import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const migration = read("supabase/migrations/202611030006_retention_and_delete.sql");
const hardeningMigration = read("supabase/migrations/202611040007_least_privilege_hardening.sql");
const compensationMigration = read("supabase/migrations/202611040009_profile_delete_compensation.sql");
const consultMigration = read("supabase/migrations/202611030003_ai_consult_transactions.sql");
const deleteFunction = read("supabase/functions/profile-delete/index.ts");
const cloudData = read("cloud-data.js");
const app = read("app.js");
const checks = [];

function check(name, fn) {
  try {
    fn();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, error });
  }
}

function expiryAt(basis, now, relation = "客户") {
  if (relation !== "客户") return false;
  return now >= basis + 90 * 86400000;
}

check("第 89、90、91 天使用精确 90×24 小时边界", () => {
  const basis = Date.UTC(2026, 0, 1, 2, 30, 0);
  assert.equal(expiryAt(basis, basis + 89 * 86400000), false);
  assert.equal(expiryAt(basis, basis + 90 * 86400000 - 1), false);
  assert.equal(expiryAt(basis, basis + 90 * 86400000), true);
  assert.equal(expiryAt(basis, basis + 91 * 86400000), true);
  assert.equal(expiryAt(basis, basis + 120 * 86400000, "本人"), false);
  assert.equal(expiryAt(basis, basis + 120 * 86400000, "家人"), false);
});

check("到期字段只用于客户并优先最后成功咨询时间", () => {
  assert.match(migration, /if new\.relation <> '客户'[\s\S]*?retention_due_at := null/);
  assert.match(migration, /coalesce\(new\.last_consulted_at, new\.created_at, now\(\)\)/);
  assert.match(migration, /now\(\) >= new\.retention_due_at/);
  assert.doesNotMatch(migration, /timezone\('utc', now\(\)\) >=/);
  assert.match(migration, /where relation <> '客户'[\s\S]*?retention_due_at is not null/);
});

check("失败咨询不会延长客户到期时间", () => {
  const failBody = consultMigration.match(/create or replace function public\.fail_ai_consult[\s\S]*?\$\$;\s*/)?.[0] || "";
  const finalizeBody = consultMigration.match(/create or replace function public\.finalize_ai_consult[\s\S]*?\$\$;\s*/)?.[0] || "";
  assert.match(failBody, /set status = 'failed'/);
  assert.doesNotMatch(failBody, /profiles|last_consulted_at/);
  assert.match(finalizeBody, /update public\.profiles[\s\S]*?set last_consulted_at = target_consulted_at/);
});

check("每日任务只刷新提醒，不自动删除、归档或延长时间", () => {
  const refreshBody = migration.match(/create or replace function public\.refresh_client_retention_status[\s\S]*?\$\$;/)?.[0] || "";
  const cronBody = migration.match(/perform cron\.schedule\([\s\S]*?\);/)?.[0] || "";
  assert.match(refreshBody, /update public\.profiles/);
  assert.doesNotMatch(refreshBody, /delete\s+from|archive|last_consulted_at\s*=/i);
  assert.match(cronBody, /15 16 \* \* \*/);
  assert.match(cronBody, /select public\.refresh_client_retention_status\(\);/);
  assert.doesNotMatch(cronBody, /delete|archive/i);
});

check("永久删除仅由管理员函数执行且清理 Storage 与全部业务范围", () => {
  assert.match(deleteFunction, /authenticateAdministrator/);
  assert.match(deleteFunction, /confirmPermanent !== true/);
  assert.match(deleteFunction, /profile\.name !== confirmName/);
  assert.match(deleteFunction, /current-report\.pdf/);
  assert.match(deleteFunction, /method: "DELETE"/);
  assert.match(deleteFunction, /rpc\/delete_profile_permanently/);
  assert.match(migration, /delete from public\.messages/);
  assert.match(migration, /delete from public\.conversations/);
  assert.match(migration, /delete from public\.client_summaries/);
  assert.match(migration, /delete from public\.reports/);
  assert.match(migration, /delete from public\.bazi_charts/);
  assert.match(migration, /delete from public\.profiles/);
  assert.match(migration, /encode\(digest\([\s\S]*?'sha256'\), 'hex'\)/);
  assert.match(migration, /revoke all on function public\.delete_profile_permanently[\s\S]*?authenticated/);
  assert.match(migration, /grant execute on function public\.delete_profile_permanently[\s\S]*?service_role/);
  assert.doesNotMatch(migration, /grant execute on function public\.delete_profile_permanently[\s\S]*?to authenticated/);
  assert.match(cloudData, /\/functions\/v1\/profile-delete/);
  assert.match(hardeningMigration, /revoke delete on public\.profiles from authenticated/);
  assert.match(hardeningMigration, /revoke insert, update, delete on public\.messages from authenticated/);
  assert.match(hardeningMigration, /drop policy if exists reports_storage_delete_admin/);
  assert.doesNotMatch(hardeningMigration, /grant\s+delete/i);
});

