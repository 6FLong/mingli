(function createReportClient(global) {
  "use strict";

  const cloud = global.MingliCloud?.client;
  const utils = global.MingliReportUtils;
  const FORMAT_VERSION = "mingli-backup-v1";
  const REPORT_VERSION = "mingli-report-v1";

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

  function reportPresentation(data, generatedAt = new Date().toISOString()) {
    const { profile, chart, summary, report } = data;
    const facts = chart.facts || {};
    const pillars = facts.pillars || {};
    const pattern = facts.pattern || {};
    const useful = facts.usefulGod || {};
    const strength = facts.strength || {};
    const reportCore = report?.report_core || {};
    const coreItems = Array.isArray(reportCore.items) ? reportCore.items.filter((item) => item?.status !== "invalidated") : [];
    const summaryContent = summary?.content || {};
    const pillarLine = ["year", "month", "day", "hour"]
      .map((key) => `${pillars[key]?.label || key}：${pillars[key]?.name || "未知"}`)
      .join("　");
    const relationItems = [
      ...(facts.relations?.natal || []),
      ...(facts.relations?.active || []),
    ].slice(0, 20);
    const sections = [
      {
        title: "命盘概览",
        items: [
          { label: "四柱", text: pillarLine },
          { label: "当前阶段", text: `${facts.luck?.current?.name || "大运未知"}；${facts.annual?.name || "流年未知"}` },
          { label: "计算口径", text: `${facts.ruleset || chart.ruleset}。年柱以立春交节时刻为界，月柱以十二节交节时刻为界。` },
        ],
      },
      {
        title: "旺衰、格局与取用",
        items: [
          { label: "日主旺衰", text: `${strength.label || "未判定"}。${strength.summary || ""}` },
          { label: "月令格局", text: `${pattern.name || "未判定"}；${pattern.status || ""}。${factText(pattern.basis, "")}` },
          { label: "子平取用", text: `${useful.strategy || "未判定"}。主要取${factText(useful.primaryGods)}，喜${factText(useful.favorableGods)}，忌${factText(useful.unfavorableGods)}。` },
        ],
      },
      {
        title: "关系与岁运",
        items: relationItems.length
          ? relationItems.map((item) => ({
              label: item.name || item.type || "关系",
              text: item.explanation || item.description || factText(item),
              factRefs: item.factRefs || [],
            }))
          : [{ text: "当前结构化命盘未记录需要单列的合冲刑害关系。" }],
      },
      {
        title: "咨询核心",
        items: coreItems.length
          ? coreItems.map((item) => ({
              label: item.topic || "核心结论",
              text: item.conclusion || item.summary || "",
              factRefs: item.factRefs || [],
            }))
          : [{ text: reportCore.latestSummary || "尚未形成稳定的咨询核心结论。" }],
      },
      {
        title: "现实背景与待观察事项",
        items: [
          ...(summaryContent.confirmedContext || []).map((text) => ({ label: "已确认背景", text })),
          ...(summaryContent.decisionsAndOutcomes || []).map((text) => ({ label: "决定与结果", text })),
          ...(summaryContent.openQuestions || []).map((text) => ({ label: "待确认", text })),
          ...(summaryContent.riskNotes || []).map((text) => ({ label: "风险边界", text })),
        ],
      },
      {
        title: "说明",
        items: [
          { text: "本报告用于整理传统四柱预测学习与咨询记录，不替代医疗、法律、财务等专业意见，也不对现实结果作保证。" },
          ...((facts.warnings || []).map((text) => ({ text }))),
        ],
      },
    ];
    return {
      identityLine: `${profile.name}｜${profile.relation}｜${profile.birth_place || "未知城市"}｜${profile.birth_date}`,
      updatedAt: generatedAt,
      updatedAtLabel: beijingLabel(generatedAt),
      sections: sections.map((section) => ({ ...section, items: section.items.filter((item) => item.text) })),
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
      throw new Error("该档案还没有成功咨询记录，暂不能生成分析报告");
    }
    const generatedAt = new Date().toISOString();
    const presentation = reportPresentation(data, generatedAt);
    const pdf = await utils.generateReportPdf(presentation);
    const recovery = await recoveryData(data, generatedAt);
    const base = baseFilename(data.profile);
    const recoveryName = `${base.replace(/命理分析报告$/, "恢复数据")}.json`;
    const zip = utils.createZip([
      { name: `${base}.pdf`, data: pdf },
      { name: recoveryName, data: JSON.stringify(recovery, null, 2) },
    ]);
    return { data, presentation, pdf, recovery, zip, base };
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
    const pkg = await refreshProfileReport(profileId);
    utils.downloadBytes(pkg.zip, `${pkg.base}.zip`, "application/zip");
    return pkg;
  }

  async function exportAllProfiles(onProgress = () => {}) {
    const profiles = await cloud.request("/rest/v1/profiles?select=id,name,birth_place,birth_date&order=is_self.desc,updated_at.desc");
    if (!Array.isArray(profiles) || !profiles.length) throw new Error("还没有可导出的档案");
    const entries = [];
    const manifest = { formatVersion: FORMAT_VERSION, exportedAt: new Date().toISOString(), profiles: [], failures: [] };
    for (let index = 0; index < profiles.length; index += 1) {
      const profile = profiles[index];
      onProgress({ current: index + 1, total: profiles.length, name: profile.name });
      try {
        const pkg = await refreshProfileReport(profile.id);
        const folder = `${safeFilename(profile.name)}-${String(profile.id).slice(0, 8)}`;
        entries.push(
          { name: `${folder}/${pkg.base}.pdf`, data: pkg.pdf },
          { name: `${folder}/${pkg.base.replace(/命理分析报告$/, "恢复数据")}.json`, data: JSON.stringify(pkg.recovery, null, 2) },
        );
        manifest.profiles.push({ id: profile.id, name: profile.name, folder });
      } catch (error) {
        manifest.failures.push({ id: profile.id, name: profile.name, error: error?.message || "导出失败" });
      }
    }
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
    buildProfilePackage,
    refreshProfileReport,
    saveProfilePackage,
    exportAllProfiles,
    inspectImportZip,
    validateRecoveryData,
    restorePackages,
    baseFilename,
  });
})(window);
