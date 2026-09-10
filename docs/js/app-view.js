(function () {
  var ctx = window.loadContext();
  if (!ctx) {
    window.location.href = "index.html";
    return;
  }

  var currentPeriod = "month";
  var currentOffice = ctx.office || "";
  var rawProfitSeries = [];
  var rawStabilitySeries = [];
  var lastTargetPerf = null;
  var profitChart = null;

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

  function renderContextBar() {
    var el = document.getElementById("contextBar");
    var officePart = ctx.office
      ? "<span><b>" + t("office") + "</b>: " + window.officeLabel(ctx.office) + "</span>"
      : "";
    el.innerHTML =
      "<span><b>" + t("corp") + "</b>: " + window.corpLabel(ctx.corp) + "</span>" +
      officePart +
      "<span><b>" + t("yearmonth") + "</b>: <select id='ymSwitch'></select></span>";
    var sel = document.getElementById("ymSwitch");
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

  // office_scope가 있는 접근키(예: 상해지점 전용 키)는 타 지점을 선택할 수 없도록 드롭다운을
  // 감추고 고정 지점명만 표시합니다.
  function renderOfficeSelect() {
    var wrap = document.getElementById("officeSelectWrap");
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

  function applyFundVisibility() {
    document.getElementById("fundCard").style.display = currentOffice ? "none" : "block";
  }

  function renderProfit() {
    var rows = window.aggregateFlowSeries(rawProfitSeries, currentPeriod, ["revenueCny", "salesProfitCny", "operatingProfitCny", "netProfitCny"]);
    var body = document.getElementById("profitBody");
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
        "<td>" + fmtPct(opPct) + "</td>" +
        "<td>" + fmtPct(netPct) + "</td>";
      body.appendChild(tr);
    });

    var ctx2d = document.getElementById("profitChart").getContext("2d");
    if (profitChart) profitChart.destroy();
    profitChart = new Chart(ctx2d, {
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

    renderMarginCards();
  }

  // "실적 지표" 카드의 매출이익률/영업이익률/당기순이익률: 선택된 적용년월(가장 최근 달) 기준.
  function renderMarginCards() {
    var last = rawProfitSeries.length ? rawProfitSeries[rawProfitSeries.length - 1] : null;
    if (!last || !last.revenueCny) {
      document.getElementById("salesMarginPct").textContent = t("noData");
      document.getElementById("operatingMarginPct").textContent = t("noData");
      document.getElementById("netMarginPct").textContent = t("noData");
      return;
    }
    document.getElementById("salesMarginPct").textContent = fmtPct(last.salesProfitCny / last.revenueCny * 100);
    document.getElementById("operatingMarginPct").textContent = fmtPct(last.operatingProfitCny / last.revenueCny * 100);
    document.getElementById("netMarginPct").textContent = fmtPct(last.netProfitCny / last.revenueCny * 100);
  }

  function renderStability() {
    var rows = window.aggregateStockSeries(rawStabilitySeries, currentPeriod, ["debtRatioPct", "currentRatioPct"]);
    var body = document.getElementById("stabilityBody");
    body.innerHTML = "";
    rows.forEach(function (row) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + row.yearmonth + "</td>" +
        "<td>" + fmtPct(row.debtRatioPct) + "</td>" +
        "<td>" + fmtPct(row.currentRatioPct) + "</td>";
      body.appendChild(tr);
    });
  }

  function renderBudget(summary) {
    document.getElementById("targetProfitCny").textContent = fmt(summary.targetProfitCny);
    document.getElementById("actualProfitCny").textContent = fmt(summary.actualProfitCny);
    document.getElementById("profitAchievementPct").textContent = fmtPct(summary.profitAchievementPct);
    document.getElementById("gaBudgetCny").textContent = fmt(summary.gaBudgetCny);
    document.getElementById("gaActualCny").textContent = fmt(summary.gaActualCny);
    document.getElementById("gaAchievementPct").textContent = fmtPct(summary.gaAchievementPct);
  }

  function targetPerfRow(row, isTotal) {
    var target = Number(row.targetOperatingProfitCny) || 0;
    var actual = Number(row.operatingProfitCny) || 0;
    var over = actual - target;
    var achievePct = target ? (actual / target * 100) : null;
    var headcount = row.headcount != null ? Number(row.headcount) : null;
    var productivity = headcount ? (actual / headcount) : null;
    var tr = document.createElement("tr");
    if (isTotal) tr.className = "subtotal-row";
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
    return tr;
  }

  function periodTypeForRpc() {
    if (currentPeriod === "year") return "annual";
    return currentPeriod; // "month" | "quarter"
  }

  function renderTargetPerfPeriodLabel() {
    var month = Number(ctx.yearmonth.slice(5, 7));
    var year = ctx.yearmonth.slice(0, 4);
    var label;
    if (currentPeriod === "month") label = t("periodTargetMonthly", { year: year, month: month });
    else if (currentPeriod === "quarter") label = t("periodTargetQuarterly", { year: year, month: month });
    else label = t("periodTargetAnnual", { year: year, month: month });
    document.getElementById("targetPerfPeriodLabel").textContent = label;
  }

  function renderTargetPerf(data) {
    lastTargetPerf = data;
    renderTargetPerfPeriodLabel();
    var body = document.getElementById("targetPerfBody");
    body.innerHTML = "";
    var periods = (data && data.periods) || [];
    if (!periods.length) {
      var tr = document.createElement("tr");
      tr.innerHTML = "<td colspan='14' style='color:var(--muted);'>" + t("noData") + "</td>";
      body.appendChild(tr);
      return;
    }
    periods.forEach(function (row, i) {
      body.appendChild(targetPerfRow(row, i === periods.length - 1));
    });
  }

  function renderFund(summary) {
    document.getElementById("fundEndingCny").textContent = fmt(summary.endingCny);
    document.getElementById("fundPrevEndingCny").textContent = fmt(summary.prevEndingCny);
    document.getElementById("fundChangePct").textContent = fmtPct(summary.cashChangePct);
    document.getElementById("fundLoanBalance").textContent = fmt(summary.totalLoanBalanceCny);
    document.getElementById("fundDividend").textContent = fmt(summary.dividendAvailableCny);
  }

  function bindPeriodToggle() {
    document.getElementById("periodToggle").addEventListener("click", function (e) {
      var btn = e.target.closest(".period-btn");
      if (!btn) return;
      document.querySelectorAll(".period-btn").forEach(function (b) { b.classList.remove("period-active"); });
      btn.classList.add("period-active");
      currentPeriod = btn.dataset.period;
      renderProfit();
      renderStability();
      loadTargetPerf();
    });
  }

  function bindOfficeSelect() {
    document.getElementById("officeSelect").addEventListener("change", function (e) {
      currentOffice = e.target.value;
      applyFundVisibility();
      loadOfficeScopedData();
      loadTargetPerf();
    });
  }

  function loadOfficeScopedData() {
    var client = window.getSupabaseClient();
    if (!client) { showToast(t("fetchFail")); return; }

    client.rpc("get_profitability_series", { p_access_key: ctx.accessKey, p_corp: ctx.corp, p_yearmonth: ctx.yearmonth, p_months_back: 12, p_office: currentOffice || null }).then(function (res) {
      if (res.error) throw res.error;
      rawProfitSeries = res.data || [];
      renderProfit();
    }).catch(function () { showToast(t("fetchFail")); });

    client.rpc("get_stability_series", { p_access_key: ctx.accessKey, p_corp: ctx.corp, p_yearmonth: ctx.yearmonth, p_months_back: 12, p_office: currentOffice || null }).then(function (res) {
      if (res.error) throw res.error;
      rawStabilitySeries = res.data || [];
      renderStability();
    }).catch(function () { showToast(t("fetchFail")); });

    client.rpc("get_budget_variance_summary", { p_access_key: ctx.accessKey, p_corp: ctx.corp, p_yearmonth: ctx.yearmonth, p_office: currentOffice || null }).then(function (res) {
      if (res.error) throw res.error;
      renderBudget(res.data);
    }).catch(function () { showToast(t("fetchFail")); });

    if (!currentOffice) {
      client.rpc("get_fund_risk_summary", { p_access_key: ctx.accessKey, p_corp: ctx.corp, p_yearmonth: ctx.yearmonth }).then(function (res) {
        if (res.error) throw res.error;
        renderFund(res.data);
      }).catch(function () { showToast(t("fetchFail")); });
    }
  }

  function loadTargetPerf() {
    var client = window.getSupabaseClient();
    if (!client) return;
    var year = ctx.yearmonth.slice(0, 4);
    var month = ctx.yearmonth.slice(5, 7);
    client.rpc("get_target_performance_series", {
      p_access_key: ctx.accessKey, p_corp: ctx.corp, p_office: currentOffice || null,
      p_year: year, p_end_month: month, p_period_type: periodTypeForRpc()
    }).then(function (res) {
      if (res.error) throw res.error;
      renderTargetPerf(res.data || {});
    }).catch(function () { showToast(t("fetchFail")); });
  }

  function loadAll() {
    var client = window.getSupabaseClient();
    if (!client) {
      showToast(t("fetchFail"));
      return;
    }
    renderContextBar();
    renderOfficeSelect();
    applyFundVisibility();
    loadOfficeScopedData();
    loadTargetPerf();
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindPeriodToggle();
    bindOfficeSelect();
    loadAll();
    document.addEventListener("langchange", function () {
      renderContextBar();
      renderOfficeSelect();
      renderProfit();
      renderStability();
      if (lastTargetPerf) renderTargetPerf(lastTargetPerf);
    });
  });
})();
