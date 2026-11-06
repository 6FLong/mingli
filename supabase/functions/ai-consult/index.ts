import { ApiError, authenticateAdministrator } from "../_shared/admin.ts";
import { collectFactRefs, mergeReportCore, validateAiResult, validateDirectionalAnswer } from "../_shared/ai-contract.ts";
import { corsHeaders, isAllowedOrigin, jsonResponse } from "../_shared/http.ts";
import { serviceRequest, supabaseEnvironment } from "../_shared/supabase.ts";

const MAX_REQUEST_BYTES = 16 * 1024;
const MAX_QUESTION_LENGTH = 2000;
const CONTEXT_CHARACTER_BUDGET = 7000;
const DEEPSEEK_TIMEOUT_MS = 65_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SYSTEM_PROMPT = `你是依据陈园编著、邵伟华审订《四柱预测学》所采用子平法口径工作的咨询分析助手。

程序提供的 bazi-facts-v1 是唯一命理事实来源。
你不得重新排盘、重新计算节气、干支、十神、旺衰、格局、用神或刑冲合害。
你不得修改、纠正或补充结构化事实中不存在的命理条件。
你不得混入神煞、纳音、生肖、紫微斗数、西方占星或其他体系。

先用朋友之间自然、坦率的现代口语正面回答当前问题，再解释指定《四柱预测学》口径下的子平依据。语气温和但不官腔，不写咨询报告式套话。
对于“能不能、会不会、是否、成功吗、能录取吗、该不该”等结果型或选择型问题，conclusion 第一句必须直接给出清晰倾向，例如“这次更可能能成”“这件事目前不建议做”“这份工作值得争取”，不能用“需要综合判断”“存在机会”“建议结合实际”“从命理角度看”等空话开场或回避。
命理只能提供趋势而不能保证现实结果，因此可以使用“更可能、倾向、把握较大/较小”等有方向但不绝对的表达；随后明确说明哪些现实行动会提高或降低成功概率。
如果用户问明天面试能否成功，而 bazi-facts-v1 只有流年、没有流月流日，仍要先回答整体倾向，再明确“无法仅凭当前事实精确断定明天”，不能自行补算明日干支。
conclusion 只写一句到两句，建议 20 至 70 个汉字；modernExplanation 只补充一小段，建议 50 至 160 个汉字。两者不得重复，不要长篇铺垫。
现代解释、子平依据、建议和不确定性都必须说普通人听得懂的话；必要的专业名词要紧跟一句通俗解释，不得只复述身强、十神、格局、用神等术语。
不要替用户设计或推荐下一条问题，不输出“你还可以问”“建议继续追问”等内容。
每条命理判断必须引用真实存在的 factRefs。
证据不足时明确说明不能确定，并指出需要补充的信息。
时间类问题必须以 temporalContext.currentDateBeijing 为起点，只讨论从当前日期往后的窗口，不得把已经过去的年份或时段写成未来建议。
只能使用 baziFacts 已提供的时间层级；没有流月、流日事实时，不得自行补算月份、日期或承诺具体入职时间，应明确当前只能判断到流年或阶段。
健康、生育、法律和投资问题只能给风险提醒，不能代替专业意见或作确定承诺。
当前问题不属于健康、生育、法律或投资时，不要添加这些领域的无关免责声明。
回答必须符合指定 JSON 格式，不输出 JSON 之外的文字。`;

const OUTPUT_CONTRACT = {
  answer: {
    conclusion: "20至70字，第一句直接回答，语气自然",
    modernExplanation: "50至160字，只补充最重要的现实含义，不重复结论",
    zipingReasoning: [{ claim: "普通人能懂的一条判断", explanation: "用人话解释为什么支持该判断", factRefs: ["strength.label"] }],
    suggestions: ["简短、可执行的现实建议"],
    uncertainties: ["只有确实影响结论时才写的边界"],
  },
  clientSummary: {
    coreTopics: [],
    confirmedContext: [],
    keyConclusions: [],
    decisionsAndOutcomes: [],
    openQuestions: [],
    riskNotes: [],
    lastConsultedAt: "服务端会覆盖此时间",
  },
  reportUpdate: {
    summary: "本次咨询后写入唯一报告的精简摘要",
    replaceOutdatedContent: [],
    reportCoreUpdate: {
      upsert: [{ id: "稳定短标识", topic: "主题", conclusion: "核心结论", factRefs: ["strength.label"] }],
      invalidate: [],
    },
  },
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function serviceJson(
  environment: ReturnType<typeof supabaseEnvironment>,
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const response = await serviceRequest(environment, path, init);
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) throw new ApiError(500, "cloud_write_failed", `云端操作失败：${response.status}`);
  return body;
}

