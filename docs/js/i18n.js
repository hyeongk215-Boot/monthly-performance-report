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
    colOperatingProfitKr: "한국식 영업이익 (CNY)",
    colNetProfit: "당기순이익 (CNY)",
    colOperatingMarginPct: "영업이익률",
    colNetMarginPct: "순이익률",
    colSalesMarginPct: "매출이익률",

    stabilityHeading: "재무안정성",
    colDebtRatio: "부채비율",
    colCurrentRatio: "유동비율",

    budgetHeading: "실적 지표",
    budgetHeadingDesc: "목표영업이익은 예산관리에서 지점이 입력한 연간 계획 대비 회계관리 PL(한국) 실적입니다. 일반관리비는 예산관리 세부 예산/실적 그리드의 합계이며, 매출이익률·영업이익률·당기순이익률은 선택한 적용년월(한국식 PL 기준)의 매출 대비 비율입니다.",
    achievementLabel: "달성률",
    targetProfitLabel: "목표영업이익 (CNY)",
    actualProfitLabel: "실적 한국식 영업이익 (CNY)",
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
    targetPerfDesc: "회계관리 PL(한국)·예산관리 목표영업이익 실적을 접속 지점 기준으로 월별/분기별/연간 단위로 보여줍니다. 상단의 월간/분기/연간 선택에 따라 컬럼이 바뀝니다.",
    colPeriod: "기간",
    periodTargetMonthly: "{year}년 1~{month}월 (월별)",
    periodTargetQuarterly: "{year}년 1~{month}월 (분기 누계)",
    periodTargetAnnual: "{year}년 1~{month}월 누계 (연간)",
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

    navKpi: "경영지표 페이지",
    navTargetPerf: "목표실적 관리표 조회",
    kpiHeading: "[본사용] 경영지표 페이지",
    kpiDesc: "접근키(system_admin 또는 finance)로 전체 법인의 경영지표를 비교하거나, 법인/지점을 선택해 지점 화면과 동일한 수익성·재무안정성·실적지표를 열람할 수 있습니다.",
    kpiDrilldownHeading: "법인·지점별 경영지표",
    kpiDrilldownDesc: "지점 화면과 동일한 구성입니다. 관리자는 법인/지점 제한 없이 전체를 조회할 수 있습니다.",
    colRoe: "ROE (자기자본이익률)",
    colRoi: "ROI (총자산이익률)",
    colEquityRatio: "자기자본비율",
    financialRatioHeading: "재무비율",
    financialRatioCorpOnlyNote: "ROE·ROI·부채비율·자기자본비율은 법인 단위로만 제공됩니다(지점을 선택해도 값은 동일합니다).",
    wordExportBtn: "워드 보고서 출력",
    wordReportTitle: "경영지표 요약 보고서",
    adminHeading: "[본사용] 목표실적 관리표 조회",
    adminDesc: "접근키(system_admin 또는 finance)를 입력하면 아래 목표실적 관리표를 조회/다운로드할 수 있습니다. 전체 법인 비교·재무비율은 「경영지표 페이지」에서 확인하세요.",
    adminKeyLabel: "접근키",
    adminYm: "년월",
    adminFetch: "불러오기",
    adminFetchFail: "조회에 실패했습니다. 접근키를 확인해주세요.",
    adminKeyRequired: "접근키를 먼저 입력해주세요.",

    corpGroupLabel: "법인",
    corpGroupYjc: "① YJC 포워딩",
    corpGroupOther: "② 흥아물류 · 상해물류센터 · 윤봉물류 · 창씽 CY · 청도 CY",
    reportModeLabel: "조회 구분",
    reportModeAll: "전체(합계)",
    reportModeOffice: "지점 선택",
    yearLabel: "연도",
    yearSuffix: "년",
    monthSuffix: "월",
    quarterSuffix: "분기",
    periodLabel: "기간",
    periodHalf: "반기",
    periodHalf1: "상반기",
    periodHalf2: "하반기",
    periodValueLabel: "기간 값",
    colMetric: "지표",

    targetPerfAdminHeading: "목표실적 관리표 (법인×지점 조회)",
    targetPerfAdminDesc: "①YJC 포워딩 / ②흥아물류 외 4개 법인 그룹을 선택한 뒤, \"전체(합계)\"는 선택 기간의 지점별 실적을, \"지점 선택\"은 해당 지점의 1~12월 실적(+합계)을 볼 수 있습니다. 제공해주신 엑셀 양식과 같은 구성입니다.",
    reportYoyHeading: "전년동기대비 증감",
    reportCurrentSheetName: "당해실적",
    reportPrevSheetName: "전년동기실적",
    reportYoySheetName: "전년동기대비증감",
    adminDeleteSelectedNone: "다운로드할 데이터가 없습니다.",

    aggHeading: "전체 법인 비교",
    colCorp: "법인",
    adminDownload: "엑셀 다운로드",

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
    colOperatingProfitKr: "韩式营业利润 (CNY)",
    colNetProfit: "净利润 (CNY)",
    colOperatingMarginPct: "营业利润率",
    colNetMarginPct: "净利润率",
    colSalesMarginPct: "销售利润率",

    stabilityHeading: "财务稳定性",
    colDebtRatio: "负债比率",
    colCurrentRatio: "流动比率",

    budgetHeading: "业绩指标",
    budgetHeadingDesc: "目标营业利润是预算管理中分公司填报的年度计划与会计管理PL(韩国)实际数的对比。一般管理费为预算管理明细预算/实际网格的合计，销售利润率·营业利润率·净利润率为所选适用年月(韩式PL基准)相对营业收入的比率。",
    achievementLabel: "达成率",
    targetProfitLabel: "目标营业利润 (CNY)",
    actualProfitLabel: "实际韩式营业利润 (CNY)",
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
    targetPerfDesc: "综合会计管理PL(韩国)与预算管理目标营业利润实际数，按登录分公司展示。数据按上方月度/季度/年度选择切换列。",
    colPeriod: "期间",
    periodTargetMonthly: "{year}年1~{month}月(按月)",
    periodTargetQuarterly: "{year}年1~{month}月(季度累计)",
    periodTargetAnnual: "{year}年1~{month}月累计(年度)",
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

    navKpi: "经营指标页面",
    navTargetPerf: "目标实绩管理表查询",
    kpiHeading: "【总部用】经营指标页面",
    kpiDesc: "使用接入密钥（system_admin 或 finance）比较全法人经营指标，或选择法人/分公司查看与分公司页面相同的盈利能力·财务稳定性·业绩指标。",
    kpiDrilldownHeading: "按法人·分公司经营指标",
    kpiDrilldownDesc: "与分公司页面结构相同。管理员可不受限制地查询全部法人/分公司。",
    colRoe: "ROE (净资产收益率)",
    colRoi: "ROI (总资产收益率)",
    colEquityRatio: "自有资本比率",
    financialRatioHeading: "财务比率",
    financialRatioCorpOnlyNote: "ROE·ROI·负债比率·自有资本比率仅按法人提供（选择分公司数值也相同）。",
    wordExportBtn: "下载Word报告",
    wordReportTitle: "经营指标摘要报告",
    adminHeading: "【总部用】目标实绩管理表查询",
    adminDesc: "输入接入密钥（system_admin 或 finance）即可查询/下载目标实绩管理表。全法人比较·财务比率请前往「经营指标页面」查看。",
    adminKeyLabel: "接入密钥",
    adminYm: "年月",
    adminFetch: "加载",
    adminFetchFail: "查询失败，请检查接入密钥。",
    adminKeyRequired: "请先输入接入密钥。",

    corpGroupLabel: "法人",
    corpGroupYjc: "①YJC 货代",
    corpGroupOther: "②兴亚物流 · 上海物流中心 · 润峰物流 · 长兴CY · 青岛CY",
    reportModeLabel: "查询类型",
    reportModeAll: "全部(合计)",
    reportModeOffice: "选择分公司",
    yearLabel: "年度",
    yearSuffix: "年",
    monthSuffix: "月",
    quarterSuffix: "季度",
    periodLabel: "期间",
    periodHalf: "半年度",
    periodHalf1: "上半年",
    periodHalf2: "下半年",
    periodValueLabel: "期间值",
    colMetric: "指标",

    targetPerfAdminHeading: "目标实绩管理表 (按法人×分公司查询)",
    targetPerfAdminDesc: "选择①YJC货代 / ②兴亚物流等4家法人分组后，\"全部(合计)\"显示所选期间各分公司业绩，\"选择分公司\"显示该分公司1~12月业绩(+合计)。与您提供的Excel格式结构相同。",
    reportYoyHeading: "同比增减",
    reportCurrentSheetName: "本期实际",
    reportPrevSheetName: "去年同期实际",
    reportYoySheetName: "同比增减",
    adminDeleteSelectedNone: "没有可下载的数据。",

    aggHeading: "全法人比较",
    colCorp: "法人",
    adminDownload: "下载Excel",

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
