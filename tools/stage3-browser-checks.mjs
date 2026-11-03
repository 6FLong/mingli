import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundledModules =
  process.env.CODEX_NODE_MODULES ||
  "C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
const require = createRequire(path.join(bundledModules, "package.json"));
const { chromium } = require("playwright");
const port = 4183;
const baseUrl = `http://127.0.0.1:${port}/`;
const userId = "11111111-1111-4111-8111-111111111111";
const requests = [];

function response(route, status, body) {
  return route.fulfill({
    status,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify(body),
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const result = await fetch(baseUrl);
      if (result.ok) return;
    } catch {
      // The local server can need a brief moment to bind the port.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("本地测试服务器未启动");
}

const server = spawn(process.execPath, ["tools/dev-server.mjs"], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  await page.route("https://tcqyntzbeinlygvwahav.supabase.co/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const body = request.postDataJSON?.() || null;
    requests.push({ method, pathname: url.pathname, search: url.search, body });

    if (url.pathname === "/functions/v1/auth-login") {
      return response(route, 200, {
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        expires_in: 3600,
        user: { id: userId },
      });
    }
    if (url.pathname === "/rest/v1/profiles" && method === "GET") return response(route, 200, []);
    if (url.pathname === "/rest/v1/profiles" && method === "PATCH") return response(route, 200, []);
    if (url.pathname === "/rest/v1/profiles" && method === "POST") return response(route, 201, body);
    if (url.pathname === "/rest/v1/user_settings" && method === "GET") return response(route, 200, []);
    if (url.pathname === "/rest/v1/user_settings" && method === "POST") return response(route, 201, [body]);
    if (url.pathname === "/rest/v1/rpc/save_current_chart") {
      return response(route, 200, [{ chart_id: "22222222-2222-4222-8222-222222222222", chart_version: 1, reused: false }]);
    }
    return response(route, 200, []);
  });

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.locator("#loginAccount").fill("browser-test-account");
  await page.locator("#loginPassword").fill("browser-test-password");
  await page.locator("#loginSubmit").click();
  await page.locator("#businessApp").waitFor({ state: "visible" });

  await page.locator('[data-go="profiles"]').last().click();
  await page.locator("#openProfileModal").click();
  await page.locator("#profileName").fill("浏览器测试");
  await page.locator("#profileBirthDate").evaluate((element) => {
    element.value = "1990-01-02";
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.locator("#saveProfileDraft").click();

  await page.locator("#profileModal").waitFor({ state: "hidden" });
  await page.locator("#archiveList .archive-card").waitFor({ state: "visible" });
  assert.equal(await page.locator("#archiveList .archive-card").count(), 1);
  assert.match(await page.locator("#archiveList .archive-card").innerText(), /浏览器测试/);

  const profileWrites = requests.filter((item) => item.pathname === "/rest/v1/profiles" && item.method === "POST");
  assert.equal(profileWrites.length, 1, "创建一次档案只能产生一次档案写入");
  assert.equal(profileWrites[0].body.length, 1);
  assert.equal(profileWrites[0].body[0].owner_id, userId);
  assert.equal(profileWrites[0].body[0].relation, "本人");
  assert.equal(profileWrites[0].body[0].birth_date, "1990-01-02");

  const chartWrites = requests.filter((item) => item.pathname === "/rest/v1/rpc/save_current_chart");
  assert.equal(chartWrites.length, 1, "新档案必须保存一份结构化命盘");
  assert.equal(chartWrites[0].body.target_profile_id, profileWrites[0].body[0].id);
  assert.equal(chartWrites[0].body.target_schema_version, "bazi-facts-v1");

  const settingsWrites = requests.filter((item) => item.pathname === "/rest/v1/user_settings" && item.method === "POST");
  assert.ok(settingsWrites.some((item) => item.body.current_profile_id === profileWrites[0].body[0].id));
  assert.equal(await page.locator("#profileModal").isVisible(), false);

  console.log("OK 浏览器登录后才能初始化云端档案");
  console.log("OK 浏览器创建本人档案并保存合法云端载荷");
  console.log("OK 同一次保存不会生成重复档案写入");
  console.log("OK 新档案同步 bazi-facts-v1 命盘与当前档案设置");
  console.log("\n4 stage-three browser checks passed.");
} finally {
  await browser?.close().catch(() => undefined);
  server.kill();
}
