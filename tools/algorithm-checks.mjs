import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appPath = resolve(rootDir, "app.js");

function createDummyElement(name = "element", depth = 0) {
  const element = {
    name,
    value: "",
    textContent: "",
    innerHTML: "",
    checked: false,
    disabled: false,
    hidden: false,
    scrollTop: 0,
    clientHeight: 120,
    dataset: {},
    style: {
      setProperty() {},
    },
    classList: {
      add() {},
      remove() {},
      toggle() {},
    },
    children: [],
    append(...children) {
      children.forEach((child) => {
        if (child && typeof child === "object") child.parentElement = element;
        element.children.push(child);
      });
    },
    appendChild(child) {
      if (child && typeof child === "object") child.parentElement = element;
      element.children.push(child);
      return child;
    },
    replaceChildren(...children) {
      element.children = [];
      element.append(...children);
    },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {},
    setAttribute() {},
    focus() {},
    click() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    closest() {
      return null;
    },
    getBoundingClientRect() {
      return { top: 0, height: 32 };
    },
  };

  if (depth === 0) {
    element.children = Array.from({ length: 8 }, (_, index) => createDummyElement(`${name}-child-${index}`, depth + 1));
  }

  return element;
}

function createDocumentStub() {
  const elements = new Map();
  const getElement = (selector) => {
    if (!elements.has(selector)) {
      elements.set(selector, createDummyElement(selector));
    }
    return elements.get(selector);
  };

  return {
    querySelector: getElement,
    querySelectorAll() {
      return [];
    },
    createElement(tag) {
      return createDummyElement(tag);
    },
    addEventListener() {},
    removeEventListener() {},
  };
}

