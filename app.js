const screenNames = new Set(["home", "profiles", "mine"]);

const screens = Array.from(document.querySelectorAll(".screen"));
const tabs = Array.from(document.querySelectorAll(".tabbar .tab"));
const homeViewButtons = Array.from(document.querySelectorAll("[data-home-view]"));
const homeViewPanels = Array.from(document.querySelectorAll("[data-home-panel]"));
const toastEl = document.querySelector("#toast");
const questionText = document.querySelector("#questionText");
const resultTitle = document.querySelector("#resultTitle");
const resultCard = document.querySelector("#analysisResult");
const analysisTone = document.querySelector("#analysisTone");
const resultConclusion = document.querySelector("#resultConclusion");
const resultEvidence = document.querySelector("#resultEvidence");
const resultExplanation = document.querySelector("#resultExplanation");
const resultSuggestion = document.querySelector("#resultSuggestion");
const resultUncertaintyBlock = document.querySelector("#resultUncertaintyBlock");
const resultUncertainty = document.querySelector("#resultUncertainty");
const questionChips = Array.from(document.querySelectorAll("#questionChips button"));
const recentQuestionList = document.querySelector("#recentQuestionList");
const viewAllQuestionsButton = document.querySelector("#viewAllQuestions");
const questionHistoryList = document.querySelector("#questionHistoryList");
const archiveSearch = document.querySelector("#archiveSearch");
const archiveList = document.querySelector("#archiveList");
const expiredProfileCount = document.querySelector("#expiredProfileCount");
const profileCountEls = Array.from(document.querySelectorAll("[data-profile-count]"));
const profileModal = document.querySelector("#profileModal");
const profileModalTitle = document.querySelector("#profileModalTitle");
const profileModalIntro = document.querySelector("#profileModalIntro");
const profileName = document.querySelector("#profileName");
const profileGender = document.querySelector("#profileGender");
const profileBirthDate = document.querySelector("#profileBirthDate");
const profileBirthTime = document.querySelector("#profileBirthTime");
const profileRelation = document.querySelector("#profileRelation");
const profileBirthPlace = document.querySelector("#profileBirthPlace");
const profileNote = document.querySelector("#profileNote");
const profileLunarLeap = document.querySelector("#profileLunarLeap");
const calendarTypeInputs = Array.from(document.querySelectorAll('input[name="calendarType"]'));
const currentProfileNames = Array.from(document.querySelectorAll("[data-current-profile-name]"));
const currentProfileMetas = Array.from(document.querySelectorAll("[data-current-profile-meta]"));
const profileSwitchButtons = Array.from(document.querySelectorAll("[data-open-profile-picker]"));
const profilePickerModal = document.querySelector("#profilePickerModal");
const profilePickerSearch = document.querySelector("#profilePickerSearch");
const profilePickerList = document.querySelector("#profilePickerList");
const profileActionsModal = document.querySelector("#profileActionsModal");
const profileActionsTitle = document.querySelector("#profileActionsTitle");
const datePickerModal = document.querySelector("#datePickerModal");
const datePickerValue = document.querySelector("#datePickerValue");
const dateYearWheel = document.querySelector("#dateYearWheel");
const dateMonthWheel = document.querySelector("#dateMonthWheel");
const dateDayWheel = document.querySelector("#dateDayWheel");
const closeDatePickerButton = document.querySelector("#closeDatePicker");
const confirmDatePickerButton = document.querySelector("#confirmDatePicker");
const optionPickerModal = document.querySelector("#optionPickerModal");
const optionPickerTitle = document.querySelector("#optionPickerTitle");
const optionPickerSubtitle = document.querySelector("#optionPickerSubtitle");
const optionPickerSearchWrap = document.querySelector("#optionPickerSearchWrap");
const optionPickerSearch = document.querySelector("#optionPickerSearch");
const optionPickerList = document.querySelector("#optionPickerList");
const closeOptionPickerButton = document.querySelector("#closeOptionPicker");
const backupFileInput = document.querySelector("#backupFileInput");
const saveProfileButton = document.querySelector("#saveProfileDraft");
const todayStateLabel = document.querySelector("#todayStateLabel");
const todayStateText = document.querySelector("#todayStateText");
const chartSummaryTitle = document.querySelector("#chartSummaryTitle");
const chartSummaryText = document.querySelector("#chartSummaryText");
const chartSummaryTags = document.querySelector("#chartSummaryTags");
const chartPillars = document.querySelector("#chartPillars");
const currentLuckLabel = document.querySelector("#currentLuckLabel");
const luckTimeline = document.querySelector("#luckTimeline");
const chartBasis = document.querySelector("#chartBasis");

const DB_NAME = "mingli-local-db";
const DB_VERSION = 2;
const PROFILE_STORE = "profiles";
const SETTINGS_STORE = "settings";
const CHART_STORE = "charts";
const QUESTION_STORE = "questions";
const BACKUP_STORE = "backups";
const CURRENT_PROFILE_KEY = "currentProfileId";
const APP_VERSION = "product-38";
const RULESET_LABEL = "《四柱预测学》子平法口径（未核对处按传统子平法）";
const RULESET_PROVENANCE = Object.freeze({
  primarySource: {
    title: "四柱预测学",
    author: "陈园",
    reviewer: "邵伟华",
    edition: "2011年3月第一版",
    printing: "2011年3月第一次印刷",
    publisher: "中国科学文化音像出版社",
    isbn: "978-7-89452-116-4",
  },
  fallback: "指定版本未核对处采用传统子平法保守通行规则",
  sourceStatus: "partial-book-audit",
  provisionalRules: ["晚子时23:00换日", "出生地真太阳时修正", "起运三天折一年"],
});
const BAZI_TIME_ZONE = "Asia/Shanghai";
const BAZI_TIME_ZONE_OFFSET_MINUTES = 8 * 60;
const DATE_PICKER_MIN_YEAR = 1900;
const DATE_PICKER_MAX_YEAR = new Date(Date.now() + BAZI_TIME_ZONE_OFFSET_MINUTES * 60000).getUTCFullYear();
const HOME_HISTORY_LIMIT = 3;
const CLIENT_EXPIRY_DAYS = 90;

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const SEXAGENARY = Array.from({ length: 60 }, (_, index) => ({
  stem: STEMS[index % 10],
  branch: BRANCHES[index % 12],
  name: `${STEMS[index % 10]}${BRANCHES[index % 12]}`,
  index,
}));

const STEM_ELEMENTS = {
  甲: "木",
  乙: "木",
  丙: "火",
  丁: "火",
  戊: "土",
  己: "土",
  庚: "金",
  辛: "金",
  壬: "水",
  癸: "水",
};

const STEM_POLARITY = {
  甲: "阳",
  乙: "阴",
  丙: "阳",
  丁: "阴",
  戊: "阳",
  己: "阴",
  庚: "阳",
  辛: "阴",
  壬: "阳",
  癸: "阴",
};

const BRANCH_ELEMENTS = {
  子: "水",
  丑: "土",
  寅: "木",
  卯: "木",
  辰: "土",
  巳: "火",
  午: "火",
  未: "土",
  申: "金",
  酉: "金",
  戌: "土",
  亥: "水",
};

const HIDDEN_STEMS = {
  子: ["癸"],
  丑: ["己", "癸", "辛"],
  寅: ["甲", "丙", "戊"],
  卯: ["乙"],
  辰: ["戊", "乙", "癸"],
  巳: ["丙", "戊", "庚"],
  午: ["丁", "己"],
  未: ["己", "丁", "乙"],
  申: ["庚", "壬", "戊"],
  酉: ["辛"],
  戌: ["戊", "辛", "丁"],
  亥: ["壬", "甲"],
};

const STEM_COMBINATIONS = [
  { members: ["甲", "己"], element: "土", name: "甲己合土" },
  { members: ["乙", "庚"], element: "金", name: "乙庚合金" },
  { members: ["丙", "辛"], element: "水", name: "丙辛合水" },
  { members: ["丁", "壬"], element: "木", name: "丁壬合木" },
  { members: ["戊", "癸"], element: "火", name: "戊癸合火" },
];

const BRANCH_PAIR_RELATIONS = [
  ...[
    ["子", "丑", "土"], ["寅", "亥", "木"], ["卯", "戌", "火"],
    ["辰", "酉", "金"], ["巳", "申", "水"], ["午", "未", "土"],
  ].map(([a, b, element]) => ({ type: "六合", members: [a, b], element })),
  ...[["子", "午"], ["丑", "未"], ["寅", "申"], ["卯", "酉"], ["辰", "戌"], ["巳", "亥"]]
    .map((members) => ({ type: "六冲", members })),
  ...[["子", "未"], ["丑", "午"], ["寅", "巳"], ["卯", "辰"], ["申", "亥"], ["酉", "戌"]]
    .map((members) => ({ type: "六害", members })),
  ...[["子", "酉"], ["丑", "辰"], ["寅", "亥"], ["卯", "午"], ["巳", "申"], ["未", "戌"]]
    .map((members) => ({ type: "六破", members })),
  ...[["子", "卯"], ["寅", "巳"], ["巳", "申"], ["寅", "申"], ["丑", "戌"], ["戌", "未"], ["丑", "未"]]
    .map((members) => ({ type: "相刑", members })),
];

const BRANCH_GROUP_RELATIONS = [
  { type: "三合", members: ["申", "子", "辰"], element: "水" },
  { type: "三合", members: ["亥", "卯", "未"], element: "木" },
  { type: "三合", members: ["寅", "午", "戌"], element: "火" },
  { type: "三合", members: ["巳", "酉", "丑"], element: "金" },
  { type: "三会", members: ["亥", "子", "丑"], element: "水" },
  { type: "三会", members: ["寅", "卯", "辰"], element: "木" },
  { type: "三会", members: ["巳", "午", "未"], element: "火" },
  { type: "三会", members: ["申", "酉", "戌"], element: "金" },
  { type: "三刑", members: ["寅", "巳", "申"] },
  { type: "三刑", members: ["丑", "戌", "未"] },
];

const SELF_PUNISH_BRANCHES = new Set(["辰", "午", "酉", "亥"]);

const ELEMENT_GENERATES = {
  木: "火",
  火: "土",
  土: "金",
  金: "水",
  水: "木",
};

const ELEMENT_CONTROLS = {
  木: "土",
  土: "水",
  水: "火",
  火: "金",
  金: "木",
};

const ELEMENT_LABELS = {
  木: "木",
  火: "火",
  土: "土",
  金: "金",
  水: "水",
};

const FIRST_MONTH_STEM = {
  甲: "丙",
  己: "丙",
  乙: "戊",
  庚: "戊",
  丙: "庚",
  辛: "庚",
  丁: "壬",
  壬: "壬",
  戊: "甲",
  癸: "甲",
};

const FIRST_HOUR_STEM = {
  甲: "甲",
  己: "甲",
  乙: "丙",
  庚: "丙",
  丙: "戊",
  辛: "戊",
  丁: "庚",
  壬: "庚",
  戊: "壬",
  癸: "壬",
};

const MONTH_BOUNDARIES = [
  { termIndex: 0, termName: "小寒", branch: "丑", monthOffset: 11 },
  { termIndex: 2, termName: "立春", branch: "寅", monthOffset: 0 },
  { termIndex: 4, termName: "惊蛰", branch: "卯", monthOffset: 1 },
  { termIndex: 6, termName: "清明", branch: "辰", monthOffset: 2 },
  { termIndex: 8, termName: "立夏", branch: "巳", monthOffset: 3 },
  { termIndex: 10, termName: "芒种", branch: "午", monthOffset: 4 },
  { termIndex: 12, termName: "小暑", branch: "未", monthOffset: 5 },
  { termIndex: 14, termName: "立秋", branch: "申", monthOffset: 6 },
  { termIndex: 16, termName: "白露", branch: "酉", monthOffset: 7 },
  { termIndex: 18, termName: "寒露", branch: "戌", monthOffset: 8 },
  { termIndex: 20, termName: "立冬", branch: "亥", monthOffset: 9 },
  { termIndex: 22, termName: "大雪", branch: "子", monthOffset: 10 },
];

const DAY_MS = 86400000;
const JULIAN_DAY_UNIX_EPOCH = 2440587.5;
const JULIAN_DAY_J2000 = 2451545;
const DEG_TO_RAD = Math.PI / 180;
const SOLAR_TERM_START_LONGITUDE = 285;

const SOLAR_TERM_ESTIMATE_MINUTES = [
  0, 21208, 42467, 63836, 85337, 107014, 128867, 150921, 173149, 195551, 218072, 240693,
  263343, 285989, 308563, 331033, 353350, 375494, 397447, 419210, 440795, 462224,
  483532, 504758,
];
const solarTermMomentCache = new Map();

function createBeijingDate(year, monthIndex, day, hour = 0, minute = 0, second = 0, millisecond = 0) {
  return new Date(
    Date.UTC(year, monthIndex, day, hour, minute, second, millisecond) -
      BAZI_TIME_ZONE_OFFSET_MINUTES * 60000,
  );
}

function getBeijingDateParts(date) {
  const shifted = new Date(date.getTime() + BAZI_TIME_ZONE_OFFSET_MINUTES * 60000);
  return {
    year: shifted.getUTCFullYear(),
    monthIndex: shifted.getUTCMonth(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
  };
}

function addBeijingDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

function setBeijingTime(date, hour, minute, second = 0, millisecond = 0) {
  const parts = getBeijingDateParts(date);
  return createBeijingDate(parts.year, parts.monthIndex, parts.day, hour, minute, second, millisecond);
}

const LUNAR_INFO_START_YEAR = 1900;
const LUNAR_YEAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5d0, 0x14573, 0x052d0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04bd7, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
  0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
  0x0d520,
];
const LUNAR_INFO_END_YEAR = LUNAR_INFO_START_YEAR + LUNAR_YEAR_INFO.length - 1;

const BRANCH_TIME_DEFAULTS = {
  子: "00:30",
  丑: "01:30",
  寅: "03:30",
  卯: "05:30",
  辰: "07:30",
  巳: "09:30",
  午: "11:30",
  未: "13:30",
  申: "15:30",
  酉: "17:30",
  戌: "19:30",
  亥: "21:30",
};

const BIRTH_TIME_OPTIONS = [
  { value: "", label: "时辰未知", meta: "无法确定时可留空", shortLabel: "" },
  { value: "00:30", label: "子时", meta: "00:00-00:59｜凌晨子时", shortLabel: "子时 00-01" },
  { value: "01:30", label: "丑时", meta: "01:00-02:59｜夜半后", shortLabel: "丑时 01-03" },
  { value: "03:30", label: "寅时", meta: "03:00-04:59｜黎明前后", shortLabel: "寅时 03-05" },
  { value: "05:30", label: "卯时", meta: "05:00-06:59｜清晨", shortLabel: "卯时 05-07" },
  { value: "07:30", label: "辰时", meta: "07:00-08:59｜早间", shortLabel: "辰时 07-09" },
  { value: "09:30", label: "巳时", meta: "09:00-10:59｜上午", shortLabel: "巳时 09-11" },
  { value: "11:30", label: "午时", meta: "11:00-12:59｜中午", shortLabel: "午时 11-13" },
  { value: "13:30", label: "未时", meta: "13:00-14:59｜午后", shortLabel: "未时 13-15" },
  { value: "15:30", label: "申时", meta: "15:00-16:59｜下午", shortLabel: "申时 15-17" },
  { value: "17:30", label: "酉时", meta: "17:00-18:59｜傍晚", shortLabel: "酉时 17-19" },
  { value: "19:30", label: "戌时", meta: "19:00-20:59｜晚间", shortLabel: "戌时 19-21" },
  { value: "21:30", label: "亥时", meta: "21:00-22:59｜夜间", shortLabel: "亥时 21-23" },
  { value: "23:30", label: "子时", meta: "23:00-23:59｜晚子时，按次日排日柱", shortLabel: "子时 23-24" },
];

const RELATION_OPTIONS = ["本人", "家人", "客户"].map((value) => ({
  value,
  label: value,
}));

const BIRTH_PLACE_OPTIONS = [
  { value: "", label: "暂不选择", meta: "不做真太阳时修正" },
  { value: "北京", label: "北京", meta: "华北｜东经约116.4°" },
  { value: "上海", label: "上海", meta: "华东｜东经约121.5°" },
  { value: "广州", label: "广州", meta: "华南｜东经约113.3°" },
  { value: "深圳", label: "深圳", meta: "华南｜东经约114.1°" },
  { value: "杭州", label: "杭州", meta: "华东｜东经约120.2°" },
  { value: "南京", label: "南京", meta: "华东｜东经约118.8°" },
  { value: "苏州", label: "苏州", meta: "华东｜东经约120.6°" },
  { value: "成都", label: "成都", meta: "西南｜东经约104.1°" },
  { value: "重庆", label: "重庆", meta: "西南｜东经约106.6°" },
  { value: "武汉", label: "武汉", meta: "华中｜东经约114.3°" },
  { value: "西安", label: "西安", meta: "西北｜东经约108.9°" },
  { value: "郑州", label: "郑州", meta: "华中｜东经约113.6°" },
  { value: "长沙", label: "长沙", meta: "华中｜东经约113.0°" },
  { value: "天津", label: "天津", meta: "华北｜东经约117.2°" },
  { value: "青岛", label: "青岛", meta: "华东｜东经约120.4°" },
  { value: "厦门", label: "厦门", meta: "华东｜东经约118.1°" },
  { value: "福州", label: "福州", meta: "华东｜东经约119.3°" },
  { value: "济南", label: "济南", meta: "华东｜东经约117.0°" },
  { value: "合肥", label: "合肥", meta: "华东｜东经约117.2°" },
  { value: "南昌", label: "南昌", meta: "华中｜东经约115.9°" },
  { value: "昆明", label: "昆明", meta: "西南｜东经约102.8°" },
  { value: "贵阳", label: "贵阳", meta: "西南｜东经约106.6°" },
  { value: "南宁", label: "南宁", meta: "华南｜东经约108.3°" },
  { value: "海口", label: "海口", meta: "华南｜东经约110.3°" },
  { value: "沈阳", label: "沈阳", meta: "东北｜东经约123.4°" },
  { value: "大连", label: "大连", meta: "东北｜东经约121.6°" },
  { value: "长春", label: "长春", meta: "东北｜东经约125.3°" },
  { value: "哈尔滨", label: "哈尔滨", meta: "东北｜东经约126.6°" },
  { value: "太原", label: "太原", meta: "华北｜东经约112.5°" },
  { value: "石家庄", label: "石家庄", meta: "华北｜东经约114.5°" },
  { value: "呼和浩特", label: "呼和浩特", meta: "华北｜东经约111.7°" },
  { value: "兰州", label: "兰州", meta: "西北｜东经约103.8°" },
  { value: "银川", label: "银川", meta: "西北｜东经约106.2°" },
  { value: "西宁", label: "西宁", meta: "西北｜东经约101.8°" },
  { value: "乌鲁木齐", label: "乌鲁木齐", meta: "西北｜东经约87.6°" },
  { value: "拉萨", label: "拉萨", meta: "西南｜东经约91.1°" },
  { value: "香港", label: "香港", meta: "华南｜东经约114.2°" },
  { value: "澳门", label: "澳门", meta: "华南｜东经约113.5°" },
  { value: "台北", label: "台北", meta: "台湾｜东经约121.6°" },
  { value: "海外/其他", label: "海外/其他", meta: "后续可补充具体城市" },
];

const BIRTH_PLACE_LONGITUDES = {
  北京: 116.4,
  上海: 121.5,
  广州: 113.3,
  深圳: 114.1,
  杭州: 120.2,
  南京: 118.8,
  苏州: 120.6,
  成都: 104.1,
  重庆: 106.6,
  武汉: 114.3,
  西安: 108.9,
  郑州: 113.6,
  长沙: 113,
  天津: 117.2,
  青岛: 120.4,
  厦门: 118.1,
  福州: 119.3,
  济南: 117,
  合肥: 117.2,
  南昌: 115.9,
  昆明: 102.8,
  贵阳: 106.6,
  南宁: 108.3,
  海口: 110.3,
  沈阳: 123.4,
  大连: 121.6,
  长春: 125.3,
  哈尔滨: 126.6,
  太原: 112.5,
  石家庄: 114.5,
  呼和浩特: 111.7,
  兰州: 103.8,
  银川: 106.2,
  西宁: 101.8,
  乌鲁木齐: 87.6,
  拉萨: 91.1,
  香港: 114.2,
  澳门: 113.5,
  台北: 121.6,
};

const QUESTION_TYPES = {
  今年运势: {
    focus: ["正官", "七杀", "正财", "偏财", "正印", "偏印"],
    tone: "年度节奏",
    conclusion: "今年适合把重点放在已经具备基础的事情上。机会可以争取，但要避免同时铺太多战线。",
    suggestion: "把目标拆成季度节奏，优先处理能带来确定反馈的工作、财务和关系安排。",
  },
  近三年: {
    focus: ["正官", "七杀", "正财", "偏财", "食神", "伤官", "正印", "偏印"],
    tone: "阶段观察",
    conclusion: "近三年会有阶段性变化，不建议只按某一年做重决定。更适合一年打基础、一年验证、一年收拢。",
    suggestion: "每年复盘一次方向、现金流和合作边界，不把三年的资源一次押完。",
  },
  财运: {
    focus: ["正财", "偏财", "食神", "伤官"],
    tone: "财务节奏",
    conclusion: "财务上可以看机会，但不适合只凭情绪加码。更重要的是看这笔钱能不能稳定承接。",
    suggestion: "投资、借贷、合伙和分成要先写清楚，先做小范围验证，再决定是否扩大投入。",
  },
  事业: {
    focus: ["正官", "七杀", "正印", "偏印", "食神", "伤官"],
    tone: "事业判断",
    conclusion: "事业上有推进空间，但不一定要立刻做大转向。先争取更清晰的职责、资源和可衡量成果。",
    suggestion: "跳槽、调岗或创业前，先确认岗位稳定性、收入结构、合同边界和承压成本。",
  },
  婚姻感情: {
    focus: ["正财", "偏财", "正官", "七杀", "比肩", "劫财", "伤官"],
    tone: "关系节奏",
    conclusion: "关系里真正要处理的是现实边界和期待差异，不只是当下情绪好坏。",
    suggestion: "重要沟通放在情绪稳定时进行，涉及金钱、家庭、承诺和未来安排的问题要具体到行动。",
  },
  健康: {
    focus: ["正印", "偏印", "食神", "伤官", "正官", "七杀"],
    tone: "健康观察",
    conclusion: "健康问题不能直接断病名，但可以看今年是否容易出现压力、消耗和恢复力不足。重点不是吓自己，而是提前管理作息、体检和风险信号。",
    suggestion: "把命理提示当作风险提醒：规律作息、减少持续透支，已有症状或体检异常时以医生判断为准。",
  },
  日常饮食: {
    focus: ["食神", "伤官", "正财", "偏财", "正印", "偏印"],
    tone: "日常应事",
    conclusion: "这类问题不看长期大运结论，而看当天、当时的五行象意和十神倾向。它不能精准到唯一菜名，但可以给出更像哪一类饭菜。",
    suggestion: "把结果当作今晚饮食倾向：看五行对应口味和食材，再结合你现实中的选择场景。",
  },
  子女生育: {
    focus: ["食神", "伤官", "正印", "偏印", "正官", "七杀", "正财", "偏财"],
    tone: "子女与生育",
    conclusion: "子女和生育问题不能用“综合判断”套模板，重点要看食神、伤官的子女星有没有被原局、大运和流年引动，同时看印星代表的身体修复和现实支持。",
    suggestion: "把命理时间窗口当作备孕、检查和家庭分工的参考，不把它当成医学保证；涉及二胎时，还要同步看身体状态、伴侣配合和照护资源。",
  },
  家庭居住: {
    focus: ["正印", "偏印", "正财", "偏财", "食神", "伤官", "正官", "七杀"],
    tone: "家庭居住",
    conclusion: "家庭和居住问题重点不是单看房子，而是看稳定感、资源成本、照顾责任和现实约束是否能同时承接。",
    suggestion: "搬家、装修、购置或家庭安排先算时间、预算、照护责任和合同边界，再结合运年看适合推进还是先缓一缓。",
  },
  合同风险: {
    focus: ["正官", "七杀", "正印", "偏印", "伤官", "劫财"],
    tone: "合同风险",
    conclusion: "合同和风险类问题要先看规则、责任、证据和违约成本，命盘只提示哪里容易起压力或冲突，不能替代法律判断。",
    suggestion: "涉及合同、手续、纠纷或审批时，把关键条款、付款节点、责任边界和退出条件写清楚；必要时请专业人士审核。",
  },
  出行迁移: {
    focus: ["正官", "七杀", "正印", "偏印", "正财", "偏财", "食神", "伤官"],
    tone: "出行迁移",
    conclusion: "出行、迁移和换城市不只看能不能动，还要看动了以后资源、工作、家庭和风险是否接得住。",
    suggestion: "远行、出差、搬迁或换城市前，先确认目的、预算、证件手续、住宿交通和备选方案，再看运年是否适合主动变化。",
  },
  学业: {
    focus: ["正印", "偏印", "食神", "伤官"],
    tone: "学习节奏",
    conclusion: "学习和进修适合先把方向收窄，再用阶段成果验证，不要只停留在信息收集。",
    suggestion: "固定学习时段，配合输出、考试或作品复盘；如果基础不稳，先补方法和框架。",
  },
  自定义: {
    focus: ["正官", "七杀", "正财", "偏财", "正印", "偏印", "食神", "伤官", "比肩", "劫财"],
    tone: "综合判断",
    conclusion: "这个问题需要先拆成时间、对象、投入和风险，再判断适合主动推进还是保守观察。",
    suggestion: "先明确你要问的是钱、工作、关系、健康还是选择，再按轻重缓急处理。",
  },
};

const questionMap = {
  今年运势: "今年整体运势怎么样？",
  财运: "财运什么时候会有起色？",
  事业: "今年适不适合换工作？",
  婚姻感情: "这段关系还能不能继续？",
  健康: "健康方面要注意什么？",
  子女生育: "我什么时候会有二胎？",
  家庭居住: "近期适不适合搬家或装修？",
  合同风险: "这份合同有没有明显风险？",
  出行迁移: "近期适不适合出行或换城市？",
  近三年: "近三年整体走势如何？",
};