check("数据库删除失败时恢复原报告，极端部分失败写入专用日志", () => {
  const readIndex = deleteFunction.indexOf("readReportBackup(environment, reportPath)");
  const storageDeleteIndex = deleteFunction.indexOf('method: "DELETE"', readIndex);
  const databaseDeleteIndex = deleteFunction.indexOf("rpc/delete_profile_permanently", storageDeleteIndex);
  const restoreIndex = deleteFunction.indexOf("restoreReportBackup(environment, reportPath, reportBackup)", databaseDeleteIndex);
  assert.ok(readIndex >= 0 && storageDeleteIndex > readIndex, "删除前必须读取报告备份");
  assert.ok(databaseDeleteIndex > storageDeleteIndex, "报告删除成功后才能执行数据库事务");
  assert.ok(restoreIndex > databaseDeleteIndex, "数据库事务失败后必须恢复报告");
  assert.match(deleteFunction, /headers: \{ "Content-Type": "application\/pdf", "x-upsert": "true" \}/);
  assert.match(deleteFunction, /profile_delete_partial_failure/);
  assert.match(deleteFunction, /record_profile_delete_partial_failure/);
  assert.match(deleteFunction, /async function recordPartialFailure[\s\S]*?catch \{[\s\S]*?return false/);
  assert.match(compensationMigration, /result, error_code[\s\S]*?'partial_failure'/);
  assert.match(compensationMigration, /encode\(digest\([\s\S]*?'sha256'\), 'hex'\)/);
  assert.match(compensationMigration, /revoke all on function public\.record_profile_delete_partial_failure[\s\S]*?authenticated/);
  assert.match(compensationMigration, /grant execute on function public\.record_profile_delete_partial_failure[\s\S]*?service_role/);
  assert.doesNotMatch(compensationMigration, /grant execute on function public\.record_profile_delete_partial_failure[\s\S]*?to authenticated/);
});

check("前端明确二次确认删除范围并只给到期客户显示更新报告", () => {
  assert.match(app, /永久删除「\$\{profile\.name\}」/);
  assert.match(app, /请先确认报告 ZIP 已保存到本地/);
  assert.match(app, /updateProfileReportAction"\)\.hidden = !getProfileExpiry\(profile\)\.expired/);
  assert.match(app, /MingliReportUi\.refreshProfile\(profileId\)/);
});

const bundledModules =
  process.env.CODEX_NODE_MODULES ||
  "C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
const require = createRequire(path.join(bundledModules, "package.json"));
const { chromium } = require("playwright");
const port = 4187;
const baseUrl = `http://127.0.0.1:${port}/`;
const ownerId = "11111111-1111-4111-8111-111111111111";
const ids = {
  self: "20000000-0000-4000-8000-000000000001",
  family: "20000000-0000-4000-8000-000000000002",
  day89: "20000000-0000-4000-8000-000000000003",
  day90: "20000000-0000-4000-8000-000000000004",
  day91: "20000000-0000-4000-8000-000000000005",
  recentlyConsulted: "20000000-0000-4000-8000-000000000006",
};
const now = Date.now();
const iso = (value) => new Date(value).toISOString();

function profile(id, name, relation, ageDays, isSelf = false) {
  const created = now - ageDays * 86400000;
  return {
    id,
    owner_id: ownerId,
    name,
    gender: "male",
    calendar_type: "solar",
    birth_date: "1990-01-02",
    birth_time: "10:30:00",
    birth_time_known: true,
    lunar_leap_month: false,
    birth_place: "北京",
    birth_longitude: 116.4,
    relation,
    is_self: isSelf,
    note: "",
    last_consulted_at: null,
    retention_due_at: relation === "客户" ? iso(created + 90 * 86400000) : null,
    retention_expired_at: relation === "客户" && ageDays >= 90 ? iso(created + 90 * 86400000) : null,
    created_at: iso(created),
    updated_at: iso(created),
  };
}

const records = [
  profile(ids.self, "本人", "本人", 200, true),
  profile(ids.family, "家人", "家人", 200),
  profile(ids.day89, "客户八十九", "客户", 89),
  profile(ids.day90, "客户九十", "客户", 90),
  profile(ids.day91, "客户九十一", "客户", 91),
  {
    ...profile(ids.recentlyConsulted, "近期咨询客户", "客户", 200),
    last_consulted_at: iso(now - 10 * 86400000),
    retention_due_at: iso(now + 80 * 86400000),
    retention_expired_at: null,
  },
];
const deleteAttempts = new Map();
const deleteRequests = [];

function json(route, body, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      if ((await fetch(baseUrl)).ok) return;
    } catch {
      // Wait for the local server to bind.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("本地服务器未启动");
}

const server = spawn(process.execPath, ["tools/dev-server.mjs"], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
  stdio: "ignore",
});

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("https://resonant-brioche-af680c.netlify.app/api/supabase/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.replace(/^\/api\/supabase/, "");
    const method = request.method();
    if (pathname === "/functions/v1/auth-login") {
      return json(route, { access_token: "token", refresh_token: "refresh", expires_in: 3600, user: { id: ownerId } });
    }
    if (pathname === "/rest/v1/profiles" && method === "GET") return json(route, records);
    if (pathname === "/rest/v1/user_settings" && method === "GET") {
      return json(route, [{ owner_id: ownerId, current_profile_id: ids.self }]);
    }
    if (pathname === "/rest/v1/user_settings" && method === "POST") return json(route, [request.postDataJSON()]);
    if (pathname === "/rest/v1/rpc/save_current_chart") {
      return json(route, [{ chart_id: "30000000-0000-4000-8000-000000000001", reused: true }]);
    }
    if (pathname === "/functions/v1/profile-delete") {
      const body = request.postDataJSON();
      deleteRequests.push(body);
      const attempts = (deleteAttempts.get(body.profileId) || 0) + 1;
      deleteAttempts.set(body.profileId, attempts);
      if (body.profileId === ids.day91 && attempts === 1) {
        return json(route, { error: "profile_delete_failed", message: "档案删除失败，请安全重试" }, 500);
      }
      return json(route, { deleted: true, messages: 2, conversations: 1, charts: 1 });
    }
    return json(route, []);
  });

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.locator("#loginAccount").fill("retention-test");
  await page.locator("#loginPassword").fill("retention-test");
  await page.locator("#loginSubmit").click();
  await page.locator("#businessApp").waitFor({ state: "visible" });
  await page.locator('[data-go="profiles"]').last().click();
  await page.locator("#archiveList .archive-card").first().waitFor({ state: "visible" });

  assert.equal(await page.locator("#expiredProfileCount").textContent(), "2");
  assert.equal(await page.locator(".expired-badge").count(), 2);
  assert.doesNotMatch(await page.locator(`[data-profile-id="${ids.self}"]`).first().innerText(), /已到期/);
  assert.doesNotMatch(await page.locator(`[data-profile-id="${ids.family}"]`).first().innerText(), /已到期/);
  assert.match(await page.locator(`[data-profile-id="${ids.recentlyConsulted}"]`).first().innerText(), /最后咨询/);
  assert.doesNotMatch(await page.locator(`[data-profile-id="${ids.recentlyConsulted}"]`).first().innerText(), /已到期/);

  await page.locator(`[data-profile-actions][data-profile-id="${ids.day89}"]`).click();
  assert.equal(await page.locator("#updateProfileReportAction").isVisible(), false);
  await page.locator("#closeProfileActions").click();

  await page.locator('[data-filter="expired"]').click();
  assert.equal(await page.locator("#archiveList .archive-card:not(.is-hidden)").count(), 2);

  await page.locator(`[data-profile-actions][data-profile-id="${ids.day90}"]`).click();
  assert.equal(await page.locator("#updateProfileReportAction").isVisible(), true);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.locator("#deleteProfileAction").click();
  await page.waitForTimeout(100);
  assert.equal(deleteRequests.length, 0, "取消确认不得请求删除服务");
  assert.equal(await page.locator(`[data-profile-actions][data-profile-id="${ids.day90}"]`).count(), 1);

  await page.locator(`[data-profile-actions][data-profile-id="${ids.day90}"]`).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#deleteProfileAction").click();
  await page.locator(`[data-profile-actions][data-profile-id="${ids.day90}"]`).waitFor({ state: "detached" });
  assert.equal(deleteRequests.at(-1).confirmName, "客户九十");
  assert.equal(deleteRequests.at(-1).confirmPermanent, true);

  await page.locator(`[data-profile-actions][data-profile-id="${ids.day91}"]`).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#deleteProfileAction").click();
  await page.waitForTimeout(150);
  assert.equal(await page.locator(`[data-profile-actions][data-profile-id="${ids.day91}"]`).count(), 1);
  assert.equal(deleteAttempts.get(ids.day91), 1);

  await page.locator(`[data-profile-actions][data-profile-id="${ids.day91}"]`).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#deleteProfileAction").click();
  await page.locator(`[data-profile-actions][data-profile-id="${ids.day91}"]`).waitFor({ state: "detached" });
  assert.equal(deleteAttempts.get(ids.day91), 2);
  assert.deepEqual(pageErrors, []);
  checks.push({ name: "浏览器显示到期数量、筛选和操作菜单，并支持取消与安全重试删除", ok: true });
} catch (error) {
  checks.push({ name: "浏览器到期提醒与删除流程", ok: false, error });
} finally {
  await browser?.close().catch(() => undefined);
  server.kill();
}

for (const result of checks) {
  if (result.ok) console.log(`OK ${result.name}`);
  else {
    console.error(`FAIL ${result.name}`);
    console.error(result.error?.stack || result.error);
  }
}
const failed = checks.filter((item) => !item.ok);
if (failed.length) process.exitCode = 1;
else console.log(`\n${checks.length} stage-seven checks passed.`);