function loadAppContext() {
  const document = createDocumentStub();
  const navigator = {};
  const window = {
    document,
    navigator,
    location: { protocol: "file:" },
    matchMedia: () => ({ matches: false }),
    setTimeout: () => 0,
    clearTimeout() {},
    requestAnimationFrame: (callback) => callback(),
    confirm: () => false,
    addEventListener() {},
    removeEventListener() {},
    scrollTo() {},
  };

  const context = vm.createContext({
    console,
    Date,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    RegExp,
    Map,
    Set,
    Promise,
    Intl,
    document,
    window,
    navigator,
    caches: undefined,
    indexedDB: undefined,
    Event: class Event {
      constructor(type) {
        this.type = type;
      }
    },
  });

  vm.runInContext(readFileSync(appPath, "utf8"), context, { filename: appPath });
  return context;
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertApprox(actual, expected, toleranceMinutes, label) {
  const deltaMinutes = Math.abs(actual - expected) / 60000;
  if (deltaMinutes > toleranceMinutes) {
    throw new Error(`${label}: expected within ${toleranceMinutes} minutes of ${expected}, got ${actual}`);
  }
}

function assertIncludes(actual, expected, label) {
  if (!String(actual).includes(expected)) {
    throw new Error(`${label}: expected to include ${expected}, got ${actual}`);
  }
}

function runChecks() {
  const app = loadAppContext();
  const results = [];
  const check = (label, run) => {
    run();
    results.push(`OK ${label}`);
  };

  check("农历 2024 正月初一 -> 2024-02-10", () => {
    assertEqual(app.convertLunarToSolar("2024-01-01")?.iso, "2024-02-10", "2024 春节");
  });

  check("农历 2025 正月初一 -> 2025-01-29", () => {
    assertEqual(app.convertLunarToSolar("2025-01-01")?.iso, "2025-01-29", "2025 春节");
  });

  check("农历 2025 闰六月初一 -> 2025-07-25", () => {
    assertEqual(app.convertLunarToSolar("2025-06-01", true)?.iso, "2025-07-25", "2025 闰六月");
  });

  check("2026 立春交节时间在凌晨 03:55 左右", () => {
    const actual = app.getSolarTermMoment(2026, 2).getTime();
    const expected = app.createBeijingDate(2026, 1, 4, 3, 55, 55).getTime();
    assertApprox(actual, expected, 3, "2026 立春");
    assertEqual(app.formatDateTimeLabel(new Date(actual)), "2026-02-04 03:55", "立春北京时间显示");
    assertEqual(new Date(actual).toISOString().slice(0, 16), "2026-02-03T19:55", "立春 UTC 瞬间");
  });

  check("立春前仍取上一年年柱", () => {
    const pillar = app.calculateYearPillar(app.createBeijingDate(2026, 1, 4, 3, 50));
    assertEqual(pillar.baziYear, 2025, "立春前年份");
    assertEqual(pillar.name, "乙巳", "立春前年柱");
  });

  check("立春后进入新一年年柱", () => {
    const pillar = app.calculateYearPillar(app.createBeijingDate(2026, 1, 4, 4, 0));
    assertEqual(pillar.baziYear, 2026, "立春后年份");
    assertEqual(pillar.name, "丙午", "立春后年柱");
  });

  check("立春前后月柱切换", () => {
    const before = app.createBeijingDate(2026, 1, 4, 3, 50);
    const after = app.createBeijingDate(2026, 1, 4, 4, 0);
    const beforeYear = app.calculateYearPillar(before);
    const afterYear = app.calculateYearPillar(after);
    assertEqual(app.calculateMonthPillar(before, beforeYear.stem).name, "己丑", "立春前月柱");
    assertEqual(app.calculateMonthPillar(after, afterYear.stem).name, "庚寅", "立春后月柱");
  });

  check("当前流年按立春分界", () => {
    assertEqual(app.getCurrentBaziYear(app.createBeijingDate(2026, 0, 10)), 2025, "2026 立春前流年");
    assertEqual(app.getCurrentBaziYear(app.createBeijingDate(2026, 1, 5)), 2026, "2026 立春后流年");
  });

  check("完整排盘样例包含四柱与起运", () => {
    const chart = app.calculateBaziChart({
      id: "case-2026-lichun",
      name: "立春边界样例",
      gender: "male",
      genderLabel: "乾造",
      calendarType: "solar",
      lunarLeapMonth: false,
      birthDate: "2026-02-04",
      birthTime: "04:00",
      birthPlace: "",
      relation: "本人",
      isSelf: true,
      note: "",
    });
    assertEqual(chart.pillars.year.name, "丙午", "样例年柱");
    assertEqual(chart.pillars.month.name, "庚寅", "样例月柱");
    assertEqual(chart.pillars.hour.name.endsWith("寅"), true, "样例时支");
    assertEqual(chart.luck.direction, "顺行", "样例大运顺逆");
    assertEqual(chart.facts.schemaVersion, "bazi-facts-v1", "结构化事实版本");
    assertEqual(chart.facts.ruleset, "《四柱预测学》子平法口径（未核对处按传统子平法）", "子平规则口径");
    assertEqual(chart.facts.rulesetProvenance.primarySource.isbn, "978-7-89452-116-4", "规则来源版本");
    assertEqual(chart.facts.rulesetProvenance.sourceStatus, "partial-book-audit", "规则校订状态");
    assertEqual(Boolean(chart.strength.zipingFactors.command.status), true, "旺衰得令判断");
    assertEqual(Array.isArray(chart.strength.zipingFactors.ground.rootPillars), true, "旺衰得地判断");
    assertEqual(Array.isArray(chart.strength.zipingFactors.momentum.supportingStems), true, "旺衰得势判断");
    assertEqual(Boolean(chart.rules.pattern.name), true, "月令格局");
    assertEqual(chart.rules.usefulGod.primaryGods.length > 0, true, "子平取用");
    assertEqual(chart.facts.methodology.excludedSystems.includes("神煞断法"), true, "排除神煞断法");
  });

  check("原局天干五合与地支六合可追溯", () => {
    const relations = app.analyzeStemBranchRelations([
      { key: "year", label: "年柱", source: "原局", stem: "甲", branch: "子" },
      { key: "month", label: "月柱", source: "原局", stem: "己", branch: "丑" },
    ]);
    assertEqual(relations.some((item) => item.type === "天干五合" && item.element === "土"), true, "甲己合土");
    assertEqual(relations.some((item) => item.type === "六合" && item.element === "土"), true, "子丑六合");
    assertEqual(relations.every((item) => item.scope === "原局"), true, "原局来源");
  });

  check("流年冲刑只标记为岁运触发", () => {
    const relations = app.analyzeStemBranchRelations([
      { key: "day", label: "日柱", source: "原局", stem: "甲", branch: "寅" },
      { key: "annual", label: "当前流年", source: "流年", stem: "丙", branch: "申" },
    ], true);
    assertEqual(relations.some((item) => item.type === "六冲"), true, "寅申冲");
    assertEqual(relations.some((item) => item.type === "相刑"), true, "寅申刑");
    assertEqual(relations.every((item) => item.scope === "岁运触发"), true, "岁运来源");
  });

  check("申子辰三合局需三支齐全", () => {
    const incomplete = app.analyzeStemBranchRelations([
      { key: "year", label: "年柱", source: "原局", stem: "甲", branch: "申" },
      { key: "month", label: "月柱", source: "原局", stem: "乙", branch: "子" },
    ]);
    const complete = app.analyzeStemBranchRelations([
      { key: "year", label: "年柱", source: "原局", stem: "甲", branch: "申" },
      { key: "month", label: "月柱", source: "原局", stem: "乙", branch: "子" },
      { key: "day", label: "日柱", source: "原局", stem: "丙", branch: "辰" },
    ]);
    assertEqual(incomplete.some((item) => item.type === "三合"), false, "三合不齐不成立");
    assertEqual(complete.some((item) => item.type === "三合" && item.element === "水"), true, "申子辰三合水");
  });

  check("从格只在日主无明显生扶时初筛", () => {
    const weak = { label: "偏弱", dayElement: "木" };
    const followWealth = app.detectSpecialPattern(weak, { 正财: 2, 偏财: 2, 食神: 1 });
    const supported = app.detectSpecialPattern(weak, { 正财: 2, 偏财: 2, 正印: 1, 比肩: 1 });
    assertEqual(followWealth?.name, "从财格", "从财格初筛");
    assertEqual(supported, null, "有印比根气不判从财");
  });

  check("自定义跳槽问题命中事业专项", () => {
    const result = app.generateExplainableResult(
      {
        id: "ask-career",
        name: "问事样例",
        gender: "male",
        genderLabel: "乾造",
        calendarType: "solar",
        lunarLeapMonth: false,
        birthDate: "1992-08-16",
        birthTime: "09:30",
        birthPlace: "北京",
        relation: "本人",
        isSelf: true,
        note: "",
      },
      "今年适不适合跳槽？",
      "自定义",
    );
    assertIncludes(result.tone, "事业判断", "跳槽 tone");
    assertIncludes(result.conclusion, "跳槽", "跳槽结论");
    assertIncludes(result.evidence.join("\n"), "事业专项判断", "跳槽依据");
  });

  check("自定义投资问题命中财务专项", () => {
    const result = app.generateExplainableResult(
      {
        id: "ask-finance",
        name: "问事样例",
        gender: "male",
        genderLabel: "乾造",
        calendarType: "solar",
        lunarLeapMonth: false,
        birthDate: "1992-08-16",
        birthTime: "09:30",
        birthPlace: "北京",
        relation: "本人",
        isSelf: true,
        note: "",
      },
      "这笔投资能不能做？",
      "自定义",
    );
    assertIncludes(result.tone, "财务节奏", "投资 tone");
    assertIncludes(result.conclusion, "投资", "投资结论");
    assertIncludes(result.evidence.join("\n"), "财务专项判断", "投资依据");
  });

  check("坤造复合问题按伴侣星解释", () => {
    const result = app.generateExplainableResult(
      {
        id: "ask-relationship",
        name: "问事样例",
        gender: "female",
        genderLabel: "坤造",
        calendarType: "solar",
        lunarLeapMonth: false,
        birthDate: "1994-11-03",
        birthTime: "21:20",
        birthPlace: "上海",
        relation: "本人",
        isSelf: true,
        note: "",
      },
      "这段关系还能不能复合？",
      "自定义",
    );
    assertIncludes(result.tone, "关系节奏", "复合 tone");
    assertIncludes(result.conclusion, "复合", "复合结论");
    assertIncludes(result.evidence.join("\n"), "坤造以官杀", "复合依据");
  });

  return results;
}

const results = runChecks();
console.log(results.join("\n"));
