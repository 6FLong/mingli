import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const html = read("index.html");
const app = read("app.js");
const cloudData = read("cloud-data.js");
const reportUi = read("report-ui.js");
const reportClient = read("report-client.js");
const chartFunction = read("supabase/functions/chart-explain/index.ts");
const migration = read("supabase/migrations/202611060011_chart_interpretation.sql");
const originalChartMigration = read("supabase/migrations/202611030002_chart_version_rpc.sql");
const config = read("supabase/config.toml");

assert.match(config, /\[functions\.chart-explain\]\s*verify_jwt = true/);
assert.match(migration, /ai_interpretation jsonb/);
assert.match(migration, /presentation_snapshot jsonb/);
assert.match(migration, /grant update \(ai_interpretation,[\s\S]*?to service_role/);
assert.match(originalChartMigration, /select \* into existing_chart/);
assert.match(originalChartMigration, /is_current/);
assert.doesNotMatch(originalChartMigration, /existing_char\s|is_curren\s|target_birth_fingerprin\s/);
assert.match(chartFunction, /bazi-facts-v1/);
assert.match(chartFunction, /factRefValue\(facts, reference\)/);
assert.match(chartFunction, /不得重新计算或补充任何干支/);
assert.doesNotMatch(chartFunction, /select=id,name|birth_place|necessaryProfile/);
assert.match(cloudData, /\/functions\/v1\/chart-explain/);
assert.match(app, /renderChartInterpretation\(response\?\.interpretation\)/);
assert.match(html, /id="retryChartInterpretation"/);
console.log("OK 命盘人话解读使用独立受保护接口、只读取结构化事实并缓存到当前命盘");

assert.match(html, /id="generateClientReport"[^>]*>生成分析报告/);
assert.doesNotMatch(reportUi, /mingli:consultation-complete/);
assert.match(reportUi, /data\.report\?\.presentation_snapshot/);
assert.match(reportClient, /presentation_snapshot: pkg\.presentation/);
assert.doesNotMatch(reportClient, /还没有成功咨询记录，暂不能生成分析报告/);
assert.match(reportClient, /chart\.ai_interpretation/);
console.log("OK 分析报告默认不生成、只由用户主动生成并保存当次内容快照");

const bundledModules = process.env.CODEX_NODE_MODULES ||
  "C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
const require = createRequire(path.join(bundledModules, "package.json"));
const { chromium } = require("playwright");
const port = 4196;
const baseUrl = `http://127.0.0.1:${port}/`;
const ownerId = "11111111-1111-4111-8111-111111111111";
const profileId = "22222222-2222-4222-8222-222222222222";
const chartId = "33333333-3333-4333-8333-333333333333";
const interpretation = {
  schemaVersion: "chart-interpretation-v1",
  headline: "做事有冲劲，也需要留出缓冲",
  summary: "你不是没有行动力，而是遇到持续压力时更需要稳定资源托住。方向明确时推进很快，事情太多时容易把自己耗住。现在适合先抓最重要的一件事做深。",
  tags: ["行动直接", "需要缓冲", "适合做深"],
  sections: [
    { title: "你做事的方式", text: "目标清楚时很能推进，但不适合同时扛太多任务。", factRefs: ["strength.label"] },
    { title: "你的优势", text: "学习和资源支持到位时，能力更容易稳定发挥。", factRefs: ["usefulGod.primaryGods"] },
    { title: "当前阶段", text: "这一阶段先稳住节奏，再扩大投入，会比硬冲更顺。", factRefs: ["annual.stemGod"] },
  ],
};
const facts = {
  schemaVersion: "bazi-facts-v1",
  engineVersion: "test",
  ruleset: "《四柱预测学》子平法口径",
  pillars: {
    year: { label: "年柱", name: "庚午", stem: "庚", branch: "午", hiddenStems: ["丁"], stemGod: "正印" },
    month: { label: "月柱", name: "戊寅", stem: "戊", branch: "寅", hiddenStems: ["甲"], stemGod: "正官" },
    day: { label: "日柱", name: "癸卯", stem: "癸", branch: "卯", hiddenStems: ["乙"], stemGod: "日主" },
    hour: { label: "时柱", name: "丁巳", stem: "丁", branch: "巳", hiddenStems: ["丙"], stemGod: "偏财" },
  },
  strength: { label: "偏弱", summary: "日主偏弱，需要资源承接。" },
  pattern: { name: "正官格", status: "格局成立", basis: ["月令主气为官。"] },
  usefulGod: { strategy: "扶身承压", primaryGods: ["印"], favorableGods: ["正印"], unfavorableGods: ["偏财"] },
  luck: { current: { name: "辛巳", stemGod: "偏印" } },
  annual: { year: 2026, name: "丙午", stemGod: "正财", note: "现实投入增加。" },
  futureAnnuals: [{ year: 2026, name: "丙午", stemGod: "正财", note: "现实投入增加。" }],
  tenGodCounts: { 正印: 2, 正官: 1, 偏财: 1 },
  relations: { natal: [], active: [] },
  warnings: [],
};
const profile = {
  id: profileId, owner_id: ownerId, name: "测试档案", gender: "female", calendar_type: "solar",
  birth_date: "1990-03-04", birth_time: "10:00:00", birth_time_known: true, lunar_leap_month: false,
  birth_place: "北京", birth_longitude: 116.4, relation: "本人", is_self: true, note: "",
  created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z", last_consulted_at: null,
};
let reportRow = null;

function json(route, body, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function mockCloud(route) {
  const request = route.request();
  const url = new URL(request.url());
  const pathname = url.pathname.replace(/^\/api\/supabase/, "");
  const method = request.method();
  if (pathname === "/functions/v1/auth-login") return json(route, { access_token: "token", refresh_token: "refresh", expires_in: 3600, user: { id: ownerId } });
  if (pathname === "/rest/v1/profiles" && method === "GET") return json(route, [profile]);
  if (pathname === "/rest/v1/user_settings" && method === "GET") return json(route, [{ owner_id: ownerId, current_profile_id: profileId, preferences: {} }]);
  if (pathname === "/rest/v1/user_settings" && method === "POST") return json(route, [request.postDataJSON()]);
  if (pathname === "/rest/v1/rpc/save_current_chart") return json(route, [{ id: chartId, facts, ai_interpretation: interpretation }]);
  if (pathname === "/functions/v1/chart-explain") return json(route, { interpretation, cached: false, interpretedAt: "2026-11-06T01:00:00.000Z" });
  if (pathname === "/rest/v1/bazi_charts" && method === "GET") return json(route, [{ id: chartId, profile_id: profileId, facts, ai_interpretation: interpretation, interpretation_status: "ready" }]);
  if (pathname === "/rest/v1/client_summaries" && method === "GET") return json(route, []);
  if (pathname === "/rest/v1/reports" && method === "GET") return json(route, reportRow ? [reportRow] : []);
  if (pathname.startsWith("/rest/v1/reports") && method === "POST") {
    reportRow = { ...request.postDataJSON(), id: "44444444-4444-4444-8444-444444444444" };
    return json(route, [reportRow]);
  }
  if (pathname.startsWith("/rest/v1/conversations") || pathname.startsWith("/rest/v1/messages")) return json(route, []);
  if (pathname.startsWith("/storage/v1/object/reports/") && method === "POST") return json(route, { Key: "current-report.pdf" });
  if (pathname === "/rest/v1/profiles" && ["POST", "PATCH"].includes(method)) return json(route, []);
  return json(route, []);
}

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
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("https://resonant-brioche-af680c.netlify.app/api/supabase/**", mockCloud);
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.locator("#loginAccount").fill("chart-test");
  await page.locator("#loginPassword").fill("chart-test");
  await page.locator("#loginSubmit").click();
  await page.locator("#businessApp").waitFor({ state: "visible" });
  await page.locator('[data-home-view="chart"]').click();
  await page.locator("#chartSummaryTitle").filter({ hasText: interpretation.headline }).waitFor({ state: "visible" });
  assert.match(await page.locator("#chartSummaryText").innerText(), /不是没有行动力/);
  assert.equal(await page.locator("#chartInterpretationSections article").count(), 3);

  await page.locator('[data-home-view="report"]').click();
  await page.locator("#generateClientReport").waitFor({ state: "visible" });
  assert.match(await page.locator("#reportStatusTitle").innerText(), /尚未生成/);
  assert.equal(await page.locator("#reportPreviewContent").locator("section").count(), 0);
  await page.locator("#generateClientReport").click();
  await page.waitForFunction(() => document.querySelector("#reportSyncStatus")?.textContent === "已同步", null, { timeout: 15000 });
  assert.equal(await page.locator("#reportStatusTitle").innerText(), "分析报告");
  assert.ok(reportRow?.presentation_snapshot, "生成报告时没有保存内容快照");
  assert.match(await page.locator("#reportPreviewContent").innerText(), /你做事的方式/);
  assert.equal(await page.locator("#downloadClientReport").isEnabled(), true);
  assert.deepEqual(pageErrors, []);
  console.log("OK 手机端档案排盘后自动显示 AI 人话解读，报告保持未生成直到主动点击");
} finally {
  await browser?.close();
  server.kill();
}

console.log("\n3 chart AI and report flow checks passed.");