function firstRow(value: unknown): JsonRecord | null {
  return Array.isArray(value) && isRecord(value[0]) ? value[0] : null;
}

function redactIdentity(value: unknown, identityValues: string[]): unknown {
  if (typeof value === "string") {
    return identityValues.reduce(
      (text, identity) => (identity.length >= 2 ? text.split(identity).join("当事人") : text),
      value,
    );
  }
  if (Array.isArray(value)) return value.map((item) => redactIdentity(item, identityValues));
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactIdentity(item, identityValues)]));
  }
  return value;
}

function factsForAi(facts: JsonRecord): JsonRecord {
  const copy = structuredClone(facts);
  if (isRecord(copy.subject)) delete copy.subject.profileId;
  return copy;
}

function currentBeijingTemporalContext(now = new Date()): JsonRecord {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
  const currentDateBeijing = `${parts.year}-${parts.month}-${parts.day}`;
  return {
    timeZone: "Asia/Shanghai",
    currentDateBeijing,
    currentDateTimeBeijing: `${currentDateBeijing} ${parts.hour}:${parts.minute}`,
    direction: "只判断从当前北京时间往后的窗口，不把过去时段当作未来建议",
    precision: "只使用 bazi-facts-v1 已提供的流年层级；没有流月、流日事实时不得自行补算月份或日期",
  };
}

function relevantHistory(
  rows: JsonRecord[],
  conversationId: string,
  question: string,
  identityValues: string[],
): JsonRecord[] {
  const keywords = [...new Set(question.match(/[\p{Script=Han}]{2,6}/gu) || [])].slice(0, 20);
  const ranked = rows
    .filter((row) => row.status === "complete" && (row.role === "user" || row.role === "assistant"))
    .map((row, index) => {
      const structured = isRecord(row.structured_content) && isRecord(row.structured_content.answer)
        ? row.structured_content.answer
        : null;
      const content = structured
        ? [structured.conclusion, structured.modernExplanation].filter(Boolean).join("\n")
        : String(row.content || "");
      const keywordScore = keywords.reduce((score, keyword) => score + (content.includes(keyword) ? 2 : 0), 0);
      return {
        row,
        content,
        score: (row.conversation_id === conversationId ? 20 : 0) + keywordScore + Math.max(0, 8 - index / 10),
      };
    })
    .sort((a, b) => b.score - a.score);

  const selected: JsonRecord[] = [];
  let used = 0;
  for (const item of ranked) {
    const content = String(redactIdentity(item.content, identityValues)).slice(0, 1800);
    if (!content || used + content.length > CONTEXT_CHARACTER_BUDGET) continue;
    selected.push({
      role: item.row.role,
      content,
      createdAt: item.row.created_at,
      currentConversation: item.row.conversation_id === conversationId,
    });
    used += content.length;
  }
  return selected.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

function parseDeepSeekContent(value: unknown): JsonRecord {
  const text = String(value || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(text);
  if (!isRecord(parsed)) throw new Error("DeepSeek did not return an object");
  return parsed;
}

async function callDeepSeek(messages: JsonRecord[]): Promise<JsonRecord> {
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY") || "";
  if (!apiKey) throw new ApiError(503, "ai_not_configured", "AI 服务尚未配置");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEEPSEEK_TIMEOUT_MS);
  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("DEEPSEEK_MODEL") || "deepseek-chat",
        messages,
        temperature: 0.2,
        max_tokens: 5000,
        response_format: { type: "json_object" },
      }),
    });
    if (!response.ok) {
      const code = response.status === 429 ? "ai_rate_limited" : "ai_upstream_failed";
      throw new ApiError(response.status === 429 ? 429 : 502, code, "AI 服务暂时不可用，请稍后重试");
    }
    const payload = await response.json();
    return parseDeepSeekContent(payload?.choices?.[0]?.message?.content);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(504, "ai_timeout", "分析时间过长，请重试");
    }
    throw new ApiError(502, "ai_invalid_response", "AI 返回内容无法读取，请重试");
  } finally {
    clearTimeout(timeout);
  }
}

