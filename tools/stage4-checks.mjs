import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const checks = [];

function check(name, fn) {
  try {
    fn();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, error });
  }
}

check("业务主页面只有首页、档案、我的", () => {
  assert.deepEqual([...html.matchAll(/data-screen="([^"]+)"/g)].map((match) => match[1]), ["home", "profiles", "mine"]);
  assert.deepEqual([...html.matchAll(/class="tab(?: [^"]*)?"[^>]*data-go="([^"]+)"/g)].map((match) => match[1]), ["home", "profiles", "mine"]);
  assert.doesNotMatch(html, /data-screen="(?:ask|detail|history)"/);
});

check("首页固定为历史对话、排盘、分析报告三个视图", () => {
  assert.deepEqual([...html.matchAll(/data-home-view="([^"]+)"/g)].map((match) => match[1]), ["conversation", "chart", "report"]);
  assert.match(html, /aria-selected="true"[^>]*data-home-view="conversation"/);
  assert.match(html, /data-home-panel="chart" hidden/);
  assert.match(html, /data-home-panel="report" hidden/);
  assert.match(app, /function setHomeView\(viewName\)/);
});

check("首页不保留无依据评分和原型入口", () => {
  assert.doesNotMatch(html, /今日状态|今日建议|运势总分|miniChart|核心入口|>问事<|data-go="(?:ask|detail|history)"/);
  assert.doesNotMatch(app, /scoreMiniChart|renderAdvice/);
});

check("档案筛选符合正式关系标签", () => {
  assert.deepEqual([...html.matchAll(/data-filter="([^"]+)"/g)].map((match) => match[1]), ["all", "本人", "家人", "客户", "expired"]);
});

check("三入口导航与手机窄屏有稳定尺寸规则", () => {
  assert.match(css, /\.tabbar\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3,\s*1fr\)/);
  assert.match(css, /@media \(max-width:\s*340px\)/);
  assert.match(css, /\.home-segments\s*\{[\s\S]*?repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
});

const bundledModules =
  process.env.CODEX_NODE_MODULES ||
  "C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
const require = createRequire(path.join(bundledModules, "package.json"));
const { chromium } = require("playwright");
const port = 4184;
const baseUrl = `http://127.0.0.1:${port}/`;
const server = spawn(process.execPath, ["tools/dev-server.mjs"], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
  stdio: "ignore",
});

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      if ((await fetch(baseUrl)).ok) return;
    } catch {
      // Wait for the local server to bind.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("本地测试服务器未启动");
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  for (const width of [320, 390, 430]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.route("https://tcqyntzbeinlygvwahav.supabase.co/**", async (route) => {
      const url = new URL(route.request().url());
      const method = route.request().method();
      let body = [];
      if (url.pathname === "/functions/v1/auth-login") {
        body = {
          access_token: "test-access-token",
          refresh_token: "test-refresh-token",
          expires_in: 3600,
          user: { id: "11111111-1111-4111-8111-111111111111" },
        };
      } else if (url.pathname === "/rest/v1/user_settings" && method === "POST") {
        body = [route.request().postDataJSON()];
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    });
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.locator("#loginAccount").fill("layout-test");
    await page.locator("#loginPassword").fill("layout-test");
    await page.locator("#loginSubmit").click();
    await page.locator("#businessApp").waitFor({ state: "visible" });

    assert.equal(await page.locator(".tabbar .tab").count(), 3);
    assert.equal(await page.locator('[data-home-panel="conversation"]').isVisible(), true);
    assert.equal(await page.locator('[data-home-panel="chart"]').isVisible(), false);
    await page.locator('[data-home-view="chart"]').click();
    assert.equal(await page.locator('[data-home-panel="chart"]').isVisible(), true);
    await page.locator('[data-home-view="report"]').click();
    assert.equal(await page.locator('[data-home-panel="report"]').isVisible(), true);

    const layout = await page.evaluate(() => ({
      bodyWidth: document.body.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      navBottom: document.querySelector(".tabbar").getBoundingClientRect().bottom,
      navWidth: document.querySelector(".tabbar").getBoundingClientRect().width,
    }));
    assert.ok(layout.bodyWidth <= layout.viewportWidth, `${width}px 页面存在横向溢出`);
    assert.ok(Math.abs(layout.navBottom - 844) <= 1, `${width}px 底部导航未贴合视口`);
    assert.ok(layout.navWidth <= width, `${width}px 底部导航超出视口`);
    assert.deepEqual(pageErrors, [], `${width}px 页面脚本报错`);
    await page.close();
  }
  checks.push({ name: "320px 至 430px 浏览器切换与布局无溢出", ok: true });
} catch (error) {
  checks.push({ name: "320px 至 430px 浏览器切换与布局无溢出", ok: false, error });
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
else console.log(`\n${checks.length} stage-four checks passed.`);
