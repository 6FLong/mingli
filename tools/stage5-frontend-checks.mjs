import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const consultationUiSource = fs.readFileSync(path.join(root, "consultation-ui.js"), "utf8");
const bundledModules =
  process.env.CODEX_NODE_MODULES ||
  "C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
const require = createRequire(path.join(bundledModules, "package.json"));
const { chromium, devices, webkit } = require("playwright");
const port = 4185;
const baseUrl = `http://127.0.0.1:${port}/`;
const ownerId = "11111111-1111-4111-8111-111111111111";
const profileOne = "22222222-2222-4222-8222-222222222222";
const profileTwo = "33333333-3333-4333-8333-333333333333";
const conversationId = "44444444-4444-4444-8444-444444444444";
const chartId = "55555555-5555-4555-8555-555555555555";
const desktopState = { answered: false, payloads: [], delayedMessageReads: 3 };

const profiles = [
  {
    id: profileOne,
    owner_id: ownerId,
    name: "甲档案",
    gender: "male",
    calendar_type: "solar",
    birth_date: "1990-01-02",
    birth_time: "10:30:00",
    birth_time_known: true,
    lunar_leap_month: false,
    birth_place: "北京",
    birth_longitude: 116.4,
    relation: "本人",
    is_self: true,
    note: "",
    last_consulted_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: profileTwo,
    owner_id: ownerId,
    name: "乙档案",
    gender: "female",
    calendar_type: "solar",
    birth_date: "1992-03-04",
    birth_time: "14:00:00",
    birth_time_known: true,
    lunar_leap_month: false,
    birth_place: "上海",
    birth_longitude: 121.47,
    relation: "客户",
    is_self: false,
    note: "",
    last_consulted_at: null,
    created_at: "2026-02-01T00:00:00.000Z",
    updated_at: "2026-02-01T00:00:00.000Z",
  },
];

const aiResult = {
  answer: {
    conclusion: "可以考虑机会，但先核实岗位条件。",
    modernExplanation: "当前更适合先验证，再决定是否切换。",
    zipingReasoning: [
      { claim: "日主承压时要留缓冲", explanation: "以程序给出的旺衰为依据。", factRefs: ["strength.label"] },
    ],
    suggestions: ["先确认薪资和试用期"],
    uncertainties: ["公司真实资源仍需现实核实"],
  },
  clientSummary: {
    coreTopics: ["事业"], confirmedContext: [], keyConclusions: [], decisionsAndOutcomes: [], openQuestions: [], riskNotes: [],
  },
  reportUpdate: { summary: "事业咨询", replaceOutdatedContent: [], reportCoreUpdate: { upsert: [], invalidate: [] } },
};

const messages = [
  {
    id: "66666666-6666-4666-8666-666666666666",
    profile_id: profileOne,
    conversation_id: conversationId,
    chart_id: chartId,
    role: "user",
    status: "complete",
    content: "我有一个新工作机会，适合接受吗？",
    structured_content: { questionType: "自定义" },
    fact_refs: [],
    idempotency_key: "q:test-request-key-1234",
    error_code: null,
    created_at: "2026-11-03T01:00:00.000Z",
    updated_at: "2026-11-03T01:00:00.000Z",
  },
  {
    id: "77777777-7777-4777-8777-777777777777",
    profile_id: profileOne,
    conversation_id: conversationId,
    chart_id: chartId,
    role: "assistant",
    status: "complete",
    content: aiResult.answer.conclusion,
    structured_content: aiResult,
    fact_refs: ["strength.label"],
    idempotency_key: "a:test-request-key-1234",
    error_code: null,
    created_at: "2026-11-03T01:00:01.000Z",
    updated_at: "2026-11-03T01:00:01.000Z",
  },
];

function json(route, body, status = 200) {
  return route.fulfill({ status, contentType: "application/json; charset=utf-8", body: JSON.stringify(body) });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      if ((await fetch(baseUrl)).ok) return;
    } catch {
      // Wait for local server.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("本地测试服务器未启动");
}

