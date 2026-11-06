import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectFactRefs, factRefValue, mergeReportCore, validateAiResult, validateDirectionalAnswer } from "../supabase/functions/_shared/ai-contract.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const aiSource = read("supabase/functions/ai-consult/index.ts");
const migration = read("supabase/migrations/202611030003_ai_consult_transactions.sql");
const historyMigration = read("supabase/migrations/202611030004_history_delete_rpc.sql");
const consultationClient = read("consultation-client.js");
const config = read("supabase/config.toml");

const facts = {
  schemaVersion: "bazi-facts-v1",
  pillars: {
    year: { name: "甲子", stem: "甲", branch: "子" },
    month: { name: "丙午", stem: "丙", branch: "午" },
  },
  strength: { label: "偏弱", zipingFactors: { command: { status: "失令" } } },
  annual: { name: "丙午", stemGod: "食神" },
};

function resultFixture() {
  return {
    answer: {
      conclusion: "当前更适合先验证机会，不宜仓促决定。",
      modernExplanation: "资源承接能力需要先补足。",
      zipingReasoning: [
        {
          claim: "日主偏弱，决策要留缓冲。",
          explanation: "程序已判断日主偏弱。",
          factRefs: ["strength.label", "strength.zipingFactors.command"],
        },
      ],
      suggestions: ["先核实条件"],
      uncertainties: ["现实条件仍需确认"],
    },
    clientSummary: {
      coreTopics: ["职业选择"],
      confirmedContext: [],
      keyConclusions: ["需要先验证资源"],
      decisionsAndOutcomes: [],
      openQuestions: ["新机会的具体条件"],
      riskNotes: [],
      lastConsultedAt: "2026-11-03T00:00:00.000Z",
    },
    reportUpdate: {
      summary: "本次讨论职业机会。",
      replaceOutdatedContent: [],
      reportCoreUpdate: {
        upsert: [
          {
            id: "career-buffer",
            topic: "事业",
            conclusion: "职业变动需要预留缓冲。",
            factRefs: ["strength.label"],
          },
        ],
        invalidate: [],
      },
    },
  };
}

const checks = [];
function check(name, fn) {
  try {
    fn();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, error });
  }
}

check("合法 AI JSON 通过结构和事实引用校验", () => {
  const result = resultFixture();
  assert.deepEqual(validateAiResult(result, facts), []);
  assert.deepEqual(collectFactRefs(result), ["strength.label", "strength.zipingFactors.command"]);
  assert.equal(factRefValue(facts, "strength.zipingFactors.command.status"), "失令");
});

check("不存在的 factRef 会被服务端拒绝", () => {
  const result = resultFixture();
  result.answer.zipingReasoning[0].factRefs = ["pillars.hour.name"];
  assert.match(validateAiResult(result, facts).join("；"), /不存在的 factRef/);
});

check("其他命理体系会被服务端拒绝", () => {
  const result = resultFixture();
  result.answer.modernExplanation = "再结合神煞判断。";
  assert.match(validateAiResult(result, facts).join("；"), /禁止体系：神煞/);
});

check("命盘事实中不存在的干支会被服务端拒绝", () => {
  const result = resultFixture();
  result.answer.conclusion = "癸亥会带来确定结果。";
  assert.match(validateAiResult(result, facts).join("；"), /不存在的干支：癸亥/);
});

check("报告核心按标识更新并保留失效状态", () => {
  const merged = mergeReportCore(
    { items: [{ id: "old", conclusion: "旧结论", status: "active" }] },
    {
      upsert: [{ id: "new", conclusion: "新结论", factRefs: ["strength.label"] }],
      invalidate: ["old"],
    },
    "2026-11-03T00:00:00.000Z",
  );
  assert.equal(merged.schemaVersion, "report-core-v1");
  assert.equal(merged.items.find((item) => item.id === "old").status, "invalidated");
  assert.equal(merged.items.find((item) => item.id === "new").status, "active");
});

check("AI 只从服务端 Secret 读取 DeepSeek Key 并固定模型默认值", () => {
  assert.match(aiSource, /Deno\.env\.get\("DEEPSEEK_API_KEY"\)/);
  assert.match(aiSource, /Deno\.env\.get\("DEEPSEEK_MODEL"\) \|\| "deepseek-chat"/);
  assert.doesNotMatch(read("app-config.js"), /DEEPSEEK|sk-[A-Za-z0-9]/i);
});

