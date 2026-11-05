import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const migration = read("supabase/migrations/202611050010_cloud_usage.sql");
const edgeFunction = read("supabase/functions/storage-usage/index.ts");
const accountUi = read("account-ui.js");
const html = read("index.html");
const checks = [];

function check(name, fn) {
  try {
    fn();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, error });
  }
}

check("云端用量 RPC 仅允许 service_role 调用", () => {
  assert.match(migration, /pg_database_size\(current_database\(\)\)/);
  assert.match(migration, /from storage\.objects/);
  assert.match(migration, /bucket_id = 'reports'/);
  assert.match(migration, /name like target_owner_id::text \|\| '\/%'/);
  assert.match(migration, /revoke all on function public\.get_cloud_usage\(uuid\) from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.get_cloud_usage\(uuid\) to service_role/);
});

check("云端用量接口验证管理员且不向前端暴露管理密钥", () => {
  assert.match(edgeFunction, /authenticateAdministrator/);
  assert.match(edgeFunction, /serviceRequest\(environment, "\/rest\/v1\/rpc\/get_cloud_usage"/);
  assert.match(edgeFunction, /free_plan_reference/);
  assert.doesNotMatch(edgeFunction, /serviceRoleKey\s*[:,]/);
  assert.match(accountUi, /\/functions\/v1\/storage-usage/);
  assert.match(html, /id="cloudUsageTitle"/);
});

const bundledModules = process.env.CODEX_NODE_MODULES ||
  "C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
const require = createRequire(path.join(bundledModules, "package.json"));
const { chromium } = require("playwright");
const port = 4192;
const baseUrl = `http://127.0.0.1:${port}/`;
const ownerId = "11111111-1111-4111-8111-111111111111";
let usageRequests = 0;
let failNextUsage = false;

function json(route, body, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { if ((await fetch(baseUrl)).ok) return; } catch { /* wait */ }
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
  browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("https://resonant-brioche-af680c.netlify.app/api/supabase/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.replace(/^\/api\/supabase/, "");
    if (pathname === "/functions/v1/auth-login") {
      return json(route, { access_token: "token", refresh_token: "refresh", expires_in: 3600, user: { id: ownerId } });
    }
    if (pathname === "/rest/v1/profiles") return json(route, []);
    if (pathname === "/rest/v1/user_settings") return json(route, []);
    if (pathname === "/functions/v1/storage-usage") {
      usageRequests += 1;
      if (failNextUsage) {
        failNextUsage = false;
        return json(route, { error: "usage_read_failed", message: "云端存储情况读取失败" }, 500);
      }
      return json(route, {
        database: { usedBytes: 125 * 1024 * 1024, referenceLimitBytes: 500 * 1024 * 1024, percent: 25 },
        reports: { usedBytes: 51.2 * 1024 * 1024, referenceLimitBytes: 1024 * 1024 * 1024, percent: 5 },
        counts: { profiles: 7, messages: 128, reports: 6 },
        measuredAt: "2026-11-05T02:30:00.000Z",
        limitKind: "free_plan_reference",
      });
    }
    return json(route, []);
  });

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.locator("#loginAccount").fill("usage-test");
  await page.locator("#loginPassword").fill("usage-test");
  await page.locator("#loginSubmit").click();
  await page.locator("#businessApp").waitFor({ state: "visible" });
  await page.locator('[data-go="mine"]').last().click();
  await page.locator("#databaseUsageValue").getByText("125 MB / 500 MB").waitFor();

  assert.equal(await page.locator("#reportStorageUsageValue").textContent(), "51.2 MB / 1.00 GB");
  assert.equal(await page.locator("#databaseUsageTrack").getAttribute("aria-valuenow"), "25");
  assert.equal(await page.locator("#reportStorageUsageTrack").getAttribute("aria-valuenow"), "5");
  assert.match(await page.locator("#cloudUsageCounts").textContent(), /档案 7 份 · 消息 128 条 · 报告 6 份/);
  assert.match(await page.locator("#cloudUsageStatus").textContent(), /免费版参考额度，以 Supabase 后台为准/);
  const width = await page.locator("#databaseUsageTrack i").evaluate((element) => element.style.width);
  assert.equal(width, "25%");
  const layout = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
  assert.ok(layout.document <= layout.viewport, "我的页面不得产生横向溢出");
  fs.mkdirSync(path.join(root, "tools", ".artifacts"), { recursive: true });
  await page.screenshot({ path: path.join(root, "tools", ".artifacts", "storage-usage-mobile.png"), fullPage: true });

  failNextUsage = true;
  await page.locator("#refreshCloudUsage").click();
  await page.locator("#cloudUsageStatus").getByText("云端存储情况读取失败").waitFor();
  assert.equal(await page.locator("#databaseUsageValue").textContent(), "125 MB / 500 MB", "刷新失败时保留上次成功数据");
  assert.equal(usageRequests, 2);
  assert.deepEqual(pageErrors, []);
  checks.push({ name: "我的页面展示云端用量、参考额度、数量并支持失败重试", ok: true });
} catch (error) {
  checks.push({ name: "云端存储使用情况浏览器流程", ok: false, error });
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
else console.log(`\n${checks.length} storage usage checks passed.`);
