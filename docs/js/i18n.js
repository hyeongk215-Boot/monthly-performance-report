window.I18N = {
  ko: {
    appTitle: "실적분석 - 중국법인 재무실적 종합 분석 시스템",
    langName: "한국어",
    navAdmin: "본사용: 관리자 화면",
    backBtn: "← 뒤로",

    indexHeading: "실적분석 조회",
    indexDesc: "법인/적용년도월과 접근키를 입력하면 수익성·재무안정성·예산대비실적·자금위험을 종합해서 볼 수 있습니다.",
    corp: "법인",
    yearmonth: "적용년도월",
    accessKeyLabel: "접근키",
    selectPlaceholder: "선택하세요",
    startBtn: "조회하기",
    requiredWarning: "법인, 적용년도월, 접근키를 모두 입력해주세요.",
    invalidKey: "접근키가 올바르지 않습니다. 본사 담당자에게 확인해주세요.",
    keyMismatchBranch: "이 접근키는 {branch} 전용입니다. 법인 선택이 자동으로 변경되었습니다.",
    fetchFail: "조회에 실패했습니다. 접근키를 확인해주세요.",
    noData: "-",

    periodMonth: "월간",
    periodQuarter: "분기",
    periodYear: "연간",

    profitHeading: "수익성 추이",
    colMonth: "기간",
    colRevenue: "매출액 (CNY)",
    colOperatingProfit: "영업이익 (CNY)",
    colNetProfit: "당기순이익 (CNY)",
    colOperatingMarginPct: "영업이익률",
    colNetMarginPct: "순이익률",

    stabilityHeading: "재무안정성",
    colDebtRatio: "부채비율",
    colCurrentRatio: "유동비율",

    budgetHeading: "목표영업이익 · 일반관리비 예산 달성현황",
    budgetHeadingDesc: "목표영업이익은 예산관리에서 지점이 입력한 연간 계획 대비 회계관리 PL(한국) 실적입니다. 일반관리비는 예산관리 세부 예산/실적 그리드의 합계입니다.",
    achievementLabel: "달성률",
    targetProfitLabel: "목표영업이익 (CNY)",
    actualProfitLabel: "실적 영업이익 (CNY)",
    gaBudgetLabel: "일반관리비 예산 (CNY)",
    gaActualLabel: "일반관리비 실적 (CNY)",

    fundHeading: "자금 위험 요약",
    fundCorpOnlyNote: "자금집행은 법인 단위로만 관리되어, 지점을 선택하면 이 섹션은 표시되지 않습니다.",
    endingCny: "이번 달 기말시재 (CNY)",
    prevEndingCny: "전월 기말시재 (CNY)",
    cashChangePct: "전월대비 증감률",
    totalLoanBalanceCny: "총 차입금 잔액 (CNY)",
    dividendAvailableCny: "배당가능금액 (CNY)",

    office: "지점",
    officeAllOption: "전체(법인 합계)",
    targetPerfHeading: "목표실적 관리표",
    targetPerfDesc: "회계관리 PL(한국)·예산관리 목표영업이익 실적을 지점별로 종합합니다. 선택한 월까지 1월부터의 누계이며(인원수는 평균), 목표/인원수가 입력되지 않은 지점은 표시되지 않습니다.",
    periodSingleMonth: "{year}년 {month}월",
    periodCumulative: "{year}년 1~{month}월 누계",
    colTargetProfitCny: "목표영업이익 (CNY)",
    colOverAchievedCny: "초과달성액 (CNY)",
    colAchievementRate: "달성률",
    colHeadcount: "인원수",
    colProductivity: "생산성 (1인당, CNY)",
    colCostOfSalesCny: "매출원가 (CNY)",
    colSalesProfitCny: "매출이익 (CNY)",
    colGaExpenseCny: "일반관리비 (CNY)",
    colEntertainmentCny: "접대비 (CNY)",
    colTravelCny: "출장비 (CNY)",
    totalRowLabel: "합계",

    adminHeading: "[본사용] 실적분석 관리자 화면",
    adminDesc: "접근키(system_admin 또는 finance)로 전체 법인의 실적을 한 번에 비교할 수 있습니다.",
    adminKeyLabel: "접근키",
    adminYm: "년월",
    adminFetch: "불러오기",
    adminFetchFail: "조회에 실패했습니다. 접근키를 확인해주세요.",
    adminKeyRequired: "접근키를 먼저 입력해주세요.",

    targetPerfAdminHeading: "목표실적 관리표 (법인×지점 조회)",
    targetPerfAdminDesc: "법인/지점/조회월을 선택하면 해당 지점의 목표실적 누계표와 전년 동기 실적, 전년동기대비 증감을 함께 볼 수 있습니다. 스크린샷으로 제공하신 리포트와 동일한 구성입니다.",
    reportCurrentLabelText: "{year}년 1~{month}월 실적 (선택월 누계)",
    reportPrevLabelText: "{year}년 1~{month}월 실적 (전년 동기)",
    reportYoyHeading: "전년동기대비 증감",
    reportCurrentSheetName: "당해실적",
    reportPrevSheetName: "전년동기실적",
    reportYoySheetName: "전년동기대비증감",
    adminDeleteSelectedNone: "다운로드할 데이터가 없습니다.",

    aggHeading: "전체 법인 비교",
    colCorp: "법인",
    adminDownload: "비교표 엑셀 다운로드",

    totalRows: "총 항목 수",
    rowNumberCol: "번호",
    fileNamePrefix: "실적분석"
  },
  zh: {
    appTitle: "业绩分析 - 中国法人财务业绩综合分析系统",
    langName: "中文",
    navAdmin: "总部用：管理员页面",
    backBtn: "← 返回",

    indexHeading: "业绩分析查询",
    indexDesc: "请填写法人/适用年月及接入密钥，即可综合查看盈利能力、财务稳定性、预算实际对比及资金风险。",
    corp: "法人",
    yearmonth: "适用年月",
    accessKeyLabel: "接入密钥",
    selectPlaceholder: "请选择",
    startBtn: "查询",
    requiredWarning: "请填写法人、适用年月和接入密钥。",
    invalidKey: "接入密钥不正确，请向总部负责人确认。",
    keyMismatchBranch: "该接入密钥仅限{branch}使用，已自动切换法人选择。",
    fetchFail: "查询失败，请检查接入密钥。",
    noData: "-",

    periodMonth: "月度",
    periodQuarter: "季度",
    periodYear: "年度",

    profitHeading: "盈利能力趋势",
    colMonth: "期间",
    colRevenue: "营业收入 (CNY)",
    colOperatingProfit: "营业利润 (CNY)",
    colNetProfit: "净利润 (CNY)",
    colOperatingMarginPct: "营业利润率",
    colNetMarginPct: "净利润率",

    stabilityHeading: "财务稳定性",
    colDebtRatio: "负债比率",
    colCurrentRatio: "流动比率",

    budgetHeading: "目标营业利润 · 一般管理费预算达成情况",
    budgetHeadingDesc: "目标营业利润是预算管理中分公司填报的年度计划与会计管理PL(韩国)实际数的对比。一般管理费为预算管理明细预算/实际网格的合计。",
    achievementLabel: "达成率",
    targetProfitLabel: "目标营业利润 (CNY)",
    actualProfitLabel: "实际营业利润 (CNY)",
    gaBudgetLabel: "一般管理费预算 (CNY)",
    gaActualLabel: "一般管理费实际 (CNY)",

    fundHeading: "资金风险摘要",
    fundCorpOnlyNote: "资金执行仅按法人管理，选择分公司后不显示此部分。",
    endingCny: "本月期末资金 (CNY)",
    prevEndingCny: "上月期末资金 (CNY)",
    cashChangePct: "较上月变动率",
    totalLoanBalanceCny: "借款总余额 (CNY)",
    dividendAvailableCny: "可分配利润 (CNY)",

    office: "分公司",
    officeAllOption: "全部(法人合计)",
    targetPerfHeading: "目标实绩管理表",
    targetPerfDesc: "综合会计管理PL(韩国)与预算管理目标营业利润实际数，按分公司展示。为所选月份1月至今的累计数(人员数为平均值)，未填写目标/人员数的分公司不显示。",
    periodSingleMonth: "{year}年{month}月",
    periodCumulative: "{year}年1~{month}月累计",
    colTargetProfitCny: "目标营业利润 (CNY)",
    colOverAchievedCny: "超额达成额 (CNY)",
    colAchievementRate: "达成率",
    colHeadcount: "人员数",
    colProductivity: "人均生产率 (CNY)",
    colCostOfSalesCny: "销售成本 (CNY)",
    colSalesProfitCny: "销售利润 (CNY)",
    colGaExpenseCny: "一般管理费 (CNY)",
    colEntertainmentCny: "招待费 (CNY)",
    colTravelCny: "差旅费 (CNY)",
    totalRowLabel: "合计",

    adminHeading: "【总部用】业绩分析管理员页面",
    adminDesc: "使用接入密钥（system_admin 或 finance）可一次性比较全法人的业绩。",
    adminKeyLabel: "接入密钥",
    adminYm: "年月",
    adminFetch: "加载",
    adminFetchFail: "查询失败，请检查接入密钥。",
    adminKeyRequired: "请先输入接入密钥。",

    targetPerfAdminHeading: "目标实绩管理表 (按法人×分公司查询)",
    targetPerfAdminDesc: "选择法人/分公司/查询月份，即可查看该分公司的目标实绩累计表、去年同期实际数及同比增减。与您提供的截图报告结构相同。",
    reportCurrentLabelText: "{year}年1~{month}月实际数 (所选月累计)",
    reportPrevLabelText: "{year}年1~{month}月实际数 (去年同期)",
    reportYoyHeading: "同比增减",
    reportCurrentSheetName: "本期实际",
    reportPrevSheetName: "去年同期实际",
    reportYoySheetName: "同比增减",
    adminDeleteSelectedNone: "没有可下载的数据。",

    aggHeading: "全法人比较",
    colCorp: "法人",
    adminDownload: "下载比较表Excel",

    totalRows: "总项目数",
    rowNumberCol: "编号",
    fileNamePrefix: "业绩分析"
  }
};

window.getLang = function () {
  return localStorage.getItem("appLang") || "ko";
};
window.setLang = function (lang) {
  localStorage.setItem("appLang", lang);
  applyI18n();
  document.dispatchEvent(new CustomEvent("langchange"));
};
window.t = function (key, vars) {
  var lang = getLang();
  var dict = window.I18N[lang] || window.I18N.ko;
  var str = dict[key] || window.I18N.ko[key] || key;
  if (vars) {
    Object.keys(vars).forEach(function (k) {
      str = str.split("{" + k + "}").join(vars[k]);
    });
  }
  return str;
};
window.applyI18n = function () {
  document.documentElement.lang = getLang();
  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  });
  document.title = t("appTitle");
  document.querySelectorAll(".lang-btn").forEach(function (btn) {
    btn.classList.toggle("active", btn.dataset.lang === getLang());
  });
};
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".lang-btn").forEach(function (btn) {
    btn.addEventListener("click", function () { setLang(btn.dataset.lang); });
  });
  applyI18n();
});
