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
    document.addEventListener("langchange", function () { fillYm(); renderTable(); if (aggRows.length) renderChart(); });
    document.getElementById("fetchBtn").addEventListener("click", fetchData);
    document.getElementById("downloadBtn").addEventListener("click", downloadAgg);
  });
})();
