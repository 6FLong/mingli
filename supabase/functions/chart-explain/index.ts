import { ApiError, authenticateAdministrator } from "../_shared/admin.ts";
import { factRefValue } from "../_shared/ai-contract.ts";
import { corsHeaders, isAllowedOrigin, jsonResponse } from "../_shared/http.ts";
import { serviceRequest, supabaseEnvironment } from "../_shared/supabase.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FORBIDDEN_SYSTEMS = ["神煞", "纳音", "生肖", "紫微", "西方占星", "星座"];
const DEEPSEEK_TIMEOUT_MS = 65_000;

type JsonRecord = Record<string, unknown>;

const SYSTEM_PROMPT = `你负责把程序已经计算好的四柱命盘翻译成普通人能懂的现代语言。
唯一事实来源是 bazi-facts-v1。你不负责排盘，不得重新计算或补充任何干支、十神、旺衰、格局、用神、刑冲合害和岁运关系。
只采用陈园编著、邵伟华审订《四柱预测学》对应的子平法口径，不得混入神煞、纳音、生肖、紫微斗数、西方占星或其他体系。
不要写玄虚套话，不要堆术语。每个必要术语后必须立刻用一句生活化语言解释它意味着什么。
这是命盘整体解读，不回答用户尚未提出的具体问题，不做成功率评分，不承诺现实结果。
输出必须是 JSON，不得输出 JSON 以外的文字。`;

