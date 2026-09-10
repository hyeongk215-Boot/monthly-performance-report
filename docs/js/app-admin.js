(function () {
  var lastGroupData = null;
  var lastSeriesData = null;

  var METRIC_ROWS = [
    { key: "targetOperatingProfitCny", label: "colTargetProfitCny", rowClass: "row-target" },
    { key: "operatingProfitCny", label: "colOperatingProfitKr" },
    { key: "overachievedCny", label: "colOverAchievedCny" },
    { key: "achievementPct", label: "colAchievementRate", pct: true, rowClass: "row-rate" },
    { key: "headcount", label: "colHeadcount", intVal: true },
    { key: "productivity", label: "colProductivity", rowClass: "row-rate" },
    { key: "revenueCny", label: "colRevenue" },
    { key: "costOfSalesCny", label: "colCostOfSalesCny" },
    { key: "salesProfitCny", label: "colSalesProfitCny", rowClass: "row-subtotal" },
    { key: "gaExpenseCny", label: "colGaExpenseCny" },
    { key: "entertainmentCny", label: "colEntertainmentCny" },
    { key: "travelCny", label: "colTravelCny" },
    { key: "netProfitCny", label: "colNetProfit", rowClass: "row-subtotal" }
  ];

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
  function metricValue(row, bucket) {
    var v = bucket ? bucket[row.key] : null;
    if (v === null || v === undefined) return null;
    return Number(v);
  }
  function metricText(row, bucket) {
    var v = metricValue(row, bucket);
    if (v === null) return t("noData");
    if (row.pct) return fmtPct(v);
    if (row.intVal) return String(v);
    return fmt(v);
  }

  function getKey() { return document.getElementById("adminKey").value; }

  function officesForCorp(corp) {
    var codes = (window.APP_CONFIG.CORP_OFFICES && window.APP_CONFIG.CORP_OFFICES[corp]) || [];
    return window.APP_CONFIG.OFFICES.filter(function (o) { return codes.indexOf(o.ko) !== -1; });
  }

  function fillReportYear() {
    var sel = document.getElementById("reportYear");
    var prev = sel.value;
    sel.innerHTML = "";
    var thisYear = new Date().getFullYear();
    for (var y = thisYear; y >= thisYear - 3; y--) {
      var o = document.createElement("option");
      o.value = String(y); o.textContent = y + t("yearSuffix");
      sel.appendChild(o);
    }
    sel.value = prev || String(thisYear);
  }

  function fillReportPeriodValue() {
    var type = document.getElementById("reportPeriodType").value;
    var sel = document.getElementById("reportPeriodValue");
    var prev = sel.value;
    sel.innerHTML = "";
    var opts = [];
    if (type === "month") { for (var m = 1; m <= 12; m++) opts.push({ v: String(m).padStart(2, "0"), l: m + t("monthSuffix") }); }
    else if (type === "quarter") { for (var q = 1; q <= 4; q++) opts.push({ v: String(q), l: q + t("quarterSuffix") }); }
    else if (type === "half") { opts.push({ v: "H1", l: t("periodHalf1") }, { v: "H2", l: t("periodHalf2") }); }
    document.getElementById("reportPeriodValueWrap").style.display = type === "annual" ? "none" : "";
    opts.forEach(function (o) {
      var opt = document.createElement("option");
      opt.value = o.v; opt.textContent = o.l;
      sel.appendChild(opt);
    });
    if (prev) sel.value = prev;
  }

  function fillReportOfficeSel() {
    var group = document.getElementById("reportGroup").value;
    var sel = document.getElementById("reportOfficeSel");
    var prev = sel.value;
    sel.innerHTML = "";
    var opts = [];
    if (group === "yjc") {
      officesForCorp("YJC 포워딩").forEach(function (o) { opts.push({ v: "YJC 포워딩|" + o.ko, l: window.officeLabel(o.ko) }); });
    } else {
      officesForCorp("흥아물류").forEach(function (o) { opts.push({ v: "흥아물류|" + o.ko, l: window.officeLabel(o.ko) }); });
      ["상해물류센터", "윤봉물류", "창씽 CY", "청도 CY"].forEach(function (c) { opts.push({ v: c + "|", l: window.corpLabel(c) }); });
    }
    opts.forEach(function (o) {
      var opt = document.createElement("option");
      opt.value = o.v; opt.textContent = o.l;
      sel.appendChild(opt);
    });
    if (prev) sel.value = prev;
  }

  function applyModeVisibility() {
    var mode = document.getElementById("reportMode").value;
    document.getElementById("reportPeriodTypeWrap").style.display = mode === "all" ? "" : "none";
    document.getElementById("reportPeriodValueWrap").style.display = mode === "all" ? "" : "none";
    document.getElementById("reportOfficeWrap").style.display = mode === "office" ? "" : "none";
    document.getElementById("groupModeWrap").style.display = mode === "all" ? "" : "none";
    document.getElementById("officeModeWrap").style.display = mode === "office" ? "" : "none";
    if (mode === "all") fillReportPeriodValue();
  }

  // ===== 전체(합계) 모드: 법인그룹 × 기간 (오피스 컬럼) =====
  function buildPivotHead(columns) {
    var tr = document.createElement("tr");
    tr.innerHTML = "<th style='text-align:left;'>" + t("colMetric") + "</th>" +
      columns.map(function (c) { return "<th>" + c.label + "</th>"; }).join("");
    return tr;
  }

  function renderPivotTable(tableId, columns, block) {
    var table = document.getElementById(tableId);
    var thead = table.querySelector("thead");
    var tbody = table.querySelector("tbody");
    thead.innerHTML = ""; tbody.innerHTML = "";
    if (!columns || !columns.length) {
      tbody.innerHTML = "<tr><td style='color:var(--muted);'>" + t("noData") + "</td></tr>";
      return;
    }
    thead.appendChild(buildPivotHead(columns));
    METRIC_ROWS.forEach(function (row) {
      var tr = document.createElement("tr");
      if (row.rowClass) tr.className = row.rowClass;
      var cells = columns.map(function (c) {
        if (block === "diff") {
          var cur = metricValue(row, c.current);
          var prev = metricValue(row, c.prior);
          if (cur === null && prev === null) return "<td>" + t("noData") + "</td>";
          var diff = (cur || 0) - (prev || 0);
          return "<td>" + (row.pct ? fmtPct(diff) : (row.intVal ? String(diff) : fmt(diff))) + "</td>";
        }
        return "<td>" + metricText(row, c[block]) + "</td>";
      }).join("");
      tr.innerHTML = "<td style='text-align:left;'>" + t(row.label) + "</td>" + cells;
      tbody.appendChild(tr);
    });
  }

  function renderGroupResult(data) {
    lastGroupData = data;
    var columns = (data && data.columns) || [];
    document.getElementById("reportCurrentLabel").textContent = t("reportCurrentSheetName") + " (" + (data ? data.startYm + "~" + data.endYm : "") + ")";
    document.getElementById("reportPrevLabel").textContent = t("reportPrevSheetName") + " (" + (data ? data.priorStartYm + "~" + data.priorEndYm : "") + ")";
    renderPivotTable("reportCurrentTable", columns, "current");
    renderPivotTable("reportPrevTable", columns, "prior");
    renderPivotTable("reportYoyTable", columns, "diff");
  }

  // ===== 지점 선택 모드: 단일 오피스 1~12월 시계열 =====
  function renderOfficeSeries(data) {
    lastSeriesData = data;
    var body = document.getElementById("officeSeriesBody");
    body.innerHTML = "";
    var periods = (data && data.periods) || [];
    if (!periods.length) {
      body.innerHTML = "<tr><td colspan='14' style='color:var(--muted);'>" + t("noData") + "</td></tr>";
      return;
    }
    periods.forEach(function (row, i) {
      var target = Number(row.targetOperatingProfitCny) || 0;
      var actual = Number(row.operatingProfitCny) || 0;
      var over = actual - target;
      var achievePct = target ? (actual / target * 100) : null;
      var headcount = row.headcount != null ? Number(row.headcount) : null;
      var productivity = headcount ? (actual / headcount) : null;
      var tr = document.createElement("tr");
      if (i === periods.length - 1) tr.className = "subtotal-row";
      tr.innerHTML =
        "<td style='text-align:left;'>" + row.label + "</td>" +
        "<td>" + fmt(target) + "</td>" +
        "<td>" + fmt(actual) + "</td>" +
        "<td>" + fmt(over) + "</td>" +
        "<td>" + fmtPct(achievePct) + "</td>" +
        "<td>" + (headcount != null ? headcount : t("noData")) + "</td>" +
        "<td>" + fmt(productivity) + "</td>" +
        "<td>" + fmt(row.revenueCny) + "</td>" +
        "<td>" + fmt(row.costOfSalesCny) + "</td>" +
        "<td>" + fmt(row.salesProfitCny) + "</td>" +
        "<td>" + fmt(row.gaExpenseCny) + "</td>" +
        "<td>" + fmt(row.entertainmentCny) + "</td>" +
        "<td>" + fmt(row.travelCny) + "</td>" +
        "<td>" + fmt(row.netProfitCny) + "</td>";
      body.appendChild(tr);
    });
  }

  function fetchReport() {
    var client = window.getSupabaseClient();
    var key = getKey();
    if (!client) { showToast(t("adminFetchFail")); return; }
    if (!key) { showToast(t("adminKeyRequired")); return; }
    var mode = document.getElementById("reportMode").value;
    var group = document.getElementById("reportGroup").value;
    var year = document.getElementById("reportYear").value;

    if (mode === "all") {
      var periodType = document.getElementById("reportPeriodType").value;
      var periodValue = document.getElementById("reportPeriodValue").value;
      document.getElementById("reportMeta").textContent = (group === "yjc" ? t("corpGroupYjc") : t("corpGroupOther")) + " · " + year + t("yearSuffix");
      client.rpc("get_target_performance_group", { p_access_key: key, p_group: group, p_year: year, p_period_type: periodType, p_period_value: periodValue || null }).then(function (res) {
        if (res.error) throw res.error;
        renderGroupResult(res.data || {});
      }).catch(function () { showToast(t("adminFetchFail")); });
    } else {
      var raw = document.getElementById("reportOfficeSel").value || "";
      var parts = raw.split("|");
      var corp = parts[0];
      var office = parts[1] || null;
      document.getElementById("reportMeta").textContent = window.corpLabel(corp) + (office ? " · " + window.officeLabel(office) : "") + " · " + year + t("yearSuffix");
      client.rpc("get_target_performance_series", { p_access_key: key, p_corp: corp, p_office: office, p_year: year, p_end_month: "12", p_period_type: "month" }).then(function (res) {
        if (res.error) throw res.error;
        renderOfficeSeries(res.data || {});
      }).catch(function () { showToast(t("adminFetchFail")); });
    }
  }

  // ===== 엑셀 다운로드: 원본 첨부 엑셀과 비슷한 색상/서식을 살리기 위해 HTML 표를 그대로
  // .xls로 저장하는 방식을 사용합니다 (SheetJS 무료판은 셀 배경색 저장을 지원하지 않음).
  var XLS_STYLE =
    "table{border-collapse:collapse;font-family:Malgun Gothic,sans-serif;font-size:12px;} " +
    "td,th{border:1px solid #999;padding:4px 8px;text-align:right;white-space:nowrap;} " +
    "th{background:#CCECFF;font-weight:bold;text-align:center;} " +
    ".ttl{font-weight:bold;font-size:14px;} " +
    ".row-target td{background:#FFFF00;} " +
    ".row-rate td{background:#FFFFCC;} " +
    ".row-subtotal td{background:#F0F0F0;font-weight:bold;} " +
    ".subtotal-row td{background:#F0F0F0;font-weight:bold;} " +
    "td:first-child,th:first-child{text-align:left;}";

  function downloadHtmlAsXls(filename, bodyHtml) {
    var html = "<html><head><meta charset='UTF-8'><style>" + XLS_STYLE + "</style></head><body>" + bodyHtml + "</body></html>";
    var blob = new Blob(["﻿" + html], { type: "application/vnd.ms-excel" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadReport() {
    var mode = document.getElementById("reportMode").value;
    if (mode === "all") {
      if (!lastGroupData || !(lastGroupData.columns || []).length) { showToast(t("adminDeleteSelectedNone")); return; }
      var html = "<p class='ttl'>" + t("reportCurrentSheetName") + "</p>" + document.getElementById("reportCurrentTable").outerHTML +
        "<p class='ttl'>" + t("reportPrevSheetName") + "</p>" + document.getElementById("reportPrevTable").outerHTML +
        "<p class='ttl'>" + t("reportYoySheetName") + "</p>" + document.getElementById("reportYoyTable").outerHTML;
      downloadHtmlAsXls(t("fileNamePrefix") + "_목표실적_" + document.getElementById("reportYear").value + ".xls", html);
    } else {
      if (!lastSeriesData || !(lastSeriesData.periods || []).length) { showToast(t("adminDeleteSelectedNone")); return; }
      var html2 = "<p class='ttl'>" + t("targetPerfAdminHeading") + "</p>" + document.getElementById("officeSeriesTable").outerHTML;
      downloadHtmlAsXls(t("fileNamePrefix") + "_목표실적_" + document.getElementById("reportYear").value + ".xls", html2);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    fillReportYear();
    fillReportPeriodValue();
    fillReportOfficeSel();
    applyModeVisibility();
    document.addEventListener("langchange", function () {
      fillReportYear(); fillReportPeriodValue(); fillReportOfficeSel();
      if (lastGroupData) renderGroupResult(lastGroupData);
      if (lastSeriesData) renderOfficeSeries(lastSeriesData);
    });
    document.getElementById("reportGroup").addEventListener("change", fillReportOfficeSel);
    document.getElementById("reportMode").addEventListener("change", applyModeVisibility);
    document.getElementById("reportPeriodType").addEventListener("change", fillReportPeriodValue);
    document.getElementById("fetchReportBtn").addEventListener("click", fetchReport);
    document.getElementById("downloadReportBtn").addEventListener("click", downloadReport);
  });
})();
