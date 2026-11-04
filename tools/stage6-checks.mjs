import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const reportClientSource = read("report-client.js");
const restoreFunction = read("supabase/functions/report-restore/index.ts");
const restoreMigration = read("supabase/migrations/202611030005_restore_backup_rpc.sql");
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

check("报告固定使用唯一私有 Storage 路径并覆盖旧文件", () => {
  assert.match(reportClientSource, /current-report\.pdf/);
  assert.match(reportClientSource, /"x-upsert": "true"/);
  assert.match(reportClientSource, /\/storage\/v1\/object\/reports\//);
  assert.match(reportClientSource, /status: "ready"/);
  assert.match(reportClientSource, /status: "failed"/);
});

check("正式导出为 PDF 与恢复 JSON 的 ZIP", () => {
  assert.match(reportClientSource, /\$\{base\}\.pdf/);
  assert.match(reportClientSource, /恢复数据/);
  assert.match(reportClientSource, /全部命理分析报告-/);
  assert.match(html, /accept="application\/zip,\.zip/);
  assert.match(html, /导出全部分析报告/);
});

check("恢复服务二次校验管理员、版本、摘要和敏感字段", () => {
  assert.match(restoreFunction, /authenticateAdministrator/);
  assert.match(restoreFunction, /mingli-backup-v1/);
  assert.match(restoreFunction, /sha256Hex\(stablePayload\(backup\)\)/);
  assert.match(restoreFunction, /access_token/);
  assert.match(restoreFunction, /backup_contains_secret/);
});

check("整批恢复使用单个事务并支持三种冲突处理", () => {
  assert.match(restoreMigration, /^begin;/);
  assert.match(restoreMigration, /target_conflict_mode not in \('preserve', 'replace', 'copy'\)/);
  assert.match(restoreMigration, /pg_advisory_xact_lock/);
  assert.match(restoreMigration, /insert into public\.profiles/);
  assert.match(restoreMigration, /insert into public\.bazi_charts/);
  assert.match(restoreMigration, /insert into public\.conversations/);
  assert.match(restoreMigration, /insert into public\.messages/);
  assert.match(restoreMigration, /insert into public\.client_summaries/);
  assert.match(restoreMigration, /insert into public\.reports/);
  assert.match(restoreMigration, /grant execute[\s\S]*to service_role/);
  assert.doesNotMatch(restoreMigration, /grant execute[\s\S]*to authenticated/);
});

const bundledModules =
  process.env.CODEX_NODE_MODULES ||
  "C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
const require = createRequire(path.join(bundledModules, "package.json"));
const { chromium, devices, webkit } = require("playwright");
const port = 4186;
const baseUrl = `http://127.0.0.1:${port}/`;
const ownerId = "11111111-1111-4111-8111-111111111111";
const profileId = "22222222-2222-4222-8222-222222222222";
const chartId = "33333333-3333-4333-8333-333333333333";
const conversationId = "44444444-4444-4444-8444-444444444444";
const storageWrites = [];
const reportWrites = [];
const restoreRequests = [];

const profile = {
  id: profileId, owner_id: ownerId, name: "本人报告测试", gender: "male", calendar_type: "solar",
  birth_date: "1990-01-02", birth_time: "10:30:00", birth_time_known: true, lunar_leap_month: false,
  birth_place: "北京", birth_longitude: 116.4, relation: "本人", is_self: true, note: "",
  last_consulted_at: "2026-11-03T01:00:00.000Z", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-11-03T01:00:00.000Z",
};
const facts = {
  schemaVersion: "bazi-facts-v1", engineVersion: "product-31", ruleset: "《四柱预测学》子平法口径",
  pillars: {
    year: { label: "年柱", name: "庚午" }, month: { label: "月柱", name: "戊子" },
    day: { label: "日柱", name: "丁卯" }, hour: { label: "时柱", name: "乙巳" },
  },
  strength: { label: "偏弱", summary: "冬月火弱，得木火生扶。" },
  pattern: { name: "七杀格", status: "初步成立", basis: ["月令主气取格。"] },
  usefulGod: { strategy: "扶身制杀", primaryGods: ["印"], favorableGods: ["木", "火"], unfavorableGods: ["水"] },
  relations: {
    natal: [{
      name: "卯酉六冲", type: "六冲", members: ["卯", "酉"],
      sources: [{ label: "月柱", source: "原局" }, { label: "时柱", source: "原局" }],
      effect: "地支相冲，主位置、关系或状态发生明显牵动",
    }],
    active: [{
      name: "午未六合", type: "六合", members: ["午", "未"],
      sources: [{ label: "当前大运", source: "大运" }, { label: "当前流年", source: "流年" }],
      effect: "地支六合，是否成化仍需看月令和透干",
    }],
  },
  luck: { current: { name: "乙酉大运" } }, annual: { name: "丙午" }, warnings: ["当前规则仍有传统暂行项。"],
};
const chart = {
  id: chartId, owner_id: ownerId, profile_id: profileId, chart_version: 1, schema_version: "bazi-facts-v1",
  engine_version: "product-31", ruleset: facts.ruleset, birth_fingerprint: "x", facts, is_current: true,
  created_at: "2026-11-03T00:00:00.000Z", updated_at: "2026-11-03T00:00:00.000Z",
};
const conversation = { id: conversationId, owner_id: ownerId, profile_id: profileId, chart_id: chartId, title: "事业咨询", status: "active", last_message_at: "2026-11-03T01:00:01.000Z", created_at: "2026-11-03T01:00:00.000Z", updated_at: "2026-11-03T01:00:01.000Z" };
const answer = {
  answer: {
    conclusion: "先验证机会。", modernExplanation: "当前需要保留缓冲。",
    zipingReasoning: [{ claim: "日主偏弱", explanation: "承压能力需要资源支持。", factRefs: ["strength.label"] }],
    suggestions: ["核实合同"], uncertainties: ["现实条件仍需确认"], followUpQuestions: [],
  },
  clientSummary: {}, reportUpdate: {},
};
const messages = [
  { id: "55555555-5555-4555-8555-555555555555", owner_id: ownerId, profile_id: profileId, conversation_id: conversationId, chart_id: chartId, role: "user", status: "complete", content: "新工作是否合适？", structured_content: { questionType: "事业" }, fact_refs: [], idempotency_key: null, error_code: null, created_at: "2026-11-03T01:00:00.000Z", updated_at: "2026-11-03T01:00:00.000Z" },
  { id: "66666666-6666-4666-8666-666666666666", owner_id: ownerId, profile_id: profileId, conversation_id: conversationId, chart_id: chartId, role: "assistant", status: "complete", content: "先验证机会。", structured_content: answer, fact_refs: ["strength.label"], idempotency_key: null, error_code: null, created_at: "2026-11-03T01:00:01.000Z", updated_at: "2026-11-03T01:00:01.000Z" },
];
const summary = { id: "77777777-7777-4777-8777-777777777777", owner_id: ownerId, profile_id: profileId, content: { coreTopics: ["事业"], confirmedContext: ["正在考虑新工作"], keyConclusions: [], decisionsAndOutcomes: [], openQuestions: ["合同条件"], riskNotes: [] }, version: 1, last_consulted_at: "2026-11-03T01:00:01.000Z" };
const report = { id: "88888888-8888-4888-8888-888888888888", owner_id: ownerId, profile_id: profileId, report_core: { items: [{ id: "career", topic: "事业", conclusion: "先验证再决定。", factRefs: ["strength.label"], status: "active" }], latestSummary: "事业机会需要验证。" }, report_version: 1, format_version: "mingli-report-v1", storage_path: null, status: "stale", generated_at: null, created_at: "2026-11-03T01:00:01.000Z", updated_at: "2026-11-03T01:00:01.000Z" };

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

async function mockReportCloud(route) {
  const request = route.request();
  const url = new URL(request.url());
  const pathname = url.pathname.replace(/^\/api\/supabase/, "");
  const method = request.method();
  if (pathname === "/functions/v1/auth-login") return json(route, { access_token: "token", refresh_token: "refresh", expires_in: 3600, user: { id: ownerId } });
  if (pathname === "/rest/v1/profiles" && method === "GET") return json(route, [profile]);
  if (pathname === "/rest/v1/bazi_charts" && method === "GET") return json(route, [chart]);
  if (pathname === "/rest/v1/client_summaries" && method === "GET") return json(route, [summary]);
  if (pathname === "/rest/v1/reports" && method === "GET") return json(route, [report]);
  if (pathname === "/rest/v1/conversations" && method === "GET") return json(route, [conversation]);
  if (pathname === "/rest/v1/messages" && method === "GET") return json(route, messages);
  if (pathname === "/rest/v1/user_settings" && method === "GET") return json(route, [{ owner_id: ownerId, current_profile_id: profileId }]);
  if (pathname === "/rest/v1/user_settings" && method === "POST") return json(route, [request.postDataJSON()]);
  if (pathname === "/rest/v1/rpc/save_current_chart") return json(route, [{ chart_id: chartId, reused: true }]);
  if (pathname.startsWith("/storage/v1/object/reports/") && method === "POST") {
    storageWrites.push({ path: pathname, headers: request.headers(), size: request.postDataBuffer()?.length || 0 });
    return json(route, { Key: pathname });
  }
  if (pathname === "/rest/v1/reports" && method === "POST") {
    reportWrites.push(request.postDataJSON());
    return json(route, [request.postDataJSON()], 201);
  }
  if (pathname === "/functions/v1/report-restore") {
    restoreRequests.push(request.postDataJSON());
    return json(route, { restored: 1, skipped: 0, profileIds: [profileId] });
  }
  return json(route, []);
}

async function verifyMobileZipFlow(browserType, launchOptions, contextOptions, name) {
  const deviceBrowser = await browserType.launch({ headless: true, ...launchOptions });
  try {
    const page = await deviceBrowser.newPage(contextOptions);
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.route("https://resonant-brioche-af680c.netlify.app/api/supabase/**", mockReportCloud);
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.locator("#loginAccount").fill("mobile-report-test");
    await page.locator("#loginPassword").fill("mobile-report-test");
    await page.locator("#loginSubmit").tap();
    await page.locator("#businessApp").waitFor({ state: "visible" });
    await page.locator('[data-home-view="report"]').tap();

    const zipBytes = await page.evaluate(async (id) => {
      const pkg = await window.MingliReportClient.buildProfilePackage(id);
      return [...pkg.zip];
    }, profileId);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("#saveCurrentReport").tap(),
    ]);
    assert.match(download.suggestedFilename(), /^北京-本人报告测试-1990-01-02-命理分析报告\.zip$/);

    await page.locator('[data-go="mine"]').last().tap();
    const restoreCountBeforePreview = restoreRequests.length;
    await page.locator("#backupFileInput").setInputFiles({
      name: "北京-本人报告测试-1990-01-02-命理分析报告.zip",
      mimeType: "application/zip",
      buffer: Buffer.from(zipBytes),
    });
    await page.locator("#reportImportModal").waitFor({ state: "visible" });
    await page.locator("#reportImportStatus").waitFor({ state: "visible" });
    assert.match(await page.locator("#reportImportStatus").textContent(), /已验证 1 份档案/);
    assert.match(await page.locator("#reportImportPreview").innerText(), /本人报告测试/);
    assert.equal(await page.locator("#confirmReportImport").isEnabled(), true);
    assert.equal(restoreRequests.length, restoreCountBeforePreview, "导入预览不得写入云端");
    assert.deepEqual(pageErrors, [], `${name} 页面脚本报错`);
    checks.push({ name: `${name} 报告 ZIP 下载与导入预览`, ok: true });
  } catch (error) {
    checks.push({ name: `${name} 报告 ZIP 下载与导入预览`, ok: false, error });
  } finally {
    await deviceBrowser.close();
  }
}

