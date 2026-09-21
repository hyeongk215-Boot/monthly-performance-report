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
// ko값은 DB에 그대로 저장되는 키라서 바꿀 수 없습니다. 화면 표기만 다르게 하고 싶으면
// config.js 항목에 koLabel을 넣습니다 (예: DB는 "충칭", 본사 양식 표기는 "중경").
function pickLabel(item, lang) {
  lang = lang || getLang();
  if (lang === "ko" && item.koLabel) return item.koLabel;
  return item[lang] || item.koLabel || item.ko;
}
window.corpLabel = function (koValue, lang) {
  var item = findByKo(window.APP_CONFIG.CORPORATIONS, koValue);
  if (!item) return koValue;
  return pickLabel(item, lang);
};
window.officeLabel = function (koValue, lang) {
  var item = findByKo(window.APP_CONFIG.OFFICES, koValue);
  if (!item) return koValue;
  return pickLabel(item, lang);
};

// ===== 숫자 표기 (본사 제출 양식 기준) =====
// 금액·수량: 소수점 없이 #,##0, 음수는 빨강 괄호 "(1,234)", 셀은 오른쪽 정렬.
// 비율(%)  : 소수점 2자리, 음수는 빨강, 셀은 가운데 정렬.
// 반환값에 <span class="neg">가 섞일 수 있으므로 innerHTML로 넣어야 합니다
// (textContent로 넣으면 태그가 글자 그대로 보입니다).
// 엑셀 출력은 app-admin.js가 셀 값을 원시 숫자로 되돌리고 같은 서식을
// mso-number-format으로 입히므로, 받는 쪽에서 합계·수식을 그대로 쓸 수 있습니다.
window.fmtMoney = function (n) {
  var num = Number(n);
  if (n === null || n === undefined || n === "" || isNaN(num)) return t("noData");
  var rounded = Math.round(num);
  var text = Math.abs(rounded).toLocaleString("en-US");
  return rounded < 0 ? '<span class="neg">(' + text + ')</span>' : text;
};
window.fmtPercent = function (n) {
  var num = Number(n);
  if (n === null || n === undefined || n === "" || isNaN(num)) return t("noData");
  var text = Math.abs(num).toFixed(2) + "%";
  return Number(text.slice(0, -1)) > 0 && num < 0 ? '<span class="neg">-' + text + "</span>" : text;
};
// 차트 라벨/툴팁용. ECharts·Chart.js는 HTML 태그를 해석하지 않으므로 태그 없는 값을 씁니다.
window.fmtMoneyPlain = function (n) {
  var num = Number(n);
  if (n === null || n === undefined || n === "" || isNaN(num)) return t("noData");
  return Math.round(num).toLocaleString("en-US");
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

// ===== 재무지표 분석(insights.html) 열람 권한 =====
// 이 화면은 본사 전용입니다. 관리자(system_admin)와 본사 회계(finance) 접근키만 열람할 수 있고,
// 지점 접근키(branch_*)는 메뉴 자체가 보이지 않습니다. 서버의 get_ga_breakdown()에도 같은
// 검사가 들어 있어서, 주소를 직접 입력해도 데이터는 내려가지 않습니다.
window.INSIGHTS_ROLES = ["system_admin", "finance"];
window.canViewInsights = function (ctx) {
  ctx = ctx || window.loadContext();
  return !!(ctx && window.INSIGHTS_ROLES.indexOf(ctx.role) !== -1);
};
document.addEventListener("DOMContentLoaded", function () {
  if (window.canViewInsights()) return;
  document.querySelectorAll('[data-nav="insights"]').forEach(function (el) {
    el.style.display = "none";
  });
});

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

// ===== 테마(라이트/다크) 토글 =====
// 깜빡임을 막기 위해 <head>의 인라인 스크립트가 data-theme를 먼저 설정하고, 여기서는
// 사이드바의 #themeToggle 버튼에 아이콘과 클릭 동작만 붙입니다.
(function () {
  var MOON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  var SUN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';

  window.isDarkTheme = function () {
    return document.documentElement.getAttribute("data-theme") === "dark";
  };
  window.applyTheme = function (dark) {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("erpTheme", dark ? "dark" : "light");
    var btn = document.getElementById("themeToggle");
    if (btn) btn.innerHTML = dark ? SUN : MOON;
    document.dispatchEvent(new CustomEvent("themechange", { detail: { dark: dark } }));
  };

  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("themeToggle");
    if (!btn) return;
    btn.innerHTML = window.isDarkTheme() ? SUN : MOON;
    btn.addEventListener("click", function () { window.applyTheme(!window.isDarkTheme()); });
  });
})();