async function mockAiCloud(route, state) {
  const request = route.request();
  const url = new URL(request.url());
  const pathname = url.pathname.replace(/^\/api\/supabase/, "");
  const method = request.method();
  if (pathname === "/functions/v1/auth-login") {
    return json(route, { access_token: "test-token", refresh_token: "test-refresh", expires_in: 3600, user: { id: ownerId } });
  }
  if (pathname === "/rest/v1/profiles" && method === "GET") return json(route, profiles);
  if (pathname === "/rest/v1/user_settings" && method === "GET") {
    return json(route, [{ owner_id: ownerId, current_profile_id: profileOne, last_consulted_profile_id: null, preferences: {} }]);
  }
  if (pathname === "/rest/v1/user_settings" && method === "POST") return json(route, [request.postDataJSON()]);
  if (pathname === "/rest/v1/rpc/save_current_chart") return json(route, [{ chart_id: chartId, chart_version: 1, reused: true }]);
  if (pathname === "/rest/v1/conversations" && method === "GET") {
    const filter = url.searchParams.get("profile_id");
    if (filter === `eq.${profileOne}` && state.answered) {
      return json(route, [{ id: conversationId, profile_id: profileOne, chart_id: chartId, title: "新工作机会", status: "active", last_message_at: "2026-11-03T01:00:01.000Z", created_at: "2026-11-03T01:00:00.000Z" }]);
    }
    return json(route, []);
  }
  if (pathname === "/rest/v1/messages" && method === "GET") {
    if (state.processingMode && state.payloads.length === 1 && Number(state.processingReads || 0) > 0) {
      state.processingReads -= 1;
      return json(route, [messages[0], { ...messages[1], status: "processing", structured_content: null, content: "" }]);
    }
    if (state.answered && Number(state.delayedMessageReads || 0) > 0) {
      state.delayedMessageReads -= 1;
      return json(route, []);
    }
    return json(route, state.answered ? messages : []);
  }
  if (pathname === "/functions/v1/ai-consult") {
    state.payloads.push(request.postDataJSON());
    state.answered = true;
    if (state.processingMode && state.payloads.length === 1) {
      return json(route, { conversationId, assistantMessageId: messages[1].id, status: "processing", reused: true }, 202);
    }
    return json(route, { conversationId, assistantMessageId: messages[1].id, status: "complete", result: aiResult, consultedAt: "2026-11-03T01:00:01.000Z", reused: false });
  }
  if (pathname === "/rest/v1/profiles" && ["POST", "PATCH", "DELETE"].includes(method)) return json(route, []);
  return json(route, []);
}