const server = spawn(process.execPath, ["tools/dev-server.mjs"], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: "ignore" });
let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("https://resonant-brioche-af680c.netlify.app/api/supabase/**", mockReportCloud);

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.locator("#loginAccount").fill("report-test");
  await page.locator("#loginPassword").fill("report-test");
  await page.locator("#loginSubmit").click();
  await page.locator("#businessApp").waitFor({ state: "visible" });
  const packageInfo = await page.evaluate(async (id) => {
    const pkg = await window.MingliReportClient.buildProfilePackage(id);
    const entries = window.MingliReportUtils.readZip(pkg.zip);
    const jsonName = [...entries.keys()].find((name) => name.endsWith("恢复数据.json"));
    const recovery = JSON.parse(window.MingliReportUtils.decoder.decode(entries.get(jsonName)));
    await window.MingliReportClient.validateRecoveryData(recovery);
    return {
      pdfPrefix: window.MingliReportUtils.decoder.decode(pkg.pdf.slice(0, 8)),
      pdfSuffix: window.MingliReportUtils.decoder.decode(pkg.pdf.slice(-8)),
      pdfSize: pkg.pdf.length,
      zipNames: [...entries.keys()],
      recovery,
      base: pkg.base,
      relationItems: pkg.presentation.sections.find((section) => section.title === "关系与岁运")?.items || [],
    };
  }, profileId);
  assert.match(packageInfo.pdfPrefix, /^%PDF-1\.4/);
  assert.match(packageInfo.pdfSuffix, /%%EOF$/);
  assert.ok(packageInfo.pdfSize > 20_000, "PDF 应包含实际报告页面图像");
  assert.equal(packageInfo.zipNames.filter((name) => name.endsWith(".pdf")).length, 1);
  assert.equal(packageInfo.zipNames.filter((name) => name.endsWith("恢复数据.json")).length, 1);
  assert.equal(packageInfo.recovery.profile.name, profile.name);
  assert.equal(packageInfo.recovery.currentChart.facts.schemaVersion, "bazi-facts-v1");
  assert.equal(packageInfo.recovery.conversations.length, 1);
  assert.equal(packageInfo.recovery.messages.length, 2);
  assert.doesNotMatch(JSON.stringify(packageInfo.recovery), /access_token|refresh_token|DEEPSEEK_API_KEY|service_role/i);
  assert.equal(packageInfo.base, "北京-本人报告测试-1990-01-02-命理分析报告");
  assert.deepEqual(packageInfo.relationItems.map((item) => item.label), ["卯酉六冲", "午未六合"]);
  assert.match(packageInfo.relationItems[0].text, /涉及月柱、时柱：地支相冲/);
  assert.match(packageInfo.relationItems[1].text, /当前大运（大运）、当前流年（流年）/);
  assert.doesNotMatch(JSON.stringify(packageInfo.relationItems), /\"sources\"|\"members\"|\"scope\"/);

  await page.evaluate((id) => window.MingliReportClient.refreshProfileReport(id), profileId);
  assert.equal(storageWrites.length, 1);
  assert.match(storageWrites[0].path, new RegExp(`${ownerId}/${profileId}/current-report\\.pdf$`));
  assert.equal(storageWrites[0].headers["x-upsert"], "true");
  assert.ok(storageWrites[0].size > 20_000);
  assert.equal(reportWrites.length, 1);
  assert.equal(reportWrites[0].status, "ready");
  assert.equal(reportWrites[0].storage_path, `${ownerId}/${profileId}/current-report.pdf`);

  const corruptRejected = await page.evaluate(async (id) => {
    const pkg = await window.MingliReportClient.buildProfilePackage(id);
    pkg.zip[Math.floor(pkg.zip.length / 3)] ^= 0xff;
    try {
      await window.MingliReportClient.inspectImportZip(pkg.zip.buffer);
      return false;
    } catch {
      return true;
    }
  }, profileId);
  assert.equal(corruptRejected, true);
  assert.deepEqual(pageErrors, []);
  checks.push({ name: "浏览器生成可解析 PDF、ZIP、恢复 JSON并覆盖云端当前报告", ok: true });
  checks.push({ name: "损坏 ZIP 会在导入写库前被拒绝", ok: true });
  await verifyMobileZipFlow(
    chromium,
    { executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" },
    { ...devices["Pixel 5"] },
    "Pixel 5 Android Chrome 参数",
  );
  await verifyMobileZipFlow(
    webkit,
    {},
    { ...devices["iPhone 13"] },
    "iPhone 13 WebKit 参数",
  );
} catch (error) {
  checks.push({ name: "浏览器报告与 ZIP 端到端", ok: false, error });
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
else console.log(`\n${checks.length} stage-six checks passed.`);
