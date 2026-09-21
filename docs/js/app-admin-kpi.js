(function () {
  var aggRows = [];
  var aggChart = null;
  var dProfitChart = null;
  var dPeriod = "month";
  var dRawProfitSeries = [];
  var dRawStabilitySeries = [];
  var lastDrilldown = null;

  function showToast(msg) {
    var el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(function () { el.classList.remove("show"); }, 3000);
  }
  function fmt(n) { return window.fmtMoney(n); }
  function fmtPct(n) { return window.fmtPercent(n); }

  function getKey() { return document.getElementById("adminKey").value; }
  function getYm() { return document.getElementById("adminYm").value; }

  function fillYm(sel) {
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

  function fillCorp() {
    var sel = document.getElementById("dCorp");
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
  function fillOffice() {
    var sel = document.getElementById("dOffice");
    var prev = sel.value;
    sel.innerHTML = "";
    var allOpt = document.createElement("option");
    allOpt.value = ""; allOpt.textContent = t("officeAllOption");
    sel.appendChild(allOpt);
    officesForCorp(document.getElementById("dCorp").value).forEach(function (item) {
      var o = document.createElement("option");
      o.value = item.ko; o.textContent = window.officeLabel(item.ko);
      sel.appendChild(o);
    });
    if (prev) sel.value = prev;
  }

  // ===== 전체 법인 비교 =====
  function renderAggTable() {
    var body = document.getElementById("aggBody");
    body.innerHTML = "";
    aggRows.forEach(function (row, i) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + (i + 1) + "</td>" +
        // 법인명은 숫자가 아니라 왼쪽 맞춤(.txt). 나머지 숫자 열은 num-table 기본값(오른쪽).
        "<td class='txt'>" + window.corpLabel(row.corp) + "</td>" +
        "<td>" + fmt(row.revenueCny) + "</td>" +
        "<td class='pct'>" + fmtPct(row.operatingMarginPct) + "</td>" +
        "<td class='pct'>" + fmtPct(row.netMarginPct) + "</td>" +
        "<td class='pct'>" + fmtPct(row.debtRatioPct) + "</td>" +
        "<td class='pct'>" + fmtPct(row.currentRatioPct) + "</td>" +
        "<td class='pct'>" + fmtPct(row.roePct) + "</td>" +
        "<td class='pct'>" + fmtPct(row.roiPct) + "</td>" +
        "<td class='pct'>" + fmtPct(row.equityRatioPct) + "</td>" +
        "<td class='pct'>" + fmtPct(row.achievementPct) + "</td>" +
        "<td class='pct'>" + fmtPct(row.cashChangePct) + "</td>" +
        "<td>" + fmt(row.loanBalanceCny) + "</td>";
      body.appendChild(tr);
    });
  }
  function renderAggChart() {
    var ctx2d = document.getElementById("aggChart").getContext("2d");
    if (aggChart) aggChart.destroy();
    aggChart = new Chart(ctx2d, {
      type: "bar",
      data: {
        labels: aggRows.map(function (r) { return window.corpLabel(r.corp); }),
        datasets: [
          { label: t("colNetMarginPct"), data: aggRows.map(function (r) { return r.netMarginPct; }), backgroundColor: "#1a4d8f" },
          { label: t("colRoe"), data: aggRows.map(function (r) { return r.roePct; }), backgroundColor: "#1e7e34" },
          { label: t("colDebtRatio"), data: aggRows.map(function (r) { return r.debtRatioPct; }), backgroundColor: "#c0392b" }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
  function downloadAgg() {
    if (!aggRows.length) { showToast(t("adminDeleteSelectedNone")); return; }
    var header = [t("rowNumberCol"), t("colCorp"), t("colRevenue"), t("colOperatingMarginPct"), t("colNetMarginPct"),
      t("colDebtRatio"), t("colCurrentRatio"), t("colRoe"), t("colRoi"), t("colEquityRatio"), t("achievementLabel"), t("cashChangePct"), t("totalLoanBalanceCny")];
    var aoa = [header];
    aggRows.forEach(function (row, i) {
      aoa.push([i + 1, window.corpLabel(row.corp), row.revenueCny, row.operatingMarginPct, row.netMarginPct,
        row.debtRatioPct, row.currentRatioPct, row.roePct, row.roiPct, row.equityRatioPct, row.achievementPct, row.cashChangePct, row.loanBalanceCny]);
    });
    // 셀 값은 숫자 그대로 두고 표시 서식만 지정합니다(받는 쪽에서 합계·수식을 쓸 수 있게).
    // 금액은 #,##0_);[빨강](#,##0), 비율은 소수점 2자리.
    var ws = XLSX.utils.aoa_to_sheet(aoa);
    var MONEY_COLS = [2, 12], PCT_COLS = [3, 4, 5, 6, 7, 8, 9, 10, 11];
    for (var r = 1; r < aoa.length; r++) {
      MONEY_COLS.concat(PCT_COLS).forEach(function (c) {
        var cell = ws[XLSX.utils.encode_cell({ c: c, r: r })];
        if (!cell || cell.t !== "n") return;
        cell.z = MONEY_COLS.indexOf(c) !== -1 ? '#,##0_);[Red](#,##0)' : '0.00"%"';
      });
    }
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, getYm());
    window.downloadWorkbook(wb, t("fileNamePrefix") + "_경영지표_" + getYm() + ".xlsx");
  }
  function fetchAgg() {
    var client = window.getSupabaseClient();
    var key = getKey();
    if (!client) { showToast(t("adminFetchFail")); return; }
    if (!key) { showToast(t("adminKeyRequired")); return; }
    client.rpc("get_performance_aggregate", { p_access_key: key, p_yearmonth: getYm() }).then(function (res) {
      if (res.error) throw res.error;
      aggRows = res.data || [];
      renderAggTable();
      renderAggChart();
    }).catch(function () { showToast(t("adminFetchFail")); });
  }

  // ===== 경영지표 드릴다운 (지점 화면과 동일 구성 + 재무비율) =====
  function periodTypeForRpc() { return dPeriod === "year" ? "annual" : dPeriod; }

  function renderDProfit() {
    var rows = window.aggregateFlowSeries(dRawProfitSeries, dPeriod, ["revenueCny", "salesProfitCny", "operatingProfitCny", "netProfitCny"]);
    var body = document.getElementById("dProfitBody");
    body.innerHTML = "";
    rows.forEach(function (row) {
      var opPct = row.revenueCny ? (row.operatingProfitCny / row.revenueCny * 100) : null;
      var netPct = row.revenueCny ? (row.netProfitCny / row.revenueCny * 100) : null;
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + row.yearmonth + "</td>" +
        "<td>" + fmt(row.revenueCny) + "</td>" +
        "<td>" + fmt(row.operatingProfitCny) + "</td>" +
        "<td>" + fmt(row.netProfitCny) + "</td>" +
        "<td class='pct'>" + fmtPct(opPct) + "</td>" +
        "<td class='pct'>" + fmtPct(netPct) + "</td>";
      body.appendChild(tr);
    });
    var ctx2d = document.getElementById("dProfitChart").getContext("2d");
    if (dProfitChart) dProfitChart.destroy();
    dProfitChart = new Chart(ctx2d, {
      type: "line",
      data: {
        labels: rows.map(function (r) { return r.yearmonth; }),
        datasets: [
          { label: t("colRevenue"), data: rows.map(function (r) { return r.revenueCny; }), borderColor: "#1a4d8f", backgroundColor: "transparent" },
          { label: t("colOperatingProfitKr"), data: rows.map(function (r) { return r.operatingProfitCny; }), borderColor: "#1e7e34", backgroundColor: "transparent" },
          { label: t("colNetProfit"), data: rows.map(function (r) { return r.netProfitCny; }), borderColor: "#b8860b", backgroundColor: "transparent" }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: false } } }
    });
    var last = dRawProfitSeries.length ? dRawProfitSeries[dRawProfitSeries.length - 1] : null;
    if (last && last.revenueCny) {
      document.getElementById("dSalesMarginPct").innerHTML = fmtPct(last.salesProfitCny / last.revenueCny * 100);
      document.getElementById("dOperatingMarginPct").innerHTML = fmtPct(last.operatingProfitCny / last.revenueCny * 100);
      document.getElementById("dNetMarginPct").innerHTML = fmtPct(last.netProfitCny / last.revenueCny * 100);
    } else {
      document.getElementById("dSalesMarginPct").textContent = t("noData");
      document.getElementById("dOperatingMarginPct").textContent = t("noData");
      document.getElementById("dNetMarginPct").textContent = t("noData");
    }
  }
  function renderDStability() {
    var rows = window.aggregateStockSeries(dRawStabilitySeries, dPeriod, ["debtRatioPct", "currentRatioPct"]);
    var body = document.getElementById("dStabilityBody");
    body.innerHTML = "";
    rows.forEach(function (row) {
      var tr = document.createElement("tr");
      tr.innerHTML = "<td>" + row.yearmonth + "</td><td class='pct'>" + fmtPct(row.debtRatioPct) + "</td><td class='pct'>" + fmtPct(row.currentRatioPct) + "</td>";
      body.appendChild(tr);
    });
  }
  function renderDRatios(r) {
    document.getElementById("dRoe").innerHTML = fmtPct(r.roePct);
    document.getElementById("dRoi").innerHTML = fmtPct(r.roiPct);
    document.getElementById("dDebtRatio").innerHTML = fmtPct(r.debtRatioPct);
    document.getElementById("dEquityRatio").innerHTML = fmtPct(r.equityRatioPct);
  }
  function renderDBudget(s) {
    document.getElementById("dTargetProfitCny").innerHTML = fmt(s.targetProfitCny);
    document.getElementById("dActualProfitCny").innerHTML = fmt(s.actualProfitCny);
    document.getElementById("dProfitAchievementPct").innerHTML = fmtPct(s.profitAchievementPct);
  }
  function renderDFund(s) {
    document.getElementById("dFundEndingCny").innerHTML = fmt(s.endingCny);
    document.getElementById("dFundPrevEndingCny").innerHTML = fmt(s.prevEndingCny);
    document.getElementById("dFundChangePct").innerHTML = fmtPct(s.cashChangePct);
    document.getElementById("dFundLoanBalance").innerHTML = fmt(s.totalLoanBalanceCny);
    document.getElementById("dFundDividend").innerHTML = fmt(s.dividendAvailableCny);
  }

  function fetchDrilldown() {
    var client = window.getSupabaseClient();
    var key = getKey();
    if (!client) { showToast(t("adminFetchFail")); return; }
    if (!key) { showToast(t("adminKeyRequired")); return; }
    var corp = document.getElementById("dCorp").value;
    var office = document.getElementById("dOffice").value;
    var ym = document.getElementById("dYm").value;
    document.getElementById("dFundCards").style.display = office ? "none" : "";

    client.rpc("get_profitability_series", { p_access_key: key, p_corp: corp, p_yearmonth: ym, p_months_back: 12, p_office: office || null }).then(function (res) {
      if (res.error) throw res.error;
      dRawProfitSeries = res.data || [];
      renderDProfit();
    }).catch(function () { showToast(t("adminFetchFail")); });

    client.rpc("get_stability_series", { p_access_key: key, p_corp: corp, p_yearmonth: ym, p_months_back: 12, p_office: office || null }).then(function (res) {
      if (res.error) throw res.error;
      dRawStabilitySeries = res.data || [];
      renderDStability();
    }).catch(function () { showToast(t("adminFetchFail")); });

    client.rpc("get_budget_variance_summary", { p_access_key: key, p_corp: corp, p_yearmonth: ym, p_office: office || null }).then(function (res) {
      if (res.error) throw res.error;
      renderDBudget(res.data || {});
      lastDrilldown = { corp: corp, office: office, ym: ym, budget: res.data };
    }).catch(function () { showToast(t("adminFetchFail")); });

    client.rpc("get_financial_ratios", { p_access_key: key, p_corp: corp, p_yearmonth: ym }).then(function (res) {
      if (res.error) throw res.error;
      renderDRatios(res.data || {});
      if (lastDrilldown) lastDrilldown.ratios = res.data;
    }).catch(function () { showToast(t("adminFetchFail")); });

    if (!office) {
      client.rpc("get_fund_risk_summary", { p_access_key: key, p_corp: corp, p_yearmonth: ym }).then(function (res) {
        if (res.error) throw res.error;
        renderDFund(res.data || {});
        if (lastDrilldown) lastDrilldown.fund = res.data;
      }).catch(function () { showToast(t("adminFetchFail")); });
    }
  }

  function bindPeriodToggle() {
    document.getElementById("dPeriodToggle").addEventListener("click", function (e) {
      var btn = e.target.closest(".period-btn");
      if (!btn) return;
      document.querySelectorAll("#dPeriodToggle .period-btn").forEach(function (b) { b.classList.remove("period-active"); });
      btn.classList.add("period-active");
      dPeriod = btn.dataset.period;
      renderDProfit();
      renderDStability();
    });
  }

  // ===== 1페이지 워드 보고서 (HTML을 .doc로 저장하는 방식 - 별도 vendor 라이브러리 불필요) =====
  function downloadWordReport() {
    if (!lastDrilldown) { showToast(t("adminDeleteSelectedNone")); return; }
    var d = lastDrilldown;
    var last = dRawProfitSeries.length ? dRawProfitSeries[dRawProfitSeries.length - 1] : {};
    var stab = dRawStabilitySeries.length ? dRawStabilitySeries[dRawStabilitySeries.length - 1] : {};
    var ratios = d.ratios || {};
    var budget = d.budget || {};
    var fund = d.fund || {};
    var rows = [
      [t("corp"), window.corpLabel(d.corp)],
      [t("office"), d.office ? window.officeLabel(d.office) : t("officeAllOption")],
      [t("yearmonth"), d.ym],
      [t("colRevenue"), fmt(last.revenueCny)],
      [t("colOperatingProfitKr"), fmt(last.operatingProfitCny)],
      [t("colNetProfit"), fmt(last.netProfitCny)],
      [t("colOperatingMarginPct"), fmtPct(last.revenueCny ? last.operatingProfitCny / last.revenueCny * 100 : null)],
      [t("colNetMarginPct"), fmtPct(last.revenueCny ? last.netProfitCny / last.revenueCny * 100 : null)],
      [t("colDebtRatio"), fmtPct(stab.debtRatioPct)],
      [t("colCurrentRatio"), fmtPct(stab.currentRatioPct)],
      [t("colRoe"), fmtPct(ratios.roePct)],
      [t("colRoi"), fmtPct(ratios.roiPct)],
      [t("colEquityRatio"), fmtPct(ratios.equityRatioPct)],
      [t("achievementLabel") + " (" + t("targetProfitLabel") + ")", fmtPct(budget.profitAchievementPct)]
    ];
    if (!d.office) {
      rows.push([t("cashChangePct"), fmtPct(fund.cashChangePct)]);
      rows.push([t("totalLoanBalanceCny"), fmt(fund.totalLoanBalanceCny)]);
      rows.push([t("dividendAvailableCny"), fmt(fund.dividendAvailableCny)]);
    }
    var bodyRows = rows.map(function (r) {
      return "<tr><td style='padding:6px 10px;border:1px solid #999;font-weight:bold;background:#f2f2f2;'>" + r[0] + "</td>" +
        "<td style='padding:6px 10px;border:1px solid #999;text-align:right;'>" + r[1] + "</td></tr>";
    }).join("");
    var html =
      "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>" +
      "<head><meta charset='UTF-8'><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->" +
      "<style>body{font-family:'Malgun Gothic',sans-serif;} table{border-collapse:collapse;width:100%;} .neg{color:#FF0000;}</style></head>" +
      "<body><h2>" + t("wordReportTitle") + "</h2>" +
      "<p>" + window.corpLabel(d.corp) + " · " + (d.office ? window.officeLabel(d.office) : t("officeAllOption")) + " · " + d.ym + "</p>" +
      "<table>" + bodyRows + "</table></body></html>";
    var blob = new Blob(["﻿" + html], { type: "application/msword" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = t("fileNamePrefix") + "_경영지표보고서_" + d.ym + ".doc";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  document.addEventListener("DOMContentLoaded", function () {
    fillYm(document.getElementById("adminYm"));
    fillYm(document.getElementById("dYm"));
    fillCorp();
    fillOffice();
    bindPeriodToggle();
    document.addEventListener("langchange", function () {
      fillCorp(); fillOffice();
      if (aggRows.length) { renderAggTable(); renderAggChart(); }
      if (dRawProfitSeries.length) renderDProfit();
      if (dRawStabilitySeries.length) renderDStability();
    });
    document.getElementById("fetchBtn").addEventListener("click", fetchAgg);
    document.getElementById("downloadBtn").addEventListener("click", downloadAgg);
    document.getElementById("dCorp").addEventListener("change", fillOffice);
    document.getElementById("dFetchBtn").addEventListener("click", fetchDrilldown);
    document.getElementById("wordBtn").addEventListener("click", downloadWordReport);
  });
})();