const OUTPUT_CONTRACT = {
  headline: "20字以内的人话标题",
  summary: "80至220字的整体说明，直接说性格做事方式、优势、容易卡住的位置和当前阶段",
  tags: ["最多6个、每个不超过10字的人话标签"],
  sections: [
    {
      title: "例如：你做事的底层方式",
      text: "60至180字，只说普通人能理解的实际含义",
      factRefs: ["strength.label"],
    },
  ],
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function serviceJson(environment: ReturnType<typeof supabaseEnvironment>, path: string, init: RequestInit = {}) {
  const response = await serviceRequest(environment, path, init);
  const text = await response.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new ApiError(500, "cloud_write_failed", `云端操作失败：${response.status}`);
  return body;
}

function parseContent(value: unknown): JsonRecord {
  const text = String(value || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(text);
  if (!isRecord(parsed)) throw new Error("AI did not return an object");
  return parsed;
}

function validateInterpretation(value: unknown, facts: JsonRecord): JsonRecord {
  if (!isRecord(value)) throw new ApiError(502, "invalid_ai_result", "AI 解读格式不正确，请重试");
  const headline = String(value.headline || "").trim();
  const summary = String(value.summary || "").trim();
  const tags = Array.isArray(value.tags) ? value.tags.map((item) => String(item || "").trim()) : [];
  const sections = Array.isArray(value.sections) ? value.sections : [];
  if (!headline || headline.length > 60 || !summary || summary.length > 700) {
    throw new ApiError(502, "invalid_ai_result", "AI 解读内容不完整，请重试");
  }
  if (tags.length > 6 || tags.some((item) => !item || item.length > 18)) {
    throw new ApiError(502, "invalid_ai_result", "AI 解读标签不正确，请重试");
  }
  if (sections.length < 3 || sections.length > 6) {
    throw new ApiError(502, "invalid_ai_result", "AI 解读章节不完整，请重试");
  }
  const normalizedSections = sections.map((item, index) => {
    if (!isRecord(item)) throw new ApiError(502, "invalid_ai_result", `AI 解读第 ${index + 1} 节不正确`);
    const title = String(item.title || "").trim();
    const text = String(item.text || "").trim();
    const factRefs = Array.isArray(item.factRefs) ? item.factRefs.map(String) : [];
    if (!title || title.length > 60 || !text || text.length > 900 || !factRefs.length || factRefs.length > 12) {
      throw new ApiError(502, "invalid_ai_result", `AI 解读第 ${index + 1} 节不完整`);
    }
    factRefs.forEach((reference) => {
      if (factRefValue(facts, reference) === undefined) {
        throw new ApiError(502, "invalid_fact_ref", "AI 引用了命盘中不存在的依据，请重试");
      }
    });
    return { title, text, factRefs };
  });
  const normalized = { schemaVersion: "chart-interpretation-v1", headline, summary, tags, sections: normalizedSections };
  const serialized = JSON.stringify(normalized);
  if (FORBIDDEN_SYSTEMS.some((term) => serialized.includes(term))) {
    throw new ApiError(502, "forbidden_system", "AI 解读混入了不允许的体系，请重试");
  }
  return normalized;
}

async function callDeepSeek(facts: JsonRecord): Promise<JsonRecord> {
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
        temperature: 0.2,
        max_tokens: 2800,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify({ outputContract: OUTPUT_CONTRACT, baziFacts: facts }) },
        ],
      }),
    });
    if (!response.ok) throw new ApiError(response.status === 429 ? 429 : 502, "ai_upstream_failed", "AI 解读暂时不可用，请稍后重试");
    const payload = await response.json();
    return parseContent(payload?.choices?.[0]?.message?.content);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") throw new ApiError(504, "ai_timeout", "AI 解读时间过长，请重试");
    throw new ApiError(502, "ai_invalid_response", "AI 解读无法读取，请重试");
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return jsonResponse(request, 405, { error: "method_not_allowed" });
  if (!isAllowedOrigin(request)) return jsonResponse(request, 403, { error: "origin_not_allowed" });
  const environment = supabaseEnvironment();
  let chartId = "";
  try {
    const admin = await authenticateAdministrator(request, environment);
    const payload = await request.json();
    const profileId = String(payload?.profileId || "");
    const force = payload?.force === true;
    if (!UUID_PATTERN.test(profileId)) throw new ApiError(400, "invalid_profile", "档案无效");
    const rows = await serviceJson(
      environment,
      `/rest/v1/bazi_charts?owner_id=eq.${encodeURIComponent(admin.id)}&profile_id=eq.${encodeURIComponent(profileId)}&is_current=eq.true&select=id,facts,ai_interpretation,interpretation_status,interpreted_at&limit=1`,
    );
    const chart = Array.isArray(rows) && isRecord(rows[0]) ? rows[0] : null;
    if (!chart || !isRecord(chart.facts)) throw new ApiError(404, "chart_not_found", "当前档案还没有完整命盘");
    chartId = String(chart.id);
    if (!force && chart.interpretation_status === "ready" && isRecord(chart.ai_interpretation)) {
      return jsonResponse(request, 200, { interpretation: chart.ai_interpretation, interpretedAt: chart.interpreted_at, cached: true });
    }
    await serviceJson(environment, `/rest/v1/bazi_charts?id=eq.${encodeURIComponent(chartId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ interpretation_status: "processing", interpretation_error: null }),
    });
    const interpretation = validateInterpretation(await callDeepSeek(chart.facts), chart.facts);
    const interpretedAt = new Date().toISOString();
    const saved = { ...interpretation, interpretedAt };
    await serviceJson(environment, `/rest/v1/bazi_charts?id=eq.${encodeURIComponent(chartId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        ai_interpretation: saved,
        interpretation_status: "ready",
        interpretation_error: null,
        interpreted_at: interpretedAt,
        updated_at: interpretedAt,
      }),
    });
    return jsonResponse(request, 200, { interpretation: saved, interpretedAt, cached: false });
  } catch (error) {
    const apiError = error instanceof ApiError ? error : new ApiError(500, "chart_explain_failed", "命盘解读暂时失败，请重试");
    if (chartId) {
      await serviceJson(environment, `/rest/v1/bazi_charts?id=eq.${encodeURIComponent(chartId)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ interpretation_status: "failed", interpretation_error: apiError.code }),
      }).catch(() => undefined);
    }
    return jsonResponse(request, apiError.status, { error: apiError.code, message: apiError.message });
  }
});