check("上下文移除档案 UUID且不发送姓名字段", () => {
  assert.match(aiSource, /delete copy\.subject\.profileId/);
  const profileContext = aiSource.slice(aiSource.indexOf("necessaryProfile:"), aiSource.indexOf("baziFacts:"));
  assert.doesNotMatch(profileContext, /name|birth_place|note/i);
  assert.match(aiSource, /redactIdentity\(question, identityValues\)/);
});

check("时间类回答锚定当前北京时间且禁止 AI 自行补算流月流日", () => {
  assert.match(aiSource, /temporalContext\.currentDateBeijing/);
  assert.match(aiSource, /timeZone: "Asia\/Shanghai"/);
  assert.match(aiSource, /currentDateBeijing,/);
  assert.match(aiSource, /不把过去时段当作未来建议/);
  assert.match(aiSource, /没有流月、流日事实时不得自行补算月份或日期/);
  assert.match(aiSource, /当前问题不属于健康、生育、法律或投资时，不要添加这些领域的无关免责声明/);
});

check("结果型问题必须先给出明确倾向并保留精度边界", () => {
  const vague = resultFixture();
  vague.answer.conclusion = "这个问题需要结合实际情况综合判断。";
  assert.match(validateDirectionalAnswer(vague, "我明天面试能不能成功？").join("；"), /没有先给出明确倾向/);
  const direct = resultFixture();
  direct.answer.conclusion = "目前倾向可以，积极准备会提高录取机会。";
  assert.deepEqual(validateDirectionalAnswer(direct, "我明天面试能不能成功？"), []);
  assert.deepEqual(validateDirectionalAnswer(vague, "请分析我的职业发展方向"), []);
  assert.match(aiSource, /明天面试能否成功/);
  assert.match(aiSource, /都必须说普通人听得懂的话/);
  assert.match(aiSource, /validateDirectionalAnswer\(result, question\)/);
});

check("回答简短自然且不生成推荐追问", () => {
  const verbose = resultFixture();
  verbose.answer.conclusion = "从命理角度来看，这个问题需要综合判断。";
  assert.match(validateAiResult(verbose, facts).join("；"), /回避式开场/);
  const followUp = resultFixture();
  followUp.answer.followUpQuestions = ["还想问什么？"];
  assert.match(validateAiResult(followUp, facts).join("；"), /不应包含推荐追问/);
  assert.doesNotMatch(aiSource, /followUpQuestions/);
  assert.match(aiSource, /不要替用户设计或推荐下一条问题/);
});

check("咨询使用事务锁、幂等消息和服务端专用 RPC", () => {
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /'q:' \|\| target_request_key/);
  assert.match(migration, /'a:' \|\| target_request_key/);
  assert.match(migration, /grant execute on function public\.start_ai_consult[\s\S]*to service_role/);
  assert.match(migration, /revoke all on function public\.finalize_ai_consult[\s\S]*from public, anon, authenticated/);
});

check("AI 函数强制 JWT并在成功事务中更新摘要、报告和最后咨询时间", () => {
  assert.match(config, /\[functions\.ai-consult\][\s\S]*?verify_jwt = true/);
  assert.match(migration, /insert into public\.client_summaries/);
  assert.match(migration, /insert into public\.reports/);
  assert.match(migration, /set last_consulted_at = target_consulted_at/);
  assert.match(aiSource, /validateAiResult\(result, facts\)/);
  assert.match(aiSource, /上一次输出未通过服务端校验/);
});

check("删除消息或会话会同时标记摘要与报告需要重整", () => {
  assert.match(historyMigration, /public\.is_admin\(current_user_id\)/);
  assert.match(historyMigration, /delete from public\.messages/);
  assert.match(historyMigration, /delete from public\.conversations/);
  assert.match(historyMigration, /update public\.client_summaries[\s\S]*needsRebuild/);
  assert.match(historyMigration, /update public\.reports[\s\S]*status = 'stale'/);
  assert.match(consultationClient, /\/rest\/v1\/rpc\/delete_consultation_history/);
});

for (const result of checks) {
  if (result.ok) console.log(`OK ${result.name}`);
  else {
    console.error(`FAIL ${result.name}`);
    console.error(result.error?.stack || result.error);
  }
}

const failed = checks.filter((item) => !item.ok);
if (failed.length) process.exitCode = 1;
else console.log(`\n${checks.length} stage-five contract checks passed.`);
