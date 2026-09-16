(function () {
  var ctx = window.loadContext();
  if (!ctx) {
    window.location.href = "index.html";
    return;
  }

  var CATEGORY_ORDER = [
    "wage", "welfare", "entertainment", "travel", "depreciation",
    "rent", "office_ops", "vehicle", "consulting", "system", "bank_fee"
  ];
  var CATEGORY_I18N_KEY = {
    wage: "catWage", welfare: "catWelfare", entertainment: "catEntertainment",
    travel: "catTravel", depreciation: "catDepreciation", rent: "catRent",
    office_ops: "catOfficeOps", vehicle: "catVehicle", consulting: "catConsulting",
    system: "catSystem", bank_fee: "catBankFee"
  };

  var currentPeriod = "month";
  var currentOffice = ctx.office || "";
  var waterfallChart = null;
  var gaBarChart = null;
  var gaDonutChart = null;
  var lastGaRows = null;
  var lastBucket = null;
  var lastPrevBucket = null;

  function showToast(msg) {
    var el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(function () { el.classList.remove("show"); }, 3000);
  }

  function fmt(n) {
    if (n === null || n === undefined) return t("noData");
    return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  function fmtPct(n) {
    return (n === null || n === undefined) ? t("noData") : Number(n).toFixed(1) + "%";
  }
  function fmtWan(n) {
    if (n === null || n === undefined) return t("noData");
    return (Number(n) / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + " 万元";
  }
  function categoryLabel(cat) {
    return t(CATEGORY_I18N_KEY[cat] || cat);
  }

  // ===== 테마(다크모드) =====
  function isDark() { return document.getElementById("insightsApp").classList.contains("dark"); }
  function themeVar(name) {
    return getComputedStyle(document.getElementById("insightsApp")).getPropertyValue(name).trim();
  }
  var MOON_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  var SUN_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  function applyTheme(dark) {
    document.getElementById("insightsApp").classList.toggle("dark", dark);
    localStorage.setItem("insightsDark", dark ? "1" : "0");
    var btn = document.getElementById("darkToggle");
    if (btn) btn.innerHTML = dark ? SUN_SVG : MOON_SVG;
  }
  function bindDarkToggle() {
    var saved = localStorage.getItem("insightsDark") === "1";
    applyTheme(saved);
    document.getElementById("darkToggle").addEventListener("click", function () {
      applyTheme(!isDark());
      if (lastBucket) renderWaterfall(lastBucket, lastPrevBucket);
      if (lastGaRows) renderGaCharts(lastGaRows);
    });
  }

  // ===== 언어 토글 (사이드바 전용 버튼, i18n.js의 .lang-btn과 별개) =====
  function bindLangButtons() {
    document.querySelectorAll(".ins-lang-toggle").forEach(function (btn) {
      btn.addEventListener("click", function () { window.setLang(btn.dataset.lang); });
    });
    function syncActive() {
      document.querySelectorAll(".ins-lang-toggle").forEach(function (btn) {
        btn.classList.toggle("active", btn.dataset.lang === getLang());
      });
    }
    syncActive();
    document.addEventListener("langchange", syncActive);
  }

  // ===== 필터 바 =====
  function renderContextBar() {
    document.getElementById("corpChipLabel").textContent = window.corpLabel(ctx.corp);
    var sel = document.getElementById("ymSwitch");
    sel.innerHTML = "";
    window.generateYearMonths().forEach(function (ym) {
      var o = document.createElement("option");
      o.value = ym; o.textContent = ym;
      sel.appendChild(o);
    });
    sel.value = ctx.yearmonth;
    sel.addEventListener("change", function () {
      ctx.yearmonth = sel.value;
      window.saveContext(ctx);
      loadAll();
    });
  }

  function officesForCorp(corp) {
    var codes = (window.APP_CONFIG.CORP_OFFICES && window.APP_CONFIG.CORP_OFFICES[corp]) || [];
    return window.APP_CONFIG.OFFICES.filter(function (o) { return codes.indexOf(o.ko) !== -1; });
  }

  function renderOfficeSelect() {
    var wrap = document.getElementById("officeChipWrap");
    if (ctx.officeScope) {
      wrap.style.display = "none";
      currentOffice = ctx.officeScope;
      return;
    }
    wrap.style.display = "";
    var sel = document.getElementById("officeSelect");
    sel.innerHTML = "";
    var allOpt = document.createElement("option");
    allOpt.value = ""; allOpt.textContent = t("officeAllOption");
    sel.appendChild(allOpt);
    officesForCorp(ctx.corp).forEach(function (item) {
      var o = document.createElement("option");
      o.value = item.ko; o.textContent = window.officeLabel(item.ko);
      sel.appendChild(o);
    });
    sel.value = currentOffice;
  }

  function periodTypeForRpc() {
    if (currentPeriod === "year") return "annual";
    return currentPeriod; // "month" | "quarter"
  }

  function periodRange() {
    var year = ctx.yearmonth.slice(0, 4);
    var month = Number(ctx.yearmonth.slice(5, 7));
    if (currentPeriod === "year") {
      return { start: year + "-01", end: ctx.yearmonth };
    }
    if (currentPeriod === "quarter") {
      var qStartMonth = Math.floor((month - 1) / 3) * 3 + 1;
      return { start: year + "-" + String(qStartMonth).padStart(2, "0"), end: ctx.yearmonth };
    }
    return { start: ctx.yearmonth, end: ctx.yearmonth };
  }

  // ===== 스탯 카드 =====
  function renderStatCards(bucket, prevBucket, gaTotals) {
    if (!bucket) {
      document.getElementById("statRevenue").textContent = t("noData");
      document.getElementById("statOperatingProfit").textContent = t("noData");
      return;
    }
    var revenue = Number(bucket.revenueCny) || 0;
    var operatingProfit = Number(bucket.operatingProfitCny) || 0;

    document.getElementById("statRevenue").innerHTML = fmtWan(revenue);
    document.getElementById("statOperatingProfit").innerHTML = fmtWan(operatingProfit);

    var revBadge = document.getElementById("statRevenueBadge");
    if (prevBucket && Number(prevBucket.revenueCny)) {
      var chg = (revenue - Number(prevBucket.revenueCny)) / Number(prevBucket.revenueCny) * 100;
      revBadge.textContent = t("vsPrevPeriod", { pct: (chg >= 0 ? "+" : "") + chg.toFixed(1) + "%" });
      revBadge.className = "ins-badge " + (chg >= 0 ? "success" : "danger");
    } else {
      revBadge.textContent = t("noData");
      revBadge.className = "ins-badge neutral";
    }

    var opBadge = document.getElementById("statOperatingMarginBadge");
    var opMarginPct = revenue ? (operatingProfit / revenue * 100) : null;
    opBadge.textContent = t("colOperatingMarginPct") + " " + fmtPct(opMarginPct);
    opBadge.className = "ins-badge " + (opMarginPct !== null && opMarginPct >= 0 ? "success" : "danger");

    var execPct = gaTotals && gaTotals.budget ? (gaTotals.actual / gaTotals.budget * 100) : null;
    document.getElementById("statGaExecPct").textContent = fmtPct(execPct);
    var bar = document.getElementById("statGaExecBar");
    var pct = execPct === null ? 0 : Math.min(execPct, 100);
    bar.style.width = pct + "%";
    bar.style.background = (execPct !== null && execPct > 100) ? themeVar("--ins-danger") : themeVar("--ins-success");
  }

  // ===== 손익 5단계 워터폴 =====
  function renderWaterfall(bucket, prevBucket) {
    lastBucket = bucket;
    lastPrevBucket = prevBucket;
    var el = document.getElementById("waterfallWrap");
    if (!waterfallChart) waterfallChart = echarts.init(el);

    if (!bucket) {
      waterfallChart.clear();
      document.getElementById("waterfallSummary").innerHTML = "";
      return;
    }

    var revenue = Number(bucket.revenueCny) || 0;
    var cost = Number(bucket.costOfSalesCny) || 0;
    var salesProfit = Number(bucket.salesProfitCny) || 0;
    var ga = Number(bucket.gaExpenseCny) || 0;
    var operatingProfit = Number(bucket.operatingProfitCny) || 0;

    var categories = [t("wfRevenue"), t("wfCost"), t("wfSalesProfit"), t("wfGaExpense"), t("wfOperatingProfit")];
    var base = [0, revenue - cost, 0, salesProfit - ga, 0];
    var value = [revenue, cost, salesProfit, ga, operatingProfit];
    var colors = ["#4f46e5", "#dc2626", "#059669", "#dc2626", "#059669"];
    var axisColor = themeVar("--ins-text-secondary");
    var borderColor = themeVar("--ins-border");
    var textColor = themeVar("--ins-text");

    waterfallChart.setOption({
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      grid: { left: 64, right: 20, top: 20, bottom: 30 },
      xAxis: { type: "category", data: categories, axisLine: { lineStyle: { color: borderColor } }, axisLabel: { color: axisColor } },
      yAxis: { type: "value", axisLine: { show: false }, axisLabel: { color: axisColor }, splitLine: { lineStyle: { color: borderColor } } },
      series: [
        { type: "bar", stack: "wf", itemStyle: { color: "transparent" }, silent: true, data: base },
        {
          type: "bar", stack: "wf", barWidth: "55%",
          label: { show: true, position: "top", color: textColor, formatter: function (p) { return fmt(value[p.dataIndex]); } },
          data: value.map(function (v, i) { return { value: v, itemStyle: { color: colors[i], borderRadius: 3 } }; })
        }
      ]
    }, true);

    var salesMarginPct = revenue ? (salesProfit / revenue * 100) : null;
    var operatingMarginPct = revenue ? (operatingProfit / revenue * 100) : null;
    document.getElementById("waterfallSummary").innerHTML =
      "<span><b>" + t("colSalesMarginPct") + "</b>: " + fmtPct(salesMarginPct) + "</span>" +
      "<span><b>" + t("colOperatingMarginPct") + "</b>: " + fmtPct(operatingMarginPct) + "</span>";
  }

  function loadWaterfall() {
    var client = window.getSupabaseClient();
    if (!client) { showToast(t("fetchFail")); return; }
    var year = ctx.yearmonth.slice(0, 4);
    var month = ctx.yearmonth.slice(5, 7);
    client.rpc("get_target_performance_series", {
      p_access_key: ctx.accessKey, p_corp: ctx.corp, p_office: currentOffice || null,
      p_year: year, p_end_month: month, p_period_type: periodTypeForRpc()
    }).then(function (res) {
      if (res.error) throw res.error;
      var periods = (res.data && res.data.periods) || [];
      var bucket = periods.length >= 2 ? periods[periods.length - 2] : (periods[0] || null);
      var prevBucket = periods.length >= 3 ? periods[periods.length - 3] : null;
      renderWaterfall(bucket, prevBucket);
      renderStatCards(bucket, prevBucket, lastGaTotals());
    }).catch(function () { showToast(t("fetchFail")); });
  }

  // ===== 판관비 세부 구조 =====
  function lastGaTotals() {
    if (!lastGaRows) return null;
    var budget = 0, actual = 0;
    CATEGORY_ORDER.forEach(function (cat) {
      var row = lastGaRows[cat];
      if (row) { budget += Number(row.budgetCny) || 0; actual += Number(row.actualCny) || 0; }
    });
    return { budget: budget, actual: actual };
  }

  function renderGaTable(rows) {
    var body = document.getElementById("gaBody");
    body.innerHTML = "";
    CATEGORY_ORDER.forEach(function (cat) {
      var row = rows[cat] || { budgetCny: 0, actualCny: 0 };
      var budget = Number(row.budgetCny) || 0;
      var actual = Number(row.actualCny) || 0;
      var variancePct = budget ? ((actual - budget) / budget * 100) : null;
      var badgeClass = variancePct === null ? "neutral" : (variancePct > 0 ? "danger" : "success");
      var badgeText = variancePct === null ? t("noData") : (variancePct > 0 ? "+" : "") + variancePct.toFixed(1) + "%";
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + categoryLabel(cat) + "</td>" +
        "<td>" + fmt(budget) + "</td>" +
        "<td>" + fmt(actual) + "</td>" +
        "<td><span class='ins-badge " + badgeClass + "'>" + badgeText + "</span></td>";
      body.appendChild(tr);
    });
  }

  function renderGaCharts(rows) {
    var categories = CATEGORY_ORDER.map(categoryLabel);
    var budgetData = CATEGORY_ORDER.map(function (cat) { return (rows[cat] && Number(rows[cat].budgetCny)) || 0; });
    var actualData = CATEGORY_ORDER.map(function (cat) { return (rows[cat] && Number(rows[cat].actualCny)) || 0; });
    var axisColor = themeVar("--ins-text-secondary");
    var borderColor = themeVar("--ins-border");

    var barEl = document.getElementById("gaBarWrap");
    if (!gaBarChart) gaBarChart = echarts.init(barEl);
    gaBarChart.setOption({
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: { data: [t("colBudget"), t("colActual")], top: 0, textStyle: { color: axisColor, fontSize: 11 } },
      grid: { left: 90, right: 20, top: 34, bottom: 20 },
      xAxis: {
        type: "value", axisLine: { show: false }, splitLine: { lineStyle: { color: borderColor } },
        axisLabel: { color: axisColor, fontSize: 10, formatter: function (v) { return (v / 10000).toLocaleString(undefined, { maximumFractionDigits: 0 }) + "万"; } }
      },
      yAxis: { type: "category", data: categories, axisLine: { lineStyle: { color: borderColor } }, axisLabel: { color: axisColor, fontSize: 11 } },
      series: [
        { name: t("colBudget"), type: "bar", data: budgetData, itemStyle: { color: "#c7d2fe" } },
        { name: t("colActual"), type: "bar", data: actualData, itemStyle: { color: "#4f46e5" } }
      ]
    }, true);

    var donutEl = document.getElementById("gaDonutWrap");
    if (!gaDonutChart) gaDonutChart = echarts.init(donutEl);
    gaDonutChart.setOption({
      tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
      legend: { show: false },
      series: [{
        type: "pie",
        radius: ["42%", "70%"],
        label: { show: false },
        itemStyle: { borderColor: themeVar("--ins-surface"), borderWidth: 2 },
        data: CATEGORY_ORDER.map(function (cat, i) {
          return { name: categories[i], value: actualData[i] };
        }).filter(function (d) { return d.value > 0; })
      }]
    }, true);
  }

  function loadGaBreakdown() {
    var client = window.getSupabaseClient();
    if (!client) { showToast(t("fetchFail")); return; }
    var range = periodRange();
    client.rpc("get_ga_breakdown", {
      p_access_key: ctx.accessKey, p_corp: ctx.corp, p_office: currentOffice || null,
      p_start_ym: range.start, p_end_ym: range.end
    }).then(function (res) {
      if (res.error) throw res.error;
      var rows = {};
      (res.data || []).forEach(function (r) { rows[r.category] = r; });
      lastGaRows = rows;
      renderGaTable(rows);
      renderGaCharts(rows);
      renderStatCards(lastBucket, lastPrevBucket, lastGaTotals());
    }).catch(function () { showToast(t("fetchFail")); });
  }

  // ===== 필터/토글 바인딩 =====
  function bindPeriodToggle() {
    document.getElementById("periodToggle").addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (!btn) return;
      document.querySelectorAll("#periodToggle button").forEach(function (b) { b.classList.remove("on"); });
      btn.classList.add("on");
      currentPeriod = btn.dataset.period;
      loadWaterfall();
      loadGaBreakdown();
    });
  }

  function bindOfficeSelect() {
    document.getElementById("officeSelect").addEventListener("change", function (e) {
      currentOffice = e.target.value;
      loadWaterfall();
      loadGaBreakdown();
    });
  }

  function resizeCharts() {
    if (waterfallChart) waterfallChart.resize();
    if (gaBarChart) gaBarChart.resize();
    if (gaDonutChart) gaDonutChart.resize();
  }

  // ===== PDF / PPT 내보내기 (화면에 보이는 색상을 그대로 캡처) =====
  function captureContent() {
    var el = document.getElementById("captureArea");
    var bg = themeVar("--ins-bg");
    return html2canvas(el, { backgroundColor: bg, scale: 2, useCORS: true });
  }

  function exportPdf() {
    showToast(t("exportPreparing"));
    captureContent().then(function (canvas) {
      var pdf = new window.jspdf.jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      var pageWidth = pdf.internal.pageSize.getWidth();
      var pageHeight = pdf.internal.pageSize.getHeight();
      var imgWidth = pageWidth;
      var imgHeight = canvas.height * imgWidth / canvas.width;
      var imgData = canvas.toDataURL("image/png");
      var heightLeft = imgHeight;
      var position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save("insights-" + ctx.yearmonth + ".pdf");
    }).catch(function () { showToast(t("exportFail")); });
  }

  function exportPpt() {
    showToast(t("exportPreparing"));
    captureContent().then(function (canvas) {
      var pptx = new window.PptxGenJS();
      pptx.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
      pptx.layout = "WIDE";
      var slide = pptx.addSlide();
      var imgData = canvas.toDataURL("image/png");
      var slideW = 13.33, slideH = 7.5;
      var ratio = canvas.width / canvas.height;
      var w = slideW - 0.6, h = w / ratio;
      if (h > slideH - 0.6) { h = slideH - 0.6; w = h * ratio; }
      slide.addImage({ data: imgData, x: (slideW - w) / 2, y: (slideH - h) / 2, w: w, h: h });
      pptx.writeFile({ fileName: "insights-" + ctx.yearmonth + ".pptx" });
    }).catch(function () { showToast(t("exportFail")); });
  }

  function bindExportButtons() {
    document.getElementById("exportPdfBtn").addEventListener("click", exportPdf);
    document.getElementById("exportPptBtn").addEventListener("click", exportPpt);
  }

  function loadAll() {
    var client = window.getSupabaseClient();
    if (!client) {
      showToast(t("fetchFail"));
      return;
    }
    renderContextBar();
    renderOfficeSelect();
    loadWaterfall();
    loadGaBreakdown();
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindDarkToggle();
    bindLangButtons();
    bindPeriodToggle();
    bindOfficeSelect();
    bindExportButtons();
    window.addEventListener("resize", resizeCharts);
    loadAll();
    document.addEventListener("langchange", function () {
      renderContextBar();
      renderOfficeSelect();
      loadWaterfall();
      if (lastGaRows) { renderGaTable(lastGaRows); renderGaCharts(lastGaRows); }
    });
  });
})();
