(function () {
  var aggRows = [];
  var aggChart = null;

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

  function getKey() { return document.getElementById("adminKey").value; }
  function getYm() { return document.getElementById("adminYm").value; }

  function fillYm() {
    var sel = document.getElementById("adminYm");
    var prev = sel.value;
    sel.innerHTML = "";
    window.generateYearMonths().forEach(function (ym) {
      var o = document.createElement("option");
      o.value = ym; o.textContent = ym;
      sel.appendChild(o);
    });
    sel.value = prev || window.defaultYearMonth();
  }

  function officesForCorp(corp) {
    var codes = (window.APP_CONFIG.CORP_OFFICES && window.APP_CONFIG.CORP_OFFICES[corp]) || [];
    return window.APP_CONFIG.OFFICES.filter(function (o) { return codes.indexOf(o.ko) !== -1; });
  }

  function fillReportCorp() {
    var sel = document.getElementById("reportCorp");
    var prev = sel.value;
    var lang = getLang();
    sel.innerHTML = "";
    window.APP_CONFIG.CORPORATIONS.forEach(function (item) {
      var o = document.createElement("option");
      o.value = item.ko; o.textContent = item[lang] || item.ko;
      sel.appendChild(o);
    });
    if (prev) sel.value = prev;
  }

  function fillReportOffice() {
    var sel = document.getElementById("reportOffice");
    var prev = sel.value;
    sel.innerHTML = "";
    var allOpt = document.createElement("option");
    allOpt.value = ""; allOpt.textContent = t("officeAllOption");
    sel.appendChild(allOpt);
    officesForCorp(document.getElementById("reportCorp").value).forEach(function (item) {
      var o = document.createElement("option");
      o.value = item.ko; o.textContent = window.officeLabel(item.ko);
      sel.appendChild(o);
    });
    if (prev) sel.value = prev;
  }

  function fillReportYm() {
    var sel = document.getElementById("reportYm");
    var prev = sel.value;
    sel.innerHTML = "";
    window.generateYearMonths().forEach(function (ym) {
      var o = document.createElement("option");
      o.value = ym; o.textContent = ym;
      sel.appendChild(o);
    });
    sel.value = prev || window.defaultYearMonth();
  }

  var reportCurrentRows = [];
  var reportPrevRows = [];
  var reportYoyRows = [];

  function reportRowLine(row) {
    return [
      row.office ? window.officeLabel(row.office) : t("totalRowLabel"),
      row.revenueCny, row.costOfSalesCny, row.salesProfitCny, row.gaExpenseCny,
      row.entertainmentCny, row.travelCny, row.operatingProfitCny, row.netProfitCny
    ];
  }

  function renderReportCurrentTable(data) {
    var office = document.getElementById("reportOffice").value;
    var rows = ((data && data.byOffice) || []).filter(function (r) { return !office || r.office === office; });
    reportCurrentRows = rows.concat(data && data.total ? [data.total] : []);
    var body = document.getElementById("reportCurrentBody");
    body.innerHTML = "";
    if (!reportCurrentRows.length) {
      body.innerHTML = "<tr><td colspan='14' style='color:var(--muted);'>" + t("noData") + "</td></tr>";
      return;
    }
    reportCurrentRows.forEach(function (row) {
      var target = Number(row.targetOperatingProfitCny) || 0;
      var actual = Number(row.operatingProfitCny) || 0;
      var over = actual - target;
      var achievePct = target ? (actual / target * 100) : null;
      var headcount = row.headcount != null ? Number(row.headcount) : null;
      var productivity = headcount ? (actual / headcount) : null;
      var tr = document.createElement("tr");
      if (!row.office) tr.className = "subtotal-row";
      tr.innerHTML =
        "<td style='text-align:left;'>" + (row.office ? window.officeLabel(row.office) : t("totalRowLabel")) + "</td>" +
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

  function renderReportPrevTable(data) {
    var office = document.getElementById("reportOffice").value;
    var rows = ((data && data.byOffice) || []).filter(function (r) { return !office || r.office === office; });
    reportPrevRows = rows.concat(data && data.total ? [data.total] : []);
    var body = document.getElementById("reportPrevBody");
    body.innerHTML = "";
    if (!reportPrevRows.length) {
      body.innerHTML = "<tr><td colspan='9' style='color:var(--muted);'>" + t("noData") + "</td></tr>";
      return;
    }
    reportPrevRows.forEach(function (row) {
      var tr = document.createElement("tr");
      if (!row.office) tr.className = "subtotal-row";
      var vals = reportRowLine(row);
      tr.innerHTML = "<td style='text-align:left;'>" + vals[0] + "</td>" + vals.slice(1).map(function (v) { return "<td>" + fmt(v) + "</td>"; }).join("");
      body.appendChild(tr);
    });
  }

  function renderReportYoyTable() {
    var byOfficeCurrent = {};
    reportCurrentRows.forEach(function (r) { byOfficeCurrent[r.office || ""] = r; });
    var byOfficePrev = {};
    reportPrevRows.forEach(function (r) { byOfficePrev[r.office || ""] = r; });
    var offices = Object.keys(byOfficeCurrent);
    reportYoyRows = offices.map(function (office) {
      var cur = byOfficeCurrent[office] || {};
      var prev = byOfficePrev[office] || {};
      var diff = { office: office };
      ["revenueCny", "costOfSalesCny", "salesProfitCny", "gaExpenseCny", "entertainmentCny", "travelCny", "operatingProfitCny", "netProfitCny"].forEach(function (k) {
        diff[k] = (Number(cur[k]) || 0) - (Number(prev[k]) || 0);
      });
      return diff;
    });
    var body = document.getElementById("reportYoyBody");
    body.innerHTML = "";
    if (!reportYoyRows.length) {
      body.innerHTML = "<tr><td colspan='9' style='color:var(--muted);'>" + t("noData") + "</td></tr>";
      return;
    }
    reportYoyRows.forEach(function (row) {
      var tr = document.createElement("tr");
      if (!row.office) tr.className = "subtotal-row";
      var vals = reportRowLine(row);
      tr.innerHTML = "<td style='text-align:left;'>" + vals[0] + "</td>" + vals.slice(1).map(function (v) { return "<td>" + fmt(v) + "</td>"; }).join("");
      body.appendChild(tr);
    });
  }

  function prevYearYm(ym) {
    var year = Number(ym.slice(0, 4)) - 1;
    return year + ym.slice(4);
  }

  function fetchReport() {
    var client = window.getSupabaseClient();
    var key = getKey();
    if (!client) { showToast(t("adminFetchFail")); return; }
    if (!key) { showToast(t("adminKeyRequired")); return; }
    var corp = document.getElementById("reportCorp").value;
    var ym = document.getElementById("reportYm").value;
    document.getElementById("reportCurrentLabel").textContent = t("reportCurrentLabelText", { year: ym.slice(0, 4), month: Number(ym.slice(5, 7)) });
    document.getElementById("reportPrevLabel").textContent = t("reportPrevLabelText", { year: prevYearYm(ym).slice(0, 4), month: Number(ym.slice(5, 7)) });
    Promise.all([
      client.rpc("get_target_performance_report", { p_access_key: key, p_corp: corp, p_yearmonth: ym }),
      client.rpc("get_target_performance_report", { p_access_key: key, p_corp: corp, p_yearmonth: prevYearYm(ym) })
    ]).then(function (results) {
      if (results[0].error) throw results[0].error;
      renderReportCurrentTable(results[0].data || {});
      renderReportPrevTable(results[1].error ? {} : (results[1].data || {}));
      renderReportYoyTable();
    }).catch(function () {
      showToast(t("adminFetchFail"));
    });
  }

  function downloadReport() {
    if (!reportCurrentRows.length) { showToast(t("adminDeleteSelectedNone")); return; }
    var wb = XLSX.utils.book_new();
    var header1 = [t("office"), t("colTargetProfitCny"), t("colOperatingProfit"), t("colOverAchievedCny"), t("colAchievementRate"),
      t("colHeadcount"), t("colProductivity"), t("colRevenue"), t("colCostOfSalesCny"), t("colSalesProfitCny"), t("colGaExpenseCny"),
      t("colEntertainmentCny"), t("colTravelCny"), t("colNetProfit")];
    var aoa1 = [header1];
    reportCurrentRows.forEach(function (row) {
      var target = Number(row.targetOperatingProfitCny) || 0;
      var actual = Number(row.operatingProfitCny) || 0;
      var headcount = row.headcount != null ? Number(row.headcount) : null;
      aoa1.push([
        row.office ? window.officeLabel(row.office) : t("totalRowLabel"), target, actual, actual - target,
        target ? Math.round(actual / target * 100) : "", headcount, headcount ? Math.round(actual / headcount) : "",
        row.revenueCny, row.costOfSalesCny, row.salesProfitCny, row.gaExpenseCny, row.entertainmentCny, row.travelCny, row.netProfitCny
      ]);
    });
    var ws1 = XLSX.utils.aoa_to_sheet(aoa1);
    XLSX.utils.book_append_sheet(wb, ws1, t("reportCurrentSheetName"));

    var header2 = [t("office"), t("colRevenue"), t("colCostOfSalesCny"), t("colSalesProfitCny"), t("colGaExpenseCny"),
      t("colEntertainmentCny"), t("colTravelCny"), t("colOperatingProfit"), t("colNetProfit")];
    var aoa2 = [header2];
    reportPrevRows.forEach(function (row) { aoa2.push(reportRowLine(row)); });
    var ws2 = XLSX.utils.aoa_to_sheet(aoa2);
    XLSX.utils.book_append_sheet(wb, ws2, t("reportPrevSheetName"));

    var aoa3 = [header2];
    reportYoyRows.forEach(function (row) { aoa3.push(reportRowLine(row)); });
    var ws3 = XLSX.utils.aoa_to_sheet(aoa3);
    XLSX.utils.book_append_sheet(wb, ws3, t("reportYoySheetName"));

    window.downloadWorkbook(wb, t("fileNamePrefix") + "_목표실적_" + document.getElementById("reportYm").value + ".xlsx");
  }

  function renderTable() {
    var body = document.getElementById("aggBody");
    body.innerHTML = "";
    aggRows.forEach(function (row, i) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + (i + 1) + "</td>" +
        "<td>" + window.corpLabel(row.corp) + "</td>" +
        "<td>" + fmt(row.revenueCny) + "</td>" +
        "<td>" + fmtPct(row.operatingMarginPct) + "</td>" +
        "<td>" + fmtPct(row.netMarginPct) + "</td>" +
        "<td>" + fmtPct(row.debtRatioPct) + "</td>" +
        "<td>" + fmtPct(row.currentRatioPct) + "</td>" +
        "<td>" + fmtPct(row.achievementPct) + "</td>" +
        "<td>" + fmtPct(row.cashChangePct) + "</td>" +
        "<td>" + fmt(row.loanBalanceCny) + "</td>";
      body.appendChild(tr);
    });
  }

  function renderChart() {
    var ctx2d = document.getElementById("aggChart").getContext("2d");
    if (aggChart) aggChart.destroy();
    aggChart = new Chart(ctx2d, {
      type: "bar",
      data: {
        labels: aggRows.map(function (r) { return window.corpLabel(r.corp); }),
        datasets: [
          { label: t("colNetMarginPct"), data: aggRows.map(function (r) { return r.netMarginPct; }), backgroundColor: "#1a4d8f" },
          { label: t("colDebtRatio"), data: aggRows.map(function (r) { return r.debtRatioPct; }), backgroundColor: "#c0392b" }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  function downloadAgg() {
    var header = [t("rowNumberCol"), t("colCorp"), t("colRevenue"), t("colOperatingMarginPct"), t("colNetMarginPct"),
      t("colDebtRatio"), t("colCurrentRatio"), t("achievementLabel"), t("cashChangePct"), t("totalLoanBalanceCny")];
    var aoa = [header];
    aggRows.forEach(function (row, i) {
      aoa.push([i + 1, window.corpLabel(row.corp), row.revenueCny, row.operatingMarginPct, row.netMarginPct,
        row.debtRatioPct, row.currentRatioPct, row.achievementPct, row.cashChangePct, row.loanBalanceCny]);
    });
    var ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 5 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 16 }];
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, getYm());
    window.downloadWorkbook(wb, t("fileNamePrefix") + "_" + getYm() + ".xlsx");
  }

  function fetchData() {
    var client = window.getSupabaseClient();
    var key = getKey();
    if (!client) { showToast(t("adminFetchFail")); return; }
    if (!key) { showToast(t("adminKeyRequired")); return; }
    client.rpc("get_performance_aggregate", { p_access_key: key, p_yearmonth: getYm() }).then(function (res) {
      if (res.error) throw res.error;
      aggRows = res.data || [];
      renderTable();
      renderChart();
    }).catch(function () {
      showToast(t("adminFetchFail"));
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    fillYm();
    fillReportCorp();
    fillReportOffice();
    fillReportYm();
    document.addEventListener("langchange", function () {
      fillYm(); fillReportCorp(); fillReportOffice(); fillReportYm();
      renderTable(); if (aggRows.length) renderChart();
    });
    document.getElementById("fetchBtn").addEventListener("click", fetchData);
    document.getElementById("downloadBtn").addEventListener("click", downloadAgg);
    document.getElementById("reportCorp").addEventListener("change", fillReportOffice);
    document.getElementById("fetchReportBtn").addEventListener("click", fetchReport);
    document.getElementById("downloadReportBtn").addEventListener("click", downloadReport);
  });
})();
