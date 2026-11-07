import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const checks = [];
function check(name, fn) {
  try {
    fn();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, error });
  }
}

const migration = read("supabase/migrations/202611030001_initial_schema.sql");
const serviceRoleMigration = read("supabase/migrations/202611040008_service_role_api_grants.sql");
const supabaseConfig = read("supabase/config.toml");
const appConfigSource = read("app-config.js");
const indexHtml = read("index.html");
const gitignore = read(".gitignore");

check("公开前端配置可执行且只包含公开连接信息", () => {
  const context = { window: {} };
  vm.runInNewContext(appConfigSource, context, { filename: "app-config.js" });
  const config = context.window.MINGLI_CONFIG;
  assert.equal(config.supabaseUrl, "https://resonant-brioche-af680c.netlify.app/api/supabase");
  assert.match(config.supabasePublishableKey, /^sb_publishable_/);
  assert.equal(config.databaseSchemaVersion, "2026110611");
  assert.equal(Object.isFrozen(config), true);
});

check("前端配置不包含管理员身份或服务端密钥", () => {
  assert.doesNotMatch(appConfigSource, /@qq\.com|service_role|DEEPSEEK_API_KEY|database password/i);
  assert.doesNotMatch(appConfigSource, /3ee8e734-ffad-4a5e-b1b9-4582b751a73f/i);
});

check("页面在业务脚本之前加载公开配置", () => {
  const configIndex = indexHtml.indexOf("./app-config.js");
  const appIndex = indexHtml.indexOf("./app.js");
  assert.ok(configIndex >= 0, "app-config.js missing");
  assert.ok(appIndex > configIndex, "app-config.js must load before app.js");
});

const requiredTables = [
  "admin_users",
  "profiles",
  "bazi_charts",
  "conversations",
  "messages",
  "client_summaries",
  "reports",
  "user_settings",
  "login_events",
  "data_deletion_log",
];

check("迁移创建全部正式数据表", () => {
  for (const table of requiredTables) {
    assert.match(migration, new RegExp(`create table public\\.${table}\\s*\\(`, "i"), table);
  }
});

check("全部正式数据表启用 RLS", () => {
  for (const table of requiredTables) {
    assert.match(
      migration,
      new RegExp(`alter table public\\.${table} enable row level security`, "i"),
      table,
    );
  }
});

check("管理员白名单只保存 UUID 且已写入唯一管理员", () => {
  assert.match(migration, /user_id uuid primary key references auth\.users\(id\)/i);
  assert.match(migration, /3ee8e734-ffad-4a5e-b1b9-4582b751a73f/i);
  assert.doesNotMatch(migration, /@qq\.com/i);
});

check("档案标签、本人唯一和命盘版本约束存在", () => {
  assert.match(migration, /relation in \('本人', '家人', '客户'\)/);
  assert.match(migration, /profiles_one_self_per_owner/i);
  assert.match(migration, /bazi_charts_one_current_per_profile/i);
  assert.match(migration, /unique \(profile_id, chart_version\)/i);
});

check("登录日志包含账户、时间、地区、设备和风险字段", () => {
  for (const field of [
    "account_identifier",
    "occurred_at",
    "device_summary",
    "ip_hash",
    "ip_masked",
    "country_code",
    "region_name",
    "city_name",
    "location_source",
    "risk_level",
    "read_at",
  ]) {
    assert.match(migration, new RegExp(`\\b${field}\\b`, "i"), field);
  }
  assert.doesNotMatch(migration, /password\s+text|access_token\s+text|refresh_token\s+text/i);
});

check("登录日志客户端只能读取和更新 read_at", () => {
  assert.match(migration, /grant select on public\.login_events to authenticated/i);
  assert.match(migration, /grant update \(read_at\) on public\.login_events to authenticated/i);
  assert.doesNotMatch(migration, /grant (insert|delete).*login_events.*authenticated/i);
});

check("服务端角色只有受控函数所需的表权限", () => {
  assert.match(serviceRoleMigration, /grant usage on schema public to service_role/i);
  for (const table of ["admin_users", "profiles", "bazi_charts", "messages", "client_summaries", "reports"]) {
    assert.match(serviceRoleMigration, new RegExp(`grant select on public\\.${table} to service_role`, "i"), table);
  }
  assert.match(serviceRoleMigration, /grant select, insert on public\.login_events to service_role/i);
  assert.doesNotMatch(serviceRoleMigration, /grant\s+(?:all|delete|update)/i);
});

check("匿名角色没有业务表权限", () => {
  assert.match(migration, /revoke all on all tables in schema public from anon/i);
  assert.doesNotMatch(migration, /grant .* on public\..* to anon/i);
});

check("报告存储为私有 Bucket 且路径绑定管理员 UUID", () => {
  assert.match(migration, /'reports',\s*'reports',\s*false/i);
  assert.match(migration, /storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/i);
  for (const operation of ["select", "insert", "update", "delete"]) {
    assert.match(migration, new RegExp(`reports_storage_${operation}_admin`, "i"));
  }
});

check("迁移使用事务并建立更新时间触发器", () => {
  assert.match(migration.trimStart(), /^begin;/i);
  assert.match(migration.trimEnd(), /commit;$/i);
  assert.match(migration, /create or replace function public\.set_updated_at/i);
});

check("只有登录函数允许无 JWT，其他函数强制鉴权", () => {
  assert.match(supabaseConfig, /\[functions\.auth-login\][\s\S]*?verify_jwt = false/);
  for (const name of ["ai-consult", "profile-delete", "report-restore"]) {
    assert.match(
      supabaseConfig,
      new RegExp(`\\[functions\\.${name}\\][\\s\\S]*?verify_jwt = true`),
      name,
    );
  }
});

check("本地敏感配置与日志不会进入版本库", () => {
  assert.match(gitignore, /^\.env$/m);
  assert.match(gitignore, /^\.env\.\*$/m);
  assert.match(gitignore, /^\*\.log$/m);
});

for (const result of checks) {
  if (result.ok) {
    console.log(`OK ${result.name}`);
  } else {
    console.error(`FAIL ${result.name}`);
    console.error(result.error?.stack || result.error);
  }
}

const failed = checks.filter((item) => !item.ok);
if (failed.length > 0) {
  process.exitCode = 1;
} else {
  console.log(`\n${checks.length} stage-one checks passed.`);
}
