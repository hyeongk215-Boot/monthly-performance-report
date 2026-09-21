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
  // 법인/지점은 이 화면에서만 바꿉니다. ctx.corp(로그인 컨텍스트)는 다른 화면과 공유하므로
  // 여기서 법인을 바꿔도 「실적 개요」가 따라 바뀌지는 않습니다.
  var currentCorp = ctx.branchScope || ctx.corp;
  var currentOffice = ctx.officeScope || "";
  var waterfallChart = null;
  var gaBarChart = null;
  var gaDonutChart = null;
  var stabilityChart = null;
  var lastGaRows = null;
  var lastBucket = null;
  var lastPrevBucket = null;
  var rawStabilitySeries = [];

  function showToast(msg) {
    var el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(function () { el.classList.remove("show"); }, 3000);
  }

  function fmt(n) { return window.fmtMoney(n); }
  function fmtPct(n) { return window.fmtPercent(n); }
  // ECharts는 HTML 태그를 해석하지 않으므로 차트 라벨/툴팁에는 태그 없는 값을 씁니다.
  function fmtChart(n) { return window.fmtMoneyPlain(n); }
  function fmtWan(n) {
    if (n === null || n === undefined) return t("noData");
    return (Number(n) / 10000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " 万元";
  }
  function categoryLabel(cat) {
    return t(CATEGORY_I18N_KEY[cat] || cat);
  }

  // ===== 테마 =====
  // 다크/라이트 전환과 토글 버튼은 common.js가 다른 화면과 똑같이 처리합니다. 여기서는 전환
  // 이벤트를 받아 ECharts 색만 다시 칠합니다(차트는 CSS 변수를 자동으로 따르지 않기 때문).
  function themeVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function chartColors() {
    return {
      accent: themeVar("--primary"),
      danger: themeVar("--danger"),
      ok: themeVar("--ok"),
      budget: window.isDarkTheme() ? "#3b4463" : "#c7d2fe",
      axis: themeVar("--muted"),
      border: themeVar("--border"),
      text: themeVar("--text"),
      surface: themeVar("--card")
    };
  }

  // ===== 필터 바 =====
  function renderCorpSelect() {
    var sel = document.getElementById("corpSelect");
    // 관리자/본사 회계 키는 보통 branch_scope가 없어서 6개 법인이 모두 나옵니다. 혹시 법인이
    // 묶인 키라면 그 법인만 남기고 잠급니다(서버도 branch_scope를 우선 적용합니다).
    var locked = ctx.branchScope || "";
    var list = window.APP_CONFIG.CORPORATIONS.filter(function (c) {
      return !locked || c.ko === locked;
    });
    if (!list.length) list = window.APP_CONFIG.CORPORATIONS;

    var stillValid = list.filter(function (c) { return c.ko === currentCorp; }).length > 0;
    if (!stillValid) currentCorp = list[0].ko;

    sel.innerHTML = "";
    list.forEach(function (item) {
      var o = document.createElement("option");
      o.value = item.ko; o.textContent = window.corpLabel(item.ko);
      sel.appendChild(o);
    });
    sel.value = currentCorp;
    sel.disabled = !!locked;
  }

  function renderContextBar() {
    renderCorpSelect();
    var sel = document.getElementById("ymSwitch");
    if (!sel.options.length) {
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
  }

  function officesForCorp(corp) {
    var codes = (window.APP_CONFIG.CORP_OFFICES && window.APP_CONFIG.CORP_OFFICES[corp]) || [];
    return window.APP_CONFIG.OFFICES.filter(function (o) { return codes.indexOf(o.ko) !== -1; });
  }

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
    officesForCorp(currentCorp).forEach(function (item) {
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
      revBadge.textContent = t("vsPrevPeriod", { pct: (chg >= 0 ? "+" : "") + chg.toFixed(2) + "%" });
      revBadge.className = "ins-badge " + (chg >= 0 ? "success" : "danger");
    } else {
      revBadge.textContent = t("noData");
      revBadge.className = "ins-badge neutral";
    }

    var opBadge = document.getElementById("statOperatingMarginBadge");
    var opMarginPct = revenue ? (operatingProfit / revenue * 100) : null;
    opBadge.innerHTML = t("colOperatingMarginPct") + " " + fmtPct(opMarginPct);
    opBadge.className = "ins-badge " + (opMarginPct !== null && opMarginPct >= 0 ? "success" : "danger");

    // 예산이나 실적이 미입력(null)이면 집행률은 계산하지 않고 「미입력」으로 둡니다.
    // 미입력을 0으로 치면 집행률 0% 또는 ∞가 나와 실제 절감/초과와 섞여버립니다.
    var budgetTotal = gaTotals ? gaTotals.budget : null;
    var actualTotal = gaTotals ? gaTotals.actual : null;
    var execEl = document.getElementById("statGaExecPct");
    var bar = document.getElementById("statGaExecBar");
    var execPct = null;

    if (budgetTotal === null || actualTotal === null) {
      execEl.textContent = t("notEntered");
    } else if (budgetTotal === 0) {
      execEl.textContent = t("noData");
    } else {
      execPct = actualTotal / budgetTotal * 100;
      execEl.innerHTML = fmtPct(execPct);
    }
    bar.style.width = (execPct === null ? 0 : Math.min(execPct, 100)) + "%";
    bar.style.background = (execPct !== null && execPct > 100) ? themeVar("--danger") : themeVar("--ok");
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

    var c = chartColors();
    var categories = [t("wfRevenue"), t("wfCost"), t("wfSalesProfit"), t("wfGaExpense"), t("wfOperatingProfit")];
    var base = [0, revenue - cost, 0, salesProfit - ga, 0];
    var value = [revenue, cost, salesProfit, ga, operatingProfit];
    var colors = [c.accent, c.danger, c.ok, c.danger, c.ok];

    waterfallChart.setOption({
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      grid: { left: 64, right: 20, top: 20, bottom: 30 },
      xAxis: { type: "category", data: categories, axisLine: { lineStyle: { color: c.border } }, axisLabel: { color: c.axis } },
      yAxis: { type: "value", axisLine: { show: false }, axisLabel: { color: c.axis }, splitLine: { lineStyle: { color: c.border } } },
      series: [
        { type: "bar", stack: "wf", itemStyle: { color: "transparent" }, silent: true, data: base },
        {
          type: "bar", stack: "wf", barWidth: "55%",
          label: { show: true, position: "top", color: c.text, formatter: function (p) { return fmtChart(value[p.dataIndex]); } },
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
      p_access_key: ctx.accessKey, p_corp: currentCorp, p_office: currentOffice || null,
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
  // ⚠ 0원과 미입력의 구분: 서버가 합계 없는 항목을 null로 내려줍니다. 0은 "0원으로 입력됨",
  // null은 "아예 입력 안 됨"이라 화면 표시도 합계 계산도 다르게 다룹니다.
  function gaValue(rows, cat, key) {
    var row = rows && rows[cat];
    if (!row) return null;                      // 카테고리 행 자체가 없음
    var v = row[key];
    if (v === null || v === undefined) return null;  // 해당 kind(예산/실적) 행이 없음
    return Number(v);
  }

  // 집행률(실적/예산)은 예산과 실적이 "둘 다" 입력된 항목만 더해서 계산합니다.
  // 한쪽만 있는 항목을 각자 더하면 분모와 분자의 항목 구성이 달라져서
  // (예: 예산만 있는 출장비가 분모에만 반영) 집행률이 실제보다 낮게 나옵니다.
  function lastGaTotals() {
    if (!lastGaRows) return null;
    var budget = null, actual = null;
    CATEGORY_ORDER.forEach(function (cat) {
      var b = gaValue(lastGaRows, cat, "budgetCny");
      var a = gaValue(lastGaRows, cat, "actualCny");
      if (b === null || a === null) return;
      budget = (budget || 0) + b;
      actual = (actual || 0) + a;
    });
    return { budget: budget, actual: actual };
  }

  function renderGaTable(rows) {
    var body = document.getElementById("gaBody");
    body.innerHTML = "";
    var anyMissing = false;   // 예산/실적 중 하나라도 비어 있는 항목이 있는가
    var anyPresent = false;   // 값이 하나라도 들어온 항목이 있는가

    CATEGORY_ORDER.forEach(function (cat) {
      var budget = gaValue(rows, cat, "budgetCny");
      var actual = gaValue(rows, cat, "actualCny");
      if (budget === null || actual === null) anyMissing = true;
      if (budget !== null || actual !== null) anyPresent = true;

      var varianceCell;
      if (budget === null || actual === null) {
        // 한쪽이라도 미입력이면 증감률은 의미가 없습니다(0으로 계산하면 -100% 같은 거짓 신호).
        varianceCell = "<span class='ins-badge neutral'>" + t("notEntered") + "</span>";
      } else if (budget === 0) {
        varianceCell = "<span class='ins-badge neutral'>" + t("noData") + "</span>";
      } else {
        var pct = (actual - budget) / budget * 100;
        varianceCell = "<span class='ins-badge " + (pct > 0 ? "danger" : "success") + "'>" +
          (pct > 0 ? "+" : "") + pct.toFixed(2) + "%</span>";
      }

      var tr = document.createElement("tr");
      if (budget === null && actual === null) tr.className = "ins-row-missing";
      tr.innerHTML =
        "<td>" + categoryLabel(cat) + "</td>" +
        "<td>" + gaCell(budget) + "</td>" +
        "<td>" + gaCell(actual) + "</td>" +
        "<td class='pct'>" + varianceCell + "</td>";
      body.appendChild(tr);
    });

    var note = document.getElementById("gaEmptyNote");
    if (!anyPresent) {
      note.style.display = "";
      note.textContent = t("gaAllEmptyNote");
    } else if (anyMissing) {
      note.style.display = "";
      note.textContent = t("gaPartialNote");
    } else {
      note.style.display = "none";
    }
  }

  function gaCell(v) {
    return v === null
      ? "<span class='ins-missing'>" + t("notEntered") + "</span>"
      : fmt(v);
  }

  function renderGaCharts(rows) {
    var c = chartColors();
    var categories = CATEGORY_ORDER.map(categoryLabel);
    // 미입력은 null로 넘겨서 막대를 아예 그리지 않습니다(0으로 넘기면 "0원 입력"처럼 보입니다).
    var budgetData = CATEGORY_ORDER.map(function (cat) { return gaValue(rows, cat, "budgetCny"); });
    var actualData = CATEGORY_ORDER.map(function (cat) { return gaValue(rows, cat, "actualCny"); });

    var barEl = document.getElementById("gaBarWrap");
    if (!gaBarChart) gaBarChart = echarts.init(barEl);
    gaBarChart.setOption({
      tooltip: {
        trigger: "axis", axisPointer: { type: "shadow" },
        valueFormatter: function (v) { return (v === null || v === undefined) ? t("notEntered") : fmtChart(v); }
      },
      legend: { data: [t("colBudget"), t("colActual")], top: 0, textStyle: { color: c.axis, fontSize: 11 } },
      grid: { left: 90, right: 20, top: 34, bottom: 20 },
      xAxis: {
        type: "value", axisLine: { show: false }, splitLine: { lineStyle: { color: c.border } },
        axisLabel: { color: c.axis, fontSize: 10, formatter: function (v) { return (v / 10000).toLocaleString(undefined, { maximumFractionDigits: 0 }) + "万"; } }
      },
      yAxis: { type: "category", data: categories, axisLine: { lineStyle: { color: c.border } }, axisLabel: { color: c.axis, fontSize: 11 } },
      series: [
        { name: t("colBudget"), type: "bar", data: budgetData, itemStyle: { color: c.budget } },
        { name: t("colActual"), type: "bar", data: actualData, itemStyle: { color: c.accent } }
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
        itemStyle: { borderColor: c.surface, borderWidth: 2 },
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
      p_access_key: ctx.accessKey, p_corp: currentCorp, p_office: currentOffice || null,
      p_start_ym: range.start, p_end_ym: range.end
    }).then(function (res) {
      if (res.error) throw res.error;
      var rows = {};
      (res.data || []).forEach(function (r) { rows[r.category] = r; });
      lastGaRows = rows;
      renderGaTable(rows);
      renderGaCharts(rows);
      renderStatCards(lastBucket, lastPrevBucket, lastGaTotals());
    }).catch(function (err) {
      // 서버도 역할을 다시 검사합니다. 지점 키로 주소를 직접 열면 여기로 떨어집니다.
      if (err && String(err.message || "").indexOf("forbidden_role") !== -1) {
        showAccessDenied();
        return;
      }
      showToast(t("fetchFail"));
    });
  }

  // ===== 재무안정성 추이 (위험 임계 밴드) =====
  // 부채비율/유동비율은 저량지표이므로 aggregateStockSeries로 기간말 값만 사용합니다.
  function renderStability() {
    var el = document.getElementById("stabilityWrap");
    if (!stabilityChart) stabilityChart = echarts.init(el);

    var rows = window.aggregateStockSeries(rawStabilitySeries, currentPeriod, ["debtRatioPct", "currentRatioPct"]);
    if (!rows.length) {
      stabilityChart.clear();
      return;
    }

    var c = chartColors();
    var labels = rows.map(function (r) { return r.yearmonth; });
    var debtData = rows.map(function (r) { return r.debtRatioPct === null || r.debtRatioPct === undefined ? null : Number(r.debtRatioPct); });
    var currentData = rows.map(function (r) { return r.currentRatioPct === null || r.currentRatioPct === undefined ? null : Number(r.currentRatioPct); });

    stabilityChart.setOption({
      tooltip: { trigger: "axis", valueFormatter: function (v) { return v === null ? t("noData") : Number(v).toFixed(2) + "%"; } },
      legend: { data: [t("colDebtRatio"), t("colCurrentRatio")], top: 0, textStyle: { color: c.axis, fontSize: 11 } },
      grid: { left: 56, right: 24, top: 34, bottom: 24 },
      xAxis: { type: "category", data: labels, axisLine: { lineStyle: { color: c.border } }, axisLabel: { color: c.axis, fontSize: 10 }, axisTick: { show: false } },
      yAxis: {
        type: "value", axisLine: { show: false }, splitLine: { lineStyle: { color: c.border, type: "dashed" } },
        axisLabel: { color: c.axis, fontSize: 10, formatter: "{value}%" }
      },
      series: [
        {
          name: t("colDebtRatio"), type: "line", smooth: true, symbolSize: 5, connectNulls: false,
          data: debtData, itemStyle: { color: c.danger }, lineStyle: { width: 2 },
          markArea: {
            silent: true, itemStyle: { color: "rgba(220, 38, 38, 0.10)" },
            data: [[{ yAxis: 200 }, { yAxis: "max" }]]
          },
          markLine: {
            silent: true, symbol: "none",
            label: { formatter: t("debtRiskLine"), color: c.axis, fontSize: 10, position: "insideEndTop" },
            lineStyle: { color: c.danger, type: "dashed" },
            data: [{ yAxis: 200 }]
          }
        },
        {
          name: t("colCurrentRatio"), type: "line", smooth: true, symbolSize: 5, connectNulls: false,
          data: currentData, itemStyle: { color: c.accent }, lineStyle: { width: 2 },
          markLine: {
            silent: true, symbol: "none",
            label: { formatter: t("currentSafeLine"), color: c.axis, fontSize: 10, position: "insideEndBottom" },
            lineStyle: { color: c.accent, type: "dashed" },
            data: [{ yAxis: 100 }]
          }
        }
      ]
    }, true);
  }

  function loadStability() {
    var client = window.getSupabaseClient();
    if (!client) { showToast(t("fetchFail")); return; }
    client.rpc("get_stability_series", {
      p_access_key: ctx.accessKey, p_corp: currentCorp, p_yearmonth: ctx.yearmonth,
      p_months_back: 12, p_office: currentOffice || null
    }).then(function (res) {
      if (res.error) throw res.error;
      rawStabilitySeries = res.data || [];
      renderStability();
    }).catch(function () { showToast(t("fetchFail")); });
  }

  // ===== 필터/토글 바인딩 =====
  function bindPeriodToggle() {
    document.getElementById("periodToggle").addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (!btn) return;
      document.querySelectorAll("#periodToggle .period-btn").forEach(function (b) { b.classList.remove("period-active"); });
      btn.classList.add("period-active");
      currentPeriod = btn.dataset.period;
      loadWaterfall();
      loadGaBreakdown();
      renderStability(); // 저량지표라 재조회 없이 기간 재집계만 하면 됩니다.
    });
  }

  function bindCorpSelect() {
    document.getElementById("corpSelect").addEventListener("change", function (e) {
      currentCorp = e.target.value;
      // 법인이 바뀌면 이전 법인의 지점이 그대로 남으면 안 되므로 "전체"로 되돌립니다.
      currentOffice = "";
      renderOfficeSelect();
      loadWaterfall();
      loadGaBreakdown();
      loadStability();
    });
  }

  function bindOfficeSelect() {
    document.getElementById("officeSelect").addEventListener("change", function (e) {
      currentOffice = e.target.value;
      loadWaterfall();
      loadGaBreakdown();
      loadStability();
    });
  }

  function resizeCharts() {
    if (waterfallChart) waterfallChart.resize();
    if (gaBarChart) gaBarChart.resize();
    if (gaDonutChart) gaDonutChart.resize();
    if (stabilityChart) stabilityChart.resize();
  }

  function redrawCharts() {
    if (lastBucket) renderWaterfall(lastBucket, lastPrevBucket);
    if (lastGaRows) renderGaCharts(lastGaRows);
    renderStability();
  }

  // ===== PDF / PPT 내보내기 (화면에 보이는 색상을 그대로 캡처) =====
  function captureContent() {
    var el = document.getElementById("captureArea");
    return html2canvas(el, { backgroundColor: themeVar("--bg"), scale: 2, useCORS: true });
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

  // ===== 열람 권한 =====
  function showAccessDenied() {
    document.getElementById("insightsRoot").style.display = "none";
    document.getElementById("denyCard").style.display = "";
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
    loadStability();
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("denyBackBtn").addEventListener("click", function () {
      window.location.href = "view.html";
    });

    // 관리자(system_admin)·본사 회계(finance)가 아니면 여기서 끝냅니다. RPC도 호출하지 않습니다.
    if (!window.canViewInsights(ctx)) {
      showAccessDenied();
      return;
    }

    bindPeriodToggle();
    bindCorpSelect();
    bindOfficeSelect();
    bindExportButtons();
    window.addEventListener("resize", resizeCharts);
    document.addEventListener("themechange", redrawCharts);
    loadAll();
    document.addEventListener("langchange", function () {
      renderContextBar();
      renderOfficeSelect();
      loadWaterfall();
      if (lastGaRows) { renderGaTable(lastGaRows); renderGaCharts(lastGaRows); }
      renderStability();
    });
  });
})();