async function verifyMobileConsultFlow(browserType, launchOptions, contextOptions, name) {
  const state = { answered: false, payloads: [], processingMode: name.includes("iPhone"), processingReads: 2 };
  const deviceBrowser = await browserType.launch({ headless: true, ...launchOptions });
  try {
    const page = await deviceBrowser.newPage(contextOptions);
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.route("https://resonant-brioche-af680c.netlify.app/api/supabase/**", (route) => mockAiCloud(route, state));
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.locator("#loginAccount").fill("mobile-consult-test");
    await page.locator("#loginPassword").fill("mobile-consult-test");
    await page.locator("#loginSubmit").tap();
    await page.locator("#businessApp").waitFor({ state: "visible" });
    await page.locator("#recentQuestionList .chat-empty").waitFor({ state: "visible" });

    const firstQuestion = "我有一个新工作机会，适合接受吗？";
    await page.locator("#questionText").fill(firstQuestion);
    await page.locator("#generateResult").tap();
    for (let attempt = 0; attempt < 50 && state.payloads.length < 1; attempt += 1) {
      await page.waitForTimeout(100);
    }
    if (state.payloads.length < 1) {
      const diagnostics = await page.evaluate(() => ({
        buttonDisabled: document.querySelector("#generateResult")?.disabled,
        buttonText: document.querySelector("#generateResult")?.textContent,
        question: document.querySelector("#questionText")?.value,
        profile: document.querySelector("[data-current-profile-name]")?.textContent,
      }));
      throw new Error(`${name} 未提交第一条问题：${JSON.stringify(diagnostics)}`);
    }
    await page.locator(".chat-message.is-assistant.status-complete").waitFor({ state: "visible" });
    assert.equal(state.payloads[0].profileId, profileOne);
    assert.equal(state.payloads[0].conversationId, null);
    assert.equal(state.payloads[0].question, firstQuestion);

    const followUp = "我最应该先核实哪一项？";
    await page.locator("#questionText").fill(followUp);
    await page.locator("#generateResult").tap();
    for (let attempt = 0; attempt < 50 && state.payloads.length < 2; attempt += 1) {
      await page.waitForTimeout(100);
    }
    assert.equal(state.payloads.length, 2);
    assert.equal(state.payloads[1].conversationId, conversationId);
    assert.equal(state.payloads[1].question, followUp);
    assert.deepEqual(pageErrors, [], `${name} 页面脚本报错`);
    console.log(`OK ${name} 自定义问题与同会话连续追问`);
  } finally {
    await deviceBrowser.close();
  }
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

  await page.route("https://resonant-brioche-af680c.netlify.app/api/supabase/**", (route) => mockAiCloud(route, desktopState));

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.locator("#loginAccount").fill("frontend-test");
  await page.locator("#loginPassword").fill("frontend-test");
  await page.locator("#loginSubmit").click();
  await page.locator("#businessApp").waitFor({ state: "visible" });
  await page.locator("#recentQuestionList .chat-empty").waitFor({ state: "visible" });
  assert.match(await page.locator("#recentQuestionList .chat-empty").innerText(), /还没有咨询记录/);

  await page.locator('[data-go="profiles"]').last().click();
  await page.locator("#archiveList .archive-card").first().waitFor({ state: "visible" });
  const archiveLayout = await page.locator("#archiveList .archive-card").evaluateAll((cards) => cards.map((card) => {
    const cardRect = card.getBoundingClientRect();
    const mainRect = card.querySelector(".archive-card-main").getBoundingClientRect();
    const moreRect = card.querySelector(".archive-more").getBoundingClientRect();
    return {
      mainInside: mainRect.left >= cardRect.left && mainRect.right <= cardRect.right,
      moreInside: moreRect.left >= cardRect.left && moreRect.right <= cardRect.right,
      moreWidth: moreRect.width,
      mainBackground: getComputedStyle(card.querySelector(".archive-card-main")).backgroundColor,
    };
  }));
  assert.ok(archiveLayout.every((item) => item.mainInside && item.moreInside && Math.abs(item.moreWidth - 44) <= 1));
  assert.ok(archiveLayout.every((item) => item.mainBackground === "rgba(0, 0, 0, 0)"));
  await page.locator('[data-go="home"]').last().click();

  const careerDimension = page.locator('#questionChips [data-question-type="事业"]');
  await careerDimension.click();
  assert.equal(await page.locator("#questionText").inputValue(), "请分析我的工作方向、职业变化和事业发展趋势。");
  assert.equal(await careerDimension.evaluate((element) => element.classList.contains("is-selected")), true);

  const question = "我有一个新工作机会，适合接受吗？";
  await page.locator("#questionText").fill(question);
  await page.locator("#generateResult").click();
  await page.locator(".chat-message.is-assistant.status-complete").waitFor({ state: "visible" });
  assert.ok(desktopState.delayedMessageReads > 0, "回答展示不应等待云端消息列表同步完成");
  const sentPayload = desktopState.payloads[0];
  assert.equal(sentPayload.profileId, profileOne);
  assert.equal(sentPayload.conversationId, null);
  assert.equal(sentPayload.question, question);
  assert.equal(sentPayload.questionType, "自定义");
  assert.match(sentPayload.idempotencyKey, /^[0-9a-f-]{36}$/);

  const answer = page.locator(".chat-message.is-assistant");
  const answerText = await answer.innerText();
  assert.match(answerText, /可以考虑机会，但先核实岗位条件/);
  assert.match(answerText, /当前更适合先验证/);
  assert.match(answerText, /详细解释/);
  assert.doesNotMatch(answerText, /直接回答|现代解释|可以继续追问/);
  assert.equal(await answer.locator(".chat-answer-details").evaluate((element) => element.open), false);
  await answer.locator(".chat-answer-details > summary").click();
  const detailText = await answer.locator(".chat-answer-detail-content").innerText();
  for (const expected of ["为什么这样看", "接下来怎么做", "还要留意"]) assert.match(detailText, new RegExp(expected));
  assert.doesNotMatch(detailText, /strength\.label|可以继续追问/);
  assert.equal(await page.locator("#questionText").inputValue(), "");
  assert.doesNotMatch(consultationUiSource, /分析已保存到云端/);
  assert.ok(consultationUiSource.indexOf("showReturnedAnswer(response") < consultationUiSource.indexOf("syncCompletedAnswerInBackground(response"));

  if (process.env.MINGLI_CAPTURE_VISUALS === "YES") {
    const artifacts = path.join(root, "tools", ".artifacts");
    fs.mkdirSync(artifacts, { recursive: true });
    await page.waitForTimeout(1900);
    await page.screenshot({ path: path.join(artifacts, "product42-home.png"), fullPage: false });
    await page.locator('[data-go="profiles"]').last().click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(artifacts, "product42-profiles.png"), fullPage: false });
    await page.locator('[data-go="mine"]').last().click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(artifacts, "product42-mine.png"), fullPage: false });
    await page.locator('[data-go="home"]').last().click();
  }

  await page.locator("[data-open-profile-picker]").click();
  await page.locator(`#profilePickerList [data-pick-profile][data-profile-id="${profileTwo}"]`).click();
  await page.locator("#recentQuestionList .chat-empty").waitFor({ state: "visible" });
  assert.match(await page.locator("#recentQuestionList .chat-empty").innerText(), /还没有咨询记录/);
  assert.equal(await page.locator(".chat-message").count(), 0, "切换档案后不得残留上一档案消息");
  assert.deepEqual(pageErrors, []);

  await verifyMobileConsultFlow(
    chromium,
    { executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" },
    { ...devices["Pixel 5"] },
    "Pixel 5 Android Chrome 参数",
  );
  await verifyMobileConsultFlow(
    webkit,
    {},
    { ...devices["iPhone 13"] },
    "iPhone 13 WebKit 参数",
  );

  console.log("OK 首次咨询使用当前档案和自定义问题调用云端 AI");
  console.log("OK AI 回答按固定学习结构展示并保存为连续会话");
  console.log("OK 成功后清空已发送问题且不会重复提交");
  console.log("OK 切换档案立即清空上一档案消息和上下文");
  console.log("\n6 stage-five frontend checks passed.");
} finally {
  await browser?.close().catch(() => undefined);
  server.kill();
}
