// 공통 유틸 함수 모음 (자금집행 docs/js/common.js 구조를 재사용 + 기간 집계 헬퍼 추가)

// ===== Supabase 클라이언트 =====
window.getSupabaseClient = function () {
  var cfg = window.APP_CONFIG;
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return null;
  if (!window._supabaseClient) {
    window._supabaseClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  }
  return window._supabaseClient;
};

window.MIN_YEARMONTH = "2024-01";

window.generateYearMonths = function (back, forward) {
  back = back == null ? 36 : back;
  forward = forward == null ? 1 : forward;
  var now = new Date();
  var list = [];
  for (var i = -back; i <= forward; i++) {
    var d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    var ym = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    if (ym < window.MIN_YEARMONTH) continue;
    list.push(ym);
  }
  return list.reverse();
};

window.defaultYearMonth = function () {
  var now = new Date();
  var d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  var ym = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  return ym < window.MIN_YEARMONTH ? window.MIN_YEARMONTH : ym;
};

// ===== 법인 라벨 =====
function findByKo(list, koValue) {
  for (var i = 0; i < list.length; i++) {
    if (list[i].ko === koValue) return list[i];
  }
  return null;
}
window.corpLabel = function (koValue, lang) {
  var item = findByKo(window.APP_CONFIG.CORPORATIONS, koValue);
  if (!item) return koValue;
  return item[lang || getLang()] || item.ko;
};

// ===== 세션 컨텍스트 =====
window.saveContext = function (ctx) {
  sessionStorage.setItem("perfContext", JSON.stringify(ctx));
};
window.loadContext = function () {
  var raw = sessionStorage.getItem("perfContext");
  return raw ? JSON.parse(raw) : null;
};
window.clearContext = function () {
  sessionStorage.removeItem("perfContext");
};

window.downloadWorkbook = function (wb, filename) {
  XLSX.writeFile(wb, filename);
};

// ===== 기간(월/분기/연) 집계 헬퍼 =====
// "YYYY-MM" -> 분기 라벨 "YYYY-Qn" 또는 연 라벨 "YYYY"
window.periodLabel = function (yearmonth, unit) {
  if (unit === "month") return yearmonth;
  var parts = yearmonth.split("-");
  var year = parts[0], month = Number(parts[1]);
  if (unit === "quarter") return year + "-Q" + Math.ceil(month / 3);
  return year; // "year"
};

// 흐름지표(매출/영업이익/순이익 등): 같은 기간에 속한 월들의 값을 합산
window.aggregateFlowSeries = function (series, unit, valueKeys) {
  if (unit === "month") return series;
  var groups = {};
  var order = [];
  series.forEach(function (row) {
    var label = window.periodLabel(row.yearmonth, unit);
    if (!groups[label]) {
      groups[label] = { yearmonth: label };
      valueKeys.forEach(function (k) { groups[label][k] = 0; });
      order.push(label);
    }
    valueKeys.forEach(function (k) { groups[label][k] += Number(row[k]) || 0; });
  });
  return order.map(function (label) { return groups[label]; });
};

// 저량지표(부채비율/유동비율/잔액 등): 같은 기간의 마지막(가장 최근) 월 값만 사용
window.aggregateStockSeries = function (series, unit, valueKeys) {
  if (unit === "month") return series;
  var groups = {};
  var order = [];
  series.forEach(function (row) {
    var label = window.periodLabel(row.yearmonth, unit);
    if (!groups[label]) order.push(label);
    groups[label] = { yearmonth: label };
    valueKeys.forEach(function (k) { groups[label][k] = row[k]; });
  });
  return order.map(function (label) { return groups[label]; });
};
