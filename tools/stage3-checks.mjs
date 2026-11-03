import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const cloudDataSource = read("cloud-data.js");
const appSource = read("app.js");
const html = read("index.html");
const chartMigration = read("supabase/migrations/202611030002_chart_version_rpc.sql");

const requests = [];
const context = {
  window: {
    MingliCloud: {
      client: {
        session: { user: { id: "11111111-1111-4111-8111-111111111111" } },
        request: async (...args) => {
          requests.push(args);
          return [];
        },
      },
    },
  },
  Date,
  Number,
  String,
  Set,
  JSON,
  encodeURIComponent,
  console,
};
vm.runInNewContext(cloudDataSource, context, { filename: "cloud-data.js" });
const data = context.window.MingliCloudData;

const checks = [];
function check(name, fn) {
  try {
    fn();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, error });
  }
}

async function checkAsync(name, fn) {
  try {
    await fn();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, error });
  }
}

check("关系标签只保留本人、家人、客户", () => {
  assert.equal(data.normalizedRelation({ relation: "本人", isSelf: true }), "本人");
  assert.equal(data.normalizedRelation({ relation: "家人" }), "家人");
  assert.equal(data.normalizedRelation({ relation: "朋友" }), "客户");
  assert.match(appSource, /RELATION_OPTIONS = \["本人", "家人", "客户"\]/);
  assert.doesNotMatch(html, /data-filter="朋友"/);
});

check("档案映射不丢失出生信息且云端字段合法", () => {
  const record = data.toProfileRecord({
    id: "22222222-2222-4222-8222-222222222222",
    name: "本人",
    gender: "female",
    calendarType: "lunar",
    lunarLeapMonth: true,
    birthDate: "1990-06-01",
    birthTime: "23:30",
    birthPlace: "深圳",
    relation: "本人",
    isSelf: true,
    note: "备注",
    createdAt: Date.parse("2026-01-01T00:00:00Z"),
    updatedAt: Date.parse("2026-01-02T00:00:00Z"),
  });
  assert.equal(record.owner_id, "11111111-1111-4111-8111-111111111111");
  assert.equal(record.birth_time, "23:30:00");
  assert.equal(record.birth_time_known, true);
  assert.equal(record.relation, "本人");
  assert.equal(record.is_self, true);
  const profile = data.fromProfileRecord(record);
  assert.equal(profile.birthTime, "23:30");
  assert.equal(profile.calendarType, "lunar");
  assert.equal(profile.lunarLeapMonth, true);
});

check("未知出生时间映射为 null 且不伪造时柱输入", () => {
  const record = data.toProfileRecord({
    id: "33333333-3333-4333-8333-333333333333",
    name: "客户",
    birthDate: "1991-01-01",
    birthTime: "",
    relation: "客户",
  });
  assert.equal(record.birth_time, null);
  assert.equal(record.birth_time_known, false);
});

check("出生指纹只由影响命盘的出生字段组成", () => {
  const base = { gender: "male", calendarType: "solar", birthDate: "1990-01-01", birthTime: "10:30", birthPlace: "北京" };
  assert.equal(data.chartFingerprint({ ...base, name: "甲", note: "a" }), data.chartFingerprint({ ...base, name: "乙", note: "b" }));
  assert.notEqual(data.chartFingerprint(base), data.chartFingerprint({ ...base, birthTime: "11:30" }));
});

await checkAsync("档案读取明确来自 Supabase REST", async () => {
  requests.length = 0;
  await data.listProfiles();
  assert.match(requests[0][0], /^\/rest\/v1\/profiles\?/);
});

await checkAsync("当前设置写入 user_settings 云端表", async () => {
  requests.length = 0;
  await data.saveSettings({ currentProfileId: "22222222-2222-4222-8222-222222222222" });
  assert.equal(requests[0][0], "/rest/v1/user_settings?on_conflict=owner_id");
  assert.equal(requests[0][1].method, "POST");
});

check("应用初始化以云端档案为正式来源", () => {
  const initializeBlock = appSource.slice(appSource.indexOf("async function initializeApp"), appSource.indexOf("function setCalendarTypeValue"));
  assert.match(initializeBlock, /MingliCloudData\.listProfiles\(\)/);
  assert.match(initializeBlock, /profiles = cloudProfiles\.map/);
  assert.match(initializeBlock, /legacyMigrationProfiles =[\s\S]*storedProfiles/);
  assert.doesNotMatch(initializeBlock, /profiles = storedProfiles/);
});

check("命盘 RPC 使用事务锁、版本递增和报告过期标记", () => {
  assert.match(chartMigration, /pg_advisory_xact_lock/);
  assert.match(chartMigration, /max\(chart_version\)/);
  assert.match(chartMigration, /set is_current = false/);
  assert.match(chartMigration, /on conflict \(profile_id\) do update[\s\S]*status = 'stale'/);
  assert.match(chartMigration, /public\.is_admin\(current_user_id\)/);
});

check("档案删除先请求云端再修改本地状态", () => {
  const block = appSource.slice(appSource.indexOf("async function deleteProfile"), appSource.indexOf("async function deleteQuestionRecord"));
  assert.ok(block.indexOf("MingliCloudData.deleteProfile") < block.indexOf("profiles = profiles.filter"));
});

check("本机旧档案只在云端为空时提供确认迁移", () => {
  const initializeBlock = appSource.slice(appSource.indexOf("async function initializeApp"), appSource.indexOf("function setCalendarTypeValue"));
  assert.match(initializeBlock, /profiles\.length === 0/);
  assert.match(initializeBlock, /legacyMigrationProfiles/);
  assert.match(html, /id="legacyMigrationModal" hidden/);
  assert.match(html, /失败不会删除本机原数据/);
  const migrationBlock = appSource.slice(appSource.indexOf('document.querySelector("#migrateLegacyData")'), appSource.indexOf("profileModal.addEventListener"));
  assert.match(migrationBlock, /await persistProfiles\(\)/);
  assert.match(migrationBlock, /catch \(error\)/);
});

for (const result of checks) {
  if (result.ok) console.log(`OK ${result.name}`);
  else {
    console.error(`FAIL ${result.name}`);
    console.error(result.error?.stack || result.error);
  }
}

const failed = checks.filter((item) => !item.ok);
if (failed.length) process.exitCode = 1;
else console.log(`\n${checks.length} stage-three checks passed.`);
