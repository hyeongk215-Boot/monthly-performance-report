(function () {
  var ctx = window.loadContext();
  if (!ctx) {
    window.location.href = "index.html";
    return;
  }

  var currentPeriod = "month";
  var rawProfitSeries = [];
  var rawStabilitySeries = [];
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
    el.innerHTML =
      "<span><b>" + t("corp") + "</b>: " + window.corpLabel(ctx.corp) + "</span>" +
      "<span><b>" + t("yearmonth") + "</b>: " + ctx.yearmonth + "</span>";
  }

  function renderProfit() {
    var rows = window.aggregateFlowSeries(rawProfitSeries, currentPeriod, ["revenueCny", "operatingProfitCny", "netProfitCny"]);
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
          { label: t("colOperatingProfit"), data: rows.map(function (r) { return r.operatingProfitCny; }), borderColor: "#1e7e34", backgroundColor: "transparent" },
          { label: t("colNetProfit"), data: rows.map(function (r) { return r.netProfitCny; }), borderColor: "#b8860b", backgroundColor: "transparent" }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: false } } }
    });
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
    document.getElementById("totalBudgetCny").textContent = fmt(summary.totalBudgetCny);
    document.getElementById("totalActualCny").textContent = fmt(summary.totalActualCny);
    document.getElementById("achievementPct").textContent = fmtPct(summary.achievementPct);
    var body = document.getElementById("overBody");
    body.innerHTML = "";
    var over = summary.overAccounts || [];
    if (!over.length) {
      var tr = document.createElement("tr");
      tr.innerHTML = "<td colspan='3' style='color:var(--muted);'>" + t("noOverAccounts") + "</td>";
      body.appendChild(tr);
      return;
    }
    over.forEach(function (a) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td style='text-align:left;'>" + (getLang() === "zh" ? a.nameZh : a.nameKo) + "</td>" +
        "<td>" + fmt(a.budgetCny) + "</td>" +
        "<td>" + fmt(a.actualCny) + "</td>";
      body.appendChild(tr);
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
    });
  }

  function loadAll() {
    var client = window.getSupabaseClient();
    if (!client) {
      showToast(t("fetchFail"));
      return;
    }
    renderContextBar();

    client.rpc("get_profitability_series", { p_access_key: ctx.accessKey, p_corp: ctx.corp, p_yearmonth: ctx.yearmonth, p_months_back: 12 }).then(function (res) {
      if (res.error) throw res.error;
      rawProfitSeries = res.data || [];
      renderProfit();
    }).catch(function () { showToast(t("fetchFail")); });

    client.rpc("get_stability_series", { p_access_key: ctx.accessKey, p_corp: ctx.corp, p_yearmonth: ctx.yearmonth, p_months_back: 12 }).then(function (res) {
      if (res.error) throw res.error;
      rawStabilitySeries = res.data || [];
      renderStability();
    }).catch(function () { showToast(t("fetchFail")); });

    client.rpc("get_budget_variance_summary", { p_access_key: ctx.accessKey, p_corp: ctx.corp, p_yearmonth: ctx.yearmonth }).then(function (res) {
      if (res.error) throw res.error;
      renderBudget(res.data);
    }).catch(function () { showToast(t("fetchFail")); });

    client.rpc("get_fund_risk_summary", { p_access_key: ctx.accessKey, p_corp: ctx.corp, p_yearmonth: ctx.yearmonth }).then(function (res) {
      if (res.error) throw res.error;
      renderFund(res.data);
    }).catch(function () { showToast(t("fetchFail")); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindPeriodToggle();
    loadAll();
    document.addEventListener("langchange", function () {
      renderContextBar();
      renderProfit();
      renderStability();
    });
  });
})();
