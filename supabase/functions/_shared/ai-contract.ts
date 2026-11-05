const FORBIDDEN_SYSTEMS = ["神煞", "纳音", "生肖", "紫微", "西方占星", "星座"];
const STEM_BRANCH_PATTERN = /[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/g;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringArray(value: unknown, maxItems: number, maxLength: number): string[] | null {
  if (!Array.isArray(value) || value.length > maxItems) return null;
  const items = value.map((item) => String(item || "").trim());
  if (items.some((item) => !item || item.length > maxLength)) return null;
  return items;
}

export function factRefValue(facts: Record<string, unknown>, reference: string): unknown {
  if (!reference || reference.length > 180 || !/^[A-Za-z0-9_.\[\]-]+$/.test(reference)) return undefined;
  const parts = reference.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let value: unknown = facts;
  for (const part of parts) {
    if ((isRecord(value) || Array.isArray(value)) && Object.prototype.hasOwnProperty.call(value, part)) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return value;
}

function collectKnownStemBranches(value: unknown, result = new Set<string>()): Set<string> {
  if (typeof value === "string") {
    for (const match of value.match(STEM_BRANCH_PATTERN) || []) result.add(match);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectKnownStemBranches(item, result));
  } else if (isRecord(value)) {
    Object.values(value).forEach((item) => collectKnownStemBranches(item, result));
  }
  return result;
}

export function collectFactRefs(result: Record<string, unknown>): string[] {
  const answer = isRecord(result.answer) ? result.answer : {};
  const reasoning = Array.isArray(answer.zipingReasoning) ? answer.zipingReasoning : [];
  const report = isRecord(result.reportUpdate) ? result.reportUpdate : {};
  const core = isRecord(report.reportCoreUpdate) ? report.reportCoreUpdate : {};
  const upserts = Array.isArray(core.upsert) ? core.upsert : [];
  return [...reasoning, ...upserts]
    .flatMap((item) => (isRecord(item) && Array.isArray(item.factRefs) ? item.factRefs : []))
    .map((item) => String(item))
    .filter((item, index, array) => array.indexOf(item) === index);
}

export function validateAiResult(result: unknown, facts: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (!isRecord(result)) return ["返回内容不是 JSON 对象"];
  const answer = isRecord(result.answer) ? result.answer : null;
  const summary = isRecord(result.clientSummary) ? result.clientSummary : null;
  const report = isRecord(result.reportUpdate) ? result.reportUpdate : null;
  if (!answer) errors.push("缺少 answer");
  if (!summary) errors.push("缺少 clientSummary");
  if (!report) errors.push("缺少 reportUpdate");
  if (errors.length) return errors;

  for (const key of ["conclusion", "modernExplanation"] as const) {
    const value = String(answer[key] || "").trim();
    if (!value || value.length > 4000) errors.push(`answer.${key} 无效`);
  }
  const reasoning = Array.isArray(answer.zipingReasoning) ? answer.zipingReasoning : [];
  if (!reasoning.length || reasoning.length > 12) errors.push("zipingReasoning 数量无效");
  reasoning.forEach((item, index) => {
    if (!isRecord(item)) {
      errors.push(`zipingReasoning[${index}] 无效`);
      return;
    }
    if (!String(item.claim || "").trim() || !String(item.explanation || "").trim()) {
      errors.push(`zipingReasoning[${index}] 缺少判断或解释`);
    }
    const refs = stringArray(item.factRefs, 12, 180);
    if (!refs?.length) errors.push(`zipingReasoning[${index}] 缺少 factRefs`);
    refs?.forEach((reference) => {
      if (factRefValue(facts, reference) === undefined) errors.push(`不存在的 factRef: ${reference}`);
    });
  });
  for (const key of ["suggestions", "uncertainties", "followUpQuestions"] as const) {
    if (!stringArray(answer[key], 12, 800)) errors.push(`answer.${key} 无效`);
  }

  const summaryKeys = [
    "coreTopics",
    "confirmedContext",
    "keyConclusions",
    "decisionsAndOutcomes",
    "openQuestions",
    "riskNotes",
  ];
  summaryKeys.forEach((key) => {
    if (!stringArray(summary[key], 30, 500)) errors.push(`clientSummary.${key} 无效`);
  });
  if (JSON.stringify(summary).length > 8000) errors.push("clientSummary 超出长度限制");

  if (!String(report.summary || "").trim() || String(report.summary).length > 3000) {
    errors.push("reportUpdate.summary 无效");
  }
  if (!stringArray(report.replaceOutdatedContent, 30, 180)) errors.push("replaceOutdatedContent 无效");
  const coreUpdate = isRecord(report.reportCoreUpdate) ? report.reportCoreUpdate : null;
  if (!coreUpdate) {
    errors.push("缺少 reportCoreUpdate");
  } else {
    if (!stringArray(coreUpdate.invalidate, 30, 180)) errors.push("reportCoreUpdate.invalidate 无效");
    const upserts = Array.isArray(coreUpdate.upsert) ? coreUpdate.upsert : [];
    if (upserts.length > 30) errors.push("reportCoreUpdate.upsert 过多");
    upserts.forEach((item, index) => {
      if (!isRecord(item) || !String(item.id || "").trim() || !String(item.conclusion || "").trim()) {
        errors.push(`reportCoreUpdate.upsert[${index}] 无效`);
        return;
      }
      const refs = stringArray(item.factRefs, 12, 180);
      if (!refs?.length) errors.push(`reportCoreUpdate.upsert[${index}] 缺少 factRefs`);
      refs?.forEach((reference) => {
        if (factRefValue(facts, reference) === undefined) errors.push(`不存在的 report factRef: ${reference}`);
      });
    });
  }

  const serialized = JSON.stringify(result);
  FORBIDDEN_SYSTEMS.forEach((term) => {
    if (serialized.includes(term)) errors.push(`包含禁止体系：${term}`);
  });
  const knownStemBranches = collectKnownStemBranches(facts);
  for (const value of serialized.match(STEM_BRANCH_PATTERN) || []) {
    if (!knownStemBranches.has(value)) errors.push(`包含命盘事实中不存在的干支：${value}`);
  }
  return [...new Set(errors)];
}

export function validateDirectionalAnswer(result: unknown, question: string): string[] {
  const asksForDirection = /能不能|可不可以|会不会|是否|能否|成功吗|能成功|能录取|会录取|该不该|要不要|适不适合/.test(question);
  if (!asksForDirection) return [];
  const answer = isRecord(result) && isRecord(result.answer) ? result.answer : {};
  const conclusion = String(answer.conclusion || "").trim().slice(0, 180);
  const hasDirection = /更可能|倾向|偏向|可以|不可以|不建议|建议争取|把握较大|把握较小|机会较大|机会较小|大概率|小概率|较难|较有希望/.test(conclusion);
  return hasDirection ? [] : ["结果型问题没有先给出明确倾向"];
}

export function mergeReportCore(
  existing: unknown,
  update: Record<string, unknown>,
  consultedAt: string,
): Record<string, unknown> {
  const current = isRecord(existing) ? existing : {};
  const items = Array.isArray(current.items) ? current.items.filter(isRecord) : [];
  const byId = new Map(items.map((item) => [String(item.id || ""), { ...item }]));
  const invalid = new Set(Array.isArray(update.invalidate) ? update.invalidate.map(String) : []);
  invalid.forEach((id) => {
    const item = byId.get(id);
    if (item) byId.set(id, { ...item, status: "invalidated", updatedAt: consultedAt });
  });
  const upserts = Array.isArray(update.upsert) ? update.upsert.filter(isRecord) : [];
  upserts.forEach((item) => {
    const id = String(item.id || "");
    if (!id) return;
    byId.set(id, { ...byId.get(id), ...item, status: "active", updatedAt: consultedAt });
  });
  return {
    schemaVersion: "report-core-v1",
    items: [...byId.values()].slice(-80),
    updatedAt: consultedAt,
  };
}
