import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const html = read("index.html");
const app = read("app.js");
const configSource = read("app-config.js");
const functionConfig = read("supabase/config.toml");
const manifest = JSON.parse(read("manifest.webmanifest"));
const checks = [];

function check(name, fn) {
  try {
    fn();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, error });
  }
}

check("HTML 引用的本地发布资源全部存在", () => {
  const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1].split("?")[0])
    .filter((value) => value.startsWith("./"));
  assert.ok(references.length > 10);
  references.forEach((value) => {
    assert.equal(fs.existsSync(path.join(root, value.slice(2))), true, `缺少资源 ${value}`);
  });
});

check("Web App Manifest 使用相对 Pages 路径且不承诺离线", () => {
  assert.equal(manifest.start_url, "./index.html");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.display, "standalone");
  assert.doesNotMatch(manifest.description, /本地优先|离线/);
  assert.deepEqual(manifest.icons.map((item) => item.src), ["./icon-192.png", "./icon-512.png"]);
  assert.doesNotMatch(app, /serviceWorker\.register\s*\(/);
  assert.equal(fs.existsSync(path.join(root, "sw.js")), false);
});

check("主屏幕 PNG 图标尺寸和格式正确", () => {
  for (const size of [192, 512]) {
    const bytes = fs.readFileSync(path.join(root, `icon-${size}.png`));
    assert.equal(bytes.subarray(1, 4).toString("ascii"), "PNG");
    assert.equal(bytes.readUInt32BE(16), size);
    assert.equal(bytes.readUInt32BE(20), size);
  }
});

check("公开配置只包含可公开值且版本与发布一致", () => {
  const context = { window: {} };
  vm.runInNewContext(configSource, context);
  const config = context.window.MINGLI_CONFIG;
  assert.equal(config.environment, "production");
  assert.equal(config.databaseSchemaVersion, "2026110409");
  assert.equal(config.supabasePublishableKey.startsWith("sb_publishable_"), true);
  assert.deepEqual(Object.keys(config).sort(), [
    "databaseSchemaVersion",
    "environment",
    "reportFormatVersion",
    "supabasePublishableKey",
    "supabaseUrl",
  ]);
  assert.equal(config.supabaseUrl, "https://resonant-brioche-af680c.netlify.app/api/supabase");
  assert.match(app, /const APP_VERSION = "product-39"/);
  assert.match(html, /应用版本<\/span><b>product-39<\/b>/);
});

check("前端不包含管理员身份、服务端密钥或凭据", () => {
  const frontendFiles = [
    "index.html", "app.js", "app-config.js", "auth-ui.js", "account-ui.js", "cloud-client.js",
    "cloud-data.js", "consultation-client.js", "consultation-ui.js", "report-client.js", "report-ui.js", "report-utils.js",
  ];
  const source = frontendFiles.map(read).join("\n");
  assert.doesNotMatch(source, /[A-Z0-9._%+-]+@(qq|gmail|outlook|hotmail|163)\.com/i);
  assert.doesNotMatch(source, /service[_-]?role(?:[_-]?key)?\s*[:=]\s*["'][^"']+/i);
  assert.doesNotMatch(source, /sk-[A-Za-z0-9_-]{20,}/);
  assert.doesNotMatch(source, /postgres(?:ql)?:\/\//i);
  assert.doesNotMatch(source, /database[_ -]?password\s*[:=]/i);
});

check("登录页为空且正式页面没有原型或示例文案", () => {
  assert.match(html, /id="loginAccount"[^>]*type="text"/);
  assert.match(html, /id="loginPassword"[^>]*type="password"/);
  assert.doesNotMatch(html, /id="loginAccount"[^>]*value=/);
  assert.doesNotMatch(html, /id="loginPassword"[^>]*value=/);
  assert.doesNotMatch(html, /示例|原型|算法校验|安装到桌面/);
});

check("Supabase 函数目录与 JWT 配置一致", () => {
  const functionDirs = fs.readdirSync(path.join(root, "supabase/functions"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name)
    .sort();
  const configured = [...functionConfig.matchAll(/\[functions\.([^\]]+)\]/g)].map((match) => match[1]).sort();
  assert.deepEqual(configured, functionDirs);
  assert.match(functionConfig, /\[functions\.auth-login\]\s*verify_jwt = false/);
  for (const name of functionDirs.filter((name) => name !== "auth-login")) {
    assert.match(functionConfig, new RegExp(`\\[functions\\.${name}\\]\\s*verify_jwt = true`));
  }
});

check("九个数据库迁移连续且都使用事务", () => {
  const files = fs.readdirSync(path.join(root, "supabase/migrations")).sort();
  assert.deepEqual(files.map((file) => file.slice(0, 12)), [
    "202611030001", "202611030002", "202611030003", "202611030004", "202611030005", "202611030006",
    "202611040007", "202611040008", "202611040009",
  ]);
  files.forEach((file) => {
    const source = read(`supabase/migrations/${file}`).trim();
    assert.match(source, /^begin;/i, `${file} 缺少 begin`);
    assert.match(source, /commit;$/i, `${file} 缺少 commit`);
  });
});

check("全部正式 JavaScript 文件通过语法检查", () => {
  const files = [
    "app.js", "app-config.js", "auth-ui.js", "account-ui.js", "cloud-client.js", "cloud-data.js",
    "consultation-client.js", "consultation-ui.js", "report-client.js", "report-ui.js", "report-utils.js",
  ];
  files.forEach((file) => {
    const result = spawnSync(process.execPath, ["--check", file], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, `${file}: ${result.stderr}`);
  });
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
else console.log(`\n${checks.length} stage-eight release checks passed.`);