const seedProfiles = [];
const LEGACY_SEED_IDS = new Set(["liu", "wang", "chen", "li", "zhao", "zhou"]);

let archiveCards = [];
let profilePickerItems = [];
let profiles = [];
let currentProfileId = null;
let activeFilter = "all";
let toastTimer = null;
let currentQuestionTag = "自定义";
let currentHomeView = "conversation";
const screenScrollPositions = new Map();
let dbPromise = null;
let editingProfileId = null;
let questionRecords = [];
let legacyMigrationProfiles = [];
let datePickerState = { year: 1990, month: 1, day: 1 };
let datePickerScrollTimers = {};
let datePickerProgrammaticScroll = false;
let activeOptionPickerType = null;
let actionProfileId = null;

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("is-show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastEl.classList.remove("is-show");
  }, 1800);
}

async function disableOfflineMode() {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
    if ("caches" in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys
          .filter((key) => key.includes("mingli-pwa"))
          .map((key) => caches.delete(key)),
      );
    }
  } catch (error) {
    // 网络版不依赖 Service Worker，历史缓存清理失败不影响当前使用。
  }
}

function mod(value, base) {
  return ((value % base) + base) % base;
}

function openDatabase() {
  if (!("indexedDB" in window)) {
    return Promise.resolve(null);
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PROFILE_STORE)) {
        db.createObjectStore(PROFILE_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(CHART_STORE)) {
        db.createObjectStore(CHART_STORE, { keyPath: "profileId" });
      }
      if (!db.objectStoreNames.contains(QUESTION_STORE)) {
        const questionStore = db.createObjectStore(QUESTION_STORE, { keyPath: "id" });
        questionStore.createIndex("profileId", "profileId", { unique: false });
      }
      if (!db.objectStoreNames.contains(BACKUP_STORE)) {
        db.createObjectStore(BACKUP_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

async function readAllFromDb(storeName) {
  const db = await openDatabase();
  if (!db) return null;

  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, "readonly").objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function writeAllToDb(storeName, records) {
  const db = await openDatabase();
  if (!db) return;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    store.clear();
    records.forEach((record) => store.put(record));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function putRecordToDb(storeName, record) {
  const db = await openDatabase();
  if (!db) return;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function readProfilesFromDb() {
  return readAllFromDb(PROFILE_STORE);
}

async function persistProfiles() {
  await window.MingliCloudData.upsertProfiles(profiles.map(serializeProfile));
  await writeAllToDb(PROFILE_STORE, profiles.map(serializeProfile));
}

async function readQuestionsFromDb() {
  return (await readAllFromDb(QUESTION_STORE)) || [];
}

async function persistQuestion(record) {
  await putRecordToDb(QUESTION_STORE, record);
}

async function persistChart(chart) {
  if (chart.error) return;
  const profile = profiles.find((item) => item.id === chart.profileId);
  if (!profile) return;
  await window.MingliCloudData.saveCurrentChart(profile, chart);
  await putRecordToDb(CHART_STORE, chart);
}

async function readSetting(key) {
  if (key === CURRENT_PROFILE_KEY) {
    const settings = await window.MingliCloudData.getSettings();
    return settings?.current_profile_id || null;
  }
  const db = await openDatabase();
  if (!db) return null;

  return new Promise((resolve, reject) => {
    const request = db.transaction(SETTINGS_STORE, "readonly").objectStore(SETTINGS_STORE).get(key);
    request.onsuccess = () => resolve(request.result?.value ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function writeSetting(key, value) {
  if (key === CURRENT_PROFILE_KEY) {
    await window.MingliCloudData.saveSettings({ currentProfileId: value });
  }
  const db = await openDatabase();
  if (!db) return;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SETTINGS_STORE, "readwrite");
    transaction.objectStore(SETTINGS_STORE).put({ key, value });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function parseDateParts(value) {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!matched) return null;
  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return { year, month, day, iso: `${matched[1]}-${matched[2]}-${matched[3]}` };
}

function formatDateValue(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getDaysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function normalizeDatePickerState(nextState) {
  const year = Math.min(DATE_PICKER_MAX_YEAR, Math.max(DATE_PICKER_MIN_YEAR, Number(nextState.year) || 1990));
  const month = Math.min(12, Math.max(1, Number(nextState.month) || 1));
  const maxDay = getDaysInMonth(year, month);
  const day = Math.min(maxDay, Math.max(1, Number(nextState.day) || 1));
  return { year, month, day };
}

function getDatePickerDisplayValue() {
  return formatDateValue(datePickerState.year, datePickerState.month, datePickerState.day);
}

function getDatePickerLabel() {
  return `${datePickerState.year}年${String(datePickerState.month).padStart(2, "0")}月${String(datePickerState.day).padStart(2, "0")}日`;
}

function formatDateTimeLabel(date) {
  const parts = getBeijingDateParts(date);
  return [
    parts.year,
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-") + ` ${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

function parseTimeParts(value) {
  const matched = /^(\d{2}):(\d{2})$/.exec(String(value || ""));
  if (!matched) return null;
  const hour = Number(matched[1]);
  const minute = Number(matched[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute, label: `${matched[1]}:${matched[2]}` };
}

function getHourBranch(value) {
  const time = parseTimeParts(value);
  if (!time) return null;
  const branchIndex = time.hour === 23 ? 0 : Math.floor((time.hour + 1) / 2);
  return {
    branch: BRANCHES[branchIndex],
    branchIndex,
    label: `${BRANCHES[branchIndex]}时`,
  };
}

function getDayOfYear(date) {
  const parts = getBeijingDateParts(date);
  return Math.floor((Date.UTC(parts.year, parts.monthIndex, parts.day) - Date.UTC(parts.year, 0, 0)) / DAY_MS);
}

function getEquationOfTimeMinutes(date) {
  const day = getDayOfYear(date);
  const angle = (2 * Math.PI * (day - 81)) / 364;
  return 9.87 * Math.sin(2 * angle) - 7.53 * Math.cos(angle) - 1.5 * Math.sin(angle);
}

function getBirthLongitude(profile) {
  return BIRTH_PLACE_LONGITUDES[profile.birthPlace] ?? null;
}

function getTrueSolarTimeInfo(profile, standardDate, hasKnownTime) {
  const longitude = getBirthLongitude(profile);
  if (!hasKnownTime || longitude === null) {
    return {
      applied: false,
      longitude,
      offsetMinutes: 0,
      calculationDate: standardDate,
      label: hasKnownTime ? "未选择出生地，按北京时间排盘" : "出生时间未知，按正午估算年月日柱",
    };
  }

  const longitudeOffset = (longitude - 120) * 4;
  const equationOffset = getEquationOfTimeMinutes(standardDate);
  const offsetMinutes = Math.round(longitudeOffset + equationOffset);
  const calculationDate = new Date(standardDate.getTime() + offsetMinutes * 60000);
  return {
    applied: true,
    longitude,
    longitudeOffset: Number(longitudeOffset.toFixed(1)),
    equationOffset: Number(equationOffset.toFixed(1)),
    offsetMinutes,
    calculationDate,
    label: `${profile.birthPlace}经度约${longitude}°，真太阳时修正${offsetMinutes >= 0 ? "+" : ""}${offsetMinutes}分钟`,
  };
}

function parseLegacyMeta(meta) {
  const text = String(meta || "");
  const parts = text.split("｜");
  const dateMatched = /(\d{4}-\d{2}-\d{2})/.exec(text);
  const branchMatched = /([子丑寅卯辰巳午未申酉戌亥])时/.exec(text);
  return {
    genderLabel: parts[0] === "乾造" || parts[0] === "坤造" ? parts[0] : "",
    birthDate: dateMatched?.[1] || "",
    birthTime: branchMatched ? BRANCH_TIME_DEFAULTS[branchMatched[1]] || "" : "",
    relation: parts[2] || "",
  };
}

function normalizeGender(profile, legacy) {
  if (profile.gender === "male" || profile.gender === "female") return profile.gender;
  if (profile.genderLabel === "乾造" || legacy.genderLabel === "乾造") return "male";
  if (profile.genderLabel === "坤造" || legacy.genderLabel === "坤造") return "female";
  if (profile.gender === "乾造") return "male";
  if (profile.gender === "坤造") return "female";
  return "male";
}

function getGenderLabel(profile) {
  return profile.gender === "female" ? "坤造" : "乾造";
}

function getCalendarType(profile) {
  return profile.calendarType === "lunar" ? "lunar" : "solar";
}

function buildProfileMeta(profile) {
  const calendarLabel = profile.calendarType === "lunar" ? "农历 " : "";
  const birthDate = profile.birthDate || "日期未填";
  const hourLabel = getHourBranch(profile.birthTime)?.label || "时辰未知";
  return `${profile.genderLabel}｜${calendarLabel}${birthDate} ${hourLabel}｜${profile.relation}`;
}

function buildProfileKeywords(profile) {
  return [
    profile.name,
    profile.genderLabel,
    profile.calendarType === "lunar" ? "农历" : "阳历",
    profile.birthDate?.slice(0, 4),
    profile.birthDate,
    profile.relation,
    profile.birthPlace,
    profile.note,
    profile.recentQuestion,
    profile.recentTag,
  ]
    .filter(Boolean)
    .join(" ");
}

function withDerivedProfileFields(profile) {
  const next = {
    ...profile,
    genderLabel: getGenderLabel(profile),
  };
  next.avatar = String(next.name || "档").slice(0, 1);
  next.meta = buildProfileMeta(next);
  next.keywords = buildProfileKeywords(next);
  return next;
}

function normalizeProfile(profile, index = 0) {
  const legacy = parseLegacyMeta(profile?.meta);
  const now = Date.now();
  const gender = normalizeGender(profile || {}, legacy);
  const birthDate = parseDateParts(profile?.birthDate)?.iso || legacy.birthDate || "";
  const birthTime = parseTimeParts(profile?.birthTime)?.label || legacy.birthTime || "";
  const birthPlace = String(profile?.birthPlace || "");
  const suppliedLongitude = Number(profile?.birthLongitude);
  const hasSuppliedLongitude = profile?.birthLongitude !== null && profile?.birthLongitude !== "" && Number.isFinite(suppliedLongitude);
  const birthLongitude = hasSuppliedLongitude
    ? suppliedLongitude
    : BIRTH_PLACE_LONGITUDES[birthPlace] ?? null;
  const rawRelation = String(profile?.relation || legacy.relation || "客户");
  const isSelf = Boolean(profile?.isSelf) || rawRelation === "本人";
  const relation = isSelf ? "本人" : rawRelation === "家人" ? "家人" : "客户";
  const rawId = String(profile?.id || "");
  const id = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawId)
    ? rawId
    : crypto.randomUUID();

  return withDerivedProfileFields({
    id,
    name: String(profile?.name || "未命名档案"),
    gender,
    calendarType: getCalendarType(profile || {}),
    lunarLeapMonth: Boolean(profile?.lunarLeapMonth),
    birthDate,
    birthTime,
    birthPlace,
    birthLongitude,
    relation,
    isSelf,
    note: String(profile?.note || ""),
    recentQuestion: String(profile?.recentQuestion || "暂无问事记录"),
    recentTag: String(profile?.recentTag || "自定义"),
    lastConsultedAt: Number(profile?.lastConsultedAt || 0) || null,
    retentionDueAt: Number(profile?.retentionDueAt || 0) || null,
    retentionExpiredAt: Number(profile?.retentionExpiredAt || 0) || null,
    createdAt: Number(profile?.createdAt || now),
    updatedAt: Number(profile?.updatedAt || now),
  });
}

function isLegacySeedProfile(profile) {
  return LEGACY_SEED_IDS.has(profile.id) && /某某$/.test(profile.name || "");
}

function serializeProfile(profile) {
  const normalized = withDerivedProfileFields(profile);
  return {
    id: normalized.id,
    name: normalized.name,
    gender: normalized.gender,
    genderLabel: normalized.genderLabel,
    calendarType: normalized.calendarType,
    lunarLeapMonth: Boolean(normalized.lunarLeapMonth),
    birthDate: normalized.birthDate,
    birthTime: normalized.birthTime,
    birthPlace: normalized.birthPlace,
    birthLongitude: normalized.birthLongitude,
    relation: normalized.relation,
    isSelf: Boolean(normalized.isSelf),
    note: normalized.note,
    recentQuestion: normalized.recentQuestion,
    recentTag: normalized.recentTag,
    lastConsultedAt: normalized.lastConsultedAt || null,
    retentionDueAt: normalized.retentionDueAt || null,
    retentionExpiredAt: normalized.retentionExpiredAt || null,
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt,
    avatar: normalized.avatar,
    meta: normalized.meta,
    keywords: normalized.keywords,
  };
}

function lunarMonthToNumber(value) {
  const monthText = String(value || "").replace("闰", "").replace("月", "");
  const monthMap = {
    正: 1,
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
    十一: 11,
    冬: 11,
    十二: 12,
    腊: 12,
  };
  if (/^\d+$/.test(monthText)) return Number(monthText);
  return monthMap[monthText] || null;
}

function getChineseCalendarParts(date) {
  if (!Intl?.DateTimeFormat) return null;
  const formatter = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", {
    timeZone: BAZI_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "relatedYear")?.value);
  const monthText = parts.find((part) => part.type === "month")?.value || "";
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const month = lunarMonthToNumber(monthText);
  if (!year || !month || !day) return null;
  return {
    year,
    month,
    day,
    leap: monthText.includes("闰"),
  };
}

function getLunarYearInfo(year) {
  return LUNAR_YEAR_INFO[year - LUNAR_INFO_START_YEAR] || null;
}

function isLunarTableYearSupported(year) {
  return year >= LUNAR_INFO_START_YEAR && year <= LUNAR_INFO_END_YEAR && Boolean(getLunarYearInfo(year));
}

function getLunarLeapMonth(year) {
  const yearInfo = getLunarYearInfo(year);
  return yearInfo ? yearInfo & 0xf : 0;
}

function getLunarLeapMonthDays(year) {
  const yearInfo = getLunarYearInfo(year);
  if (!yearInfo || !getLunarLeapMonth(year)) return 0;
  return yearInfo & 0x10000 ? 30 : 29;
}

function getLunarMonthDays(year, month) {
  const yearInfo = getLunarYearInfo(year);
  if (!yearInfo || month < 1 || month > 12) return 0;
  return yearInfo & (0x10000 >> month) ? 30 : 29;
}

function getLunarYearDays(year) {
  const yearInfo = getLunarYearInfo(year);
  if (!yearInfo) return 0;
  let days = 348;
  for (let mask = 0x8000; mask > 0x8; mask >>= 1) {
    if (yearInfo & mask) days += 1;
  }
  return days + getLunarLeapMonthDays(year);
}

function createSolarBirthFromDate(date, extra = {}) {
  const parts = getBeijingDateParts(date);
  const { year, month, day } = parts;
  return {
    year,
    month,
    day,
    iso: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    ...extra,
  };
}

function convertLunarToSolarByTable(lunarDate, leapMonth = false) {
  const parts = parseDateParts(lunarDate);
  if (!parts) return null;
  if (!isLunarTableYearSupported(parts.year)) return null;

  const leapMonthNumber = getLunarLeapMonth(parts.year);
  const isLeapMonth = Boolean(leapMonth);
  if (isLeapMonth && leapMonthNumber !== parts.month) return null;

  const maxDays = isLeapMonth ? getLunarLeapMonthDays(parts.year) : getLunarMonthDays(parts.year, parts.month);
  if (!maxDays || parts.day < 1 || parts.day > maxDays) return null;

  let offsetDays = 0;
  for (let year = LUNAR_INFO_START_YEAR; year < parts.year; year += 1) {
    offsetDays += getLunarYearDays(year);
  }

  for (let month = 1; month < parts.month; month += 1) {
    offsetDays += getLunarMonthDays(parts.year, month);
    if (leapMonthNumber === month) {
      offsetDays += getLunarLeapMonthDays(parts.year);
    }
  }

  if (isLeapMonth) {
    offsetDays += getLunarMonthDays(parts.year, parts.month);
  }

  offsetDays += parts.day - 1;
  const solarDate = addBeijingDays(createBeijingDate(1900, 0, 31), offsetDays);
  return createSolarBirthFromDate(solarDate, { lunarSource: "table" });
}

function convertLunarToSolarWithIntl(lunarDate, leapMonth = false) {
  const parts = parseDateParts(lunarDate);
  if (!parts) return null;

  const start = createBeijingDate(parts.year, 0, 1, 12);
  const end = createBeijingDate(parts.year + 1, 2, 15, 12);
  for (let date = new Date(start); date <= end; date = addBeijingDays(date, 1)) {
    const lunar = getChineseCalendarParts(date);
    if (
      lunar &&
      lunar.year === parts.year &&
      lunar.month === parts.month &&
      lunar.day === parts.day &&
      lunar.leap === Boolean(leapMonth)
    ) {
      return createSolarBirthFromDate(date, { lunarSource: "intl" });
    }
  }
  return null;
}

function convertLunarToSolar(lunarDate, leapMonth = false) {
  return convertLunarToSolarByTable(lunarDate, leapMonth) || convertLunarToSolarWithIntl(lunarDate, leapMonth);
}

function resolveSolarBirth(profile) {
  if (!profile.birthDate) {
    return { error: "请先补全出生日期" };
  }

  if (profile.calendarType === "lunar") {
    const converted = convertLunarToSolar(profile.birthDate, profile.lunarLeapMonth);
    if (!converted) {
      return { error: `农历日期暂时无法换算，请检查日期、闰月选择或是否超出 ${LUNAR_INFO_START_YEAR}-${LUNAR_INFO_END_YEAR} 年范围` };
    }
    return {
      ...converted,
      original: profile.birthDate,
      convertedFromLunar: true,
    };
  }

  const parts = parseDateParts(profile.birthDate);
  if (!parts) {
    return { error: "出生日期格式不正确" };
  }
  return parts;
}

function getSolarTermEstimateTimestamp(year, termIndex) {
  return (
    Date.UTC(1900, 0, 6, 2, 5) +
    31556925974.7 * (year - 1900) +
    SOLAR_TERM_ESTIMATE_MINUTES[termIndex] * 60000
  );
}

function getJulianDay(timestamp) {
  return timestamp / DAY_MS + JULIAN_DAY_UNIX_EPOCH;
}

function getSunApparentLongitude(timestamp) {
  const julianCenturies = (getJulianDay(timestamp) - JULIAN_DAY_J2000) / 36525;
  const meanLongitude = mod(
    280.46646 + julianCenturies * (36000.76983 + 0.0003032 * julianCenturies),
    360,
  );
  const meanAnomaly = mod(
    357.52911 + julianCenturies * (35999.05029 - 0.0001537 * julianCenturies),
    360,
  );
  const meanAnomalyRad = meanAnomaly * DEG_TO_RAD;
  const center =
    Math.sin(meanAnomalyRad) * (1.914602 - julianCenturies * (0.004817 + 0.000014 * julianCenturies)) +
    Math.sin(2 * meanAnomalyRad) * (0.019993 - 0.000101 * julianCenturies) +
    Math.sin(3 * meanAnomalyRad) * 0.000289;
  const omega = (125.04 - 1934.136 * julianCenturies) * DEG_TO_RAD;
  return mod(meanLongitude + center - 0.00569 - 0.00478 * Math.sin(omega), 360);
}

function getSolarTermLongitude(termIndex) {
  return mod(SOLAR_TERM_START_LONGITUDE + termIndex * 15, 360);
}

function getLongitudeDelta(longitude, targetLongitude) {
  return mod(longitude - targetLongitude + 540, 360) - 180;
}

function getSolarTermMoment(year, termIndex) {
  const cacheKey = `${year}-${termIndex}`;
  const cachedTimestamp = solarTermMomentCache.get(cacheKey);
  if (cachedTimestamp) {
    return new Date(cachedTimestamp);
  }

  const targetLongitude = getSolarTermLongitude(termIndex);
  const estimateTimestamp = getSolarTermEstimateTimestamp(year, termIndex);
  let low = estimateTimestamp - 5 * DAY_MS;
  let high = estimateTimestamp + 5 * DAY_MS;
  let lowDelta = getLongitudeDelta(getSunApparentLongitude(low), targetLongitude);
  let highDelta = getLongitudeDelta(getSunApparentLongitude(high), targetLongitude);

  for (let guard = 0; lowDelta > 0 && guard < 10; guard += 1) {
    high = low;
    highDelta = lowDelta;
    low -= DAY_MS;
    lowDelta = getLongitudeDelta(getSunApparentLongitude(low), targetLongitude);
  }

  for (let guard = 0; highDelta < 0 && guard < 10; guard += 1) {
    low = high;
    lowDelta = highDelta;
    high += DAY_MS;
    highDelta = getLongitudeDelta(getSunApparentLongitude(high), targetLongitude);
  }

  if (lowDelta > 0 || highDelta < 0) {
    solarTermMomentCache.set(cacheKey, estimateTimestamp);
    return new Date(estimateTimestamp);
  }

  for (let step = 0; step < 48; step += 1) {
    const middle = (low + high) / 2;
    const middleDelta = getLongitudeDelta(getSunApparentLongitude(middle), targetLongitude);
    if (middleDelta <= 0) {
      low = middle;
    } else {
      high = middle;
    }
  }

  const timestamp = Math.round((low + high) / 2);
  solarTermMomentCache.set(cacheKey, timestamp);
  return new Date(timestamp);
}

function getMajorTermEntries(startYear, endYear) {
  const entries = [];
  for (let year = startYear; year <= endYear; year += 1) {
    MONTH_BOUNDARIES.forEach((boundary) => {
      entries.push({
        ...boundary,
        date: getSolarTermMoment(year, boundary.termIndex),
        year,
      });
    });
  }
  return entries.sort((a, b) => a.date - b.date);
}

function findMonthBoundary(date) {
  const year = getBeijingDateParts(date).year;
  const entries = getMajorTermEntries(year - 1, year + 1);
  let selected = entries[0];
  entries.forEach((entry) => {
    if (entry.date <= date) {
      selected = entry;
    }
  });
  return selected;
}

function isSameCalendarDate(a, b) {
  const aParts = getBeijingDateParts(a);
  const bParts = getBeijingDateParts(b);
  return aParts.year === bParts.year && aParts.monthIndex === bParts.monthIndex && aParts.day === bParts.day;
}

function getMajorTermOnDate(date) {
  const year = getBeijingDateParts(date).year;
  return getMajorTermEntries(year - 1, year + 1).find((entry) => isSameCalendarDate(entry.date, date));
}

function getPillarByIndex(index) {
  return SEXAGENARY[mod(index, 60)];
}

function getPillarIndex(name) {
  return SEXAGENARY.findIndex((item) => item.name === name);
}

function getYearPillarByYear(year) {
  return getPillarByIndex(year - 4);
}

function calculateYearPillar(birthDate) {
  const year = getBeijingDateParts(birthDate).year;
  const liChun = getSolarTermMoment(year, 2);
  const baziYear = birthDate < liChun ? year - 1 : year;
  return {
    ...getYearPillarByYear(baziYear),
    baziYear,
    boundary: liChun,
  };
}

function getCurrentBaziYear(date = new Date()) {
  return calculateYearPillar(date).baziYear;
}

function calculateMonthPillar(birthDate, yearStem) {
  const boundary = findMonthBoundary(birthDate);
  const firstStem = FIRST_MONTH_STEM[yearStem];
  const stem = STEMS[mod(STEMS.indexOf(firstStem) + boundary.monthOffset, 10)];
  return {
    stem,
    branch: boundary.branch,
    name: `${stem}${boundary.branch}`,
    termName: boundary.termName,
    termDate: boundary.date.toISOString(),
  };
}

function calculateDayPillar(dayDate) {
  const parts = getBeijingDateParts(dayDate);
  const offset = Math.floor(
    (Date.UTC(parts.year, parts.monthIndex, parts.day) -
      Date.UTC(1900, 0, 31)) /
      DAY_MS,
  );
  return getPillarByIndex(offset + 40);
}

function calculateHourPillar(dayStem, birthTime) {
  const hourBranch = getHourBranch(birthTime);
  if (!hourBranch) return null;
  const firstStem = FIRST_HOUR_STEM[dayStem];
  const stem = STEMS[mod(STEMS.indexOf(firstStem) + hourBranch.branchIndex, 10)];
  return {
    stem,
    branch: hourBranch.branch,
    name: `${stem}${hourBranch.branch}`,
  };
}

function getRelationType(sourceElement, targetElement) {
  if (sourceElement === targetElement) return "same";
  if (ELEMENT_GENERATES[sourceElement] === targetElement) return "generates";
  if (ELEMENT_CONTROLS[sourceElement] === targetElement) return "controls";
  if (ELEMENT_CONTROLS[targetElement] === sourceElement) return "controlledBy";
  if (ELEMENT_GENERATES[targetElement] === sourceElement) return "generatedBy";
  return "same";
}

function getTenGod(dayStem, targetStem) {
  if (!dayStem || !targetStem) return "";
  const dayElement = STEM_ELEMENTS[dayStem];
  const targetElement = STEM_ELEMENTS[targetStem];
  const samePolarity = STEM_POLARITY[dayStem] === STEM_POLARITY[targetStem];
  const relation = getRelationType(dayElement, targetElement);

  if (relation === "same") return samePolarity ? "比肩" : "劫财";
  if (relation === "generates") return samePolarity ? "食神" : "伤官";
  if (relation === "controls") return samePolarity ? "偏财" : "正财";
  if (relation === "controlledBy") return samePolarity ? "七杀" : "正官";
  if (relation === "generatedBy") return samePolarity ? "偏印" : "正印";
  return "";
}

function enrichPillar(label, pillar, dayStem) {
  if (!pillar) return null;
  const hidden = HIDDEN_STEMS[pillar.branch] || [];
  return {
    ...pillar,
    label,
    stemGod: label === "日柱" ? "日主" : getTenGod(dayStem, pillar.stem),
    branchGod: hidden[0] ? getTenGod(dayStem, hidden[0]) : "",
    hiddenStems: hidden,
    hiddenGods: hidden.map((stem) => ({
      stem,
      god: getTenGod(dayStem, stem),
      element: STEM_ELEMENTS[stem],
    })),
  };
}

function collectTenGodCounts(pillars) {
  const counts = {};
  Object.values(pillars).forEach((pillar) => {
    if (!pillar) return;
    if (pillar.stemGod && pillar.stemGod !== "日主") {
      counts[pillar.stemGod] = (counts[pillar.stemGod] || 0) + 1;
    }
    pillar.hiddenGods.forEach((item) => {
      counts[item.god] = (counts[item.god] || 0) + 0.5;
    });
  });
  return counts;
}

function countElements(pillars) {
  const counts = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  Object.values(pillars).forEach((pillar) => {
    if (!pillar) return;
    counts[STEM_ELEMENTS[pillar.stem]] += 1;
    counts[BRANCH_ELEMENTS[pillar.branch]] += 1;
    pillar.hiddenStems.slice(1).forEach((stem) => {
      counts[STEM_ELEMENTS[stem]] += 0.35;
    });
  });
  return counts;
}

function analyzeStrength(pillars) {
  const dayStem = pillars.day.stem;
  const dayElement = STEM_ELEMENTS[dayStem];
  const resourceElement = Object.keys(ELEMENT_GENERATES).find((element) => ELEMENT_GENERATES[element] === dayElement);
  const monthElement = BRANCH_ELEMENTS[pillars.month.branch];
  let score = 0;
  const evidence = [];

  if (monthElement === dayElement) {
    score += 3;
    evidence.push(`月令为${pillars.month.branch}${monthElement}，对${dayStem}${dayElement}日主有直接支撑。`);
  } else if (ELEMENT_GENERATES[monthElement] === dayElement) {
    score += 2;
    evidence.push(`月令${monthElement}生扶日主${dayElement}，基础气势不弱。`);
  } else if (ELEMENT_CONTROLS[monthElement] === dayElement) {
    score -= 2;
    evidence.push(`月令${monthElement}克制日主${dayElement}，承压感较明显。`);
  } else if (ELEMENT_GENERATES[dayElement] === monthElement) {
    score -= 1;
    evidence.push(`日主${dayElement}生月令${monthElement}，输出与消耗并存。`);
  } else {
    score -= 0.5;
    evidence.push(`月令${monthElement}与日主${dayElement}关系偏消耗，需要看印比是否补足。`);
  }

  Object.entries(pillars).forEach(([key, pillar]) => {
    if (!pillar) return;
    if (key !== "day") {
      const stemElement = STEM_ELEMENTS[pillar.stem];
      if (stemElement === dayElement) score += 1;
      if (ELEMENT_GENERATES[stemElement] === dayElement) score += 0.8;
      if (ELEMENT_CONTROLS[stemElement] === dayElement) score -= 0.8;
      if (ELEMENT_CONTROLS[dayElement] === stemElement) score -= 0.4;
      if (ELEMENT_GENERATES[dayElement] === stemElement) score -= 0.4;
    }
    pillar.hiddenStems.forEach((stem, index) => {
      const hiddenElement = STEM_ELEMENTS[stem];
      const weight = index === 0 ? 0.7 : 0.35;
      if (hiddenElement === dayElement) score += weight;
      if (ELEMENT_GENERATES[hiddenElement] === dayElement) score += weight * 0.8;
      if (ELEMENT_CONTROLS[hiddenElement] === dayElement) score -= weight * 0.7;
    });
  });

  const elementCounts = countElements(pillars);
  const support = elementCounts[dayElement] + elementCounts[resourceElement];
  const drain = Object.entries(elementCounts)
    .filter(([element]) => element !== dayElement && ELEMENT_GENERATES[element] !== dayElement)
    .reduce((sum, [, count]) => sum + count, 0);

  evidence.push(`天干和藏干中，生扶力量约 ${support.toFixed(1)}，克泄耗力量约 ${drain.toFixed(1)}。`);

  const rootPillars = Object.values(pillars)
    .filter(Boolean)
    .filter((pillar) => pillar.hiddenStems.some((stem) => STEM_ELEMENTS[stem] === dayElement))
    .map((pillar) => pillar.label);
  const resourceRootPillars = Object.values(pillars)
    .filter(Boolean)
    .filter((pillar) => pillar.hiddenStems.some((stem) => STEM_ELEMENTS[stem] === resourceElement))
    .map((pillar) => pillar.label);
  const supportingStems = Object.values(pillars)
    .filter((pillar) => pillar && pillar.label !== "日柱")
    .filter((pillar) => [dayElement, resourceElement].includes(STEM_ELEMENTS[pillar.stem]))
    .map((pillar) => `${pillar.label}${pillar.stem}`);
  const commandStatus = monthElement === dayElement || ELEMENT_GENERATES[monthElement] === dayElement
    ? "得令"
    : ELEMENT_CONTROLS[monthElement] === dayElement || ELEMENT_GENERATES[dayElement] === monthElement
      ? "失令"
      : "月令作用偏中性";
  const groundStatus = rootPillars.length ? "得地" : resourceRootPillars.length ? "有印根相生" : "少根";
  const momentumStatus = supportingStems.length ? "得势" : "天干少助";
  evidence.push(`子平三审：月令${commandStatus}；${rootPillars.length ? `${rootPillars.join("、")}见本气或余气根` : "地支未见明显同类根"}；${supportingStems.length ? `${supportingStems.join("、")}生扶日主` : "天干未见明显印比生扶"}。`);

  let label = "中和";
  if (score >= 3.2) label = "偏旺";
  if (score <= 0.2) label = "偏弱";

  const summary =
    label === "偏旺"
      ? "可主动承担，但要避免过度坚持和竞争心太重。"
      : label === "偏弱"
        ? "更需要资源、节奏和外部支撑，不宜一次承压过大。"
        : "进退空间相对均衡，适合按资源成熟度做判断。";
  const favorableGods =
    label === "偏旺"
      ? ["正财", "偏财", "正官", "七杀", "食神", "伤官"]
      : label === "偏弱"
        ? ["正印", "偏印", "比肩", "劫财"]
        : ["正财", "偏财", "正官", "正印", "食神"];
  const unfavorableGods =
    label === "偏旺"
      ? ["正印", "偏印", "比肩", "劫财"]
      : label === "偏弱"
        ? ["正财", "偏财", "正官", "七杀", "食神", "伤官"]
        : [];

  return {
    label,
    score: Number(score.toFixed(2)),
    dayElement,
    elementCounts,
    evidence,
    favorableGods,
    unfavorableGods,
    summary,
    zipingFactors: {
      command: {
        status: commandStatus,
        monthBranch: pillars.month.branch,
        monthElement,
        evidence: evidence[0],
      },
      ground: {
        status: groundStatus,
        rootPillars,
        resourceRootPillars,
      },
      momentum: {
        status: momentumStatus,
        supportingStems,
      },
    },
  };
}

function detectSpecialPattern(strength, tenGodCounts) {
  const count = (...gods) => gods.reduce((sum, god) => sum + (tenGodCounts[god] || 0), 0);
  const support = count("正印", "偏印", "比肩", "劫财");
  const output = count("食神", "伤官");
  const wealth = count("正财", "偏财");
  const officer = count("正官", "七杀");
  const total = support + output + wealth + officer;
  const dominant = [
    { name: "从财格", value: wealth, favorableGods: ["正财", "偏财", "食神", "伤官"] },
    { name: "从官杀格", value: officer, favorableGods: ["正官", "七杀", "正财", "偏财"] },
    { name: "从儿格", value: output, favorableGods: ["食神", "伤官", "正财", "偏财"] },
  ].sort((a, b) => b.value - a.value)[0];

  if (strength.label === "偏弱" && support <= 0.5 && dominant.value >= 3 && dominant.value / Math.max(total, 1) >= 0.55) {
    return {
      ...dominant,
      type: "从格",
      basis: `日主偏弱，印比生扶仅约 ${support.toFixed(1)}，${dominant.name.replace("格", "")}力量约 ${dominant.value.toFixed(1)}，且占主要气势。`,
      confidence: "中等",
    };
  }

  if (strength.label === "偏旺" && support >= 4.5 && output + wealth + officer <= 1) {
    const nameMap = { 木: "曲直仁寿格", 火: "炎上格", 土: "稼穑格", 金: "从革格", 水: "润下格" };
    return {
      name: nameMap[strength.dayElement],
      type: "专旺格",
      favorableGods: ["正印", "偏印", "比肩", "劫财"],
      basis: `日主偏旺，印比同党约 ${support.toFixed(1)}，克泄耗仅约 ${(output + wealth + officer).toFixed(1)}，原局气势高度集中于${strength.dayElement}。`,
      confidence: "中等",
    };
  }

  return null;
}

function getPatternAnalysis(pillars, tenGodCounts, strength) {
  const month = pillars.month;
  const monthMainStem = month.hiddenStems[0];
  const monthGod = getTenGod(pillars.day.stem, monthMainStem);
  const regularName = monthGod === "比肩" ? "建禄格" : monthGod === "劫财" ? "月劫格" : `${monthGod}格`;
  const specialPattern = detectSpecialPattern(strength, tenGodCounts);
  const name = specialPattern?.name || regularName;
  const exposedPillars = Object.values(pillars)
    .filter((pillar) => pillar && pillar.label !== "日柱" && pillar.stem === monthMainStem)
    .map((pillar) => pillar.label);
  const protectMap = {
    正官: ["正财", "偏财", "正印", "偏印"],
    七杀: ["食神", "正印", "偏印"],
    正财: ["食神", "伤官", "正官"],
    偏财: ["食神", "伤官", "正官"],
    正印: ["正官", "七杀", "比肩", "劫财"],
    偏印: ["正官", "七杀", "比肩", "劫财"],
    食神: ["正财", "偏财", "比肩"],
    伤官: ["正财", "偏财", "正印"],
    比肩: ["正官", "七杀", "食神", "伤官"],
    劫财: ["正官", "七杀", "食神", "伤官"],
  };
  const disruptMap = {
    正官: ["伤官"],
    七杀: ["正财", "偏财"],
    正财: ["比肩", "劫财"],
    偏财: ["比肩", "劫财"],
    正印: ["正财", "偏财"],
    偏印: ["食神"],
    食神: ["偏印"],
    伤官: ["正官"],
    比肩: ["正财", "偏财"],
    劫财: ["正财", "偏财"],
  };
  const supportingGods = (protectMap[monthGod] || []).filter((god) => (tenGodCounts[god] || 0) > 0);
  const disruptingGods = (disruptMap[monthGod] || []).filter((god) => (tenGodCounts[god] || 0) > 0);
  const regularStatus = exposedPillars.length
    ? disruptingGods.length ? "月令主气透干，成格中带制约" : "月令主气透干，格局取象较清楚"
    : "月令主气未透，以月令本气立格，需结合藏干和岁运";
  const status = specialPattern
    ? `满足严格的${specialPattern.type}初筛条件；仍需结合全局根气复核，不以单一分值定格`
    : regularStatus;

  return {
    method: "月令主气取格",
    name,
    regularName,
    special: Boolean(specialPattern),
    specialType: specialPattern?.type || null,
    monthBranch: month.branch,
    monthMainStem,
    monthGod,
    exposed: exposedPillars.length > 0,
    exposedPillars,
    supportingGods,
    disruptingGods,
    status,
    basis: [
      `月令为${month.branch}，主气${monthMainStem}对应日主十神为${monthGod}。`,
      ...(specialPattern ? [specialPattern.basis] : []),
      exposedPillars.length ? `${monthMainStem}透于${exposedPillars.join("、")}。` : `${monthMainStem}未透天干。`,
      supportingGods.length ? `原局见${supportingGods.join("、")}，可作为护格或通关条件。` : "原局未见明显护格十神透出。",
      disruptingGods.length ? `原局同时见${disruptingGods.join("、")}，格局使用时需先看制化。` : "原局未见该格最直接的破格因素。",
    ],
    confidence: specialPattern?.confidence || (exposedPillars.length ? "较高" : "中等"),
    specialFavorableGods: specialPattern?.favorableGods || [],
  };
}

function getUsefulGodAnalysis(pillars, strength, pattern, tenGodCounts) {
  const count = (...gods) => gods.reduce((sum, god) => sum + (tenGodCounts[god] || 0), 0);
  let primaryGods = [];
  let favorableGods = [];
  let unfavorableGods = [];
  let strategy = "以月令格局为纲，结合日主旺衰取用";
  const basis = [`日主${strength.label}，旺衰分值 ${strength.score}。`, `月令取${pattern.name}。`];

  if (pattern.special) {
    primaryGods = pattern.specialFavorableGods.slice(0, 2);
    favorableGods = pattern.specialFavorableGods;
    const allGods = ["正印", "偏印", "比肩", "劫财", "食神", "伤官", "正财", "偏财", "正官", "七杀"];
    unfavorableGods = allGods.filter((god) => !favorableGods.includes(god));
    strategy = `${pattern.name}按顺势制化取用`;
    basis.push(`${pattern.status}，取用先顺从原局集中气势，再看岁运是否破格。`);
  } else if (strength.label === "偏弱") {
    const pressure = count("正官", "七杀", "正财", "偏财", "食神", "伤官");
    const support = count("正印", "偏印", "比肩", "劫财");
    if (count("正官", "七杀") >= 1) {
      primaryGods = ["正印", "偏印"];
      strategy = "印星化官杀并生身";
    } else {
      primaryGods = ["比肩", "劫财"];
      strategy = "印比扶身";
    }
    favorableGods = ["正印", "偏印", "比肩", "劫财"];
    unfavorableGods = ["正财", "偏财", "正官", "七杀", "食神", "伤官"];
    basis.push(`生扶约 ${support.toFixed(1)}，克泄耗约 ${pressure.toFixed(1)}，先补承接能力。`);
  } else if (strength.label === "偏旺") {
    const output = count("食神", "伤官");
    const wealth = count("正财", "偏财");
    if (output < 1.5) {
      primaryGods = ["食神", "伤官"];
      strategy = "食伤泄秀";
    } else if (wealth < 1.5) {
      primaryGods = ["正财", "偏财"];
      strategy = "财星耗身并承接食伤";
    } else {
      primaryGods = ["正官", "七杀"];
      strategy = "官杀制身";
    }
    favorableGods = ["食神", "伤官", "正财", "偏财", "正官", "七杀"];
    unfavorableGods = ["正印", "偏印", "比肩", "劫财"];
    basis.push(`日主偏旺，优先以${primaryGods.join("、")}实现克、泄、耗的平衡。`);
  } else {
    const patternUseMap = {
      正官格: ["正财", "偏财", "正印", "偏印"],
      七杀格: ["食神", "正印", "偏印"],
      正财格: ["食神", "伤官"],
      偏财格: ["食神", "伤官"],
      正印格: ["正官", "七杀"],
      偏印格: ["正官", "七杀"],
      食神格: ["正财", "偏财"],
      伤官格: ["正财", "偏财", "正印"],
      建禄格: ["食神", "伤官", "正财", "偏财", "正官", "七杀"],
      月劫格: ["食神", "伤官", "正财", "偏财", "正官", "七杀"],
    };
    primaryGods = patternUseMap[pattern.name] || ["正财", "正官", "食神"];
    favorableGods = [...new Set([...primaryGods, ...pattern.supportingGods])];
    unfavorableGods = pattern.disruptingGods;
    strategy = "日主中和，按月令格局护格取用";
    basis.push(`旺衰中和，不强行扶抑，优先服务于${pattern.name}的成格与护格。`);
  }

  return {
    method: "子平法：月令格局、旺衰与制化取用",
    strategy,
    primaryGods,
    favorableGods,
    unfavorableGods,
    basis,
    confidence: strength.label === "中和" && !pattern.exposed ? "中等" : "较高",
    note: "按子平法月令格局与制化取用；从格、专旺格只在严格初筛条件满足时标记并提示复核，不以神煞、纳音或其他术数替代。",
  };
}

function makeRelationRecord(type, members, entries, element = "") {
  const sources = entries.map((entry) => ({ key: entry.key, label: entry.label, source: entry.source }));
  const memberText = members.join("");
  const effectMap = {
    天干五合: `天干相合，是否化${element}仍需看月令、通根与制化`,
    六合: `地支六合${element ? `，有合向${element}之意` : ""}，是否成化仍需看月令和透干`,
    三合: `三合${element}局齐全，${element}气得到集中引动`,
    三会: `三会${element}方齐全，季节方气得到集中引动`,
    六冲: "地支相冲，主位置、关系或状态发生明显牵动",
    六害: "地支相害，主配合不畅、隐性牵制或关系损耗",
    六破: "地支相破，主原有结构被扰动、承诺或计划容易松动",
    相刑: "地支相刑，主反复、压力、别扭或规则性摩擦",
    三刑: "三刑齐全，相关宫位与事务的压力和反复更明显",
    自刑: "同支自刑，主同类问题反复、自我牵制或内耗",
  };
  return {
    type,
    members,
    name: `${memberText}${type}`,
    element: element || null,
    sources,
    scope: sources.some((item) => item.source !== "原局") ? "岁运触发" : "原局",
    effect: effectMap[type] || "干支关系被触发",
  };
}

function analyzeStemBranchRelations(entries, onlyTriggered = false) {
  const relations = [];
  const seen = new Set();
  const add = (record) => {
    const sourceKey = record.sources.map((item) => item.key).sort().join("+");
    const key = `${record.type}:${record.members.join("")}:${sourceKey}`;
    if (!seen.has(key)) {
      seen.add(key);
      relations.push(record);
    }
  };
  const valid = entries.filter((entry) => entry?.stem && entry?.branch);

  for (let first = 0; first < valid.length; first += 1) {
    for (let second = first + 1; second < valid.length; second += 1) {
      const pair = [valid[first], valid[second]];
      if (onlyTriggered && pair.every((entry) => entry.source === "原局")) continue;
      const stems = pair.map((entry) => entry.stem);
      const branches = pair.map((entry) => entry.branch);
      const stemCombination = STEM_COMBINATIONS.find((item) => item.members.every((stem) => stems.includes(stem)));
      if (stemCombination) add(makeRelationRecord("天干五合", stemCombination.members, pair, stemCombination.element));
      BRANCH_PAIR_RELATIONS.forEach((relation) => {
        if (relation.members.every((branch) => branches.includes(branch))) {
          add(makeRelationRecord(relation.type, relation.members, pair, relation.element));
        }
      });
      if (branches[0] === branches[1] && SELF_PUNISH_BRANCHES.has(branches[0])) {
        add(makeRelationRecord("自刑", [branches[0], branches[1]], pair));
      }
    }
  }

  BRANCH_GROUP_RELATIONS.forEach((relation) => {
    const matchedEntries = relation.members.map((branch) => valid.find((entry) => entry.branch === branch));
    if (matchedEntries.every(Boolean)) {
      if (!onlyTriggered || matchedEntries.some((entry) => entry.source !== "原局")) {
        add(makeRelationRecord(relation.type, relation.members, matchedEntries, relation.element));
      }
    }
  });

  return relations;
}

function calculateAge(solarBirth, atDate) {
  const current = getBeijingDateParts(atDate);
  let age = current.year - solarBirth.year;
  const birthdayThisYear = createBeijingDate(current.year, solarBirth.month - 1, solarBirth.day);
  if (atDate < birthdayThisYear) age -= 1;
  return Math.max(0, age);
}

function formatStartAge(years) {
  const fullYears = Math.floor(years);
  const months = Math.max(0, Math.round((years - fullYears) * 12));
  if (fullYears <= 0 && months <= 0) return "出生后不久";
  if (months === 12) return `${fullYears + 1}岁`;
  return months > 0 ? `${fullYears}岁${months}个月` : `${fullYears}岁`;
}

function calculateLuck(profile, rawPillars, solarBirth, birthDate) {
  const isMale = profile.gender === "male";
  const yearIsYang = STEM_POLARITY[rawPillars.year.stem] === "阳";
  const forward = (isMale && yearIsYang) || (!isMale && !yearIsYang);
  const birthYear = getBeijingDateParts(birthDate).year;
  const entries = getMajorTermEntries(birthYear - 1, birthYear + 1);
  const target = forward
    ? entries.find((entry) => entry.date > birthDate)
    : entries
        .slice()
        .reverse()
        .find((entry) => entry.date < birthDate);
  const diffDays = target ? Math.abs(target.date - birthDate) / DAY_MS : 0;
  const startAge = diffDays / 3;
  const monthIndex = getPillarIndex(rawPillars.month.name);
  const dayStem = rawPillars.day.stem;
  const lucks = Array.from({ length: 8 }, (_, index) => {
    const pillar = getPillarByIndex(monthIndex + (forward ? index + 1 : -(index + 1)));
    const start = startAge + index * 10;
    return {
      ...pillar,
      startAge: start,
      endAge: start + 10,
      startYear: solarBirth.year + Math.round(start),
      stemGod: getTenGod(dayStem, pillar.stem),
      branchGod: getTenGod(dayStem, HIDDEN_STEMS[pillar.branch]?.[0]),
    };
  });
  const age = calculateAge(solarBirth, new Date());
  const currentIndex = Math.floor((age - startAge) / 10);
  const current = currentIndex >= 0 ? lucks[currentIndex] || lucks[lucks.length - 1] : null;

  return {
    direction: forward ? "顺行" : "逆行",
    targetTermName: target?.termName || "",
    targetTermDateText: target ? formatDateTimeLabel(target.date) : "",
    diffDays: Number(diffDays.toFixed(2)),
    startAge,
    startAgeText: formatStartAge(startAge),
    currentAge: age,
    current,
    items: lucks,
  };
}

function getGodDomain(god) {
  if (god === "正财" || god === "偏财") return "财务与资源";
  if (god === "正官" || god === "七杀") return "责任、职位与压力";
  if (god === "正印" || god === "偏印") return "学习、资质与支持";
  if (god === "食神" || god === "伤官") return "表达、作品与输出";
  if (god === "比肩" || god === "劫财") return "合作、竞争与边界";
  return "整体节奏";
}

function makeAnnualNote(annual, strength) {
  const domain = getGodDomain(annual.stemGod);
  const favorText = strength.favorableGods.includes(annual.stemGod)
    ? "为当前命局所喜"
    : strength.unfavorableGods.includes(annual.stemGod)
      ? "对当前命局形成压力"
      : "影响中性";
  if (annual.stemGod === "正财" || annual.stemGod === "偏财") {
    return strength.label === "偏弱" ? `财星出现但${favorText}，投入宜轻量验证` : `财星${favorText}，适合清晰定价`;
  }
  if (annual.stemGod === "正官" || annual.stemGod === "七杀") {
    return strength.label === "偏弱" ? `官杀临岁且${favorText}，先确认承压边界` : `官杀${favorText}，可推进职责目标`;
  }
  if (annual.stemGod === "正印" || annual.stemGod === "偏印") {
    return `印星${favorText}，利学习、资质、复盘和取得支持`;
  }
  if (annual.stemGod === "食神" || annual.stemGod === "伤官") {
    return `食伤${favorText}，适合表达输出，也要留意沟通锋芒`;
  }
  return `${domain}被引动，${favorText}，注意合作与分工`;
}

function calculateAnnuals(dayStem, strength, startYear = getCurrentBaziYear(), count = 3) {
  return Array.from({ length: count }, (_, index) => {
    const year = startYear + index;
    const pillar = getYearPillarByYear(year);
    const stemGod = getTenGod(dayStem, pillar.stem);
    return {
      ...pillar,
      year,
      stemGod,
      branchGod: getTenGod(dayStem, HIDDEN_STEMS[pillar.branch]?.[0]),
      note: makeAnnualNote({ ...pillar, stemGod }, strength),
    };
  });
}

function createRelationEntry(key, label, source, pillar) {
  if (!pillar) return null;
  return {
    key,
    label,
    source,
    stem: pillar.stem,
    branch: pillar.branch,
    name: pillar.name,
  };
}

function analyzeZiPingRules(pillars, strength, luck, annuals, tenGodCounts) {
  const natalEntries = [
    createRelationEntry("year", "年柱", "原局", pillars.year),
    createRelationEntry("month", "月柱", "原局", pillars.month),
    createRelationEntry("day", "日柱", "原局", pillars.day),
    createRelationEntry("hour", "时柱", "原局", pillars.hour),
  ].filter(Boolean);
  const luckEntry = createRelationEntry("luck", "当前大运", "大运", luck.current);
  const annualEntry = createRelationEntry("annual", "当前流年", "流年", annuals[0]);
  const pattern = getPatternAnalysis(pillars, tenGodCounts, strength);
  const usefulGod = getUsefulGodAnalysis(pillars, strength, pattern, tenGodCounts);
  const natalRelations = analyzeStemBranchRelations(natalEntries);
  const luckRelations = luckEntry
    ? analyzeStemBranchRelations([...natalEntries, luckEntry], true).filter((relation) =>
        relation.sources.some((source) => source.source === "大运"),
      )
    : [];
  const annualRelations = annualEntry
    ? analyzeStemBranchRelations([...natalEntries, annualEntry], true).filter((relation) =>
        relation.sources.some((source) => source.source === "流年"),
      )
    : [];
  const activeRelations = analyzeStemBranchRelations(
    [...natalEntries, luckEntry, annualEntry].filter(Boolean),
    true,
  );

  return {
    ruleset: RULESET_LABEL,
    pattern,
    usefulGod,
    relations: {
      natal: natalRelations,
      luck: luckRelations,
      annual: annualRelations,
      active: activeRelations,
    },
    summary: {
      natalRelationCount: natalRelations.length,
      luckTriggerCount: luckRelations.length,
      annualTriggerCount: annualRelations.length,
      strongestSignals: activeRelations.slice(0, 6).map((relation) => relation.name),
    },
  };
}

function serializePillarFact(pillar) {
  if (!pillar) return null;
  return {
    label: pillar.label,
    name: pillar.name,
    stem: pillar.stem,
    branch: pillar.branch,
    stemGod: pillar.stemGod,
    branchGod: pillar.branchGod,
    hiddenStems: pillar.hiddenStems,
    hiddenGods: pillar.hiddenGods,
  };
}

function buildStructuredBaziFacts(profile, data) {
  return {
    schemaVersion: "bazi-facts-v1",
    engineVersion: APP_VERSION,
    ruleset: RULESET_LABEL,
    rulesetProvenance: RULESET_PROVENANCE,
    methodology: {
      order: ["月令", "日主旺衰", "格局成败", "用神制化", "原局关系", "大运流年引动"],
      excludedSystems: ["神煞断法", "纳音断法", "生肖断法", "紫微斗数", "西方占星"],
    },
    subject: {
      profileId: profile.id,
      gender: profile.gender,
      relation: profile.relation,
    },
    calendar: {
      timeZone: BAZI_TIME_ZONE,
      solarBirth: data.solarBirth.iso,
      standardBirthTime: data.standardBirthDate.toISOString(),
      calculationBirthTime: data.birthDate.toISOString(),
      calculationBirthLabel: formatDateTimeLabel(data.birthDate),
      trueSolarTimeApplied: Boolean(data.solarTime.applied),
      trueSolarOffsetMinutes: data.solarTime.offsetMinutes || 0,
      yearBoundary: "立春交节时刻",
      monthBoundary: "十二节交节时刻",
      dayBoundary: "23:00 后换日",
    },
    pillars: {
      year: serializePillarFact(data.pillars.year),
      month: serializePillarFact(data.pillars.month),
      day: serializePillarFact(data.pillars.day),
      hour: serializePillarFact(data.pillars.hour),
    },
    tenGodCounts: data.tenGodCounts,
    strength: data.strength,
    pattern: data.rules.pattern,
    usefulGod: data.rules.usefulGod,
    relations: data.rules.relations,
    luck: {
      direction: data.luck.direction,
      startAge: data.luck.startAge,
      startAgeText: data.luck.startAgeText,
      current: data.luck.current,
    },
    annual: data.annuals[0],
    futureAnnuals: data.annuals,
    warnings: [
      ...(data.pillars.hour ? [] : ["出生时间未知，时柱和涉及具体时间的关系不完整。"]),
      data.rules.usefulGod.note,
    ],
  };
}

function calculateBaziChart(profile) {
  const solarBirth = resolveSolarBirth(profile);
  if (solarBirth.error) {
    return {
      profileId: profile.id,
      profileName: profile.name,
      error: solarBirth.error,
      calculatedAt: Date.now(),
    };
  }

  const time = parseTimeParts(profile.birthTime);
  const standardBirthDate = createBeijingDate(
    solarBirth.year,
    solarBirth.month - 1,
    solarBirth.day,
    time?.hour ?? 12,
    time?.minute ?? 0,
  );
  const solarTime = getTrueSolarTimeInfo(profile, standardBirthDate, Boolean(time));
  const birthDate = solarTime.calculationDate;
  const dayDate = new Date(birthDate);
  const birthParts = getBeijingDateParts(birthDate);
  if (birthParts.hour >= 23) {
    dayDate.setTime(addBeijingDays(dayDate, 1).getTime());
  }

  const year = calculateYearPillar(birthDate);
  const month = calculateMonthPillar(birthDate, year.stem);
  const day = calculateDayPillar(dayDate);
  const calculationTime = time
    ? `${String(birthParts.hour).padStart(2, "0")}:${String(birthParts.minute).padStart(2, "0")}`
    : "";
  if (time) {
    const standardHourBranch = getHourBranch(profile.birthTime);
    const calculationHourBranch = getHourBranch(calculationTime);
    solarTime.standardHourBranch = standardHourBranch?.branch || "";
    solarTime.calculationHourBranch = calculationHourBranch?.branch || "";
    solarTime.hourChanged = Boolean(
      solarTime.applied &&
        standardHourBranch &&
        calculationHourBranch &&
        standardHourBranch.branch !== calculationHourBranch.branch,
    );
    solarTime.dateChanged = Boolean(solarTime.applied && !isSameCalendarDate(standardBirthDate, birthDate));
  }
  const hour = time ? calculateHourPillar(day.stem, calculationTime) : null;
  const termAmbiguity = time ? null : getMajorTermOnDate(standardBirthDate);
  const rawPillars = { year, month, day, hour };
  const pillars = {
    year: enrichPillar("年柱", year, day.stem),
    month: enrichPillar("月柱", month, day.stem),
    day: enrichPillar("日柱", day, day.stem),
    hour: enrichPillar("时柱", hour, day.stem),
  };
  const strength = analyzeStrength(pillars);
  const luck = calculateLuck(profile, rawPillars, solarBirth, birthDate);
  const annuals = calculateAnnuals(day.stem, strength);
  const tenGodCounts = collectTenGodCounts(pillars);
  const rules = analyzeZiPingRules(pillars, strength, luck, annuals, tenGodCounts);
  const facts = buildStructuredBaziFacts(profile, {
    solarBirth,
    standardBirthDate,
    birthDate,
    solarTime,
    pillars,
    tenGodCounts,
    strength,
    luck,
    annuals,
    rules,
  });

  return {
    profileId: profile.id,
    profileName: profile.name,
    profileGender: profile.gender,
    solarBirth,
    birthDateTime: birthDate.toISOString(),
    standardBirthDateTime: standardBirthDate.toISOString(),
    standardBirthLabel: formatDateTimeLabel(standardBirthDate),
    calculationBirthLabel: formatDateTimeLabel(birthDate),
    solarTime,
    termAmbiguity,
    dayChangedAtZi: Boolean(birthParts.hour >= 23),
    pillars,
    tenGodCounts,
    strength,
    luck,
    annuals,
    rules,
    facts,
    calculatedAt: Date.now(),
  };
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function createDateWheelButton(type, value, label) {
  const button = createElement("button", datePickerState[type] === value ? "is-selected" : "", label);
  button.type = "button";
  button.dataset.datePart = type;
  button.dataset.value = String(value);
  button.setAttribute("aria-pressed", datePickerState[type] === value ? "true" : "false");
  return button;
}

function getDateWheel(type) {
  return {
    year: dateYearWheel,
    month: dateMonthWheel,
    day: dateDayWheel,
  }[type];
}

function getDateWheelOptions() {
  const yearCount = DATE_PICKER_MAX_YEAR - DATE_PICKER_MIN_YEAR + 1;
  return {
    year: Array.from({ length: yearCount }, (_, index) => DATE_PICKER_MIN_YEAR + index),
    month: Array.from({ length: 12 }, (_, index) => index + 1),
    day: Array.from({ length: getDaysInMonth(datePickerState.year, datePickerState.month) }, (_, index) => index + 1),
  };
}

function clearDatePickerScrollTimers() {
  Object.values(datePickerScrollTimers).forEach((timer) => window.clearTimeout(timer));
  datePickerScrollTimers = {};
}

function scrollSelectedDateItemsIntoView() {
  datePickerProgrammaticScroll = true;
  clearDatePickerScrollTimers();
  [dateYearWheel, dateMonthWheel, dateDayWheel].forEach((wheel) => {
    const selected = wheel.querySelector(".is-selected");
    if (selected) {
      const wheelRect = wheel.getBoundingClientRect();
      const selectedRect = selected.getBoundingClientRect();
      const selectedOffset = selectedRect.top - wheelRect.top + wheel.scrollTop;
      const previousSnapType = wheel.style.scrollSnapType;
      wheel.style.scrollSnapType = "none";
      wheel.scrollTop = selectedOffset - (wheel.clientHeight - selectedRect.height) / 2;
      window.requestAnimationFrame(() => {
        wheel.style.scrollSnapType = previousSnapType;
      });
    }
  });
  window.setTimeout(() => {
    datePickerProgrammaticScroll = false;
  }, 320);
}

function renderDatePicker() {
  datePickerProgrammaticScroll = true;
  clearDatePickerScrollTimers();
  const options = getDateWheelOptions();

  dateYearWheel.replaceChildren(...options.year.map((year) => createDateWheelButton("year", year, `${year}`)));
  dateMonthWheel.replaceChildren(...options.month.map((month) => createDateWheelButton("month", month, `${month}`.padStart(2, "0"))));
  dateDayWheel.replaceChildren(...options.day.map((day) => createDateWheelButton("day", day, `${day}`.padStart(2, "0"))));
  datePickerValue.textContent = getDatePickerLabel();
  window.setTimeout(scrollSelectedDateItemsIntoView, 20);
}

function openDatePicker() {
  const current = parseDateParts(profileBirthDate.value);
  datePickerState = normalizeDatePickerState(current || { year: 1990, month: 1, day: 1 });
  renderDatePicker();
  datePickerModal.hidden = false;
}

function closeDatePicker() {
  clearDatePickerScrollTimers();
  datePickerModal.hidden = true;
}

function selectDatePart(type, value) {
  datePickerState = normalizeDatePickerState({
    ...datePickerState,
    [type]: value,
  });
  renderDatePicker();
}

function getCenteredDateWheelValue(type) {
  const wheel = getDateWheel(type);
  const buttons = Array.from(wheel.querySelectorAll("button"));
  if (!buttons.length) return null;

  const wheelRect = wheel.getBoundingClientRect();
  const center = wheelRect.top + wheelRect.height / 2;
  const closest = buttons.reduce(
    (best, button) => {
      const buttonRect = button.getBoundingClientRect();
      const buttonCenter = buttonRect.top + buttonRect.height / 2;
      const distance = Math.abs(buttonCenter - center);
      return distance < best.distance ? { button, distance } : best;
    },
    { button: buttons[0], distance: Infinity },
  ).button;

  return Number(closest.dataset.value);
}

function handleDateWheelScroll(type) {
  if (datePickerProgrammaticScroll) return;

  window.clearTimeout(datePickerScrollTimers[type]);
  datePickerScrollTimers[type] = window.setTimeout(() => {
    if (datePickerProgrammaticScroll || datePickerModal.hidden) return;
    const value = getCenteredDateWheelValue(type);
    if (value && datePickerState[type] !== value) {
      selectDatePart(type, value);
    }
  }, 90);
}

function getBirthTimeLabel(value) {
  const option = BIRTH_TIME_OPTIONS.find((item) => item.value === value);
  if (option && option.value) return option.shortLabel || option.label;
  if (option) return "";
  const branch = getHourBranch(value);
  const time = parseTimeParts(value);
  return branch && time ? `${branch.label} ${time.label}` : "";
}

function setBirthTimeControl(value) {
  const normalized = parseTimeParts(value)?.label || "";
  profileBirthTime.dataset.value = normalized;
  profileBirthTime.value = getBirthTimeLabel(normalized);
}

function getOptionPickerConfig(type) {
  const configs = {
    birthTime: {
      title: "出生时间",
      subtitle: "按时辰选择",
      searchable: false,
      options: BIRTH_TIME_OPTIONS,
      currentValue: () => profileBirthTime.dataset.value || "",
    },
    relation: {
      title: "关系标签",
      subtitle: "用于区分档案",
      searchable: false,
      options: RELATION_OPTIONS,
      currentValue: () => profileRelation.value || "",
    },
    birthPlace: {
      title: "出生地",
      subtitle: "城市级即可",
      searchable: true,
      options: BIRTH_PLACE_OPTIONS,
      currentValue: () => profileBirthPlace.value || "",
    },
  };
  return configs[type];
}

function renderOptionPicker() {
  const config = getOptionPickerConfig(activeOptionPickerType);
  if (!config) return;

  const keyword = optionPickerSearch.value.trim().toLowerCase();
  const currentValue = config.currentValue();
  const options = config.options.filter((option) => {
    if (!keyword) return true;
    return `${option.label} ${option.value} ${option.meta || ""}`.toLowerCase().includes(keyword);
  });

  if (options.length === 0) {
    optionPickerList.replaceChildren(createElement("div", "option-picker-empty", "没有匹配项"));
    return;
  }

  optionPickerList.replaceChildren(
    ...options.map((option) => {
      const button = createElement("button", option.value === currentValue ? "option-picker-item is-selected" : "option-picker-item");
      button.type = "button";
      button.dataset.optionValue = option.value;

      const title = createElement("strong", "", option.label);
      button.append(title);
      if (option.meta) {
        button.append(createElement("span", "", option.meta));
      }
      return button;
    }),
  );
}

function openOptionPicker(type) {
  const config = getOptionPickerConfig(type);
  if (!config) return;

  activeOptionPickerType = type;
  optionPickerTitle.textContent = config.title;
  optionPickerSubtitle.textContent = config.subtitle;
  optionPickerSearch.value = "";
  optionPickerSearchWrap.hidden = !config.searchable;
  renderOptionPicker();
  optionPickerModal.hidden = false;
}

function closeOptionPicker() {
  optionPickerModal.hidden = true;
  activeOptionPickerType = null;
  optionPickerSearch.value = "";
}

function applyOptionPickerValue(value) {
  const config = getOptionPickerConfig(activeOptionPickerType);
  if (!config) return;
  const option = config.options.find((item) => item.value === value);
  if (!option) return;

  if (activeOptionPickerType === "birthTime") {
    setBirthTimeControl(option.value);
  } else if (activeOptionPickerType === "relation") {
    profileRelation.value = option.value;
  } else if (activeOptionPickerType === "birthPlace") {
    profileBirthPlace.value = option.value;
  }

  [profileBirthTime, profileRelation, profileBirthPlace].forEach((field) => {
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  });
  closeOptionPicker();
}

function replaceList(list, items, renderItem) {
  list.replaceChildren(...items.map(renderItem));
}

function createPillarCell(label, pillar) {
  const cell = createElement("div");
  const labelEl = createElement("span", "", label);
  const nameEl = createElement("strong", "", pillar?.name || "未知");
  const godText = pillar ? `${pillar.stemGod}｜${pillar.branchGod || "藏干少"}` : "出生时间未知";
  const godEl = createElement("em", "", godText);
  cell.append(labelEl, nameEl, godEl);
  return cell;
}

function renderChartError(chart) {
  renderChartSummaryError(chart.error);
  chartPillars.replaceChildren(
    createPillarCell("年柱", null),
    createPillarCell("月柱", null),
    createPillarCell("日柱", null),
    createPillarCell("时柱", null),
  );
  currentLuckLabel.textContent = "当前：出生信息待完善";
  luckTimeline.replaceChildren(
    createElement("div", "is-current", "").appendChild(createElement("span", "", chart.error)).parentElement,
  );
  chartBasis.replaceChildren(createBasisArticle("排盘状态", chart.error));
}

function createBasisArticle(title, text) {
  const article = createElement("article");
  article.append(createElement("h3", "", title), createElement("p", "", text));
  return article;
}

function topTenGods(counts) {
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return "十神分布较清淡";
  return sorted
    .slice(0, 3)
    .map(([god, count]) => `${god}${Number.isInteger(count) ? count : count.toFixed(1)}`)
    .join("、");
}

function getLeadingTenGod(chart) {
  const sorted = Object.entries(chart.tenGodCounts || {}).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || "十神";
}

function getMonthCommandText(chart) {
  const month = chart.pillars.month;
  const dayElement = chart.strength.dayElement;
  const monthElement = BRANCH_ELEMENTS[month.branch];
  if (monthElement === dayElement) {
    return `月令${month.branch}${monthElement}直接帮身，原局底气主要来自季节根气`;
  }
  if (ELEMENT_GENERATES[monthElement] === dayElement) {
    return `月令${month.branch}${monthElement}生扶日主，遇事更需要借助资源、学习和外部支持`;
  }
  if (ELEMENT_CONTROLS[monthElement] === dayElement) {
    return `月令${month.branch}${monthElement}克制日主，现实中更容易先感到规则、压力或责任`;
  }
  if (ELEMENT_GENERATES[dayElement] === monthElement) {
    return `日主生月令${month.branch}${monthElement}，表达、付出和消耗会比较明显`;
  }
  return `月令${month.branch}${monthElement}与日主关系偏耗，做事要看后续印比能否补足`;
}

function getChartSummary(chart) {
  const annual = chart.annuals[0];
  const currentLuck = chart.luck.current;
  const annualDomain = getGodDomain(annual.stemGod);
  const dayMaster = `${chart.pillars.day.stem}${chart.strength.dayElement}`;
  const monthText = getMonthCommandText(chart);
  const leadingGod = getLeadingTenGod(chart);
  const tenGodText = topTenGods(chart.tenGodCounts);
  const pattern = chart.rules.pattern;
  const usefulGod = chart.rules.usefulGod;
  const currentLuckText = currentLuck
    ? `现在走${currentLuck.name}大运，透出${currentLuck.stemGod}，阶段重点落在${getGodDomain(currentLuck.stemGod)}。`
    : `目前还没正式起运，约${chart.luck.startAgeText}后节奏会更清楚。`;
  const annualTone = usefulGod.favorableGods.includes(annual.stemGod)
    ? "今年这股力量对你是加分项，可以主动用起来"
    : usefulGod.unfavorableGods.includes(annual.stemGod)
      ? "今年这股力量会带来压力，适合先控节奏、控投入"
      : "今年这股力量影响中性，关键看现实条件是否成熟";

  const title = `${chart.profileName}：${chart.pillars.day.name}日柱，${dayMaster}日主${chart.strength.label}`;
  const strengthText =
    chart.strength.label === "偏旺"
      ? "日主偏旺，优点是行动力和主见比较明显；问题是容易把事情都揽到自己身上，合作、分工和规则要提前说清。"
      : chart.strength.label === "偏弱"
        ? "日主偏弱，遇到机会或压力时更需要资源、专业、团队和稳定节奏来托住，不适合靠一口气硬冲。"
        : "日主中和，命盘不是单边强弱，做事更看当下资源、合作条件和时间窗口是否配合。";

  return {
    title,
    text: `${monthText}；按月令主气取${pattern.name}，${pattern.status}。十神里较明显的是${tenGodText}。${strengthText}当前以${usefulGod.primaryGods.join("、")}为主要取用方向，采用${usefulGod.strategy}。${currentLuckText}${annual.year}年${annual.name}流年带动${annualDomain}，${annualTone}。`,
    tags: [
      `${chart.pillars.day.name}日柱`,
      pattern.name,
      `用${usefulGod.primaryGods.join("/")}`,
      `${leadingGod}较显`,
      currentLuck ? `${currentLuck.name}大运` : `${chart.luck.startAgeText}起运`,
      `${annual.year} ${annual.stemGod}`,
    ],
  };
}

function renderChartSummary(chart) {
  const summary = getChartSummary(chart);
  chartSummaryTitle.textContent = summary.title;
  chartSummaryText.textContent = summary.text;
  chartSummaryTags.replaceChildren(...summary.tags.map((tag) => createElement("span", "", tag)));
}

function renderChartSummaryError(message) {
  chartSummaryTitle.textContent = "先把出生信息补完整";
  chartSummaryText.textContent = message || "有了出生日期和时间后，这里会先用现代话解释命盘主调，再展示四柱、大运和流年依据。";
  chartSummaryTags.replaceChildren(createElement("span", "", "待排盘"));
}

function formatRuleRelations(relations, fallback) {
  if (!relations?.length) return fallback;
  return relations
    .slice(0, 8)
    .map((relation) => {
      const sourceText = relation.sources.map((source) => source.label).join("、");
      return `${relation.name}（${sourceText}）：${relation.effect}`;
    })
    .join("；");
}

function renderDetailChart(chart) {
  if (chart.error) {
    renderChartError(chart);
    return;
  }

  renderChartSummary(chart);

  chartPillars.replaceChildren(
    createPillarCell("年柱", chart.pillars.year),
    createPillarCell("月柱", chart.pillars.month),
    createPillarCell("日柱", chart.pillars.day),
    createPillarCell("时柱", chart.pillars.hour),
  );

  currentLuckLabel.textContent = chart.luck.current
    ? `当前：${chart.luck.current.name}大运`
    : `当前：未起运，${chart.luck.startAgeText}起运`;

  replaceList(luckTimeline, chart.annuals, (annual, index) => {
    const item = createElement("div", index === 0 ? "is-current" : "");
    item.append(
      createElement("b", "", `${annual.year} ${annual.name}`),
      createElement("span", "", annual.note),
    );
    return item;
  });

  const factors = chart.strength.zipingFactors;
  const rootText = `${chart.pillars.day.stem}${chart.strength.dayElement}日主${chart.strength.label}；月令${factors.command.status}，地支${factors.ground.status}，天干${factors.momentum.status}。${chart.strength.summary}`;
  const hiddenText = Object.values(chart.pillars)
    .filter(Boolean)
    .map((pillar) => `${pillar.branch}藏${pillar.hiddenStems.join("")}`)
    .join("；");
  const usefulGod = chart.rules.usefulGod;
  const pattern = chart.rules.pattern;
  const favorableText = usefulGod.favorableGods.join("、") || "随格局制化细看";
  const unfavorableText = usefulGod.unfavorableGods.length
    ? usefulGod.unfavorableGods.join("、")
    : "随运岁组合细看";
  const luckText = `${RULESET_LABEL}：年以立春分界，月按太阳黄经交节时刻定节令，${chart.luck.direction}，以${chart.luck.targetTermName}${chart.luck.targetTermDateText ? `（${chart.luck.targetTermDateText}）` : ""}计起运，相差约${chart.luck.diffDays}天，按三天折一年，约${chart.luck.startAgeText}起运。`;
  const timeText = chart.solarTime?.applied
    ? `输入北京时间 ${chart.standardBirthLabel}，${chart.solarTime.label}，排盘采用 ${chart.calculationBirthLabel}${chart.solarTime.hourChanged ? `，时辰由${chart.solarTime.standardHourBranch}修正为${chart.solarTime.calculationHourBranch}` : ""}。`
    : `${chart.solarTime?.label || "未选择出生地，按北京时间排盘"}。`;
  chartBasis.replaceChildren(
    createBasisArticle("日主强弱", rootText),
    createBasisArticle("时间修正", timeText),
    createBasisArticle("月令格局", `${pattern.name}：${pattern.status}。${pattern.basis.join("")}`),
    createBasisArticle("子平取用", `${usefulGod.strategy}。主要取${usefulGod.primaryGods.join("、")}，喜${favorableText}，忌${unfavorableText}。${usefulGod.basis.join("")}`),
    createBasisArticle("十神分布", `当前命盘较突出的十神为：${topTenGods(chart.tenGodCounts)}。`),
    createBasisArticle("藏干根气", hiddenText),
    createBasisArticle("原局关系", formatRuleRelations(chart.rules.relations.natal, "原局未见完整的天干五合、三合三会、六冲刑害破组合。")),
    createBasisArticle("岁运关系", formatRuleRelations(chart.rules.relations.active, "当前大运、流年未形成明显的新增合冲刑害。")),
    createBasisArticle("起运口径", luckText),
  );
}

function renderHomeSummary(chart) {
  if (chart.error) {
    todayStateLabel.textContent = "待完善";
    todayStateText.textContent = chart.error;
    return;
  }

  const annual = chart.annuals[0];
  todayStateLabel.textContent = chart.strength.label;
  todayStateText.textContent = `${annual.year} ${annual.name}，${annual.stemGod}带动${getGodDomain(annual.stemGod)}；${chart.strength.summary}`;
}

function getCurrentProfile() {
  return profiles.find((profile) => profile.id === currentProfileId) || null;
}

function renderEmptyProductState() {
  currentProfileId = null;
  currentProfileNames.forEach((item) => {
    item.textContent = "未选择档案";
  });
  currentProfileMetas.forEach((item) => {
    item.textContent = "请先创建第一个档案";
  });
  profileSwitchButtons.forEach((button) => {
    button.textContent = "新增档案";
  });
  renderQuestionHistory();
  todayStateLabel.textContent = "待建立";
  todayStateText.textContent = "创建第一个档案后显示当前命盘阶段。";
  chartPillars.replaceChildren(
    createPillarCell("年柱", null),
    createPillarCell("月柱", null),
    createPillarCell("日柱", null),
    createPillarCell("时柱", null),
  );
  renderChartSummaryError("创建第一个档案后，这里会先用现代话解释命盘主调。");
  currentLuckLabel.textContent = "当前：请先创建档案";
  luckTimeline.replaceChildren(createBasisArticle("排盘状态", "创建第一个档案后显示大运与流年。"));
  chartBasis.replaceChildren(createBasisArticle("排盘状态", "暂无档案，不能排盘。"));
  hideResult();
}

function renderCurrentProfileViews() {
  const profile = getCurrentProfile();
  if (!profile) {
    renderEmptyProductState();
    return;
  }
  const chart = calculateBaziChart(profile);
  renderDetailChart(chart);
  renderHomeSummary(chart);
  void persistChart(chart).catch(() => {});
}

function setHomeView(viewName) {
  if (!homeViewPanels.some((panel) => panel.dataset.homePanel === viewName)) return;
  currentHomeView = viewName;
  homeViewButtons.forEach((button) => {
    const selected = button.dataset.homeView === viewName;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-selected", String(selected));
  });
  homeViewPanels.forEach((panel) => {
    const selected = panel.dataset.homePanel === viewName;
    panel.hidden = !selected;
    panel.classList.toggle("is-active", selected);
  });
}

function goTo(requestedScreenName) {
  const legacyHomeViews = { ask: "conversation", history: "conversation", detail: "chart" };
  const screenName = legacyHomeViews[requestedScreenName] ? "home" : requestedScreenName;
  if (!screenNames.has(screenName)) return;

  const activeScreen = screens.find((screen) => screen.classList.contains("is-active"));
  if (activeScreen?.dataset.screen) {
    screenScrollPositions.set(activeScreen.dataset.screen, window.scrollY);
  }
  if (legacyHomeViews[requestedScreenName]) setHomeView(legacyHomeViews[requestedScreenName]);

  screens.forEach((screen) => {
    screen.classList.toggle("is-active", screen.dataset.screen === screenName);
  });

  tabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.go === screenName);
  });

  window.requestAnimationFrame(() => {
    window.scrollTo({ top: screenScrollPositions.get(screenName) || 0, behavior: "auto" });
  });
}

function resetArchiveFilters() {
  activeFilter = "all";
  document.querySelectorAll("[data-filter]").forEach((item) => {
    item.classList.toggle("is-selected", item.dataset.filter === "all");
  });
}

function applyArchiveSearch() {
  const keyword = archiveSearch.value.trim().toLowerCase();

  archiveCards.forEach((card) => {
    const haystack = card.dataset.keywords.toLowerCase();
    const filterMatched =
      activeFilter === "all" ||
      (activeFilter === "expired" ? card.dataset.expired === "true" : card.dataset.relation === activeFilter);
    const keywordMatched = !keyword || haystack.includes(keyword);
    card.classList.toggle("is-hidden", !filterMatched || !keywordMatched);
  });
}

function applyProfileDataset(element, profile) {
  element.dataset.profileId = profile.id;
  element.dataset.name = profile.name;
  element.dataset.meta = profile.meta;
  element.dataset.keywords = profile.keywords;
}

function getProfileExpiry(profile, now = Date.now()) {
  if (profile.relation !== "客户") return { expired: false, days: 0, overdueDays: 0 };
  const basis = Number(profile.lastConsultedAt || profile.createdAt || now);
  const dueAt = Number(profile.retentionDueAt || basis + CLIENT_EXPIRY_DAYS * 86400000);
  const days = Math.max(0, Math.floor((now - basis) / 86400000));
  return {
    expired: now >= dueAt,
    days,
    overdueDays: Math.max(0, Math.floor((now - dueAt) / 86400000)),
  };
}

function getProfileActivityLabel(profile) {
  if (profile.lastConsultedAt) return `最后咨询 ${formatRecordTime(profile.lastConsultedAt)}`;
  return "尚无咨询记录";
}

function createArchiveCard(profile) {
  const isCurrent = profile.id === currentProfileId;
  const expiry = getProfileExpiry(profile);
  const card = createElement("article", `archive-card${isCurrent ? " is-current" : ""}`);
  card.dataset.keywords = profile.keywords;
  card.dataset.relation = profile.relation;
  card.dataset.expired = String(expiry.expired);

  const avatar = createElement("i", "avatar-mark", profile.avatar);
  const body = createElement("div");
  const titleRow = createElement("div", "archive-title-row");
  titleRow.append(createElement("h2", "", profile.name));
  if (profile.isSelf) {
    titleRow.append(createElement("span", "self-badge", "本人"));
  }
  if (isCurrent) {
    titleRow.append(createElement("span", "current-badge", "当前"));
  }
  if (expiry.expired) {
    titleRow.append(createElement("span", "expired-badge", expiry.overdueDays ? `已到期 ${expiry.overdueDays} 天` : "已到期"));
  }
  body.append(
    titleRow,
    createElement("p", "", profile.meta),
    createElement("span", "", getProfileActivityLabel(profile)),
  );

  const main = createElement("button", "archive-card-main");
  main.type = "button";
  main.setAttribute("data-pick-profile", "");
  main.setAttribute("aria-label", `选择${profile.name}`);
  applyProfileDataset(main, profile);
  main.append(avatar, body);

  const more = createElement("button", "archive-more", "⋯");
  more.type = "button";
  more.setAttribute("data-profile-actions", "");
  more.setAttribute("aria-label", `管理${profile.name}`);
  applyProfileDataset(more, profile);

  card.append(main, more);
  return card;
}

function createPickerItem(profile) {
  const isCurrent = profile.id === currentProfileId;
  const item = createElement("button", `picker-item${isCurrent ? " is-current" : ""}`);
  item.type = "button";
  item.setAttribute("data-pick-profile", "");
  applyProfileDataset(item, profile);
  const titleRow = createElement("div", "archive-title-row");
  titleRow.append(createElement("strong", "", profile.name));
  if (profile.isSelf) {
    titleRow.append(createElement("span", "self-badge", "本人"));
  }
  if (isCurrent) {
    titleRow.append(createElement("span", "current-badge", "当前"));
  }
  item.append(titleRow, createElement("span", "", profile.meta));
  return item;
}

function updateProfileCount() {
  profileCountEls.forEach((item) => {
    item.textContent = String(profiles.length);
  });
}

function formatRecordTime(timestamp) {
  if (!timestamp) return "";
  const parts = getBeijingDateParts(new Date(timestamp));
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  const hour = String(parts.hour).padStart(2, "0");
  const minute = String(parts.minute).padStart(2, "0");
  return `${month}-${day} ${hour}:${minute}`;
}

function getQuestionRecordMeta(record) {
  const profile = profiles.find((profileItem) => profileItem.id === record.profileId);
  return `${profile?.name || record.profileName || "已删除档案"}｜${record.tag || "自定义"}｜${formatRecordTime(record.createdAt)}`;
}

function createQuestionHistoryItem(record) {
  const item = createElement("button", "recent-item");
  item.type = "button";
  item.dataset.questionRecordId = record.id;
  const icon = createElement("i", "icon-badge small");
  icon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 6.5h14v10.2H8.8L5 20.2V6.5zM8.5 10h7M8.5 13.1h4.8" /></svg>';
  const body = createElement("div");
  body.append(createElement("span", "", getQuestionRecordMeta(record)), createElement("strong", "", record.question));
  item.append(icon, body);
  return item;
}

function createQuestionHistoryRow(record) {
  const row = createElement("article", "history-item");
  const openButton = createQuestionHistoryItem(record);
  openButton.classList.add("history-open");

  const deleteButton = createElement("button", "history-delete", "删除");
  deleteButton.type = "button";
  deleteButton.dataset.deleteQuestionRecordId = record.id;
  deleteButton.setAttribute("aria-label", `删除问题：${record.question}`);

  row.append(openButton, deleteButton);
  return row;
}

function getOrderedQuestionRecords() {
  return [...questionRecords].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

function createQuestionHistoryEmpty() {
  const empty = createElement("div", "recent-empty");
  empty.textContent = profiles.length === 0 ? "创建档案并生成分析后，历史问题会保存在这里。" : "生成分析后，问题历史会保存在这里。";
  return empty;
}

function renderQuestionHistory() {
  if (window.MingliConsultation?.ownsHistory) return;
  const orderedRecords = getOrderedQuestionRecords();

  if (!recentQuestionList) return;
  if (orderedRecords.length === 0) {
    recentQuestionList.replaceChildren(createQuestionHistoryEmpty());
    if (questionHistoryList) {
      questionHistoryList.replaceChildren(createQuestionHistoryEmpty());
    }
    if (viewAllQuestionsButton) {
      viewAllQuestionsButton.hidden = true;
    }
    return;
  }

  recentQuestionList.replaceChildren(...orderedRecords.slice(0, HOME_HISTORY_LIMIT).map(createQuestionHistoryItem));
  if (viewAllQuestionsButton) {
    viewAllQuestionsButton.hidden = orderedRecords.length <= HOME_HISTORY_LIMIT;
  }
  if (questionHistoryList) {
    questionHistoryList.replaceChildren(...orderedRecords.map(createQuestionHistoryRow));
  }
}

function getOrderedProfiles() {
  const current = profiles.find((profile) => profile.id === currentProfileId);
  const self = profiles.find((profile) => profile.isSelf);
  return [
    self,
    current && current.id !== self?.id ? current : null,
    ...profiles.filter((profile) => profile.id !== self?.id && profile.id !== current?.id),
  ].filter(Boolean);
}

function createEmptyArchiveState() {
  const empty = createElement("article", "empty-state");
  empty.append(
    createElement("h2", "", "还没有档案"),
    createElement("p", "", "先创建第一个档案，之后才能排盘、看大运流年和问事。"),
  );
  const action = createElement("button", "", "新增档案");
  action.type = "button";
  action.setAttribute("data-open-profile-modal", "");
  empty.append(action);
  return empty;
}

function createEmptyPickerState() {
  const empty = createElement("div", "empty-state compact");
  empty.append(
    createElement("h2", "", "暂无档案"),
    createElement("p", "", "先新增档案后再切换。"),
  );
  const action = createElement("button", "", "新增档案");
  action.type = "button";
  action.setAttribute("data-open-profile-modal", "");
  empty.append(action);
  return empty;
}

function renderProfiles() {
  const orderedProfiles = getOrderedProfiles();
  archiveList.replaceChildren(
    ...(orderedProfiles.length > 0 ? orderedProfiles.map(createArchiveCard) : [createEmptyArchiveState()]),
  );
  profilePickerList.replaceChildren(
    ...(orderedProfiles.length > 0 ? orderedProfiles.map(createPickerItem) : [createEmptyPickerState()]),
  );
  archiveCards = Array.from(document.querySelectorAll(".archive-card"));
  profilePickerItems = Array.from(document.querySelectorAll("#profilePickerList [data-pick-profile]"));
  expiredProfileCount.textContent = String(profiles.filter((profile) => getProfileExpiry(profile).expired).length);
  updateProfileCount();
  applyArchiveSearch();
  renderQuestionHistory();
}

function renderCurrentProfileHeader(profile) {
  if (!profile) {
    renderEmptyProductState();
    return;
  }
  currentProfileNames.forEach((item) => {
    item.textContent = profile.name;
  });
  currentProfileMetas.forEach((item) => {
    item.textContent = profile.meta;
  });
  profileSwitchButtons.forEach((button) => {
    button.textContent = "切换档案";
  });

  renderQuestionHistory();
}

function setCurrentProfile(profile) {
  if (!profile) {
    renderProfiles();
    renderEmptyProductState();
    void writeSetting(CURRENT_PROFILE_KEY, null).catch(() => {});
    window.dispatchEvent(new CustomEvent("mingli:profile-changed", { detail: { profileId: null } }));
    return;
  }
  currentProfileId = profile.id;
  renderProfiles();
  renderCurrentProfileHeader(profile);
  renderCurrentProfileViews();
  void writeSetting(CURRENT_PROFILE_KEY, profile.id).catch(() => {});
  window.dispatchEvent(new CustomEvent("mingli:profile-changed", { detail: { profileId: profile.id } }));
}

async function updateCurrentProfileRecent(question, tag) {
  if (!currentProfileId) return;
  const updatedAt = Date.now();
  profiles = profiles.map((profile) =>
    profile.id === currentProfileId
      ? withDerivedProfileFields({
          ...profile,
          recentQuestion: question,
          recentTag: tag,
          updatedAt,
        })
      : profile,
  );
  renderProfiles();
  renderCurrentProfileHeader(getCurrentProfile());
  await persistProfiles();
}

function showResult() {
  resultCard.hidden = false;
}

function hideResult() {
  resultCard.hidden = true;
}

const QUESTION_INTENT_RULES = [
  {
    type: "子女生育",
    label: "子女与生育",
    pattern: /二胎|三胎|一胎|孩子|小孩|子女|怀孕|备孕|生育|要小孩|宝宝|添丁|生产|生娃|孕|子嗣/,
    focus: ["食神", "伤官", "正印", "偏印", "正官", "七杀", "正财", "偏财"],
    modernFocus: "备孕时间、身体恢复、伴侣分工、家庭资源和子女缘分",
  },
  {
    type: "财运",
    label: "财务与资产",
    pattern: /钱|财|收入|工资|涨薪|投资|投入|借|债|贷款|买房|卖房|房子|车|副业|生意|项目|报价|分成|现金流|回款|客户|订单/,
    focus: ["正财", "偏财", "食神", "伤官", "比肩", "劫财"],
    modernFocus: "现金流、投入产出、合作分账和资产决策",
  },
  {
    type: "事业",
    label: "工作与事业",
    pattern: /工作|事业|跳槽|离职|辞职|面试|升职|岗位|领导|职场|调岗|转行|创业|公司|合同|合作|客户|团队|合伙/,
    focus: ["正官", "七杀", "正印", "偏印", "食神", "伤官", "比肩", "劫财"],
    modernFocus: "职责、职位、压力、资源、团队和职业选择",
  },
  {
    type: "婚姻感情",
    label: "婚恋关系",
    pattern: /感情|婚|恋爱|对象|伴侣|复合|分手|离婚|结婚|相亲|桃花|关系|暧昧|另一半/,
    focus: ["正财", "偏财", "正官", "七杀", "比肩", "劫财", "伤官"],
    modernFocus: "承诺、沟通、边界、现实条件和关系稳定性",
  },
  {
    type: "健康",
    label: "健康与状态",
    pattern: /健康|身体|生病|疾病|病|看病|医院|就医|症状|不舒服|难受|疼|痛|发烧|咳嗽|炎症|手术|住院|复查|体检|作息|睡眠|压力|焦虑|情绪|恢复|疲惫|精力|饮食/,
    focus: ["正印", "偏印", "食神", "伤官", "正官", "七杀"],
    modernFocus: "健康风险、作息压力、恢复能力、体检和就医信号",
  },
  {
    type: "日常饮食",
    label: "日常饮食",
    pattern: /吃什么|吃啥|吃饭|晚饭|午饭|早饭|早餐|中饭|宵夜|夜宵|今晚吃|今天吃|饭|菜|外卖|餐厅|食堂|火锅|烧烤|炒菜|米饭|面条|面食|粉|粥|汤|喝什么|奶茶|咖啡/,
    focus: ["食神", "伤官", "正财", "偏财", "正印", "偏印"],
    modernFocus: "口味、食材、就餐场景和当下选择倾向",
  },
  {
    type: "学业",
    label: "学习与考试",
    pattern: /学习|学业|考试|考研|升学|专业|证书|课程|培训|论文|留学|面试|资格/,
    focus: ["正印", "偏印", "食神", "伤官", "正官"],
    modernFocus: "吸收能力、考试表达、证书资质和阶段成果",
  },
  {
    type: "家庭居住",
    label: "家庭与居住",
    pattern: /搬家|迁居|装修|家里|父母|家庭|居住|房间|租房|房屋|城市|邻居|物业/,
    focus: ["正印", "偏印", "食神", "伤官", "正财", "偏财", "正官", "七杀"],
    modernFocus: "家庭责任、居住成本、照顾关系和生活稳定性",
  },
  {
    type: "合同风险",
    label: "合同与风险",
    pattern: /合同|协议|官司|纠纷|投诉|风险|违约|规则|证件|手续|审批|法律/,
    focus: ["正官", "七杀", "正印", "偏印", "伤官"],
    modernFocus: "规则约束、责任边界、文件手续和潜在冲突",
  },
  {
    type: "出行迁移",
    label: "出行与迁移",
    pattern: /出行|旅行|旅游|出差|远行|迁移|搬迁|外地|出国|移民|换城市|去.+发展|回老家|通勤|交通/,
    focus: ["正官", "七杀", "正印", "偏印", "正财", "偏财", "食神", "伤官"],
    modernFocus: "移动变化、证件手续、交通安全、异地资源和适应成本",
  },
];

const QUESTION_ASPECT_RULES = [
  {
    type: "事业",
    label: "跳槽/离职",
    pattern: /跳槽|离职|辞职|换工作|转行|面试|offer|岗位/,
    reality: "岗位稳定性、收入结构、试用期风险、上级资源和退路",
    action: "先确认新机会是否已经落到书面条件，不要只因为当下不舒服就立刻离开。",
  },
  {
    type: "事业",
    label: "创业/项目",
    pattern: /创业|项目|生意|客户|订单|合伙|团队|公司/,
    reality: "现金流、客户来源、合伙分工、交付能力和责任边界",
    action: "先用小单、小预算或副业方式验证，不要一开始就把现金流和主业全部压上。",
  },
  {
    type: "财运",
    label: "投资/借贷",
    pattern: /投资|股票|基金|理财|借钱|借款|贷款|负债|债|回款|分成|入股/,
    reality: "本金安全、最坏损失、回款周期、分账规则和退出条件",
    action: "先算最坏情况下能否承受，再决定投入上限；借贷、入股和分成都要留书面依据。",
  },
  {
    type: "财运",
    label: "买卖资产",
    pattern: /买房|卖房|房子|车|购置|资产|首付|按揭/,
    reality: "首付压力、月供现金流、家庭意见、合同节点和长期持有成本",
    action: "先把现金流压力和合同节点算清楚，再看是否需要等更合适的窗口。",
  },
  {
    type: "婚姻感情",
    label: "复合/分手",
    pattern: /复合|分手|离婚|冷战|断联|还能不能继续|要不要继续/,
    reality: "真实承诺、沟通方式、金钱家庭边界、第三方意见和反复消耗",
    action: "不要只看情绪回暖，要看对方是否愿意给出稳定行动和清晰边界。",
  },
  {
    type: "婚姻感情",
    label: "相亲/结婚",
    pattern: /相亲|结婚|订婚|对象|另一半|桃花|恋爱/,
    reality: "匹配度、家庭期待、承诺节奏、现实条件和长期稳定性",
    action: "先看现实匹配和沟通稳定度，再决定是否加快承诺。",
  },
  {
    type: "家庭居住",
    label: "搬家/装修",
    pattern: /搬家|迁居|装修|租房|房屋|房间|物业/,
    reality: "预算、工期、合同、家庭配合、通勤生活和入住后的稳定性",
    action: "先把预算、工期、责任人和备用方案定下来，再择机推进。",
  },
  {
    type: "合同风险",
    label: "签约/纠纷",
    pattern: /合同|协议|条款|纠纷|投诉|违约|起诉|仲裁|律师|审批|手续/,
    reality: "条款漏洞、证据链、责任边界、付款节点、违约成本和专业审核",
    action: "不要只凭信任推进，关键条款、付款、交付、退出和违约处理必须写清楚。",
  },
  {
    type: "出行迁移",
    label: "出行/换城市",
    pattern: /出行|旅行|旅游|出差|远行|换城市|外地|出国|移民|回老家|通勤/,
    reality: "目的、证件手续、交通住宿、预算、安全和落脚资源",
    action: "先把证件、路线、预算、住宿和备用方案准备好，再看是否适合主动动。",
  },
  {
    type: "学业",
    label: "考试/证书",
    pattern: /考试|考研|证书|资格|课程|培训|论文|升学|留学/,
    reality: "复习节奏、输出能力、考试时间、证书价值和阶段反馈",
    action: "把学习目标拆到每周输出和模拟反馈，不要只停留在搜资料和焦虑。",
  },
];

function getQuestionHorizon(question) {
  const text = String(question || "");
  if (/今晚|今晚.+|今天晚上|晚上吃|夜宵|宵夜/.test(text)) return "今晚";
  if (/今天|今晚/.test(text)) return "今天";
  if (/三年|未来几年|长期|以后/.test(text)) return "中长期";
  if (/明年|来年/.test(text)) return "明年";
  if (/今年|年底|年内/.test(text)) return "今年";
  if (/三个月|半年|近期|最近|现在|当下|这个月|下个月/.test(text)) return "近期";
  if (/什么时候|何时|几月|哪年/.test(text)) return "时间点";
  return "当前阶段";
}

function getQuestionMode(question) {
  const text = String(question || "");
  if (/会不会|有没有可能|要不要|该不该|是否|能不能|可不可以|适不适合|值不值得/.test(text)) return "决策";
  if (/什么时候|何时|几月|哪年/.test(text)) return "时间";
  if (/怎么|如何|怎么办|怎么做/.test(text)) return "方法";
  return "判断";
}

const QUESTION_DECISION_RULES = [
  {
    key: "job-change",
    label: "跳槽/离职决策",
    pattern: /跳槽|离职|辞职|换工作|转行|面试|offer|新工作/,
    action: "主动改变职业路径",
    risk: "新机会是否落到书面条件、试用期是否稳定、离开后的现金流是否接得住",
  },
  {
    key: "venture",
    label: "创业/项目决策",
    pattern: /创业|项目|生意|合伙|入伙|客户|订单|副业/,
    action: "把资源投到新项目",
    risk: "现金流、客户来源、交付能力和合伙责任边界",
  },
  {
    key: "invest",
    label: "投资/投入决策",
    pattern: /投资|股票|基金|理财|入股|投入|加仓|买入|本金/,
    action: "投入本金或扩大财务风险",
    risk: "最坏损失、退出条件、回款周期和是否影响基本生活",
  },
  {
    key: "loan",
    label: "借贷/回款决策",
    pattern: /借钱|借款|贷款|负债|债|回款|催款|借给|借出去/,
    action: "让现金流承担信用关系",
    risk: "对方还款能力、书面凭证、还款周期和关系成本",
  },
  {
    key: "asset",
    label: "买卖资产决策",
    pattern: /买房|卖房|买车|卖车|房子|车|首付|按揭|出售|置换/,
    action: "做资产配置或长期支出",
    risk: "月供压力、长期持有成本、合同节点和家庭意见",
  },
  {
    key: "relationship-return",
    label: "复合/继续决策",
    pattern: /复合|和好|继续|还能不能继续|断联|冷战/,
    action: "恢复或延续关系",
    risk: "对方是否给出稳定行动、旧问题是否真正解决、边界是否清楚",
  },
  {
    key: "relationship-end",
    label: "分开/离婚决策",
    pattern: /分手|离婚|结束|放弃|断掉|要不要分/,
    action: "结束关系或拉开距离",
    risk: "情绪反复、财务与家庭牵连、后续沟通成本",
  },
  {
    key: "contract",
    label: "签约/手续决策",
    pattern: /签约|签合同|合同|协议|条款|手续|审批|官司|纠纷|违约/,
    action: "进入规则约束或处理争议",
    risk: "条款漏洞、证据链、责任边界、付款节点和违约成本",
  },
  {
    key: "move",
    label: "搬迁/出行决策",
    pattern: /搬家|迁居|换城市|出行|出差|旅行|旅游|外地|出国|通勤/,
    action: "改变空间和生活节奏",
    risk: "证件手续、预算、落脚点、通勤成本和备用方案",
  },
  {
    key: "exam",
    label: "考试/学习决策",
    pattern: /考试|考研|证书|课程|培训|论文|升学|留学|资格/,
    action: "投入学习时间换取阶段成果",
    risk: "复习节奏、输出训练、考试时间和证书实际价值",
  },
];

function getQuestionDecisionFrame(question) {
  const text = String(question || "");
  const matched = QUESTION_DECISION_RULES.find((rule) => rule.pattern.test(text));
  if (matched) return matched;
  return {
    key: "general",
    label: "综合决策",
    action: "做出选择或调整节奏",
    risk: "时间、对象、投入、收益、成本和后果",
  };
}

function isDirectHealthQuestion(question) {
  return /生病|疾病|病|看病|医院|就医|症状|不舒服|难受|疼|痛|发烧|咳嗽|炎症|手术|住院|复查|体检|健康/.test(String(question || ""));
}

function isDirectMealQuestion(question) {
  return /吃什么|吃啥|吃饭|晚饭|午饭|早饭|早餐|中饭|宵夜|夜宵|今晚吃|今天吃|饭|菜|外卖|餐厅|食堂|火锅|烧烤|炒菜|米饭|面条|面食|粉|粥|汤|喝什么|奶茶|咖啡/.test(String(question || ""));
}

function isDirectChildQuestion(question) {
  return /二胎|三胎|一胎|孩子|小孩|子女|怀孕|备孕|生育|要小孩|宝宝|添丁|生产|生娃|孕|子嗣/.test(String(question || ""));
}

function isDirectContractQuestion(question) {
  return /合同|协议|条款|官司|纠纷|投诉|违约|证件|手续|审批|法律|律师|责任边界|起诉|仲裁/.test(String(question || ""));
}

function isDirectTravelQuestion(question) {
  return /出行|旅行|旅游|出差|远行|迁移|搬迁|外地|出国|移民|换城市|去.+发展|回老家|通勤|交通/.test(String(question || ""));
}

function isDirectResidenceQuestion(question) {
  return /搬家|迁居|装修|家里|父母|家庭|居住|房间|租房|房屋|邻居|物业/.test(String(question || ""));
}

function getQuestionAspect(question, primaryType) {
  const text = String(question || "");
  return (
    QUESTION_ASPECT_RULES.find((rule) => rule.type === primaryType && rule.pattern.test(text)) ||
    QUESTION_ASPECT_RULES.find((rule) => rule.pattern.test(text)) ||
    {
      label: primaryType === "自定义" ? "综合问题" : primaryType,
      reality: "时间、对象、投入、收益、成本和风险",
      action: "先把问题拆成可验证的小步骤，再决定是否扩大投入或做不可逆决定。",
    }
  );
}

function getQuestionIntent(question, tag) {
  const text = String(question || "");
  const matched = QUESTION_INTENT_RULES.filter((rule) => rule.pattern.test(text));
  if (matched.length === 0 && tag && tag !== "自定义") {
    const taggedRule = QUESTION_INTENT_RULES.find((rule) => rule.type === tag);
    if (taggedRule) matched.unshift(taggedRule);
  }
  const primaryType = isDirectChildQuestion(question)
    ? "子女生育"
    : isDirectMealQuestion(question)
    ? "日常饮食"
    : isDirectHealthQuestion(question)
    ? "健康"
    : isDirectContractQuestion(question)
    ? "合同风险"
    : isDirectTravelQuestion(question)
    ? "出行迁移"
    : isDirectResidenceQuestion(question)
    ? "家庭居住"
    : matched.find((rule) => QUESTION_TYPES[rule.type])?.type || (tag && tag !== "自定义" ? tag : "自定义");
  const aspect = getQuestionAspect(question, primaryType);
  const labels = [...new Set([aspect.label, ...matched.map((rule) => rule.label)])];
  if (labels.length === 0 && tag && tag !== "自定义") {
    labels.push(tag);
  }
  const focus = [...new Set(matched.flatMap((rule) => rule.focus))];
  const modernFocus = [aspect.reality, ...matched.map((rule) => rule.modernFocus)].filter(Boolean);
  return {
    question: text,
    primaryType,
    labels: labels.length > 0 ? labels : ["综合问题"],
    focus,
    horizon: getQuestionHorizon(question),
    mode: getQuestionMode(question),
    modernFocus,
    aspect,
    decision: getQuestionDecisionFrame(question),
    isCustomInput: !tag || tag === "自定义",
  };
}

function inferQuestionType(question, tag) {
  const intent = getQuestionIntent(question, tag);
  if (intent.primaryType !== "自定义") return intent.primaryType;
  const text = String(question || "");
  if (/三年|未来几年/.test(text)) return "近三年";
  if (/今年|年度|全年/.test(text)) return "今年运势";
  return "自定义";
}

function hasFocusSignal(chart, config, intent = null) {
  const focus = [...new Set([...(config.focus || []), ...(intent?.focus || [])])];
  const gods = [
    chart.annuals[0]?.stemGod,
    chart.annuals[0]?.branchGod,
    chart.luck.current?.stemGod,
    chart.luck.current?.branchGod,
  ].filter(Boolean);
  return gods.some((god) => focus.includes(god));
}

function getIntentFocus(config, intent) {
  return [...new Set([...(config.focus || []), ...(intent?.focus || [])])];
}

function scoreAnnualForIntent(chart, annual, focus) {
  let score = 0;
  const reasons = [];
  if (focus.includes(annual.stemGod)) {
    score += 1.8;
    reasons.push(`天干透${annual.stemGod}，直接触发问题相关十神`);
  }
  if (focus.includes(annual.branchGod)) {
    score += 1;
    reasons.push(`地支主气为${annual.branchGod}，问题在现实层面有承接点`);
  }
  if (chart.strength.favorableGods.includes(annual.stemGod)) {
    score += 0.7;
    reasons.push(`${annual.stemGod}对当前命局偏喜，推进阻力相对小`);
  }
  if (chart.strength.unfavorableGods.includes(annual.stemGod)) {
    score -= 0.4;
    reasons.push(`${annual.stemGod}对当前命局偏耗，推进时要控制成本`);
  }
  return { annual, score, reasons };
}

function getIntentTimingProfile(chart, config, intent, count = 5) {
  const focus = getIntentFocus(config, intent);
  const scored = calculateAnnuals(chart.pillars.day.stem, chart.strength, getCurrentBaziYear(), count)
    .map((annual) => scoreAnnualForIntent(chart, annual, focus))
    .sort((a, b) => b.score - a.score);
  const topScore = scored[0]?.score || 0;
  const windows = scored
    .filter((item) => item.score >= Math.max(1.2, topScore - 0.6))
    .slice(0, 3);
  return {
    focus,
    scored,
    windows: windows.length ? windows : scored.slice(0, 2),
  };
}

function formatIntentWindows(windows) {
  if (!windows?.length) return "近几年没有特别集中的单一年份";
  return windows.map((item) => `${item.annual.year}年${item.annual.name}`).join("、");
}

function formatIntentWindowReasons(windows) {
  if (!windows?.length) return "暂无明显触发理由";
  return windows
    .map((item) => `${item.annual.year}年：${item.reasons[0] || "运年与问题相关十神有一定触发"}`)
    .join("；");
}

function getHealthGodMeaning(god) {
  if (god === "正官" || god === "七杀") return "压力、约束、突发负担和身体承压";
  if (god === "食神" || god === "伤官") return "输出、消耗、饮食作息和情绪表达";
  if (god === "正印" || god === "偏印") return "恢复力、睡眠、照护、检查和外部支持";
  if (god === "正财" || god === "偏财") return "事务消耗、责任牵扯和资源分配";
  if (god === "比肩" || god === "劫财") return "体力使用、竞争消耗和自我硬撑";
  return "整体状态";
}

function getHealthRiskProfile(chart) {
  const annualGod = chart.annuals[0]?.stemGod;
  const luckGod = chart.luck.current?.stemGod;
  let score = 0;
  const reasons = [];

  if (chart.strength.label === "偏弱") {
    score += 1;
    reasons.push("日主偏弱，承压和恢复力要优先看。");
  }
  if (chart.strength.unfavorableGods.includes(annualGod)) {
    score += 1;
    reasons.push(`今年流年透出${annualGod}，落在当前命局需谨慎的一侧。`);
  }
  if (luckGod && chart.strength.unfavorableGods.includes(luckGod)) {
    score += 1;
    reasons.push(`当前大运透出${luckGod}，会放大长期消耗。`);
  }
  if (annualGod === "七杀" || annualGod === "伤官") {
    score += 0.5;
    reasons.push(`${annualGod}被流年引动，健康上更怕压力、急躁或作息失衡。`);
  }
  if (chart.strength.favorableGods.includes(annualGod)) {
    reasons.push(`今年流年${annualGod}也有可用之处，关键是把它用在修复和管理上。`);
  }

  return {
    level: score >= 2 ? "偏高" : score >= 1 ? "中等偏谨慎" : "相对平稳",
    reasons,
  };
}

function makeHealthConclusion(chart) {
  const risk = getHealthRiskProfile(chart);
  if (risk.level === "偏高") {
    return "不能直接断定“今年一定会生病”，但从命盘节奏看，今年健康风险需要认真管理。更像是压力、作息、长期消耗或恢复力不足引发不适的概率上升，尤其不能硬扛。";
  }
  if (risk.level === "中等偏谨慎") {
    return "不是明显的“必然生病”信号，但今年健康不能完全忽略。重点在于别把小疲劳、小症状拖成长期问题，作息、体检和压力管理要提前做。";
  }
  return "从当前命盘节奏看，今年不是特别突出的健康高风险年。仍然不能用命盘替代医学判断，但更适合把重点放在规律作息、体检复查和避免过度消耗上。";
}

function makeHealthEvidence(chart, intent) {
  const annual = chart.annuals[0];
  const currentLuck = chart.luck.current;
  const risk = getHealthRiskProfile(chart);
  const evidence = [
    `${RULESET_LABEL}：健康类问题不直接断病名，先看日主强弱，再看官杀压力、食伤消耗、印星修复，最后叠加大运流年。`,
    `问题识别为「${intent.labels.join("、")}」，你问的是${intent.horizon}健康风险，不是财务、工作或关系问题。`,
    `日主${chart.strength.label}：${chart.strength.summary}`,
    `${annual.year}年${annual.name}流年，天干为${annual.stemGod}，健康层面对应${getHealthGodMeaning(annual.stemGod)}。`,
  ];
  if (currentLuck) {
    evidence.push(`当前大运为${currentLuck.name}，透出${currentLuck.stemGod}，健康层面对应${getHealthGodMeaning(currentLuck.stemGod)}。`);
  } else {
    evidence.push(`当前尚未进入第一步大运，起运约在${chart.luck.startAgeText}，健康判断以原局和流年为主。`);
  }
  evidence.push(...risk.reasons);
  evidence.push(`综合判断为「${risk.level}」，所以重点是提前管理风险，而不是断定某一种疾病。`);
  return evidence;
}

const FOOD_ELEMENT_HINTS = {
  木: {
    food: "蔬菜、青菜、酸味、清爽类",
    guess: "带蔬菜的简餐、酸辣口或清爽一点的饭",
  },
  火: {
    food: "热菜、煎炒、烧烤、辣味、红色食物",
    guess: "热炒、烧烤、辣口菜，或者比较有烟火气的一顿",
  },
  土: {
    food: "米饭、面食、土豆、甜口、家常主食",
    guess: "米饭或面食配家常菜，主食感比较强",
  },
  金: {
    food: "肉类、鸡肉、辛香、炸烤、偏干爽口感",
    guess: "肉菜、炸烤类、鸡肉或辛香口味",
  },
  水: {
    food: "汤、粥、面汤、海鲜、偏咸和带水分的食物",
    guess: "汤面、粥、带汤水的饭，或者偏咸鲜的东西",
  },
};

function getMealMoment(question) {
  const text = String(question || "");
  let moment = new Date();
  if (/明天/.test(text)) {
    moment = addBeijingDays(moment, 1);
  }

  if (/早饭|早餐|早上/.test(text)) {
    moment = setBeijingTime(moment, 7, 30);
  } else if (/午饭|中饭|中午|午餐/.test(text)) {
    moment = setBeijingTime(moment, 12, 30);
  } else if (/宵夜|夜宵/.test(text)) {
    moment = setBeijingTime(moment, 22, 30);
  } else if (/今晚|晚上|晚饭|晚餐/.test(text)) {
    moment = setBeijingTime(moment, 19, 30);
  }

  return moment;
}

function formatMealMoment(moment) {
  const parts = getBeijingDateParts(moment);
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  const hour = String(parts.hour).padStart(2, "0");
  const minute = String(parts.minute).padStart(2, "0");
  return `${month}-${day} ${hour}:${minute}`;
}

function getMealSignal(chart, question) {
  const moment = getMealMoment(question);
  const dayPillar = calculateDayPillar(moment);
  const momentParts = getBeijingDateParts(moment);
  const hourValue = `${String(momentParts.hour).padStart(2, "0")}:${String(momentParts.minute).padStart(2, "0")}`;
  const hourPillar = calculateHourPillar(dayPillar.stem, hourValue);
  const dayStem = chart.pillars.day.stem;
  const dayGod = getTenGod(dayStem, dayPillar.stem);
  const hourGod = getTenGod(dayStem, hourPillar?.stem);
  const elementScores = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  const addElement = (element, weight) => {
    if (elementScores[element] !== undefined) elementScores[element] += weight;
  };

  addElement(STEM_ELEMENTS[dayPillar.stem], 0.8);
  addElement(BRANCH_ELEMENTS[dayPillar.branch], 0.6);
  if (hourPillar) {
    addElement(STEM_ELEMENTS[hourPillar.stem], 1.2);
    addElement(BRANCH_ELEMENTS[hourPillar.branch], 1);
  }

  const rankedElements = Object.entries(elementScores)
    .sort((a, b) => b[1] - a[1])
    .map(([element]) => element);
  const mainElement = rankedElements[0];
  const secondElement = rankedElements[1];
  const mainHint = FOOD_ELEMENT_HINTS[mainElement];
  const secondHint = FOOD_ELEMENT_HINTS[secondElement];
  const appetiteText =
    dayGod === "食神" || dayGod === "伤官" || hourGod === "食神" || hourGod === "伤官"
      ? "食伤被引动，口腹欲和临时想吃的东西会更明显"
      : dayGod === "正印" || dayGod === "偏印" || hourGod === "正印" || hourGod === "偏印"
        ? "印星被引动，更像家常、热乎、照顾身体的选择"
        : dayGod === "正财" || dayGod === "偏财" || hourGod === "正财" || hourGod === "偏财"
          ? "财星被引动，容易受价格、方便程度或别人安排影响"
          : dayGod === "比肩" || dayGod === "劫财" || hourGod === "比肩" || hourGod === "劫财"
            ? "比劫被引动，容易和别人一起吃或跟随同伴选择"
            : "官杀被引动，容易选择省事、固定、被安排的饭";

  return {
    moment,
    dayPillar,
    hourPillar,
    dayGod,
    hourGod,
    mainElement,
    secondElement,
    mainHint,
    secondHint,
    appetiteText,
  };
}

function makeMealConclusion(chart, question) {
  const signal = getMealSignal(chart, question);
  return `更像会吃「${signal.mainHint.guess}」。如果要给一个具体方向，我会优先猜：${signal.mainHint.food}；其次带一点${signal.secondHint.food}的特征。这个判断不是精确菜单，而是按今晚流时的五行象意看食物倾向。`;
}

function makeMealEvidence(chart, intent, question) {
  const signal = getMealSignal(chart, question);
  return [
    `${RULESET_LABEL}：这类“今晚吃什么”的问题属于日常应事，不宜用大运流年直接下长期结论，而要取当日、当时的象。`,
    `取时点：${formatMealMoment(signal.moment)}，流日为${signal.dayPillar.name}，晚间流时为${signal.hourPillar?.name || "未知"}。`,
    `以你的日主${chart.pillars.day.name}为参照，流日天干对应${signal.dayGod || "不明"}，流时天干对应${signal.hourGod || "不明"}。`,
    `十神象意：${signal.appetiteText}。`,
    `五行象意：今晚较突出的五行为${signal.mainElement}，对应${signal.mainHint.food}；次要五行为${signal.secondElement}，对应${signal.secondHint.food}。`,
  ];
}

const CHILD_GODS = ["食神", "伤官"];
const SUPPORT_GODS = ["正印", "偏印"];

function getChildGodMeaning(god) {
  if (CHILD_GODS.includes(god)) return "子女星、生发之象、孩子缘分和怀孕机会";
  if (SUPPORT_GODS.includes(god)) return "身体修复、检查照护、长辈支持和备孕资源";
  if (god === "正官" || god === "七杀") return "规则压力、伴侣责任、家庭安排和身体承压";
  if (god === "正财" || god === "偏财") return "现实资源、花费预算、居住条件和照护成本";
  if (god === "比肩" || god === "劫财") return "个人意愿、精力分配、同辈意见和分工边界";
  return "整体节奏";
}

function getChildStarCount(chart) {
  return CHILD_GODS.reduce((sum, god) => sum + (chart.tenGodCounts[god] || 0), 0);
}

function getPillarGods(pillar) {
  if (!pillar) return [];
  return [
    pillar.stemGod,
    pillar.branchGod,
    ...pillar.hiddenGods.map((item) => item.god),
  ].filter(Boolean);
}

function hasGod(gods, targets) {
  return gods.some((god) => targets.includes(god));
}

function scoreChildAnnual(chart, annual) {
  let score = 0;
  const reasons = [];

  if (CHILD_GODS.includes(annual.stemGod)) {
    score += 2;
    reasons.push(`流年天干透${annual.stemGod}，子女星直接露出`);
  }
  if (CHILD_GODS.includes(annual.branchGod)) {
    score += 1.2;
    reasons.push(`流年地支主气为${annual.branchGod}，子女象被地支带动`);
  }
  if (SUPPORT_GODS.includes(annual.stemGod) || SUPPORT_GODS.includes(annual.branchGod)) {
    score += 0.9;
    reasons.push("流年带印星，利检查、恢复、照护和外部支持");
  }
  if (chart.strength.favorableGods.includes(annual.stemGod)) {
    score += 0.6;
    reasons.push(`${annual.stemGod}在当前命局偏喜，承接条件较顺`);
  }
  if (chart.strength.unfavorableGods.includes(annual.stemGod)) {
    score -= 0.3;
    reasons.push(`${annual.stemGod}对当前命局偏耗，容易有身体或现实压力`);
  }

  return {
    annual,
    score,
    reasons,
  };
}

function getChildTimingProfile(chart) {
  const yearScores = calculateAnnuals(chart.pillars.day.stem, chart.strength, getCurrentBaziYear(), 6)
    .map((annual) => scoreChildAnnual(chart, annual))
    .sort((a, b) => b.score - a.score);
  const topScore = yearScores[0]?.score || 0;
  const windows = yearScores
    .filter((item) => item.score >= Math.max(1.8, topScore - 0.7))
    .slice(0, 3);
  const currentLuckGods = chart.luck.current ? [chart.luck.current.stemGod, chart.luck.current.branchGod].filter(Boolean) : [];
  const hourGods = getPillarGods(chart.pillars.hour);
  const childStarCount = getChildStarCount(chart);

  return {
    childStarCount,
    hourHasChildSignal: hasGod(hourGods, CHILD_GODS),
    hourHasSupportSignal: hasGod(hourGods, SUPPORT_GODS),
    luckHasChildSignal: hasGod(currentLuckGods, CHILD_GODS),
    luckHasSupportSignal: hasGod(currentLuckGods, SUPPORT_GODS),
    windows: windows.length ? windows : yearScores.slice(0, 2),
    yearScores,
  };
}

function formatChildWindows(windows) {
  if (!windows.length) return "近几年没有特别集中的单一年份";
  return windows.map((item) => `${item.annual.year}年${item.annual.name}`).join("、");
}

function getChildWindowReasonText(windows) {
  return windows
    .map((item) => {
      const reason = item.reasons[0] || "运年对子女议题有一定触发";
      return `${item.annual.year}年：${reason}`;
    })
    .join("；");
}

function makeChildConclusion(chart, intent) {
  const timing = getChildTimingProfile(chart);
  const windowText = formatChildWindows(timing.windows);
  const secondChildText = /二胎|三胎/.test(intent.question)
    ? "你问的是二胎，这比单纯问“有没有孩子”更看身体恢复、已有家庭分工、伴侣配合和照护资源。"
    : "这类问题不能只看一个年份，还要看身体状态、伴侣配合和家庭资源。";
  const luckText = timing.luckHasChildSignal
    ? "当前大运已经带到子女星，说明这个议题不是完全没被运势触发。"
    : timing.luckHasSupportSignal
      ? "当前大运更像先补身体、资源和照护支持，再等流年触发。"
      : "当前大运对子女星不是特别直露，所以更要看流年窗口和现实准备。";

  return `${secondChildText}按四柱看，接下来更值得重点观察的时间窗口是：${windowText}。这不是保证某年一定怀孕或生产，而是这些年份更容易把子女星、身体修复或家庭资源引动出来；${luckText}`;
}

function makeChildEvidence(chart, intent) {
  const timing = getChildTimingProfile(chart);
  const annual = chart.annuals[0];
  const currentLuck = chart.luck.current;
  const childStarText = timing.childStarCount > 0
    ? `原局食伤子女星约 ${timing.childStarCount.toFixed(1)}，说明命盘里有可观察的子女象。`
    : "原局食伤子女星不明显，子女议题更依赖大运、流年或伴侣命盘来触发。";
  const hourText = chart.pillars.hour
    ? timing.hourHasChildSignal
      ? `时柱为${chart.pillars.hour.name}，时柱带子女星，子女议题在命盘细节中有落点。`
      : timing.hourHasSupportSignal
        ? `时柱为${chart.pillars.hour.name}，时柱带印星，更强调身体修复、照护和支持条件。`
        : `时柱为${chart.pillars.hour.name}，没有直接透出子女星，具体时间还要看运年引动。`
    : "出生时间未知，时柱缺失；子女、晚年和具体事件时间的判断会明显降低可靠性。";

  const evidence = [
    `${RULESET_LABEL}：子女与生育先看食神、伤官为子女星和生发之象，再看印星代表身体修复、检查照护和支持条件。`,
    `问题识别为「${intent.labels.join("、")}」，你问的是${intent.horizon}的生育时间，不是财务或综合风险题。`,
    childStarText,
    hourText,
    `日主${chart.strength.label}：${chart.strength.summary}`,
    `${annual.year}年${annual.name}流年，天干为${annual.stemGod}，对应${getChildGodMeaning(annual.stemGod)}。`,
  ];
  if (currentLuck) {
    evidence.push(`当前大运为${currentLuck.name}，透出${currentLuck.stemGod}，子女生育层面对应${getChildGodMeaning(currentLuck.stemGod)}。`);
  } else {
    evidence.push(`当前尚未进入第一步大运，起运约在${chart.luck.startAgeText}，子女判断以原局、时柱和流年为主。`);
  }
  evidence.push(`未来几年重点窗口：${formatChildWindows(timing.windows)}。`);
  evidence.push(`窗口依据：${getChildWindowReasonText(timing.windows)}。`);
  return evidence;
}

function sumTenGodCounts(chart, gods) {
  return gods.reduce((sum, god) => sum + (chart.tenGodCounts[god] || 0), 0);
}

function describeAnnualGod(chart, god) {
  if (!god) return "当前没有明确的流年十神";
  if (chart.strength.favorableGods.includes(god)) return `${god}对这张盘偏有利`;
  if (chart.strength.unfavorableGods.includes(god)) return `${god}对这张盘偏耗力`;
  return `${god}影响偏中性`;
}

function getFinanceDecisionProfile(chart, intent) {
  const annualGod = chart.annuals[0]?.stemGod;
  const luckGod = chart.luck.current?.stemGod;
  const wealthCount = sumTenGodCounts(chart, ["正财", "偏财"]);
  const outputCount = sumTenGodCounts(chart, ["食神", "伤官"]);
  const peerCount = sumTenGodCounts(chart, ["比肩", "劫财"]);
  let opportunity = 0;
  let risk = 0;
  const reasons = [];

  if (wealthCount >= 1.5) {
    opportunity += 1;
    reasons.push(`原局财星约 ${wealthCount.toFixed(1)}，说明钱、资产和资源议题在命盘中有落点。`);
  } else {
    reasons.push("原局财星不算特别直露，财务判断更要看食伤生财、大运流年和现实现金流。");
  }
  if (outputCount >= 1) {
    opportunity += 0.8;
    reasons.push(`食伤约 ${outputCount.toFixed(1)}，有通过技能、表达、项目产出转化为钱的路径。`);
  }
  if (peerCount >= 1.5) {
    risk += 1;
    reasons.push(`比劫约 ${peerCount.toFixed(1)}，涉及合伙、借贷、分账时容易出现竞争、分摊或被动让利。`);
  }
  if (chart.strength.label === "偏弱") {
    risk += 1;
    reasons.push("日主偏弱时遇到财务机会，要先看自己能否承接本金、压力和后续责任。");
  }
  if (annualGod === "正财" || annualGod === "偏财") {
    opportunity += chart.strength.favorableGods.includes(annualGod) ? 1.2 : 0.5;
    if (chart.strength.unfavorableGods.includes(annualGod)) risk += 0.8;
    reasons.push(`今年流年透${annualGod}，财务议题会被引动，${describeAnnualGod(chart, annualGod)}。`);
  }
  if (luckGod === "正财" || luckGod === "偏财") {
    opportunity += 1;
    reasons.push(`当前大运透${luckGod}，说明这不是只看一两天情绪的财务题，而是阶段性资源议题。`);
  }
  if (intent.decision.key === "invest" || intent.decision.key === "loan") {
    risk += 0.8;
    reasons.push(`你问的是「${intent.decision.label}」，重点不是有没有财星，而是本金安全和退出条件。`);
  }

  const level =
    risk >= 2.2
      ? "谨慎验证"
      : opportunity >= 2 && risk < 1.8
        ? "可以主动梳理"
        : "小步推进";

  return { level, opportunity, risk, reasons };
}

function getCareerDecisionProfile(chart, intent) {
  const annualGod = chart.annuals[0]?.stemGod;
  const luckGod = chart.luck.current?.stemGod;
  const officerCount = sumTenGodCounts(chart, ["正官", "七杀"]);
  const supportCount = sumTenGodCounts(chart, ["正印", "偏印"]);
  const outputCount = sumTenGodCounts(chart, ["食神", "伤官"]);
  const peerCount = sumTenGodCounts(chart, ["比肩", "劫财"]);
  let mobility = 0;
  let pressure = 0;
  const reasons = [];

  if (officerCount >= 1) {
    mobility += 0.8;
    pressure += officerCount >= 2 ? 0.8 : 0.3;
    reasons.push(`原局官杀约 ${officerCount.toFixed(1)}，事业上会比较看重职位、规则、责任和压力承接。`);
  }
  if (supportCount >= 1) {
    mobility += 0.8;
    reasons.push(`印星约 ${supportCount.toFixed(1)}，有资质、学习、贵人或组织资源可用。`);
  }
  if (outputCount >= 1) {
    mobility += 0.6;
    reasons.push(`食伤约 ${outputCount.toFixed(1)}，适合靠作品、表达、技能输出争取机会。`);
  }
  if (peerCount >= 1.5) {
    pressure += 0.8;
    reasons.push(`比劫约 ${peerCount.toFixed(1)}，职场里容易出现竞争、同事分工或资源争夺。`);
  }
  if (annualGod === "正官" || annualGod === "七杀") {
    mobility += 1;
    pressure += annualGod === "七杀" ? 0.8 : 0.4;
    reasons.push(`今年流年透${annualGod}，工作职责、上级要求或职位压力会更明显。`);
  }
  if (luckGod === "正印" || luckGod === "偏印") {
    mobility += 0.8;
    reasons.push(`当前大运透${luckGod}，适合先补资质、方法、平台和支持，再谈大动作。`);
  }
  if (chart.strength.label === "偏弱" && (annualGod === "正官" || annualGod === "七杀")) {
    pressure += 1;
    reasons.push("日主偏弱又遇官杀，跳槽或转向前更要确认承压边界。");
  }
  if (intent.decision.key === "job-change") {
    pressure += 0.5;
    reasons.push("你问的是跳槽/离职，判断重点从“有没有机会”转为“新机会能不能稳定承接”。");
  }

  const level =
    pressure >= 2.2 && mobility < 2.2
      ? "先稳后动"
      : mobility >= 2.2 && pressure < 2.2
        ? "可以争取"
        : "边验证边推进";

  return { level, mobility, pressure, reasons };
}

function getRelationshipDecisionProfile(chart, intent) {
  const isFemale = chart.profileGender === "female";
  const partnerGods = isFemale ? ["正官", "七杀"] : ["正财", "偏财"];
  const partnerLabel = isFemale ? "坤造以官杀看伴侣、承诺和关系约束" : "乾造以财星看伴侣、现实投入和关系承接";
  const disruptGods = isFemale ? ["伤官", "比肩", "劫财"] : ["比肩", "劫财", "伤官"];
  const annualGod = chart.annuals[0]?.stemGod;
  const luckGod = chart.luck.current?.stemGod;
  const partnerCount = sumTenGodCounts(chart, partnerGods);
  const disruptCount = sumTenGodCounts(chart, disruptGods);
  let support = 0;
  let friction = 0;
  const reasons = [partnerLabel];

  if (partnerCount >= 1) {
    support += 1;
    reasons.push(`原局伴侣星约 ${partnerCount.toFixed(1)}，关系议题在命盘里有可观察的落点。`);
  } else {
    reasons.push("原局伴侣星不算直露，关系结果更依赖大运流年触发和现实互动质量。");
  }
  if (disruptCount >= 1.5) {
    friction += 1;
    reasons.push(`原局中影响关系稳定的十神约 ${disruptCount.toFixed(1)}，容易把边界、第三方意见或表达方式带进关系。`);
  }
  if (partnerGods.includes(annualGod)) {
    support += chart.strength.favorableGods.includes(annualGod) ? 1.2 : 0.7;
    reasons.push(`今年流年透${annualGod}，伴侣/承诺议题被直接引动，${describeAnnualGod(chart, annualGod)}。`);
  }
  if (disruptGods.includes(annualGod)) {
    friction += 0.8;
    reasons.push(`今年流年透${annualGod}，关系里更容易出现边界、表达或竞争性情绪。`);
  }
  if (partnerGods.includes(luckGod)) {
    support += 1;
    reasons.push(`当前大运透${luckGod}，关系不是短期情绪题，属于阶段性主题。`);
  }
  if (intent.decision.key === "relationship-return" || intent.decision.key === "relationship-end") {
    friction += 0.5;
    reasons.push(`你问的是「${intent.decision.label}」，重点要看稳定行动，而不是只看一时想念或难受。`);
  }

  const level =
    friction >= 2 && support < 2
      ? "先修边界"
      : support >= 2 && friction < 2
        ? "可以沟通推进"
        : "边观察边验证";

  return { level, support, friction, reasons, partnerLabel };
}

function getStudyDecisionProfile(chart, intent) {
  const annualGod = chart.annuals[0]?.stemGod;
  const supportCount = sumTenGodCounts(chart, ["正印", "偏印"]);
  const outputCount = sumTenGodCounts(chart, ["食神", "伤官"]);
  const reasons = [
    `印星约 ${supportCount.toFixed(1)}，看吸收、资料、老师和方法。`,
    `食伤约 ${outputCount.toFixed(1)}，看输出、考试表达、作品和答题状态。`,
    `今年流年透${annualGod}，${describeAnnualGod(chart, annualGod)}。`,
  ];
  const level = supportCount + outputCount >= 2 ? "适合形成节奏" : "先补方法基础";
  if (intent.decision.key === "exam") {
    reasons.push("你问的是考试/证书，关键是把输入转成模拟题、作品或可评分输出。");
  }
  return { level, reasons };
}

function makeDomainEvidence(chart, questionType, intent) {
  if (questionType === "财运") {
    const profile = getFinanceDecisionProfile(chart, intent);
    return [`财务专项判断为「${profile.level}」。`, ...profile.reasons];
  }
  if (questionType === "事业") {
    const profile = getCareerDecisionProfile(chart, intent);
    return [`事业专项判断为「${profile.level}」。`, ...profile.reasons];
  }
  if (questionType === "婚姻感情") {
    const profile = getRelationshipDecisionProfile(chart, intent);
    return [`关系专项判断为「${profile.level}」。`, ...profile.reasons];
  }
  if (questionType === "学业") {
    const profile = getStudyDecisionProfile(chart, intent);
    return [`学业专项判断为「${profile.level}」。`, ...profile.reasons];
  }
  return [];
}

function getDomainLearningText(questionType, chart, intent) {
  if (questionType === "财运") {
    const profile = getFinanceDecisionProfile(chart, intent);
    return `专项看法：财务先看财星，再看食伤能不能生财、比劫会不会分财；这次属于「${profile.level}」，所以不能只问赚不赚，还要问本金和退出能不能守住。`;
  }
  if (questionType === "事业") {
    const profile = getCareerDecisionProfile(chart, intent);
    return `专项看法：事业先看官杀代表职位压力，印星代表平台资质，食伤代表输出表现；这次属于「${profile.level}」，所以要同时看机会和承压边界。`;
  }
  if (questionType === "婚姻感情") {
    const profile = getRelationshipDecisionProfile(chart, intent);
    return `专项看法：${profile.partnerLabel}，再看比劫、伤官等是否冲到关系稳定；这次属于「${profile.level}」，所以重点不是情绪强弱，而是稳定行动和边界。`;
  }
  if (questionType === "学业") {
    const profile = getStudyDecisionProfile(chart, intent);
    return `专项看法：学业先看印星吸收，再看食伤输出，考试证书尤其要把输入变成可评分结果；这次属于「${profile.level}」。`;
  }
  return "";
}

function getDomainActionText(questionType, chart, intent) {
  if (questionType === "财运") {
    const profile = getFinanceDecisionProfile(chart, intent);
    return profile.level === "谨慎验证"
      ? "财务动作先设三条线：最多投多少、亏到哪里退出、多久必须回款；三条没写清楚就不扩大投入。"
      : "财务动作可以推进清单化：本金、收益、回款、分账、退出条件逐项写明，再决定投入比例。";
  }
  if (questionType === "事业") {
    const profile = getCareerDecisionProfile(chart, intent);
    return profile.level === "先稳后动"
      ? "事业动作先做信息验证：新岗位/项目的职责、收入、合同、上级资源、退路全部确认后再动。"
      : "事业动作可以主动争取，但要把成果指标和资源支持写清楚，用一到两周的小验证看方向是否成立。";
  }
  if (questionType === "婚姻感情") {
    const profile = getRelationshipDecisionProfile(chart, intent);
    return profile.level === "先修边界"
      ? "关系动作先修边界：把钱、家庭、承诺、沟通频率和不能接受的点讲清楚，再谈复合、结婚或继续。"
      : "关系动作可以沟通推进，但要观察对方是否连续给出稳定行动，而不是只看一次情绪表达。";
  }
  if (questionType === "学业") {
    return "学习动作要从输入转输出：每周固定一份可检查成果，例如模拟题、笔记框架、作品或复盘清单。";
  }
  return "";
}

function makeFocusedEvidence(chart, config, intent) {
  if (intent.primaryType === "子女生育") {
    return makeChildEvidence(chart, intent);
  }
  if (intent.primaryType === "健康") {
    return makeHealthEvidence(chart, intent);
  }
  if (intent.primaryType === "日常饮食") {
    return makeMealEvidence(chart, intent, intent.question);
  }

  const annual = chart.annuals[0];
  const timing = getIntentTimingProfile(chart, config, intent);
  const focus = timing.focus;
  const evidence = [
    `${RULESET_LABEL}：年以立春分界，月按太阳黄经交节时刻定节令，子时 23:00 后按次日。`,
    `问题识别为「${intent.labels.join("、")}」，现代关注点是${intent.modernFocus.join("；") || "时间、对象、投入和风险"}。`,
    `具体情境落在「${intent.aspect.label}」，现实先看：${intent.aspect.reality}。`,
    `对应四柱重点看：${focus.join("、")}，再结合日主旺衰、喜忌、大运和流年。`,
    `流年为${annual.name}，天干对应${annual.stemGod}，重点落在${getGodDomain(annual.stemGod)}。`,
    `日主${chart.strength.label}，初步以${chart.strength.favorableGods.join("、")}为喜。`,
  ];
  if (chart.luck.current) {
    evidence.push(
      `当前大运为${chart.luck.current.name}，透出${chart.luck.current.stemGod}，会影响问题的承接方式。`,
    );
  } else {
    evidence.push(`当前尚未进入第一步大运，起运约在${chart.luck.startAgeText}。`);
  }
  evidence.push(`你实际问的是「${intent.decision.label}」，核心动作是：${intent.decision.action}；现实风险先看${intent.decision.risk}。`);
  evidence.push(...makeDomainEvidence(chart, intent.primaryType, intent));
  evidence.push(`可重点观察的运年窗口：${formatIntentWindows(timing.windows)}。`);
  evidence.push(`窗口依据：${formatIntentWindowReasons(timing.windows)}。`);
  evidence.push(...chart.strength.evidence.slice(0, 2));
  if (hasFocusSignal(chart, config, intent)) {
    evidence.push("大运或流年已经触及本问题相关十神，可以作为近期判断重点。");
  } else {
    evidence.push("本问题相关十神没有强烈透出，更适合按现有条件稳步推进。");
  }
  return evidence;
}

function makeExplanation(questionType, chart, intent) {
  const annual = chart.annuals[0];
  const config = QUESTION_TYPES[questionType] || QUESTION_TYPES.自定义;
  const timing = getIntentTimingProfile(chart, config, intent);
  const currentLuck = chart.luck.current ? `${chart.luck.current.name}大运` : "起运前阶段";
  const annualEffect = chart.strength.favorableGods.includes(annual.stemGod)
    ? "流年十神落在喜神范围，事情较容易得到助力"
    : chart.strength.unfavorableGods.includes(annual.stemGod)
      ? "流年十神落在忌神范围，事情容易先见压力或消耗"
      : "流年十神影响偏中性，仍要看具体组合";
  if (questionType === "子女生育") {
    const timing = getChildTimingProfile(chart);
    return [
      "第一步，先定问题性质：你问的是子女与生育，四柱里不能用综合模板，要重点看食神、伤官这对子女星。",
      `第二步，看原局基础：日主${chart.strength.label}，原局食伤子女星约 ${timing.childStarCount.toFixed(1)}；时柱${chart.pillars.hour ? `为${chart.pillars.hour.name}` : "未知"}，所以具体时间的可靠性要随时柱完整度调整。`,
      `第三步，看运年触发：现在是${currentLuck}，${annual.year}年${annual.name}流年透出${annual.stemGod}，对应${getChildGodMeaning(annual.stemGod)}。`,
      `第四步，排时间窗口：未来几年优先看${formatChildWindows(timing.windows)}，因为这些年份对子女星、印星修复或承接条件更有触发。`,
      "所以结论不是“某天必有二胎”，而是把更值得准备、检查、沟通和尝试的阶段圈出来。",
    ].join("\n");
  }
  if (questionType === "健康") {
    return [
      `第一步，看日主强弱：日主${chart.strength.label}，代表身体和精神承受力的基础状态。`,
      `第二步，看健康相关十神：官杀多看压力和突发负担，食伤多看消耗和作息，印星多看恢复、睡眠、检查和支持。`,
      `第三步，看运年触发：现在是${currentLuck}，${annual.year}年${annual.name}流年透出${annual.stemGod}，对应${getHealthGodMeaning(annual.stemGod)}。`,
      `所以这类问题不能简单说“必病”或“没病”，而是看今年是否更容易因为压力、消耗、作息或恢复不足而出问题。`,
    ].join("\n");
  }
  if (questionType === "日常饮食") {
    const signal = getMealSignal(chart, intent.question);
    return [
      "第一步，先定问题性质：你问的是今晚吃什么，这是日常应事，不是年度运势、事业或财务判断。",
      `第二步，取用时间：今天晚上按${signal.hourPillar?.branch || "晚间"}时看，流日为${signal.dayPillar.name}，流时为${signal.hourPillar?.name || "未知"}。`,
      `第三步，换成十神：流日是${signal.dayGod || "不明"}，流时是${signal.hourGod || "不明"}，用来看这顿饭是偏口腹欲、家常照顾、方便安排，还是跟人一起吃。`,
      `第四步，换成五行食物象：${signal.mainElement}主${signal.mainHint.food}，${signal.secondElement}辅${signal.secondHint.food}，所以结论只能断“像哪类饭”，不能硬断唯一菜名。`,
    ].join("\n");
  }
  const domainLearning = getDomainLearningText(questionType, chart, intent);
  return [
    `第一步，先定原局：日主${chart.strength.label}，这是判断承接能力的基础。`,
    `第二步，先把问题落到现实情境：这是「${intent.aspect.label}」，现实层面重点看${intent.aspect.reality}。`,
    `第三步，再看喜忌：当前以${chart.strength.favorableGods.join("、")}为喜，用来判断事情是得力还是耗力。`,
    `第四步，叠加运年：现在是${currentLuck}，${annual.year}年${annual.name}流年透出${annual.stemGod}，${annualEffect}。`,
    ...(domainLearning ? [domainLearning] : []),
    `第五步，看时间窗口：${formatIntentWindows(timing.windows)}更容易触发相关十神；${formatIntentWindowReasons(timing.windows)}。`,
    `所以你问的${intent.horizon}${intent.mode}题，不是只看“能不能”，还要看现实条件是否能接住这些运年信号。`,
  ].join("\n");
}

function generateExplainableResult(profile, question, tag) {
  const chart = calculateBaziChart(profile);
  const intent = getQuestionIntent(question, tag);
  const questionType = inferQuestionType(question, tag);
  const config = QUESTION_TYPES[questionType] || QUESTION_TYPES.自定义;

  if (chart.error) {
    return {
      title: question,
      tone: "信息待完善",
      conclusion: chart.error,
      evidence: ["档案缺少可计算的出生日期，暂不能生成四柱、大运和流年依据。"],
      explanation: "补全出生日期后，系统会基于年柱、月柱、日柱、时柱和当前运年重新生成判断。",
      suggestion: "先回到档案页完善出生信息，再生成分析。",
      uncertainty: ["出生信息不完整时，排盘和问事结论都不应视为确定。"],
      chart,
    };
  }

  const uncertainty = [];
  if (!chart.pillars.hour) {
    uncertainty.push("出生时间未知，无法计算时柱。");
    uncertainty.push("涉及子女、晚年、具体事件时间的判断可靠性降低。");
    if (chart.termAmbiguity) {
      uncertainty.push(`出生日期当天逢${chart.termAmbiguity.termName}节气，未填具体时间时，年柱或月柱可能存在边界误差。`);
    }
  }
  if (chart.dayChangedAtZi) {
    uncertainty.push("出生时间在 23:00 后，日柱按次日计算。");
  }
  if (chart.solarTime?.applied) {
    uncertainty.push(`已按${chart.solarTime.label}排盘，输入时间为 ${chart.standardBirthLabel}，排盘时刻为 ${chart.calculationBirthLabel}。`);
    if (chart.solarTime.hourChanged) {
      uncertainty.push(`真太阳时修正后时辰由${chart.solarTime.standardHourBranch}时变为${chart.solarTime.calculationHourBranch}时，时柱会随之改变。`);
    }
    if (chart.solarTime.dateChanged) {
      uncertainty.push("真太阳时修正后跨日，日柱和时柱均按修正后的日期时间计算。");
    }
  }
  if (profile.calendarType === "lunar") {
    uncertainty.push(`农历日期已换算为阳历 ${chart.solarBirth.iso} 后排盘。`);
  }
  if (questionType === "健康") {
    uncertainty.push("健康类结果只用于命理学习和风险提醒，不能替代医生诊断、检查和治疗建议。");
  }
  if (questionType === "子女生育") {
    uncertainty.push("子女生育结果只作命理学习和时间倾向参考，不能替代医学检查、备孕建议或医生判断。");
    if (chart.profileGender === "male") {
      uncertainty.push("男性档案不能单独决定伴侣怀孕时间，涉及二胎还需要合看伴侣状态和现实备孕条件。");
    }
  }

  return {
    title: question,
    tone: intent.isCustomInput ? `${config.tone}｜${intent.mode}` : config.tone,
    conclusion: adaptConclusion(config.conclusion, questionType, chart, intent),
    evidence: makeFocusedEvidence(chart, config, intent),
    explanation: makeExplanation(questionType, chart, intent),
    suggestion: makeDetailedSuggestion(config.suggestion, questionType, chart, intent),
    uncertainty,
    chart,
  };
}

function makeFinanceConclusion(chart, intent) {
  const profile = getFinanceDecisionProfile(chart, intent);
  if (intent.decision.key === "invest") {
    return profile.level === "谨慎验证"
      ? "这笔投资不适合直接重仓或一次性决定。四柱里财务议题被引动，但承接压力也明显，正确做法是先设投入上限、退出条件和最坏损失，再用小额验证。"
      : "这笔投资可以进入筛选和小额验证阶段，但不代表可以无条件加码。命盘支持的是把财务机会梳理清楚，现实中仍要看本金安全、回撤和退出。";
  }
  if (intent.decision.key === "loan") {
    return profile.level === "谨慎验证"
      ? "借贷或回款问题要先按风险处理，不建议只凭关系和口头承诺推进。比起判断对方会不会还，更要先保留凭证、期限和违约处理方式。"
      : "借贷或回款可以沟通推进，但要把金额、期限、凭证和还款节奏写清楚，不要让关系替代规则。";
  }
  if (intent.decision.key === "asset") {
    return profile.level === "谨慎验证"
      ? "买卖资产近期要谨慎，核心不是能不能买卖，而是长期现金流和合同节点是否承接得住。先算月供、税费、备用金和退出成本。"
      : "资产类事项可以认真比较方案，但要按现金流、家庭意见和合同节点推进，不适合只看价格波动或一时冲动。";
  }
  if (profile.level === "可以主动梳理") {
    return "财务机会可以主动梳理，尤其适合把资源、定价、回款和分账规则讲清楚。四柱给的是可用的财务节奏，但真正能不能成，要看账目和边界能不能落地。";
  }
  if (profile.level === "谨慎验证") {
    return "财务上不是完全不能动，但不宜重投入。现在更适合轻量验证、控制本金、保留退出条件，先确认承接能力再扩大。";
  }
  return "财务事项可以小步推进。先从低成本验证开始，把现金流、风险边界和回款方式做清楚，再决定是否扩大投入。";
}

function makeCareerConclusion(chart, intent) {
  const profile = getCareerDecisionProfile(chart, intent);
  if (intent.decision.key === "job-change") {
    return profile.level === "先稳后动"
      ? "不建议裸辞或只凭不舒服就跳槽。事业信号里有变化念头，但承压也明显，先把新岗位职责、收入结构、试用期和退路确认清楚，再决定离开。"
      : profile.level === "可以争取"
        ? "可以主动看机会或争取更好的岗位，但要以书面条件和可衡量职责为准。四柱上事业有被引动，关键是把机会落成稳定承接。"
        : "适合边看机会边验证，不急着立刻切断原路径。先面试、比较条件、确认上级和团队资源，再决定是否跳槽。";
  }
  if (intent.decision.key === "venture") {
    return profile.level === "先稳后动"
      ? "创业或项目不适合一上来大投入。现在更适合用副业、小单或试运营验证客户和现金流，别把主业和储备一次压上。"
      : "项目可以推进试点，但要先把客户来源、交付能力、合伙责任和回款方式定清楚，再扩规模。";
  }
  if (profile.level === "可以争取") {
    return "事业上可以主动争取机会，尤其适合把职责、资源和成果指标讲清楚。不是只等贵人，而是用资质、输出和平台资源把机会接住。";
  }
  if (profile.level === "先稳后动") {
    return "事业上先稳住基本盘更合适。当前压力信号比机会信号更重，先补资源、明职责、降风险，再做大转向。";
  }
  return "事业上可以推进，但要边验证边行动。先做信息收集和小范围尝试，等职责、收入、合同和支持条件清楚后再加速。";
}

function makeRelationshipConclusion(chart, intent) {
  const profile = getRelationshipDecisionProfile(chart, intent);
  if (intent.decision.key === "relationship-return") {
    return profile.level === "先修边界"
      ? "这段关系不适合只凭想念或短暂回暖就复合。四柱里关系议题有牵动，但摩擦也重，先看旧问题能不能被说清楚、对方能不能给稳定行动。"
      : "可以沟通，但复合的关键不是一句话表态，而是后续边界、承诺和现实安排是否稳定。先小范围恢复联系，再看行动是否连续。";
  }
  if (intent.decision.key === "relationship-end") {
    return profile.level === "先修边界"
      ? "分开或拉开距离有现实原因，但不建议在情绪最高点做不可逆决定。先把金钱、家庭、承诺和沟通边界说清楚，再决定是否彻底结束。"
      : "如果核心问题已经反复出现，可以把分开当作一个认真选项。四柱提示的是关系议题被引动，现实中要看对方是否愿意共同修正。";
  }
  if (profile.level === "可以沟通推进") {
    return "关系可以向前沟通，但重点是承诺和现实安排，不是只看暧昧或情绪。把期待、金钱、家庭边界和未来节奏讲清楚，会比猜对方心思更有用。";
  }
  if (profile.level === "先修边界") {
    return "关系里目前更需要先修边界。感情不是完全没有机会，但如果沟通方式、第三方意见或现实分配不清楚，推进越快越容易反复。";
  }
  return "关系可以观察和试探推进，但要用稳定行动验证，不要只靠情绪判断。先看对方是否持续回应现实问题，再决定是否加深承诺。";
}

function makeStudyConclusion(chart, intent) {
  const profile = getStudyDecisionProfile(chart, intent);
  return profile.level === "适合形成节奏"
    ? "学习或考试可以推进，关键是把吸收变成输出。不要只停留在看课和搜资料，要用模拟题、作品或阶段反馈验证。"
    : "学习上先补方法和基础更合适。不是不能考或不能学，而是要先建立稳定节奏，再谈冲刺和结果。";
}

function adaptConclusion(base, questionType, chart, intent) {
  const annualGod = chart.annuals[0]?.stemGod;
  const annualIsFavorable = chart.strength.favorableGods.includes(annualGod);
  const annualIsUnfavorable = chart.strength.unfavorableGods.includes(annualGod);
  const focusText = intent.labels.join("、");
  const shouldBeCareful = annualIsUnfavorable || chart.strength.label === "偏弱";
  const config = QUESTION_TYPES[questionType] || QUESTION_TYPES.自定义;
  const timing = getIntentTimingProfile(chart, config, intent);
  const windowText = formatIntentWindows(timing.windows);

  if (questionType === "子女生育") {
    return makeChildConclusion(chart, intent);
  }
  if (questionType === "健康") {
    return makeHealthConclusion(chart);
  }
  if (questionType === "日常饮食") {
    return makeMealConclusion(chart, intent.question);
  }
  if (questionType === "合同风险") {
    return shouldBeCareful
      ? "这件事要先按风险题处理，不建议只凭口头承诺推进。当前更需要把条款、证据、责任边界和退出条件写清楚，尤其要防止后续扯皮。"
      : "这件事不是完全不能推进，但核心不在“感觉顺不顺”，而在合同文本、付款节点、责任边界和违约处理是否清楚。";
  }
  if (questionType === "家庭居住") {
    return "家庭和居住问题更适合按阶段推进。先看现实中的预算、照顾责任、家庭沟通和稳定性，再看运年是否支持搬动或调整，不建议只凭一时情绪决定。";
  }
  if (questionType === "出行迁移") {
    return shouldBeCareful
      ? "出行或迁移可以规划，但近期不适合临时冲动地动。先把证件、交通、预算、住宿和备用方案准备好，再决定是否推进。"
      : "出行或迁移有推进空间，但要把目的、资源和落脚点说清楚。命盘提示的是变化节奏，现实中仍要用计划和备用方案承接。";
  }
  if (questionType === "财运") {
    return makeFinanceConclusion(chart, intent);
  }
  if (questionType === "事业") {
    return makeCareerConclusion(chart, intent);
  }
  if (questionType === "婚姻感情") {
    return makeRelationshipConclusion(chart, intent);
  }
  if (questionType === "学业") {
    return makeStudyConclusion(chart, intent);
  }

  if (intent.mode === "时间") {
    return `这个问题更适合按阶段看，不适合只押一个绝对时间点。围绕「${intent.aspect.label}」，更值得重点观察的窗口是：${windowText}。如果${intent.aspect.reality}还没有同步到位，就先不要把节奏推得太满。`;
  }

  if (intent.mode === "决策") {
    return shouldBeCareful
      ? `这件事可以继续观察，但不建议马上重投入或做不可逆决定。它涉及${focusText}，具体落在「${intent.aspect.label}」，当前更适合先做小范围验证，把${intent.aspect.reality}说清楚。`
      : `这件事可以推进，但仍建议分阶段落地。它涉及${focusText}，具体落在「${intent.aspect.label}」，当前不是完全不能动，而是要把资源、承诺和风险控制同步做好。`;
  }

  if (intent.mode === "方法") {
    return `这件事的关键不是单纯等运势，而是把「${intent.aspect.label}」拆小：先处理${intent.aspect.reality}，再用一到两个可验证动作试方向。命盘提示的是节奏和风险点，不替代具体执行。`;
  }

  if (questionType === "财运" && chart.strength.label === "偏弱") {
    return "财务机会可以观察，但承接能力要优先考虑。比起一次性加码，更适合轻投入、小范围验证。";
  }
  if (questionType === "财运" && annualIsFavorable) {
    return "财星或生财之象为当前命局所喜，财务机会可以主动梳理，但仍要以明确账目和边界承接。";
  }
  if (questionType === "事业" && chart.annuals[0]?.stemGod === "七杀") {
    return "事业压力和机会会同时出现，适合争取更清晰的职责，不宜在信息不足时突然转向。";
  }
  if (questionType === "事业" && annualIsUnfavorable) {
    return "事业相关十神被引动但对命局形成压力，近期不宜贸然大变，更适合先稳岗位、明职责、补资源。";
  }
  if (questionType === "婚姻感情" && (chart.tenGodCounts.比肩 || chart.tenGodCounts.劫财)) {
    return "关系里容易出现边界、第三方意见或现实分配问题，重点是把期待说清楚，而不是只看情绪强弱。";
  }
  return base;
}

function makeDetailedSuggestion(base, questionType, chart, intent) {
  const annualGod = chart.annuals[0]?.stemGod;
  const annualIsFavorable = chart.strength.favorableGods.includes(annualGod);
  const currentLuckText = chart.luck.current ? `${chart.luck.current.name}大运` : "起运前阶段";
  const focusText = intent.labels.join("、");

  if (questionType === "健康") {
    const risk = getHealthRiskProfile(chart);
    return [
      `1. 先把结论当作风险管理：今年健康风险为「${risk.level}」，不是诊断某种病。`,
      `2. 四柱学习重点：日主${chart.strength.label}看承受力，${annualGod}看今年被触发的健康侧重点，${chart.luck.current ? `${chart.luck.current.stemGod}看大运长期背景` : "未起运时重点看原局和流年"}。`,
      "3. 现实行动：规律睡眠、减少连续熬夜和情绪透支；有症状、疼痛、体检异常或持续不适时，先看医生，不要等命理结论。",
      `4. ${base}`,
    ].join("\n");
  }
  if (questionType === "日常饮食") {
    const signal = getMealSignal(chart, intent.question);
    return [
      `1. 如果你想验证：今晚优先看是否接近「${signal.mainHint.guess}」。`,
      `2. 自己学习时按这个顺序看：先取今晚时辰，再看流日/流时，再把${signal.mainElement}、${signal.secondElement}转成食物象。`,
      `3. 如果现实中有人约饭或点外卖，${signal.appetiteText}，实际选择会更容易被这个场景带走。`,
      `4. ${base}`,
    ].join("\n");
  }
  if (questionType === "子女生育") {
    const timing = getChildTimingProfile(chart);
    const secondChildAdvice = /二胎|三胎/.test(intent.question)
      ? "二胎要额外看已有孩子照顾、伴侣分工、恢复周期和家庭预算。"
      : "如果是备孕问题，要同时看身体状态、伴侣配合和现实节奏。";
    return [
      `1. 时间上先关注：${formatChildWindows(timing.windows)}，这些年份更适合作为备孕、检查、沟通和安排资源的重点窗口。`,
      `2. 四柱学习顺序：先找食神、伤官子女星，再看时柱是否落点，再叠加大运和流年；印星出现时，重点放在身体修复和外部支持。`,
      `3. 现实行动：${secondChildAdvice}有体检异常、长期未孕或身体不适时，优先走医学检查，不用命理替代医生。`,
      `4. ${base}`,
    ].join("\n");
  }

  const riskText = annualIsFavorable
    ? "可以主动推进，但要把关键承诺落到具体动作"
    : "先控制投入强度，避免因为短期压力做过度承诺";
  const typeAdvice =
    questionType === "财运"
      ? "涉及钱、项目、投资和分成时，先算现金流、最坏损失和退出条件。"
      : questionType === "事业"
        ? "涉及工作、跳槽、创业和合作时，先确认职责、收入结构、合同边界和资源支持。"
        : questionType === "婚姻感情"
          ? "涉及关系时，先把期待、承诺、金钱和家庭边界讲清楚，不要只看情绪起伏。"
        : questionType === "健康"
          ? "健康问题只做生活方式提醒，重点放在作息、压力、情绪和体检。"
          : questionType === "学业"
            ? "学习和考试要把输入变成输出，用阶段成果验证方向。"
            : questionType === "家庭居住"
              ? "家庭和居住要同时看预算、照顾责任、通勤生活、合同和家庭沟通。"
              : questionType === "合同风险"
                ? "合同和纠纷要先看条款、证据、责任边界、付款节点和违约成本。"
                : questionType === "出行迁移"
                  ? "出行迁移要先确认目的、证件手续、预算、交通住宿和备用方案。"
                  : "先把问题拆成对象、时间、投入、风险四项，再决定推进顺序。";
  const domainAction = getDomainActionText(questionType, chart, intent);
  const nextIndex = domainAction ? 5 : 4;

  return [
    `1. 先按${focusText}处理现实问题：${typeAdvice}`,
    `2. 具体情境是「${intent.aspect.label}」：${intent.aspect.action}`,
    `3. 当前处在${currentLuckText}，流年十神为${annualGod}，${riskText}。`,
    ...(domainAction ? [`4. ${domainAction}`] : []),
    `${nextIndex}. ${intent.horizon}的行动建议：先做低成本验证，再决定是否扩大投入；如果要签约、转岗、投资或承诺关系，保留书面依据和缓冲期。`,
    `${nextIndex + 1}. ${base}`,
  ].join("\n");
}

function renderAnalysisResult(result) {
  resultTitle.textContent = result.title;
  analysisTone.textContent = result.tone;
  resultConclusion.textContent = result.conclusion;
  resultExplanation.textContent = result.explanation;
  resultSuggestion.textContent = result.suggestion;
  resultEvidence.replaceChildren(...result.evidence.map((item) => createElement("li", "", item)));
  const uncertainty = result.uncertainty || [];
  resultUncertaintyBlock.hidden = uncertainty.length === 0;
  resultUncertainty.replaceChildren(...uncertainty.map((item) => createElement("li", "", item)));
}

function createQuestionRecord(profile, question, tag, result) {
  return {
    id: `question-${Date.now()}`,
    profileId: profile.id,
    profileName: profile.name,
    question,
    tag,
    result: {
      tone: result.tone,
      conclusion: result.conclusion,
      evidence: result.evidence,
      explanation: result.explanation,
      suggestion: result.suggestion,
      uncertainty: result.uncertainty,
    },
    createdAt: Date.now(),
  };
}

function readProfileFromForm(existingProfile = null) {
  const name = profileName.value.trim() || "未命名档案";
  const calendarType = calendarTypeInputs.find((item) => item.checked)?.value || "solar";
  const birthDate = profileBirthDate.value;
  if (!birthDate) {
    showToast("请填写出生日期");
    return null;
  }

  return normalizeProfile({
    ...(existingProfile || {}),
    id: existingProfile?.id || crypto.randomUUID(),
    name,
    gender: profileGender.value === "坤造" ? "female" : "male",
    calendarType,
    lunarLeapMonth: calendarType === "lunar" && profileLunarLeap.checked,
    birthDate,
    birthTime: profileBirthTime.dataset.value || "",
    relation: profileRelation.value,
    birthPlace: profileBirthPlace.value.trim(),
    note: profileNote.value.trim(),
    recentQuestion: existingProfile?.recentQuestion || "暂无问事记录",
    recentTag: existingProfile?.recentTag || "自定义",
    createdAt: existingProfile?.createdAt || Date.now(),
    updatedAt: Date.now(),
  });
}

function normalizeImportedProfiles(value) {
  const importedProfiles = Array.isArray(value) ? value : value?.profiles;
  if (!Array.isArray(importedProfiles)) {
    return null;
  }

  return importedProfiles
    .filter((profile) => profile && (profile.name || profile.meta))
    .map((profile, index) => normalizeProfile(profile, index));
}

async function exportProfiles() {
  const backup = {
    app: "命理",
    version: 2,
    exportedAt: new Date().toISOString(),
    profiles: profiles.map(serializeProfile),
    questions: questionRecords,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `mingli-profiles-${date}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("档案备份已导出");
  void putRecordToDb(BACKUP_STORE, {
    id: `backup-${Date.now()}`,
    type: "export",
    count: profiles.length,
    createdAt: Date.now(),
  }).catch(() => {});
}

function importProfiles(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", async () => {
    try {
      const parsed = JSON.parse(reader.result);
      const nextProfiles = normalizeImportedProfiles(parsed);
      if (!nextProfiles || nextProfiles.length === 0) {
        showToast("未识别到档案数据");
        return;
      }

      profiles = nextProfiles;
      await persistProfiles();
      if (Array.isArray(parsed.questions)) {
        questionRecords = parsed.questions;
        await writeAllToDb(QUESTION_STORE, questionRecords);
      } else {
        questionRecords = [];
      }
      renderProfiles();
      setCurrentProfile(profiles[0]);
      showToast(`已导入 ${profiles.length} 份档案`);
      void putRecordToDb(BACKUP_STORE, {
        id: `backup-${Date.now()}`,
        type: "import",
        count: profiles.length,
        createdAt: Date.now(),
      }).catch(() => {});
    } catch (error) {
      showToast("备份文件无法读取");
    }
  });
  reader.readAsText(file);
}

async function initializeApp() {
  try {
    questionRecords = await readQuestionsFromDb();
    const storedProfiles = (await readProfilesFromDb()) || [];
    const cloudProfiles = await window.MingliCloudData.listProfiles();
    profiles = cloudProfiles.map((profile, index) => normalizeProfile(profile, index));
    legacyMigrationProfiles =
      profiles.length === 0
        ? storedProfiles
            .filter((profile) => !isLegacySeedProfile(profile))
            .map((profile, index) => normalizeProfile(profile, index))
        : [];
    document.querySelector("#migrateLegacyData").hidden = legacyMigrationProfiles.length === 0;
    document.querySelector("#legacyMigrationCount").textContent = String(legacyMigrationProfiles.length);
    if (legacyMigrationProfiles.length === 0) {
      await writeAllToDb(PROFILE_STORE, profiles.map(serializeProfile));
    }

    currentProfileId = await readSetting(CURRENT_PROFILE_KEY);
    if ((!currentProfileId || !profiles.some((profile) => profile.id === currentProfileId)) && profiles.length > 0) {
      currentProfileId = profiles[0].id;
      await writeSetting(CURRENT_PROFILE_KEY, currentProfileId);
    }
    if (profiles.length === 0) {
      currentProfileId = null;
      await writeSetting(CURRENT_PROFILE_KEY, null);
    }
    renderProfiles();
    setCurrentProfile(profiles.find((profile) => profile.id === currentProfileId) || null);
  } catch (error) {
    profiles = [];
    renderProfiles();
    setCurrentProfile(null);
    showToast("云端档案读取失败，请检查网络后重试");
  }
}

function setCalendarTypeValue(value) {
  calendarTypeInputs.forEach((item) => {
    item.checked = item.value === value;
  });
}

function fillProfileForm(profile) {
  profileName.value = profile.name || "";
  profileGender.value = profile.gender === "female" ? "坤造" : "乾造";
  setCalendarTypeValue(profile.calendarType === "lunar" ? "lunar" : "solar");
  profileLunarLeap.checked = Boolean(profile.lunarLeapMonth);
  profileBirthDate.value = profile.birthDate || "";
  setBirthTimeControl(profile.birthTime || "");
  profileRelation.value = profile.isSelf ? "本人" : profile.relation || "客户";
  profileBirthPlace.value = profile.birthPlace || "";
  profileNote.value = profile.note || "";
  updateLunarLeapState();
}

function openProfileModal(profile = null) {
  editingProfileId = profile?.id || null;
  if (profile) {
    profileModalTitle.textContent = "编辑档案";
    profileModalIntro.textContent = "修改出生信息后，排盘和问事会按新资料重新计算。";
    saveProfileButton.textContent = "保存修改";
    fillProfileForm(profile);
  } else {
    profileModalTitle.textContent = "新增档案";
    profileModalIntro.textContent = "选择历法，填写出生日期和时间。";
    saveProfileButton.textContent = "保存档案";
    resetProfileForm();
  }
  profileModal.hidden = false;
  window.setTimeout(() => profileName.focus(), 30);
}

function closeProfileModal() {
  profileModal.hidden = true;
  editingProfileId = null;
}

function resetProfileForm() {
  profileName.value = "";
  profileGender.value = "乾造";
  profileBirthDate.value = "";
  setBirthTimeControl("");
  profileRelation.value = profiles.some((profile) => profile.isSelf) ? "客户" : "本人";
  profileBirthPlace.value = "";
  profileNote.value = "";
  calendarTypeInputs.forEach((item) => {
    item.checked = item.value === "solar";
  });
  profileLunarLeap.checked = false;
  updateLunarLeapState();
}

async function deleteProfile(profileId) {
  const profile = profiles.find((item) => item.id === profileId);
  if (!profile) return;

  const confirmed = window.confirm(
    `永久删除「${profile.name}」？\n\n将同时删除档案、命盘、全部会话与消息、滚动摘要和云端分析报告，删除后不进入回收站。请先确认报告 ZIP 已保存到本地。`,
  );
  if (!confirmed) return;

  await window.MingliCloudData.deleteProfile(profile.id, profile.name);
  const wasCurrent = profile.id === currentProfileId;
  profiles = profiles.filter((item) => item.id !== profile.id);
  if (wasCurrent) {
    currentProfileId = profiles[0]?.id || null;
    await writeSetting(CURRENT_PROFILE_KEY, currentProfileId);
  }
  await writeAllToDb(PROFILE_STORE, profiles.map(serializeProfile));
  renderProfiles();
  setCurrentProfile(profiles.find((item) => item.id === currentProfileId) || null);
  showToast("档案已删除");
}

async function deleteQuestionRecord(recordId) {
  const record = questionRecords.find((item) => item.id === recordId);
  if (!record) return;

  const confirmed = window.confirm(`确定删除这条历史问题吗？\n${record.question}`);
  if (!confirmed) return;

  questionRecords = questionRecords.filter((item) => item.id !== record.id);
  await writeAllToDb(QUESTION_STORE, questionRecords);
  renderQuestionHistory();
  showToast("历史问题已删除");
}

async function setSelfProfile(profileId) {
  const profile = profiles.find((item) => item.id === profileId);
  if (!profile) return;
  profiles = profiles.map((item) =>
    withDerivedProfileFields({
      ...item,
      isSelf: item.id === profile.id,
      relation: item.id === profile.id ? "本人" : item.relation === "本人" ? "家人" : item.relation,
      updatedAt: item.id === profile.id ? Date.now() : item.updatedAt,
    }),
  );
  await persistProfiles();
  renderProfiles();
  renderCurrentProfileHeader(getCurrentProfile());
  renderCurrentProfileViews();
  showToast(`已设为本人档案`);
}

function openProfilePicker() {
  profilePickerModal.hidden = false;
  profilePickerSearch.value = "";
  filterProfilePicker();
  window.setTimeout(() => profilePickerSearch.focus(), 30);
}

function closeProfilePicker() {
  profilePickerModal.hidden = true;
}

function openProfileActions(profile) {
  actionProfileId = profile.id;
  profileActionsTitle.textContent = profile.name;
  document.querySelector("#updateProfileReportAction").hidden = !getProfileExpiry(profile).expired;
  profileActionsModal.hidden = false;
}

function closeProfileActions() {
  profileActionsModal.hidden = true;
  actionProfileId = null;
}

function filterProfilePicker() {
  const keyword = profilePickerSearch.value.trim().toLowerCase();

  profilePickerItems.forEach((item) => {
    const matched = !keyword || item.dataset.keywords.toLowerCase().includes(keyword);
    item.classList.toggle("is-hidden", !matched);
  });
}

function setQuestionTag(tag) {
  currentQuestionTag = tag || "自定义";
  questionChips.forEach((item) => {
    item.classList.toggle("is-selected", item.textContent.trim() === currentQuestionTag);
  });
}

function updateLunarLeapState() {
  const isLunar = calendarTypeInputs.find((item) => item.checked)?.value === "lunar";
  profileLunarLeap.disabled = !isLunar;
  if (!isLunar) profileLunarLeap.checked = false;
}

document.addEventListener("click", (event) => {
  const homeViewButton = event.target.closest("[data-home-view]");
  if (homeViewButton) {
    setHomeView(homeViewButton.dataset.homeView);
    return;
  }

  const datePickerButton = event.target.closest("[data-open-date-picker]");
  if (datePickerButton) {
    openDatePicker();
    return;
  }

  const datePartButton = event.target.closest("[data-date-part]");
  if (datePartButton) {
    const datePart = datePartButton.dataset.datePart;
    const dateValue = Number(datePartButton.dataset.value);
    window.setTimeout(() => selectDatePart(datePart, dateValue), 0);
    return;
  }

  const optionPickerButton = event.target.closest("[data-open-option-picker]");
  if (optionPickerButton) {
    openOptionPicker(optionPickerButton.dataset.openOptionPicker);
    return;
  }

  const optionValueButton = event.target.closest("[data-option-value]");
  if (optionValueButton) {
    applyOptionPickerValue(optionValueButton.dataset.optionValue);
    return;
  }

  const profileModalButton = event.target.closest("[data-open-profile-modal]");
  if (profileModalButton) {
    closeProfilePicker();
    openProfileModal();
    return;
  }

  const editProfileButton = event.target.closest("[data-edit-profile]");
  if (editProfileButton) {
    const profile = profiles.find((item) => item.id === editProfileButton.dataset.profileId);
    if (profile) {
      openProfileModal(profile);
    }
    return;
  }

  const profileActionsButton = event.target.closest("[data-profile-actions]");
  if (profileActionsButton) {
    const profile = profiles.find((item) => item.id === profileActionsButton.dataset.profileId);
    if (profile) openProfileActions(profile);
    return;
  }

  const deleteProfileButton = event.target.closest("[data-delete-profile]");
  if (deleteProfileButton) {
    void deleteProfile(deleteProfileButton.dataset.profileId).catch(() => {
      showToast("档案删除失败");
    });
    return;
  }

  const deleteQuestionRecordButton = event.target.closest("[data-delete-question-record-id]");
  if (deleteQuestionRecordButton) {
    void deleteQuestionRecord(deleteQuestionRecordButton.dataset.deleteQuestionRecordId).catch(() => {
      showToast("历史问题删除失败");
    });
    return;
  }

  const setSelfProfileButton = event.target.closest("[data-set-self-profile]");
  if (setSelfProfileButton) {
    void setSelfProfile(setSelfProfileButton.dataset.profileId).catch(() => {
      showToast("本人档案设置失败");
    });
    return;
  }

  const questionRecordButton = event.target.closest("[data-question-record-id]");
  if (questionRecordButton) {
    const record = questionRecords.find((item) => item.id === questionRecordButton.dataset.questionRecordId);
    if (!record) return;
    const profile = profiles.find((item) => item.id === record.profileId);
    if (profile) {
      setCurrentProfile(profile);
    }
    questionText.value = record.question;
    setQuestionTag(record.tag || "自定义");
    if (record.result) {
      renderAnalysisResult({
        title: record.question,
        tone: record.result.tone,
        conclusion: record.result.conclusion,
        evidence: record.result.evidence || [],
        explanation: record.result.explanation,
        suggestion: record.result.suggestion,
        uncertainty: record.result.uncertainty || [],
      });
      showResult();
    }
    goTo("ask");
    return;
  }

  if (event.target.closest("#viewAllQuestions")) {
    const expanded = questionHistoryList.hidden;
    questionHistoryList.hidden = !expanded;
    recentQuestionList.hidden = expanded;
    viewAllQuestionsButton.textContent = expanded ? "收起" : "查看全部";
    return;
  }

  const profilePickerButton = event.target.closest("[data-open-profile-picker]");
  if (profilePickerButton) {
    if (profiles.length === 0) {
      openProfileModal();
    } else {
      openProfilePicker();
    }
    return;
  }

  const goButton = event.target.closest("[data-go]");
  if (goButton) {
    const question = goButton.dataset.question;
    if (question && questionText) {
      const tag = goButton.dataset.questionTag || "自定义";
      questionText.value = question;
      setQuestionTag(tag);
      if (goButton.dataset.showResult === "true") {
        const profile = getCurrentProfile();
        if (profile) {
          renderAnalysisResult(generateExplainableResult(profile, question, tag));
          showResult();
        }
      } else {
        hideResult();
      }
    }
    goTo(goButton.dataset.go);
    return;
  }

  const chip = event.target.closest("#questionChips button");
  if (chip) {
    const tag = chip.textContent.trim();
    setQuestionTag(tag);
    questionText.value = questionMap[tag] || tag;
    hideResult();
    return;
  }

  const filter = event.target.closest("[data-filter]");
  if (filter) {
    activeFilter = filter.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((item) => {
      item.classList.toggle("is-selected", item === filter);
    });
    applyArchiveSearch();
    return;
  }

  const pickedProfile = event.target.closest("[data-pick-profile]");
  if (pickedProfile) {
    const profile = profiles.find((item) => item.id === pickedProfile.dataset.profileId);
    if (!profile) return;
    setCurrentProfile(profile);
    closeProfilePicker();
    hideResult();
    if (pickedProfile.closest("#archiveList")) goTo("home");
    showToast(`已选择 ${profile.name}`);
  }
});

document.querySelector("#generateResult").addEventListener("click", async () => {
  const profile = getCurrentProfile();
  if (!profile) {
    showToast("请先创建档案");
    openProfileModal();
    return;
  }
  if (!window.MingliConsultation) {
    showToast("云端咨询服务尚未加载，请刷新后重试");
    return;
  }
  await window.MingliConsultation.sendCurrentQuestion();
});

archiveSearch.addEventListener("input", applyArchiveSearch);
profilePickerSearch.addEventListener("input", filterProfilePicker);
questionText.addEventListener("input", () => {
  setQuestionTag("自定义");
  hideResult();
});
calendarTypeInputs.forEach((item) => {
  item.addEventListener("change", updateLunarLeapState);
});

document.querySelector("#clearSearch").addEventListener("click", () => {
  archiveSearch.value = "";
  resetArchiveFilters();
  applyArchiveSearch();
});

document.querySelector("#openExpiredProfiles").addEventListener("click", () => {
  activeFilter = "expired";
  document.querySelectorAll("[data-filter]").forEach((item) => {
    item.classList.toggle("is-selected", item.dataset.filter === "expired");
  });
  goTo("profiles");
  applyArchiveSearch();
});

if (!window.MingliReportClient) {
  document.querySelector("#exportData").addEventListener("click", () => {
    void exportProfiles().catch(() => showToast("档案备份导出失败"));
  });
  document.querySelector("#importData").addEventListener("click", () => backupFileInput.click());
  backupFileInput.addEventListener("change", () => {
    importProfiles(backupFileInput.files[0]);
    backupFileInput.value = "";
  });
}

document.querySelector("#openProfileModal").addEventListener("click", () => openProfileModal());

document.querySelector("#closeProfileModal").addEventListener("click", closeProfileModal);

document.querySelector("#closeProfilePicker").addEventListener("click", closeProfilePicker);

document.querySelector("#closeProfileActions").addEventListener("click", closeProfileActions);

document.querySelector("#editProfileAction").addEventListener("click", () => {
  const profile = profiles.find((item) => item.id === actionProfileId);
  closeProfileActions();
  if (profile) openProfileModal(profile);
});

document.querySelector("#updateProfileReportAction").addEventListener("click", () => {
  const profileId = actionProfileId;
  closeProfileActions();
  if (profileId && window.MingliReportUi) {
    void window.MingliReportUi.refreshProfile(profileId).catch(() => undefined);
  } else {
    showToast("报告服务尚未加载，请刷新后重试");
  }
});

document.querySelector("#saveProfileReportAction").addEventListener("click", () => {
  const profileId = actionProfileId;
  closeProfileActions();
  if (profileId && window.MingliReportUi) {
    void window.MingliReportUi.saveProfile(profileId);
  } else {
    showToast("报告服务尚未加载，请刷新后重试");
  }
});

document.querySelector("#deleteProfileAction").addEventListener("click", () => {
  const profileId = actionProfileId;
  closeProfileActions();
  if (!profileId) return;
  void deleteProfile(profileId).catch(() => showToast("档案删除失败"));
});

profileActionsModal.addEventListener("click", (event) => {
  if (event.target === profileActionsModal) closeProfileActions();
});

closeDatePickerButton.addEventListener("click", closeDatePicker);

dateYearWheel.addEventListener("scroll", () => handleDateWheelScroll("year"), { passive: true });
dateMonthWheel.addEventListener("scroll", () => handleDateWheelScroll("month"), { passive: true });
dateDayWheel.addEventListener("scroll", () => handleDateWheelScroll("day"), { passive: true });

confirmDatePickerButton.addEventListener("click", () => {
  profileBirthDate.value = getDatePickerDisplayValue();
  profileBirthDate.dispatchEvent(new Event("input", { bubbles: true }));
  profileBirthDate.dispatchEvent(new Event("change", { bubbles: true }));
  closeDatePicker();
});

closeOptionPickerButton.addEventListener("click", closeOptionPicker);

optionPickerSearch.addEventListener("input", renderOptionPicker);

document.querySelector("#clearProfilePickerSearch").addEventListener("click", () => {
  profilePickerSearch.value = "";
  filterProfilePicker();
});

document.querySelector("#saveProfileDraft").addEventListener("click", async () => {
  const existingProfile = editingProfileId ? profiles.find((item) => item.id === editingProfileId) : null;
  const profile = readProfileFromForm(existingProfile);
  if (!profile) return;

  const nextProfiles = existingProfile
    ? profiles.map((item) => (item.id === profile.id ? profile : item))
    : [profile, ...profiles];
  profiles = profile.isSelf
    ? nextProfiles.map((item) =>
        item.id === profile.id
          ? item
          : withDerivedProfileFields({
              ...item,
              isSelf: false,
              relation: item.relation === "本人" ? "家人" : item.relation,
            }),
      )
    : nextProfiles;
  currentProfileId = profile.id;
  try {
    await persistProfiles();
    setCurrentProfile(profile);
    resetProfileForm();
    closeProfileModal();
    showToast(existingProfile ? "档案已更新" : "档案已保存");
  } catch (error) {
    showToast("档案保存失败");
  }
});

profileModal.addEventListener("click", (event) => {
  if (event.target === profileModal) {
    closeProfileModal();
  }
});

profilePickerModal.addEventListener("click", (event) => {
  if (event.target === profilePickerModal) {
    closeProfilePicker();
  }
});

const legacyMigrationModal = document.querySelector("#legacyMigrationModal");
document.querySelector("#migrateLegacyData").addEventListener("click", () => {
  document.querySelector("#legacyMigrationPreviewCount").textContent = String(legacyMigrationProfiles.length);
  legacyMigrationModal.hidden = false;
});
document.querySelector("#closeLegacyMigration").addEventListener("click", () => {
  legacyMigrationModal.hidden = true;
});
document.querySelector("#confirmLegacyMigration").addEventListener("click", async (event) => {
  if (legacyMigrationProfiles.length === 0) return;
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = "正在迁移…";
  try {
    profiles = legacyMigrationProfiles.map((profile, index) => normalizeProfile(profile, index));
    await persistProfiles();
    legacyMigrationProfiles = [];
    document.querySelector("#migrateLegacyData").hidden = true;
    legacyMigrationModal.hidden = true;
    setCurrentProfile(profiles.find((profile) => profile.isSelf) || profiles[0] || null);
    renderProfiles();
    showToast(`已迁移 ${profiles.length} 份本机档案`);
  } catch (error) {
    profiles = [];
    showToast("迁移失败，本机原数据仍保留，请重试");
  } finally {
    button.disabled = false;
    button.textContent = "确认迁移";
  }
});
legacyMigrationModal.addEventListener("click", (event) => {
  if (event.target === legacyMigrationModal) legacyMigrationModal.hidden = true;
});

datePickerModal.addEventListener("click", (event) => {
  if (event.target === datePickerModal) {
    closeDatePicker();
  }
});

optionPickerModal.addEventListener("click", (event) => {
  if (event.target === optionPickerModal) {
    closeOptionPicker();
  }
});

function markCurrentProfileConsulted(consultedAt, question) {
  const timestamp = Date.parse(consultedAt) || Date.now();
  profiles = profiles.map((profile) =>
    profile.id === currentProfileId
      ? withDerivedProfileFields({
          ...profile,
          lastConsultedAt: timestamp,
          recentQuestion: question,
          recentTag: currentQuestionTag,
        })
      : profile,
  );
  renderProfiles();
  renderCurrentProfileHeader(getCurrentProfile());
}

window.MingliAppBridge = Object.freeze({
  getCurrentProfile,
  getQuestion: () => questionText.value.trim(),
  getQuestionType: () => currentQuestionTag || "自定义",
  hasCurrentChart: () => {
    const profile = getCurrentProfile();
    return Boolean(profile && calculateBaziChart(profile)?.facts);
  },
  clearQuestion: () => {
    questionText.value = "";
    setQuestionTag("自定义");
  },
  focusQuestion: () => questionText.focus({ preventScroll: true }),
  setHomeView,
  showToast,
  markCurrentProfileConsulted,
  reloadCloudData: initializeApp,
});

let businessAppStarted = false;

async function startBusinessApp() {
  if (businessAppStarted) return;
  businessAppStarted = true;
  await disableOfflineMode();
  updateLunarLeapState();
  await initializeApp();
}

window.addEventListener("mingli:authenticated", () => {
  void startBusinessApp();
});
