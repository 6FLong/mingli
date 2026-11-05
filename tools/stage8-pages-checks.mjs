import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const bundledModules =
  process.env.CODEX_NODE_MODULES ||
  "C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
const require = createRequire(path.join(bundledModules, "package.json"));
const { chromium, devices, webkit } = require("playwright");
const baseUrl = "https://6flong.github.io/mingli/";
const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const edgePath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

async function verifyLoginPage(browserType, launchOptions, contextOptions) {
  if (launchOptions.executablePath) {
    assert.equal(fs.existsSync(launchOptions.executablePath), true, `${launchOptions.executablePath} 不存在`);
  }
  const browser = await browserType.launch({ headless: true, ...launchOptions });
  try {
    const page = await browser.newPage(contextOptions);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(`${baseUrl}?release=product-41`, { waitUntil: "domcontentloaded" });
    assert.equal(response.status(), 200);
    await page.locator("#authGate").waitFor({ state: "visible" });
    assert.equal(await page.locator("#businessApp").isVisible(), false);
    assert.equal(await page.locator("#loginAccount").inputValue(), "");
    assert.equal(await page.locator("#loginPassword").inputValue(), "");
    assert.deepEqual(errors, []);
    const dimensions = await page.evaluate(() => ({
      body: document.body.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    assert.ok(dimensions.body <= dimensions.viewport);
    return page;
  } finally {
    await browser.close();
  }
}

const htmlResponse = await fetch(`${baseUrl}?release=product-41`, { cache: "no-store" });
assert.equal(htmlResponse.status, 200);
const html = await htmlResponse.text();
assert.match(html, /product-41/);
assert.match(html, /id="authGate"/);
assert.match(html, /manifest\.webmanifest\?v=product-41/);
assert.match(html, /report-utils\.js\?v=product-41/);
assert.match(html, /report-ui\.js\?v=product-41/);

const manifestResponse = await fetch(`${baseUrl}manifest.webmanifest?v=product-41`, { cache: "no-store" });
assert.equal(manifestResponse.status, 200);
const manifest = await manifestResponse.json();
assert.equal(manifest.start_url, "./index.html");
assert.deepEqual(manifest.icons.map((item) => item.src), ["./icon-192.png", "./icon-512.png"]);

for (const resource of ["app.js?v=product-41", "report-utils.js?v=product-41", "icon-192.png", "icon-512.png"]) {
  assert.equal((await fetch(`${baseUrl}${resource}`, { cache: "no-store" })).status, 200, resource);
}
const reportClientResponse = await fetch(`${baseUrl}report-client.js?v=product-41`, { cache: "no-store" });
assert.equal(reportClientResponse.status, 200);
const reportClientSource = await reportClientResponse.text();
const exportBody = reportClientSource.match(/async function exportAllProfiles[\s\S]*?async function inspectImportZip/)?.[0] || "";
assert.match(exportBody, /buildProfilePackage\(profile\.id\)/);
assert.doesNotMatch(exportBody, /refreshProfileReport\(profile\.id\)/);
assert.match(exportBody, /导出说明\.txt/);
assert.match(exportBody, /!manifest\.profiles\.length/);
assert.match(exportBody, /error\?\.code === "report_not_available"/);
assert.match(exportBody, /manifest\.skipped\.push/);
const reportUtilsResponse = await fetch(`${baseUrl}report-utils.js?v=product-41`, { cache: "no-store" });
assert.equal(reportUtilsResponse.status, 200);
const reportUtilsSource = await reportUtilsResponse.text();
assert.match(reportUtilsSource, /ensure\([\s\S]*?context\.font = font;/);
assert.equal((await fetch(`${baseUrl}sw.js`, { cache: "no-store" })).status, 404);

await verifyLoginPage(chromium, { executablePath: chromePath }, { viewport: { width: 390, height: 844 } });
await verifyLoginPage(chromium, { executablePath: edgePath }, { viewport: { width: 1280, height: 800 } });
await verifyLoginPage(chromium, { executablePath: chromePath }, { ...devices["Pixel 5"] });
await verifyLoginPage(webkit, {}, { ...devices["iPhone 13"], ignoreHTTPSErrors: true });

console.log("OK GitHub Pages 已发布 product-41 正式资源");
console.log("OK 线上 Manifest、图标与无 Service Worker 状态正确");
console.log("OK 390px 手机登录页为空、无横向溢出且脚本无错误");
console.log("OK 1280px Microsoft Edge 登录页为空、无横向溢出且脚本无错误");
console.log("OK Pixel 5 Android Chrome 参数下登录页触控布局正常");
console.log("OK iPhone 13 WebKit 参数下登录页布局与脚本正常");
console.log("OK 线上全部导出使用 product-41 的本地生成、无报告跳过与空 ZIP 防护");
console.log("OK 线上 PDF 生成器包含跨页字体恢复逻辑");
console.log("\n8 stage-eight Pages checks passed.");
