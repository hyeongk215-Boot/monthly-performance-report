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

    budgetHeading: "예산 대비 실적",
    achievementLabel: "달성률",
    totalBudgetLabel: "총 예산 (CNY)",
    totalActualLabel: "총 실적 (CNY)",
    overAccountsHeading: "예산 초과 계정",
    colAccount: "계정과목",
    colBudgetCny: "예산 (CNY)",
    colActualCny: "실적 (CNY)",
    noOverAccounts: "예산을 초과한 계정이 없습니다.",

    fundHeading: "자금 위험 요약",
    endingCny: "이번 달 기말시재 (CNY)",
    prevEndingCny: "전월 기말시재 (CNY)",
    cashChangePct: "전월대비 증감률",
    totalLoanBalanceCny: "총 차입금 잔액 (CNY)",
    dividendAvailableCny: "배당가능금액 (CNY)",

    adminHeading: "[본사용] 실적분석 관리자 화면",
    adminDesc: "접근키(system_admin 또는 finance)로 전체 법인의 실적을 한 번에 비교할 수 있습니다.",
    adminKeyLabel: "접근키",
    adminYm: "년월",
    adminFetch: "불러오기",
    adminFetchFail: "조회에 실패했습니다. 접근키를 확인해주세요.",
    adminKeyRequired: "접근키를 먼저 입력해주세요.",

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

    budgetHeading: "预算与实际对比",
    achievementLabel: "达成率",
    totalBudgetLabel: "预算总额 (CNY)",
    totalActualLabel: "实际总额 (CNY)",
    overAccountsHeading: "超预算科目",
    colAccount: "科目",
    colBudgetCny: "预算 (CNY)",
    colActualCny: "实际 (CNY)",
    noOverAccounts: "没有超出预算的科目。",

    fundHeading: "资金风险摘要",
    endingCny: "本月期末资金 (CNY)",
    prevEndingCny: "上月期末资金 (CNY)",
    cashChangePct: "较上月变动率",
    totalLoanBalanceCny: "借款总余额 (CNY)",
    dividendAvailableCny: "可分配利润 (CNY)",

    adminHeading: "【总部用】业绩分析管理员页面",
    adminDesc: "使用接入密钥（system_admin 或 finance）可一次性比较全法人的业绩。",
    adminKeyLabel: "接入密钥",
    adminYm: "年月",
    adminFetch: "加载",
    adminFetchFail: "查询失败，请检查接入密钥。",
    adminKeyRequired: "请先输入接入密钥。",

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
