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
const port = 4185;
const baseUrl = `http://127.0.0.1:${port}/`;
const ownerId = "11111111-1111-4111-8111-111111111111";
const profileOne = "22222222-2222-4222-8222-222222222222";
const profileTwo = "33333333-3333-4333-8333-333333333333";
const conversationId = "44444444-4444-4444-8444-444444444444";
const chartId = "55555555-5555-4555-8555-555555555555";
let answered = false;
let sentPayload = null;

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
    followUpQuestions: ["新岗位最吸引你的条件是什么？"],
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
      if (filter === `eq.${profileOne}` && answered) {
        return json(route, [{ id: conversationId, profile_id: profileOne, chart_id: chartId, title: "新工作机会", status: "active", last_message_at: "2026-11-03T01:00:01.000Z", created_at: "2026-11-03T01:00:00.000Z" }]);
      }
      return json(route, []);
    }
    if (pathname === "/rest/v1/messages" && method === "GET") return json(route, answered ? messages : []);
    if (pathname === "/functions/v1/ai-consult") {
      sentPayload = request.postDataJSON();
      answered = true;
      return json(route, { conversationId, assistantMessageId: messages[1].id, status: "complete", result: aiResult, consultedAt: "2026-11-03T01:00:01.000Z", reused: false });
    }
    if (pathname === "/rest/v1/profiles" && ["POST", "PATCH", "DELETE"].includes(method)) return json(route, []);
    return json(route, []);
  });

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.locator("#loginAccount").fill("frontend-test");
  await page.locator("#loginPassword").fill("frontend-test");
  await page.locator("#loginSubmit").click();
  await page.locator("#businessApp").waitFor({ state: "visible" });
  await page.locator("#recentQuestionList .chat-empty").waitFor({ state: "visible" });
  assert.match(await page.locator("#recentQuestionList .chat-empty").innerText(), /还没有咨询记录/);

  const question = "我有一个新工作机会，适合接受吗？";
  await page.locator("#questionText").fill(question);
  await page.locator("#generateResult").click();
  await page.locator(".chat-message.is-assistant.status-complete").waitFor({ state: "visible" });
  assert.equal(sentPayload.profileId, profileOne);
  assert.equal(sentPayload.conversationId, null);
  assert.equal(sentPayload.question, question);
  assert.equal(sentPayload.questionType, "自定义");
  assert.match(sentPayload.idempotencyKey, /^[0-9a-f-]{36}$/);

  const answerText = await page.locator(".chat-message.is-assistant").innerText();
  for (const expected of ["直接回答", "现代解释", "命理依据", "现实建议", "不确定性与边界"]) {
    assert.match(answerText, new RegExp(expected));
  }
  assert.equal(await page.locator("#questionText").inputValue(), "");

  await page.locator("[data-open-profile-picker]").click();
  await page.locator(`#profilePickerList [data-pick-profile][data-profile-id="${profileTwo}"]`).click();
  await page.locator("#recentQuestionList .chat-empty").waitFor({ state: "visible" });
  assert.match(await page.locator("#recentQuestionList .chat-empty").innerText(), /还没有咨询记录/);
  assert.equal(await page.locator(".chat-message").count(), 0, "切换档案后不得残留上一档案消息");
  assert.deepEqual(pageErrors, []);

  console.log("OK 首次咨询使用当前档案和自定义问题调用云端 AI");
  console.log("OK AI 回答按固定学习结构展示并保存为连续会话");
  console.log("OK 成功后清空已发送问题且不会重复提交");
  console.log("OK 切换档案立即清空上一档案消息和上下文");
  console.log("\n4 stage-five frontend checks passed.");
} finally {
  await browser?.close().catch(() => undefined);
  server.kill();
}
