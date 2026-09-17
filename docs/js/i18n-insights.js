// insights.html 전용 i18n 키 추가. 기존 i18n.js(window.I18N)는 절대 수정하지 않고
// 이 파일에서 Object.assign으로 새 키만 병합합니다. insights.html에서만 로드됩니다.
(function () {
  Object.assign(window.I18N.ko, {
    navInsights: "재무지표 분석",
    insightsHeading: "재무지표 분석",
    insightsDesc: "손익 구조와 판관비 세부 내역을 회계관리·예산관리에 이미 입력된 데이터로 분석합니다.",
    insightsHqOnlyNote: "본사 전용 화면입니다. 관리자·본사 회계 접근키로 6개 법인을 모두 조회할 수 있습니다. 판관비 세부 예산이 입력되지 않은 법인·기간은 0으로 표시됩니다.",
    insightsDenied: "열람 권한이 없습니다",
    insightsDeniedDesc: "재무지표 분석은 관리자(system_admin)와 본사 회계(finance) 접근키만 열람할 수 있습니다. 지점 접근키로는 조회할 수 없습니다.",
    insightsDeniedBack: "← 실적 개요로 이동",

    waterfallHeading: "손익 구조 (한국식 기준)",
    waterfallDesc: "매출 → 매출원가 → 매출이익 → 판관비 → 영업이익 5단계 흐름입니다.",
    wfRevenue: "매출액",
    wfCost: "매출원가",
    wfSalesProfit: "매출이익",
    wfGaExpense: "판관비",
    wfOperatingProfit: "영업이익",

    gaBreakdownHeading: "판관비 세부 구조",
    gaBreakdownDesc: "일반관리비 11개 항목의 예산 대비 실적입니다.",
    colCategory: "항목",
    colBudget: "예산 (CNY)",
    colActual: "실적 (CNY)",
    colVariance: "증감률",
    gaChartTitleBar: "항목별 예산 대비 실적",
    gaChartTitleDonut: "실적 구성비",
    varianceOver: "초과",
    varianceUnder: "절감",

    catWage: "인건비",
    catWelfare: "복리후생비",
    catEntertainment: "접대비",
    catTravel: "출장비",
    catDepreciation: "감가상각비",
    catRent: "임차료",
    catOfficeOps: "사무운영비",
    catVehicle: "차량비",
    catConsulting: "컨설팅비",
    catSystem: "시스템비",
    catBankFee: "은행수수료",

    statGaExecPct: "판관비 집행률",
    vsPrevPeriod: "전기대비 {pct}",
    exportPdf: "PDF로 저장",
    exportPpt: "PPT로 저장",
    exportPreparing: "내보내기 준비 중입니다...",
    exportFail: "내보내기에 실패했습니다.",

    stabilityChartHeading: "재무안정성 추이",
    stabilityChartDesc: "부채비율이 붉은 밴드(200% 초과)에 들어가거나 유동비율이 100% 아래로 내려가면 위험 신호입니다.",
    debtRiskLine: "위험 200%",
    currentSafeLine: "안전 100%"
  });

  Object.assign(window.I18N.zh, {
    navInsights: "财务指标分析",
    insightsHeading: "财务指标分析",
    insightsDesc: "基于会计管理·预算管理中已录入的数据，分析损益结构和管理费用明细。",
    insightsHqOnlyNote: "本页面为总部专用。使用管理员·总部会计接入密钥可查询全部6家法人。未录入管理费用明细预算的法人·期间将显示为0。",
    insightsDenied: "无查看权限",
    insightsDeniedDesc: "财务指标分析仅限管理员（system_admin）和总部会计（finance）接入密钥查看，分公司接入密钥无法查询。",
    insightsDeniedBack: "← 前往业绩概览",

    waterfallHeading: "损益结构（韩式口径）",
    waterfallDesc: "销售额 → 销售成本 → 销售利润 → 管理费用 → 营业利润 5个阶段。",
    wfRevenue: "销售额",
    wfCost: "销售成本",
    wfSalesProfit: "销售利润",
    wfGaExpense: "管理费用",
    wfOperatingProfit: "营业利润",

    gaBreakdownHeading: "管理费用明细结构",
    gaBreakdownDesc: "一般管理费11个项目的预算与实际对比。",
    colCategory: "项目",
    colBudget: "预算 (CNY)",
    colActual: "实际 (CNY)",
    colVariance: "增减率",
    gaChartTitleBar: "各项目预算与实际对比",
    gaChartTitleDonut: "实际构成比",
    varianceOver: "超支",
    varianceUnder: "节省",

    catWage: "人工费",
    catWelfare: "福利费",
    catEntertainment: "招待费",
    catTravel: "差旅费",
    catDepreciation: "折旧费",
    catRent: "租金",
    catOfficeOps: "办公运营费",
    catVehicle: "车辆费",
    catConsulting: "咨询费",
    catSystem: "系统费",
    catBankFee: "银行手续费",

    statGaExecPct: "管理费用执行率",
    vsPrevPeriod: "较上期 {pct}",
    exportPdf: "导出为PDF",
    exportPpt: "导出为PPT",
    exportPreparing: "正在准备导出...",
    exportFail: "导出失败。",

    stabilityChartHeading: "财务稳定性趋势",
    stabilityChartDesc: "资产负债率进入红色区间（超过200%）或流动比率低于100%即为风险信号。",
    debtRiskLine: "风险 200%",
    currentSafeLine: "安全 100%"
  });
})();
