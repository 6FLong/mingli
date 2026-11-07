(function initializeReportUi(global) {
  "use strict";

  const client = global.MingliReportClient;
  const bridge = global.MingliAppBridge;
  const statusTitle = document.querySelector("#reportStatusTitle");
  const statusText = document.querySelector("#reportStatusText");
  const syncStatus = document.querySelector("#reportSyncStatus");
  const preview = document.querySelector("#reportPreviewContent");
  const downloadButton = document.querySelector("#downloadClientReport");
  const generateButton = document.querySelector("#generateClientReport");
  const exportButton = document.querySelector("#exportData");
  const importButton = document.querySelector("#importData");
  const importInput = document.querySelector("#backupFileInput");
  const importModal = document.querySelector("#reportImportModal");
  const importStatus = document.querySelector("#reportImportStatus");
  const importPreview = document.querySelector("#reportImportPreview");
  const confirmImport = document.querySelector("#confirmReportImport");
  let currentProfileId = null;
  let generation = 0;
  let importPackages = [];
  let busy = false;

  function element(tag, className = "", text = "") {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function setBusy(value, message = "") {
    busy = value;
    downloadButton.disabled = value || !currentProfileId;
    generateButton.disabled = value || !currentProfileId;
    exportButton.disabled = value;
    if (message) {
      syncStatus.textContent = message;
      syncStatus.dataset.tone = "working";
    }
  }

  function renderEmpty(title, detail, state = "未生成", canGenerate = false) {
    statusTitle.textContent = title;
    statusText.textContent = detail;
    syncStatus.textContent = state;
    syncStatus.dataset.tone = "";
    downloadButton.disabled = true;
    generateButton.hidden = !canGenerate;
    generateButton.textContent = "生成分析报告";
    preview.replaceChildren();
  }

  function renderElementWheel(chart) {
    const block = element("section", "report-visual-section");
    block.append(element("h3", "", chart.title), element("p", "report-chart-caption", chart.caption));
    const wheel = element("div", "report-element-wheel");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 320 300");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "五行相生关系与结构占比");
    const defs = document.createElementNS(svg.namespaceURI, "defs");
    const marker = document.createElementNS(svg.namespaceURI, "marker");
    marker.setAttribute("id", "element-arrow");
    marker.setAttribute("viewBox", "0 0 10 10");
    marker.setAttribute("refX", "8");
    marker.setAttribute("refY", "5");
    marker.setAttribute("markerWidth", "5");
    marker.setAttribute("markerHeight", "5");
    marker.setAttribute("orient", "auto-start-reverse");
    const arrow = document.createElementNS(svg.namespaceURI, "path");
    arrow.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
    arrow.setAttribute("fill", "#b8a9cc");
    marker.append(arrow);
    defs.append(marker);
    svg.append(defs);
    const positions = [{ x: 160, y: 48 }, { x: 265, y: 126 }, { x: 225, y: 244 }, { x: 95, y: 244 }, { x: 55, y: 126 }];
    positions.forEach((point, index) => {
      const next = positions[(index + 1) % positions.length];
      const line = document.createElementNS(svg.namespaceURI, "line");
      line.setAttribute("x1", String(point.x));
      line.setAttribute("y1", String(point.y));
      line.setAttribute("x2", String(next.x));
      line.setAttribute("y2", String(next.y));
      line.setAttribute("class", "report-element-link");
      line.setAttribute("marker-end", "url(#element-arrow)");
      svg.append(line);
    });
    const elementPositions = { 火: positions[0], 土: positions[1], 金: positions[2], 水: positions[3], 木: positions[4] };
    chart.items.forEach((item) => {
      const point = elementPositions[item.label];
      const group = document.createElementNS(svg.namespaceURI, "g");
      group.setAttribute("class", "report-element-node");
      const circle = document.createElementNS(svg.namespaceURI, "circle");
      circle.setAttribute("cx", String(point.x));
      circle.setAttribute("cy", String(point.y));
      circle.setAttribute("r", "37");
      circle.setAttribute("fill", `${item.color}18`);
      circle.setAttribute("stroke", item.color);
      const name = document.createElementNS(svg.namespaceURI, "text");
      name.setAttribute("x", String(point.x));
      name.setAttribute("y", String(point.y - 3));
      name.setAttribute("class", "report-element-name");
      name.textContent = item.label;
      const value = document.createElementNS(svg.namespaceURI, "text");
      value.setAttribute("x", String(point.x));
      value.setAttribute("y", String(point.y + 18));
      value.setAttribute("class", "report-element-value");
      value.textContent = item.percentLabel;
      group.append(circle, name, value);
      svg.append(group);
    });
    const center = document.createElementNS(svg.namespaceURI, "text");
    center.setAttribute("x", "160");
    center.setAttribute("y", "151");
    center.setAttribute("class", "report-element-center");
    center.textContent = "相生循环";
    svg.append(center);
    wheel.append(svg);
    block.append(wheel);
    return block;
  }

  function renderTenGodColumns(chart) {
    const block = element("section", "report-visual-section");
    block.append(element("h3", "", chart.title), element("p", "report-chart-caption", chart.caption));
    const columns = element("div", "report-ten-god-columns");
    chart.items.forEach((item) => {
      const column = element("div", "report-ten-god-column");
      const plot = element("div", "report-ten-god-plot");
      const bar = element("i", "");
      bar.style.height = `${Math.max(item.value > 0 ? 8 : 2, Math.min(100, item.ratio * 100))}%`;
      bar.style.backgroundColor = item.color;
      plot.append(bar);
      column.append(plot, element("b", "", item.label), element("span", "", item.valueLabel));
      columns.append(column);
    });
    block.append(columns);
    return block;
  }

  function renderAnnualTrend(chart) {
    const block = element("section", "report-visual-section");
    block.append(element("h3", "", chart.title), element("p", "report-chart-caption", chart.caption));
    const graph = element("div", "report-annual-graph");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 300 112");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "近年流年节奏图");
    [18, 55, 92].forEach((y) => {
      const line = document.createElementNS(svg.namespaceURI, "line");
      line.setAttribute("x1", "12");
      line.setAttribute("x2", "288");
      line.setAttribute("y1", String(y));
      line.setAttribute("y2", String(y));
      line.setAttribute("class", "report-chart-gridline");
      svg.append(line);
    });
    const points = chart.items.map((item, index) => {
      const x = chart.items.length > 1 ? 28 + (244 * index) / (chart.items.length - 1) : 150;
      const y = item.level === 3 ? 18 : item.level === 1 ? 92 : 55;
      return { x, y, item };
    });
    const polyline = document.createElementNS(svg.namespaceURI, "polyline");
    polyline.setAttribute("points", points.map((point) => `${point.x},${point.y}`).join(" "));
    polyline.setAttribute("class", "report-chart-line");
    svg.append(polyline);
    points.forEach((point) => {
      const circle = document.createElementNS(svg.namespaceURI, "circle");
      circle.setAttribute("cx", String(point.x));
      circle.setAttribute("cy", String(point.y));
      circle.setAttribute("r", "5");
      circle.setAttribute("class", `report-chart-point is-${point.item.tone}`);
      svg.append(circle);
    });
    graph.append(svg);
    const labels = element("div", "report-annual-labels");
    chart.items.forEach((item) => {
      const label = element("div", `report-annual-label is-${item.tone}`);
      label.append(element("b", "", `${item.year} ${item.name}`), element("span", "", `${item.god} · ${item.toneLabel}`));
      labels.append(label);
    });
    const details = element("div", "report-annual-details");
    chart.items.forEach((item) => {
      const row = element("p", "");
      row.append(element("b", "", `${item.year}年：`), document.createTextNode(item.detail));
      details.append(row);
    });
    block.append(graph, labels, details);
    return block;
  }

  function renderPresentation(presentation, status) {
    statusTitle.textContent = "分析报告";
    statusText.textContent = `更新于 ${presentation.updatedAtLabel}`;
    syncStatus.textContent = status === "ready" ? "已同步" : status === "failed" ? "更新失败" : "待更新";
    syncStatus.dataset.tone = status === "ready" ? "ready" : "warning";
    downloadButton.disabled = false;
    generateButton.hidden = status === "ready";
    generateButton.textContent = status === "ready" ? "生成分析报告" : "重新生成";
    const overview = element("section", "report-modern-overview");
    overview.append(
      element("span", "", "先用现代话看整体"),
      element("h3", "", presentation.overview.title),
      element("p", "", presentation.overview.text),
      element("small", "", presentation.overview.method),
    );
    preview.replaceChildren(
      overview,
      renderElementWheel(presentation.visuals.elements),
      renderTenGodColumns(presentation.visuals.tenGods),
      renderAnnualTrend(presentation.visuals.annuals),
      ...presentation.sections.map((section) => {
        const block = element("section", "report-preview-section");
        block.append(element("h3", "", section.title));
        if (!section.items.length) block.append(element("p", "report-muted", "暂无内容"));
        section.items.forEach((item) => {
          const row = element("article", "report-preview-item");
          if (item.label) row.append(element("h4", "", item.label));
          row.append(element("p", "", item.text));
          if (item.factRefs?.length) row.append(element("small", "", `依据：${item.factRefs.join("、")}`));
          block.append(row);
        });
        return block;
      }),
    );
  }

  async function loadProfile(profileId) {
    currentProfileId = profileId || null;
    generation += 1;
    const currentGeneration = generation;
    if (!profileId) {
      renderEmpty("尚未选择档案", "选择档案后才能查看分析报告。", "无档案");
      return;
    }
    renderEmpty("正在读取报告", "正在同步当前档案的报告状态…", "同步中");
    try {
      const data = await client.loadProfileData(profileId);
      if (currentGeneration !== generation) return;
      const hasGeneratedReport = Boolean(data.report?.generated_at && data.report?.storage_path);
      if (!hasGeneratedReport) {
        renderEmpty("尚未生成分析报告", "命盘已经可以查看。需要交付或留存时，再生成包含命盘解读和现有咨询内容的最终报告。", "未生成", true);
        return;
      }
      const generatedAt = data.report?.generated_at || data.report?.updated_at || new Date().toISOString();
      const presentation = data.report?.presentation_snapshot || client.reportPresentation(data, generatedAt);
      renderPresentation(presentation, data.report?.status || "stale");
    } catch (error) {
      if (currentGeneration !== generation) return;
      renderEmpty("报告读取失败", error?.message || "请检查网络后重试。", "失败");
    }
  }

  async function refreshProfile(profileId, options = {}) {
    if (!profileId || busy) return null;
    setBusy(true, "生成中");
    try {
      const pkg = await client.refreshProfileReport(profileId);
      if (profileId === currentProfileId) renderPresentation(pkg.presentation, "ready");
      if (!options.quiet) bridge.showToast("分析报告已更新并同步到云端");
      return pkg;
    } catch (error) {
      if (profileId === currentProfileId) {
        syncStatus.textContent = "更新失败";
        syncStatus.dataset.tone = "warning";
      }
      if (!options.quiet) bridge.showToast(error?.message || "报告更新失败");
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(profileId) {
    if (!profileId || busy) return;
    setBusy(true, "打包中");
    try {
      const result = await client.saveProfilePackage(profileId);
      bridge.showToast("档案备份已保存");
    } catch (error) {
      bridge.showToast(error?.message || "档案导出失败");
    } finally {
      setBusy(false);
    }
  }

  downloadButton.addEventListener("click", async () => {
    if (!currentProfileId || busy) return;
    setBusy(true, "准备 PDF");
    try {
      await client.downloadClientReport(currentProfileId);
      bridge.showToast("分析报告 PDF 已下载");
    } catch (error) {
      bridge.showToast(error?.message || "分析报告下载失败");
    } finally {
      setBusy(false);
    }
  });

  generateButton.addEventListener("click", async () => {
    if (!currentProfileId || busy) return;
    await refreshProfile(currentProfileId).catch(() => undefined);
  });

  exportButton.addEventListener("click", async () => {
    if (busy) return;
    setBusy(true, "导出中");
    exportButton.querySelector("b").textContent = "准备中";
    try {
      const manifest = await client.exportAllProfiles(({ current, total }) => {
        exportButton.querySelector("b").textContent = `${current}/${total}`;
      });
      if (manifest.failures.length) bridge.showToast(`导出完成，${manifest.failures.length} 份失败`);
      else if (manifest.skipped.length) bridge.showToast(`已导出，跳过 ${manifest.skipped.length} 份尚无报告的档案`);
      else bridge.showToast("全部档案已导出");
    } catch (error) {
      bridge.showToast(error?.message || "全部档案导出失败");
    } finally {
      exportButton.querySelector("b").textContent = "导出";
      setBusy(false);
    }
  });

  importButton.addEventListener("click", () => {
    if (!busy) importInput.click();
  });

  importInput.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    importInput.value = "";
    if (!file) return;
    importPackages = [];
    importPreview.replaceChildren();
    importStatus.textContent = "正在校验备份结构和完整性…";
    importModal.hidden = false;
    try {
      importPackages = await client.inspectImportZip(await file.arrayBuffer());
      importStatus.textContent = `已验证 ${importPackages.length} 份档案，确认前不会写入云端。`;
      importPreview.replaceChildren(
        ...importPackages.map(({ data }) => {
          const row = element("article", "import-preview-item");
          row.append(
            element("strong", "", data.profile.name),
            element("span", "", `${data.profile.birth_place || "未知城市"}｜${data.profile.birth_date}`),
            element("small", "", `${data.conversations?.length || 0} 个会话｜${data.messages?.length || 0} 条消息`),
          );
          return row;
        }),
      );
      confirmImport.disabled = false;
    } catch (error) {
      importStatus.textContent = error?.message || "备份文件无法读取";
      confirmImport.disabled = true;
    }
  });

  document.querySelector("#closeReportImport").addEventListener("click", () => {
    importModal.hidden = true;
  });
  importModal.addEventListener("click", (event) => {
    if (event.target === importModal) importModal.hidden = true;
  });

  confirmImport.addEventListener("click", async () => {
    if (!importPackages.length || busy) return;
    const mode = document.querySelector("#reportImportConflict").value;
    confirmImport.disabled = true;
    confirmImport.textContent = "正在恢复…";
    try {
      const result = await client.restorePackages(importPackages.map((item) => item.data), mode);
      importStatus.textContent = `恢复完成：成功 ${result.restored} 份，跳过 ${result.skipped} 份。`;
      bridge.showToast("备份已恢复到云端");
      await bridge.reloadCloudData();
    } catch (error) {
      importStatus.textContent = error?.message || "恢复失败，云端原数据未改变。";
    } finally {
      confirmImport.disabled = false;
      confirmImport.textContent = "确认恢复";
    }
  });

  global.addEventListener("mingli:profile-changed", (event) => void loadProfile(event.detail?.profileId || null));

  global.MingliReportUi = Object.freeze({ saveProfile, refreshProfile, loadProfile });
})(window);
