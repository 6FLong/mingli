import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const bundledModules =
  process.env.CODEX_NODE_MODULES ||
  "C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
const require = createRequire(path.join(bundledModules, "package.json"));
const { chromium } = require("playwright");
const baseUrl = "https://6flong.github.io/mingli/";

const htmlResponse = await fetch(`${baseUrl}?release=product-34`, { cache: "no-store" });
assert.equal(htmlResponse.status, 200);
const html = await htmlResponse.text();
assert.match(html, /product-34/);
assert.match(html, /id="authGate"/);
assert.match(html, /manifest\.webmanifest\?v=product-34/);

const manifestResponse = await fetch(`${baseUrl}manifest.webmanifest?v=product-34`, { cache: "no-store" });
assert.equal(manifestResponse.status, 200);
const manifest = await manifestResponse.json();
assert.equal(manifest.start_url, "./index.html");
assert.deepEqual(manifest.icons.map((item) => item.src), ["./icon-192.png", "./icon-512.png"]);

for (const resource of ["app.js?v=product-34", "icon-192.png", "icon-512.png"]) {
  assert.equal((await fetch(`${baseUrl}${resource}`, { cache: "no-store" })).status, 200, resource);
}
assert.equal((await fetch(`${baseUrl}sw.js`, { cache: "no-store" })).status, 404);

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto(`${baseUrl}?release=product-34`, { waitUntil: "domcontentloaded" });
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
  fs.mkdirSync(path.join(process.cwd(), ".tools"), { recursive: true });
  await page.screenshot({ path: path.join(process.cwd(), ".tools/pages-login-product-34.png"), fullPage: true });
} finally {
  await browser.close();
}

console.log("OK GitHub Pages 已发布 product-34 正式资源");
console.log("OK 线上 Manifest、图标与无 Service Worker 状态正确");
console.log("OK 390px 手机登录页为空、无横向溢出且脚本无错误");
console.log("\n3 stage-eight Pages checks passed.");
