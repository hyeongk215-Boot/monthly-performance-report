# Supabase 배포 방법 (실적분석)

회계관리, 예산관리, 자금집행과 **동일한 관리부 ERP 전용 Supabase 프로젝트를 그대로 공유**합니다
(접대비는 별개 프로젝트).

## 0. 전제조건

이 모듈은 새 테이블을 만들지 않습니다. **회계관리, 예산관리, 자금집행의 `schema.sql`이 모두
먼저 적용되어 있어야** 합니다 — 특히 자금집행의 `get_cash_position`/`get_dividend_available`/
`fund_prev_yearmonth` 함수를 그대로 호출해서 재사용하므로, 자금집행이 없으면 이 모듈의 함수가
동작하지 않습니다.

## 1. 함수 생성

1. Supabase 대시보드 → **SQL Editor → New query**
2. `schema.sql` 전체를 붙여넣고 **Run**.

## 2. 프론트엔드에 연결

`docs/js/config.js`에 다른 모듈과 동일한 값을 넣습니다.

## 3. 계정코드/법인 목록 하드코딩 주의 (중요)

- `get_profitability_series`/`get_stability_series`/`get_budget_variance_summary`/
  `get_performance_aggregate`는 회계관리의 실제 계정코드(매출액 500000, 영업이익 799999, 당기순이익
  999999, 유동자산합계 BS-L18, 유동부채합계 BS-R52, 부채합계 BS-R58, 자본총계 BS-R68)를 참조합니다.
  회계관리에서 계정과목을 다시 교체하면 이 파일의 해당 함수들을 새 코드에 맞게 다시
  실행(create or replace)해야 합니다.
- `perf_all_corps()`는 6개 법인 목록을 하드코딩합니다. 법인이 추가/변경되면 이 함수도 같이 수정하세요.

## 4. Chart.js

`docs/vendor/chart.umd.js`는 jsdelivr CDN(`https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.js`)에서
내려받아 vendor로 포함했습니다. 별도 설정 없이 정적 파일로 서빙되며, 런타임에 CDN을 호출하지 않습니다.
Chart.js 버전을 올리고 싶으면 위 URL의 버전 태그(`@4`)를 원하는 버전으로 바꿔 다시 다운로드하세요.
