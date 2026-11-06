import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const html = read("index.html");
const manifest = JSON.parse(read("manifest.webmanifest"));
const svg = read("icon.svg");
const css = read("styles.css");

assert.equal(manifest.name, "有点玄");
assert.equal(manifest.short_name, "有点玄");
assert.match(html, /<title>有点玄<\/title>/);
assert.match(html, /class="auth-brand"[\s\S]*?icon-192\.png/);
assert.match(html, /class="auth-copy"[\s\S]*?<h1>有点玄<\/h1>/);
assert.doesNotMatch(html, /命理咨询工作台/);
assert.match(svg, /aria-label="有点玄"/);
assert.match(svg, /id="sun"|id="moon"/);
assert.match(svg, /#FF6F91|#8B68D8|#58C7E8/);
assert.match(css, /有点玄 bright celestial theme/);
assert.match(css, /--rose:\s*#e65f88/);
assert.match(css, /--gold:\s*#d99835/);
assert.match(css, /--blue:\s*#5399df/);
console.log("OK 品牌名称、天体图标和多色亮色主题已替换");

const bundledModules = process.env.CODEX_NODE_MODULES ||
  "C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
const require = createRequire(path.join(bundledModules, "package.json"));
const sharp = require("sharp");
const { chromium } = require("playwright");

for (const size of [192, 512]) {
  const image = sharp(path.join(root, `icon-${size}.png`));
  const metadata = await image.metadata();
  assert.equal(metadata.width, size);
  assert.equal(metadata.height, size);
  const stats = await image.stats();
  assert.ok(stats.channels.some((channel) => channel.stdev > 35), `${size}px 图标缺少足够的明暗与色彩层次`);
}
console.log("OK 192px 与 512px 正式图标尺寸、色彩层次正确");

const port = 4195;
const baseUrl = `http://127.0.0.1:${port}/`;
const server = spawn(process.execPath, ["tools/dev-server.mjs"], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
  stdio: "ignore",
});

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { if ((await fetch(baseUrl)).ok) return; } catch { /* wait */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("本地服务器未启动");
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  for (const width of [390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    const result = await page.evaluate(() => {
      const panel = document.querySelector(".auth-panel").getBoundingClientRect();
      const icon = document.querySelector(".auth-brand img");
      const bodyStyle = getComputedStyle(document.body);
      return {
        title: document.title,
        heading: document.querySelector(".auth-copy h1").textContent,
        iconLoaded: icon.complete && icon.naturalWidth === 192,
        panelLeft: panel.left,
        panelRight: panel.right,
        viewport: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        background: bodyStyle.backgroundColor,
      };
    });
    assert.equal(result.title, "有点玄");
    assert.equal(result.heading, "有点玄");
    assert.equal(result.iconLoaded, true);
    assert.ok(result.panelLeft >= 0 && result.panelRight <= result.viewport, `${width}px 登录面板超出应用范围`);
    assert.ok(result.scrollWidth <= result.viewport, `${width}px 登录页存在横向溢出`);
    assert.deepEqual(pageErrors, []);
    await page.close();
  }
  console.log("OK 手机与电脑登录页使用新品牌且没有溢出或脚本错误");
} finally {
  await browser?.close();
  server.kill();
}

console.log("\n3 brand UI checks passed.");
