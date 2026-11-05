import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const html = read("index.html");
const css = read("styles.css");
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

check("首页档案和三视图使用同一粘性容器", () => {
  assert.match(html, /id="homeStickyStack"[\s\S]*?id="homeProfileCollapsible"[\s\S]*?class="home-segments"/);
  assert.match(css, /\.home-sticky-stack\s*\{[\s\S]*?position:\s*sticky/);
  assert.match(css, /\.is-profile-collapsed \.home-profile-collapsible\s*\{[\s\S]*?max-height:\s*0/);
  assert.match(app, /homeProfileCollapsible\.inert = true/);
  assert.match(app, /window\.addEventListener\("scroll", scheduleHomeStickyHeader, \{ passive: true \}\)/);
  assert.match(app, /window\.addEventListener\("wheel"/);
  assert.match(app, /window\.addEventListener\("touchmove"/);
});

const bundledModules = process.env.CODEX_NODE_MODULES ||
  "C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
const require = createRequire(path.join(bundledModules, "package.json"));
const { chromium } = require("playwright");
const port = 4193;
const baseUrl = `http://127.0.0.1:${port}/`;
const ownerId = "11111111-1111-4111-8111-111111111111";

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

async function mockCloud(route) {
  const request = route.request();
  const pathname = new URL(request.url()).pathname.replace(/^\/api\/supabase/, "");
  if (pathname === "/functions/v1/auth-login") {
    return json(route, { access_token: "token", refresh_token: "refresh", expires_in: 3600, user: { id: ownerId } });
  }
  return json(route, []);
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
  for (const width of [390, 1024]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.route("https://resonant-brioche-af680c.netlify.app/api/supabase/**", mockCloud);
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.locator("#loginAccount").fill("sticky-test");
    await page.locator("#loginPassword").fill("sticky-test");
    await page.locator("#loginSubmit").click();
    await page.locator("#businessApp").waitFor({ state: "visible" });
    await page.locator('[data-home-view="chart"]').click();
    await page.locator('[data-home-panel="chart"]').evaluate((element) => { element.style.minHeight = "1900px"; });

    assert.equal(await page.locator('[data-screen="home"]').evaluate((element) => element.classList.contains("is-profile-collapsed")), false);
    await page.mouse.wheel(0, 620);
    await page.waitForFunction(() => (
      document.querySelector('[data-screen="home"]').classList.contains("is-profile-collapsed") &&
      parseFloat(getComputedStyle(document.querySelector("#homeProfileCollapsible")).maxHeight) <= 1
    ));

    const collapsed = await page.evaluate(() => {
      const stack = document.querySelector("#homeStickyStack").getBoundingClientRect();
      const segments = document.querySelector(".home-segments").getBoundingClientRect();
      const profile = document.querySelector("#homeProfileCollapsible");
      return {
        classApplied: document.querySelector('[data-screen="home"]').classList.contains("is-profile-collapsed"),
        stackTop: stack.top,
        stackWidth: stack.width,
        segmentsTop: segments.top,
        ariaHidden: profile.getAttribute("aria-hidden"),
        inert: profile.inert,
        maxHeight: parseFloat(getComputedStyle(profile).maxHeight),
      };
    });
    assert.equal(collapsed.classApplied, true, `${width}px 上滑后档案卡没有收起`);
    assert.ok(collapsed.stackTop <= 1, `${width}px 三视图没有固定在视口顶部`);
    assert.ok(collapsed.segmentsTop <= 8, `${width}px 三视图顶部位置不正确：${collapsed.segmentsTop}`);
    assert.ok(collapsed.stackWidth <= 430, `${width}px 粘性工作区超出 APP 宽度`);
    assert.equal(collapsed.ariaHidden, "true");
    assert.equal(collapsed.inert, true);
    assert.ok(collapsed.maxHeight <= 1);

    await page.locator('[data-home-view="report"]').click();
    assert.equal(await page.locator('[data-home-panel="report"]').isVisible(), true, `${width}px 收起后无法切换分析报告`);

    await page.locator('[data-home-view="chart"]').click();
    await page.waitForFunction(() => (
      !document.querySelector('[data-screen="home"]').classList.contains("is-profile-collapsed") &&
      parseFloat(getComputedStyle(document.querySelector("#homeProfileCollapsible")).maxHeight) >= 259
    ));
    await page.waitForTimeout(260);
    await page.mouse.wheel(0, 620);
    await page.waitForFunction(() => (
      document.querySelector('[data-screen="home"]').classList.contains("is-profile-collapsed") &&
      parseFloat(getComputedStyle(document.querySelector("#homeProfileCollapsible")).maxHeight) <= 1
    ));

    await page.mouse.wheel(0, -120);
    await page.waitForFunction(() => (
      !document.querySelector('[data-screen="home"]').classList.contains("is-profile-collapsed") &&
      parseFloat(getComputedStyle(document.querySelector("#homeProfileCollapsible")).maxHeight) >= 259
    ));
    const expanded = await page.evaluate(() => {
      const profile = document.querySelector("#homeProfileCollapsible");
      const stack = document.querySelector("#homeStickyStack").getBoundingClientRect();
      const card = document.querySelector(".current-profile-card").getBoundingClientRect();
      const segments = document.querySelector(".home-segments").getBoundingClientRect();
      return {
        classApplied: document.querySelector('[data-screen="home"]').classList.contains("is-profile-collapsed"),
        ariaHidden: profile.hasAttribute("aria-hidden"),
        inert: profile.inert,
        maxHeight: parseFloat(getComputedStyle(profile).maxHeight),
        stackTop: stack.top,
        scrollY: window.scrollY,
        cardBottom: card.bottom,
        segmentsTop: segments.top,
      };
    });
    assert.equal(expanded.classApplied, false, `${width}px 下拉后档案卡没有展开`);
    assert.equal(expanded.ariaHidden, false);
    assert.equal(expanded.inert, false);
    assert.ok(expanded.maxHeight >= 259);
    assert.ok(expanded.stackTop <= 1, `${width}px 展开后的档案卡没有保持在顶部：${expanded.stackTop}，scrollY=${expanded.scrollY}`);
    assert.ok(expanded.cardBottom <= expanded.segmentsTop, `${width}px 展开后的档案卡被三视图遮挡`);
    assert.deepEqual(pageErrors, []);

    if (width === 390) {
      fs.mkdirSync(path.join(root, "tools", ".artifacts"), { recursive: true });
      await page.screenshot({ path: path.join(root, "tools", ".artifacts", "sticky-home-expanded.png"), fullPage: false });
      await page.mouse.wheel(0, 620);
      await page.waitForFunction(() => parseFloat(getComputedStyle(document.querySelector("#homeProfileCollapsible")).maxHeight) <= 1);
      await page.screenshot({ path: path.join(root, "tools", ".artifacts", "sticky-home-collapsed.png"), fullPage: false });
    }
    await page.close();
    checks.push({ name: `${width}px 首页上滑固定三视图、下拉恢复档案卡`, ok: true });
  }
} catch (error) {
  checks.push({ name: "首页粘性工作区浏览器流程", ok: false, error });
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
else console.log(`\n${checks.length} sticky home checks passed.`);
