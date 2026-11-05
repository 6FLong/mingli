(function createReportClient(global) {
  "use strict";

  const cloud = global.MingliCloud?.client;
  const utils = global.MingliReportUtils;
  const FORMAT_VERSION = "mingli-backup-v1";
  const REPORT_VERSION = "mingli-report-v1";
  const STEM_ELEMENTS = Object.freeze({
    甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
    己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
  });
  const BRANCH_ELEMENTS = Object.freeze({
    子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火",
    午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
  });
  const ELEMENT_COLORS = Object.freeze({ 木: "#3f8f6b", 火: "#d86457", 土: "#a77a48", 金: "#c2963d", 水: "#397f9e" });
  const TEN_GOD_ORDER = Object.freeze(["比肩", "劫财", "食神", "伤官", "正财", "偏财", "正官", "七杀", "正印", "偏印"]);

  function ownerId() {
    const value = cloud?.session?.user?.id;
    if (!value) throw new Error("登录状态已失效");
    return value;
  }

  function one(rows) {
    return Array.isArray(rows) ? rows[0] || null : null;
  }

  function safeFilename(value) {
    return String(value || "")
      .trim()
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
      .replace(/\s+/g, " ")
      .slice(0, 80) || "未知";
  }

  function baseFilename(profile) {
    const city = safeFilename(profile.birth_place || "未知城市");
    const name = safeFilename(profile.name || "未命名");
    const birth = safeFilename(profile.birth_date || "未知日期");
    return `${city}-${name}-${birth}-命理分析报告`;
  }

  function beijingLabel(value) {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  }

  async function loadProfileData(profileId) {
    const encoded = encodeURIComponent(profileId);
    const profilePath = `/rest/v1/profiles?id=eq.${encoded}&select=*&limit=1`;
    const chartPath = `/rest/v1/bazi_charts?profile_id=eq.${encoded}&is_current=eq.true&select=*&limit=1`;
    const summaryPath = `/rest/v1/client_summaries?profile_id=eq.${encoded}&select=*&limit=1`;
    const reportPath = `/rest/v1/reports?profile_id=eq.${encoded}&select=*&limit=1`;
    const conversationsPath = `/rest/v1/conversations?profile_id=eq.${encoded}&select=*&order=created_at.asc`;
    const messagesPath = `/rest/v1/messages?profile_id=eq.${encoded}&select=*&order=created_at.asc,id.asc`;
    const [profiles, charts, summaries, reports, conversations, messages] = await Promise.all([
      cloud.request(profilePath),
      cloud.request(chartPath),
      cloud.request(summaryPath),
      cloud.request(reportPath),
      cloud.request(conversationsPath),
      cloud.request(messagesPath),
    ]);
    const profile = one(profiles);
    const chart = one(charts);
    if (!profile) throw new Error("档案不存在");
    if (!chart?.facts) throw new Error("当前档案还没有完整命盘");
    return {
      profile,
      chart,
      summary: one(summaries),
      report: one(reports),
      conversations: Array.isArray(conversations) ? conversations : [],
      messages: Array.isArray(messages) ? messages : [],
    };
  }

  function factText(value, fallback = "暂无") {
    if (value == null || value === "") return fallback;
    if (Array.isArray(value)) return value.filter(Boolean).join("、") || fallback;
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }

  function relationPresentation(item) {
    const type = String(item?.type || "").trim();
    const members = Array.isArray(item?.members) ? item.members.filter(Boolean).join("") : "";
    const label = String(item?.name || `${members}${type}` || "干支关系").trim();
    const sources = Array.isArray(item?.sources)
      ? item.sources
        .map((source) => {
          const position = String(source?.label || "").trim();
          const layer = String(source?.source || "").trim();
          if (!position) return "";
          return layer && layer !== "原局" ? `${position}（${layer}）` : position;
        })
        .filter(Boolean)
      : [];
    const effect = String(item?.effect || item?.explanation || item?.description || "").trim();
    const details = [];
    if (sources.length) details.push(`涉及${sources.join("、")}`);
    if (effect) details.push(effect);
    if (!details.length && members) details.push(`${members}形成${type || "干支关系"}`);
    return { label, text: details.join("：") || "该关系已由排盘引擎识别。" };
  }

  function countFiveElements(pillars) {
    const counts = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    Object.values(pillars || {}).forEach((pillar) => {
      if (!pillar) return;
      if (STEM_ELEMENTS[pillar.stem]) counts[STEM_ELEMENTS[pillar.stem]] += 1;
      if (BRANCH_ELEMENTS[pillar.branch]) counts[BRANCH_ELEMENTS[pillar.branch]] += 1;
      (pillar.hiddenStems || []).slice(1).forEach((stem) => {
        if (STEM_ELEMENTS[stem]) counts[STEM_ELEMENTS[stem]] += 0.35;
      });
    });
    return counts;
  }

  function distributionItems(values, order, colors = {}) {
    const max = Math.max(1, ...order.map((label) => Number(values?.[label] || 0)));
    return order.map((label) => {
      const value = Number(values?.[label] || 0);
      return {
        label,
        value,
        valueLabel: Number.isInteger(value) ? String(value) : value.toFixed(1),
        ratio: value / max,
        color: colors[label] || "#397f78",
      };
    });
  }

  function modernOverview(facts) {
    const day = facts.pillars?.day;
    const strength = facts.strength || {};
    const pattern = facts.pattern || {};
    const useful = facts.usefulGod || {};
    const strengthMeaning = {
      偏弱: "面对持续压力或较大投入时，更需要先确认支持条件、时间余量和恢复空间，再决定投入多少。",
      偏旺: "自身推动力较足，更适合把力量用于清晰输出、现实成果和规则约束，避免只靠惯性用力。",
      中和: "自身承接与输出相对均衡，判断重点要回到月令格局是否得到保护，以及当前岁运具体引动了什么。",
    }[strength.label] || "当前应结合月令、格局和岁运共同判断，不用单一标签代替完整分析。";
    const dayMaster = day?.stem ? `${day.stem}${STEM_ELEMENTS[day.stem] || ""}日主` : "日主";
    return {
      title: `${dayMaster}，${strength.label || "旺衰待定"}`,
      text: `${strength.summary || "旺衰依据尚未完整。"}${strengthMeaning}`,
      method: `按月令取${pattern.name || "格局"}，当前采用“${useful.strategy || "结合旺衰与制化取用"}”的判断路径。`,
    };
  }

  function annualTrend(facts) {
    const favorable = new Set(facts.usefulGod?.favorableGods || []);
    const unfavorable = new Set(facts.usefulGod?.unfavorableGods || []);
    const annuals = (facts.futureAnnuals?.length ? facts.futureAnnuals : [facts.annual]).filter(Boolean);
    return annuals.map((annual) => {
      const tone = favorable.has(annual.stemGod) ? "support" : unfavorable.has(annual.stemGod) ? "caution" : "steady";
      return {
        year: annual.year || "当前",
        name: annual.name || "流年",
        god: annual.stemGod || "十神待定",
        tone,
        level: tone === "support" ? 3 : tone === "steady" ? 2 : 1,
        toneLabel: tone === "support" ? "偏助力" : tone === "caution" ? "宜谨慎" : "较平稳",
        detail: annual.note || `${annual.stemGod || "流年十神"}被引动，需结合现实条件观察。`,
      };
    });
  }

  function reportPresentation(data, generatedAt = new Date().toISOString()) {
    const { profile, chart, report } = data;
    const facts = chart.facts || {};
    const pillars = facts.pillars || {};
    const pattern = facts.pattern || {};
    const useful = facts.usefulGod || {};
    const strength = facts.strength || {};
    const reportCore = report?.report_core || {};
    const coreItems = Array.isArray(reportCore.items) ? reportCore.items.filter((item) => item?.status !== "invalidated") : [];
    const pillarLine = ["year", "month", "day", "hour"]
      .map((key) => `${pillars[key]?.label || key}：${pillars[key]?.name || "未知"}`)
      .join("　");
    const relationItems = [
      ...(facts.relations?.natal || []),
      ...(facts.relations?.active || []),
    ].slice(0, 20);
    const overview = modernOverview(facts);
    const currentLuck = facts.luck?.current;
    const currentAnnual = facts.annual || facts.futureAnnuals?.[0];
    const sections = [
      {
        title: "命盘基础",
        items: [
          { label: "四柱", text: pillarLine },
          { label: "当前阶段", text: `${currentLuck?.name || "大运未知"}${currentLuck?.stemGod ? `（${currentLuck.stemGod}）` : ""}；${currentAnnual?.year || "当前"}年${currentAnnual?.name || "流年未知"}${currentAnnual?.stemGod ? `（${currentAnnual.stemGod}）` : ""}` },
          { label: "计算口径", text: `${facts.ruleset || chart.ruleset}。年柱以立春交节时刻为界，月柱以十二节交节时刻为界。` },
        ],
      },
      {
        title: "子平判断依据",
        items: [
          { label: "日主旺衰", text: `${strength.label || "未判定"}。${strength.summary || ""}` },
          { label: "月令格局", text: `${pattern.name || "未判定"}；${pattern.status || ""}。${factText(pattern.basis, "")}` },
          { label: "子平取用", text: `${useful.strategy || "未判定"}。主要取${factText(useful.primaryGods)}，喜${factText(useful.favorableGods)}，忌${factText(useful.unfavorableGods)}。` },
        ],
      },
      {
        title: "原局与岁运关系",
        items: relationItems.length
          ? relationItems.map((item) => ({ ...relationPresentation(item), factRefs: item.factRefs || [] }))
          : [{ text: "当前结构化命盘未记录需要单列的合冲刑害关系。" }],
      },
      {
        title: "咨询核心结论",
        items: coreItems.length
          ? coreItems.map((item) => ({
              label: item.topic || "核心结论",
              text: item.conclusion || item.summary || "",
              factRefs: item.factRefs || [],
            }))
          : [{ text: reportCore.latestSummary || "尚未形成稳定的咨询核心结论。" }],
      },
      {
        title: "阅读说明",
        items: [
          { text: "本报告用于整理传统四柱预测学习与咨询记录，不替代医疗、法律、财务等专业意见，也不对现实结果作保证。" },
          ...((facts.warnings || []).map((text) => ({ text }))),
        ],
      },
    ];
    return {
      title: "客户命理分析报告",
      reportKind: "client",
      identityLine: `${profile.name}｜${profile.relation}｜${profile.birth_place || "未知城市"}｜${profile.birth_date}`,
      updatedAt: generatedAt,
      updatedAtLabel: beijingLabel(generatedAt),
      overview,
      visuals: {
        elements: {
          title: "五行结构",
          caption: "按四柱天干、地支及余气的相对出现量展示，用于看结构，不代表吉凶分数。",
          items: distributionItems(countFiveElements(pillars), ["木", "火", "土", "金", "水"], ELEMENT_COLORS),
        },
        tenGods: {
          title: "十神分布",
          caption: "柱形只表示结构中出现的相对次数，不代表能力高低或现实结果。",
          items: distributionItems(facts.tenGodCounts || {}, TEN_GOD_ORDER),
        },
        annuals: {
          title: "近年流年节奏",
          caption: "助力、平稳、谨慎来自既有喜忌与流年十神的对应，不是成功率或运势评分。",
          items: annualTrend(facts),
        },
      },
      sections: sections.map((section) => ({ ...section, items: section.items.filter((item) => item.text) })),
    };
  }

  function archivePresentation(data, clientPresentation) {
    const summaryContent = data.summary?.content || {};
    const backgroundItems = [
      ...(summaryContent.confirmedContext || []).map((text) => ({ label: "已确认背景", text })),
      ...(summaryContent.decisionsAndOutcomes || []).map((text) => ({ label: "决定与结果", text })),
      ...(summaryContent.openQuestions || []).map((text) => ({ label: "待确认", text })),
      ...(summaryContent.riskNotes || []).map((text) => ({ label: "风险边界", text })),
    ];
    const historyItems = (data.messages || []).map((message) => ({
      label: `${message.role === "assistant" ? "分析回复" : "咨询问题"}｜${beijingLabel(message.created_at)}`,
      text: String(message.content || "").trim() || "（无文字内容）",
    }));
    return {
      ...clientPresentation,
      title: "完整咨询留存报告",
      reportKind: "archive",
      sections: [
        ...clientPresentation.sections,
        { title: "客户背景摘要", items: backgroundItems.length ? backgroundItems : [{ text: "暂无额外背景摘要。" }] },
        { title: "完整咨询记录", items: historyItems.length ? historyItems : [{ text: "暂无咨询记录。" }] },
      ],
    };
  }

  async function recoveryData(data, generatedAt) {
    const payload = {
      app: "命理咨询工作台",
      formatVersion: FORMAT_VERSION,
      reportVersion: REPORT_VERSION,
      exportedAt: generatedAt,
      profile: data.profile,
      currentChart: data.chart,
      clientSummary: data.summary,
      report: data.report ? { ...data.report, storage_path: null } : null,
      conversations: data.conversations,
      messages: data.messages,
    };
    const sha256 = await utils.sha256Hex(JSON.stringify(payload));
    return { ...payload, integrity: { algorithm: "SHA-256", sha256 } };
  }

  async function validateRecoveryData(value) {
    if (!value || value.formatVersion !== FORMAT_VERSION || !value.profile?.id || !value.currentChart?.facts) {
      throw new Error("恢复数据格式不正确或版本不受支持");
    }
    if (!value.integrity?.sha256 || value.integrity.algorithm !== "SHA-256") throw new Error("恢复数据缺少完整性校验");
    const copy = { ...value };
    delete copy.integrity;
    const actual = await utils.sha256Hex(JSON.stringify(copy));
    if (actual !== value.integrity.sha256) throw new Error("恢复数据完整性校验失败");
    return value;
  }

  async function buildProfilePackage(profileId) {
    const data = await loadProfileData(profileId);
    if (!data.messages.some((message) => message.role === "assistant" && message.status === "complete")) {
      const error = new Error("该档案还没有成功咨询记录，暂不能生成分析报告");
      error.code = "report_not_available";
      throw error;
    }
    const generatedAt = new Date().toISOString();
    const presentation = reportPresentation(data, generatedAt);
    const archive = archivePresentation(data, presentation);
    const clientPdf = await utils.generateReportPdf(presentation);
    const archivePdf = await utils.generateReportPdf(archive);
    const recovery = await recoveryData(data, generatedAt);
    const base = baseFilename(data.profile);
    const recoveryName = `${base.replace(/命理分析报告$/, "恢复数据")}.json`;
    const archiveName = `${base.replace(/命理分析报告$/, "完整咨询留存报告")}.pdf`;
    const zip = utils.createZip([
      { name: `${base}.pdf`, data: clientPdf },
      { name: archiveName, data: archivePdf },
      { name: recoveryName, data: JSON.stringify(recovery, null, 2) },
    ]);
    return { data, presentation, archivePresentation: archive, pdf: clientPdf, clientPdf, archivePdf, recovery, zip, base };
  }

  async function downloadClientReport(profileId) {
    const pkg = await buildProfilePackage(profileId);
    utils.downloadBytes(pkg.clientPdf, `${pkg.base}.pdf`, "application/pdf");
    void uploadCurrentReport(pkg).catch(() => undefined);
    return pkg;
  }

  async function uploadCurrentReport(pkg) {
    const profileId = pkg.data.profile.id;
    const path = `${ownerId()}/${profileId}/current-report.pdf`;
    try {
      await cloud.request(`/storage/v1/object/reports/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/pdf", "x-upsert": "true" },
        body: pkg.pdf,
      });
      const currentCore = pkg.data.report?.report_core || {};
      await cloud.request("/rest/v1/reports?on_conflict=profile_id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify({
          owner_id: ownerId(),
          profile_id: profileId,
          report_core: currentCore,
          report_version: Number(pkg.data.report?.report_version || 0) + 1,
          format_version: REPORT_VERSION,
          storage_path: path,
          status: "ready",
          last_error: null,
          generated_at: pkg.presentation.updatedAt,
        }),
      });
      return { path, generatedAt: pkg.presentation.updatedAt };
    } catch (error) {
      await cloud.request(`/rest/v1/reports?profile_id=eq.${encodeURIComponent(profileId)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ status: "failed", last_error: "report_generation_failed" }),
      }).catch(() => undefined);
      throw error;
    }
  }

  async function refreshProfileReport(profileId) {
    const pkg = await buildProfilePackage(profileId);
    await uploadCurrentReport(pkg);
    return pkg;
  }

  async function saveProfilePackage(profileId) {
    const pkg = await buildProfilePackage(profileId);
    utils.downloadBytes(pkg.zip, `${pkg.base}.zip`, "application/zip");
    try {
      await uploadCurrentReport(pkg);
      return { ...pkg, cloudSynced: true };
    } catch (error) {
      return { ...pkg, cloudSynced: false, cloudError: error?.message || "云端报告更新失败" };
    }
  }

  async function exportAllProfiles(onProgress = () => {}) {
    const profiles = await cloud.request("/rest/v1/profiles?select=id,name,birth_place,birth_date&order=is_self.desc,updated_at.desc");
    if (!Array.isArray(profiles) || !profiles.length) throw new Error("还没有可导出的档案");
    const entries = [];
    const manifest = { formatVersion: FORMAT_VERSION, exportedAt: new Date().toISOString(), profiles: [], skipped: [], failures: [] };
    for (let index = 0; index < profiles.length; index += 1) {
      const profile = profiles[index];
      onProgress({ current: index + 1, total: profiles.length, name: profile.name });
      try {
        const pkg = await buildProfilePackage(profile.id);
        const folder = `${safeFilename(profile.name)}-${String(profile.id).slice(0, 8)}`;
        entries.push(
          { name: `${folder}/${pkg.base}.pdf`, data: pkg.clientPdf },
          { name: `${folder}/${pkg.base.replace(/命理分析报告$/, "完整咨询留存报告")}.pdf`, data: pkg.archivePdf },
          { name: `${folder}/${pkg.base.replace(/命理分析报告$/, "恢复数据")}.json`, data: JSON.stringify(pkg.recovery, null, 2) },
        );
        manifest.profiles.push({ id: profile.id, name: profile.name, folder });
      } catch (error) {
        const item = { id: profile.id, name: profile.name, reason: error?.message || "导出失败" };
        if (error?.code === "report_not_available") manifest.skipped.push(item);
        else manifest.failures.push({ ...item, error: item.reason });
      }
    }
    if (!manifest.profiles.length) {
      const firstFailure = manifest.failures[0]?.error || "没有可导出的报告";
      throw new Error(`全部报告导出失败：${firstFailure}`);
    }
    const readableSummary = [
      "命理咨询工作台全部报告导出说明",
      `导出时间：${new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", dateStyle: "long", timeStyle: "medium" }).format(new Date(manifest.exportedAt))}`,
      `成功：${manifest.profiles.length} 份`,
      `跳过：${manifest.skipped.length} 份`,
      `失败：${manifest.failures.length} 份`,
      "",
      ...manifest.profiles.map((item) => `成功：${item.name}`),
      ...manifest.skipped.map((item) => `跳过：${item.name}｜${item.reason}`),
      ...manifest.failures.map((item) => `失败：${item.name}｜${item.error}`),
      "",
      "每个档案目录内包含客户 PDF、完整咨询留存 PDF 与恢复数据 JSON；导入应用时请选择整个 ZIP，不要单独选择 JSON。",
    ].join("\n");
    entries.push({ name: "导出说明.txt", data: readableSummary });
    entries.push({ name: "总清单.json", data: JSON.stringify(manifest, null, 2) });
    const zip = utils.createZip(entries);
    const date = new Date().toISOString().slice(0, 10);
    utils.downloadBytes(zip, `全部命理分析报告-${date}.zip`, "application/zip");
    return manifest;
  }

  async function inspectImportZip(bytes) {
    if (bytes.byteLength > 80 * 1024 * 1024) throw new Error("备份文件超过 80MB 限制");
    const entries = utils.readZip(bytes);
    const recoveries = [];
    for (const [name, data] of entries) {
      if (!name.endsWith("恢复数据.json")) continue;
      const parsed = JSON.parse(utils.decoder.decode(data));
      await validateRecoveryData(parsed);
      recoveries.push({ name, data: parsed });
    }
    if (!recoveries.length) throw new Error("ZIP 中没有本应用生成的恢复数据");
    return recoveries;
  }

  async function restorePackages(backups, conflictMode) {
    return cloud.request("/functions/v1/report-restore", {
      method: "POST",
      body: JSON.stringify({ backups, conflictMode }),
    });
  }

  global.MingliReportClient = Object.freeze({
    FORMAT_VERSION,
    REPORT_VERSION,
    loadProfileData,
    reportPresentation,
    archivePresentation,
    buildProfilePackage,
    downloadClientReport,
    refreshProfileReport,
    saveProfilePackage,
    exportAllProfiles,
    inspectImportZip,
    validateRecoveryData,
    restorePackages,
    baseFilename,
  });
})(window);