async function markFailed(
  environment: ReturnType<typeof supabaseEnvironment>,
  ownerId: string,
  assistantMessageId: string,
  code: string,
): Promise<void> {
  await serviceJson(environment, "/rest/v1/rpc/fail_ai_consult", {
    method: "POST",
    body: JSON.stringify({
      target_owner_id: ownerId,
      target_assistant_message_id: assistantMessageId,
      target_error_code: code,
    }),
  }).catch(() => undefined);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return jsonResponse(request, 405, { error: "method_not_allowed" });
  if (!isAllowedOrigin(request)) return jsonResponse(request, 403, { error: "origin_not_allowed" });
  if (Number(request.headers.get("content-length") || 0) > MAX_REQUEST_BYTES) {
    return jsonResponse(request, 413, { error: "request_too_large" });
  }

  const environment = supabaseEnvironment();
  let assistantMessageId = "";
  let ownerId = "";
  try {
    const admin = await authenticateAdministrator(request, environment);
    ownerId = admin.id;
    const payload = await request.json();
    const profileId = String(payload?.profileId || "");
    const conversationId = payload?.conversationId ? String(payload.conversationId) : null;
    const question = String(payload?.question || "").trim();
    const questionType = String(payload?.questionType || "自定义").trim().slice(0, 40) || "自定义";
    const requestKey = String(payload?.idempotencyKey || "");
    if (!UUID_PATTERN.test(profileId) || (conversationId && !UUID_PATTERN.test(conversationId))) {
      throw new ApiError(400, "invalid_profile", "档案或会话无效");
    }
    if (!question || question.length > MAX_QUESTION_LENGTH) {
      throw new ApiError(400, "invalid_question", "问题长度需要在 1 到 2000 个字符之间");
    }
    if (!/^[A-Za-z0-9_-]{16,96}$/.test(requestKey)) {
      throw new ApiError(400, "invalid_idempotency_key", "请求标识无效");
    }

    const profileParams = new URLSearchParams({
      id: `eq.${profileId}`,
      owner_id: `eq.${ownerId}`,
      select: "id,name,gender,relation,birth_time_known,birth_place",
      limit: "1",
    });
    const chartParams = new URLSearchParams({
      profile_id: `eq.${profileId}`,
      owner_id: `eq.${ownerId}`,
      is_current: "eq.true",
      schema_version: "eq.bazi-facts-v1",
      select: "id,facts,engine_version,ruleset",
      limit: "1",
    });
    const [profileRows, chartRows] = await Promise.all([
      serviceJson(environment, `/rest/v1/profiles?${profileParams}`),
      serviceJson(environment, `/rest/v1/bazi_charts?${chartParams}`),
    ]);
    const profile = firstRow(profileRows);
    const chart = firstRow(chartRows);
    if (!profile) throw new ApiError(404, "profile_not_found", "档案不存在");
    if (!chart || !isRecord(chart.facts)) throw new ApiError(409, "chart_required", "请先完成当前档案排盘");
    const facts = factsForAi(chart.facts);

    const start = await serviceJson(environment, "/rest/v1/rpc/start_ai_consult", {
      method: "POST",
      body: JSON.stringify({
        target_owner_id: ownerId,
        target_profile_id: profileId,
        target_chart_id: chart.id,
        target_conversation_id: conversationId,
        target_question: question,
        target_question_type: questionType,
        target_request_key: requestKey,
      }),
    });
    if (!isRecord(start)) throw new ApiError(500, "consultation_start_failed", "咨询无法开始");
    assistantMessageId = String(start.assistantMessageId || "");
    const activeConversationId = String(start.conversationId || "");
    if (start.reused && start.status === "complete" && isRecord(start.structuredContent)) {
      return jsonResponse(request, 200, {
        conversationId: activeConversationId,
        assistantMessageId,
        status: "complete",
        result: start.structuredContent,
        reused: true,
      });
    }
    if (start.reused && start.status === "processing") {
      return jsonResponse(request, 202, {
        conversationId: activeConversationId,
        assistantMessageId,
        status: "processing",
        reused: true,
      });
    }

    const commonFilters = `owner_id=eq.${encodeURIComponent(ownerId)}&profile_id=eq.${encodeURIComponent(profileId)}`;
    const userMessageId = String(start.userMessageId || "");
    const historyExclusion = userMessageId ? `&id=neq.${encodeURIComponent(userMessageId)}` : "";
    const [summaryRows, reportRows, historyRows] = await Promise.all([
      serviceJson(environment, `/rest/v1/client_summaries?${commonFilters}&select=content,last_consulted_at&limit=1`),
      serviceJson(environment, `/rest/v1/reports?${commonFilters}&select=report_core,status,updated_at&limit=1`),
      serviceJson(
        environment,
        `/rest/v1/messages?${commonFilters}${historyExclusion}&status=eq.complete&select=id,role,content,structured_content,created_at,conversation_id,status&order=created_at.desc&limit=80`,
      ),
    ]);
    const summaryRow = firstRow(summaryRows);
    const reportRow = firstRow(reportRows);
    const identityValues = [String(profile.name || ""), String(profile.birth_place || "")].filter(Boolean);
    const history = relevantHistory(
      Array.isArray(historyRows) ? historyRows.filter(isRecord) : [],
      activeConversationId,
      question,
      identityValues,
    );
    const context: JsonRecord = {
      necessaryProfile: {
        gender: profile.gender,
        relation: profile.relation,
        birthTimeComplete: Boolean(profile.birth_time_known),
      },
      baziFacts: facts,
      temporalContext: currentBeijingTemporalContext(),
      currentQuestion: redactIdentity(question, identityValues),
      questionType,
      outputContract: OUTPUT_CONTRACT,
    };
    if (summaryRow?.content && Object.keys(summaryRow.content as JsonRecord).length) {
      context.clientSummary = redactIdentity(summaryRow.content, identityValues);
    }
    if (reportRow?.report_core && Object.keys(reportRow.report_core as JsonRecord).length) {
      context.reportCore = redactIdentity(reportRow.report_core, identityValues);
    }
    if (history.length) context.relevantHistory = history;

    const riskBoundary = /健康|疾病|怀孕|生育|合同|法律|诉讼|投资|股票|收益|借贷/.test(question)
      ? "当前问题涉及健康、生育、法律或投资风险，必须明确说明不能替代医生、律师或持牌财务专业意见，不作确定承诺。"
      : "";
    const messages: JsonRecord[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: `严格返回以下结构：${JSON.stringify(OUTPUT_CONTRACT)}。${riskBoundary}` },
      { role: "user", content: JSON.stringify(context) },
    ];

    let result = await callDeepSeek(messages);
    let validationErrors = [...validateAiResult(result, facts), ...validateDirectionalAnswer(result, question)];
    if (validationErrors.length) {
      result = await callDeepSeek([
        ...messages,
        {
          role: "system",
          content: `上一次输出未通过服务端校验：${validationErrors.join("；")}。重新生成完整 JSON，不得解释错误，不得引用不存在的事实。`,
        },
      ]);
      validationErrors = [...validateAiResult(result, facts), ...validateDirectionalAnswer(result, question)];
    }
    if (validationErrors.length) {
      throw new ApiError(502, "ai_contract_invalid", "AI 回答没有通过命理事实校验，请重试");
    }

    const cleanedResult = redactIdentity(result, identityValues) as JsonRecord;
    const consultedAt = new Date().toISOString();
    const clientSummary = isRecord(cleanedResult.clientSummary) ? cleanedResult.clientSummary : {};
    clientSummary.lastConsultedAt = consultedAt;
    const reportUpdate = isRecord(cleanedResult.reportUpdate) ? cleanedResult.reportUpdate : {};
    const reportCoreUpdate = isRecord(reportUpdate.reportCoreUpdate) ? reportUpdate.reportCoreUpdate : {};
    const existingReportCore = reportRow?.report_core;
    const reportCore = mergeReportCore(existingReportCore, reportCoreUpdate, consultedAt);
    const factRefs = collectFactRefs(cleanedResult);

    await serviceJson(environment, "/rest/v1/rpc/finalize_ai_consult", {
      method: "POST",
      body: JSON.stringify({
        target_owner_id: ownerId,
        target_profile_id: profileId,
        target_conversation_id: activeConversationId,
        target_chart_id: chart.id,
        target_assistant_message_id: assistantMessageId,
        target_result: cleanedResult,
        target_fact_refs: factRefs,
        target_client_summary: clientSummary,
        target_report_core: reportCore,
        target_report_summary: String(reportUpdate.summary || ""),
        target_consulted_at: consultedAt,
      }),
    });

    return jsonResponse(request, 200, {
      conversationId: activeConversationId,
      assistantMessageId,
      status: "complete",
      result: cleanedResult,
      consultedAt,
      reused: false,
    });
  } catch (error) {
    const apiError = error instanceof ApiError
      ? error
      : new ApiError(500, "consultation_failed", "咨询暂时无法完成，请重试");
    if (assistantMessageId && ownerId) await markFailed(environment, ownerId, assistantMessageId, apiError.code);
    return jsonResponse(request, apiError.status, { error: apiError.code, message: apiError.message });
  }
});
