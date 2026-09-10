-- Supabase 마이그레이션: 실적분석 (회계관리·예산관리·자금집행 데이터 종합 대시보드)
-- 사용법: Supabase 대시보드 > SQL Editor > New query 에 이 파일 전체를 붙여넣고 실행하세요.
--
-- ⚠ 전제조건: 회계관리, 예산관리, 자금집행의 schema.sql이 모두 같은 Supabase 프로젝트에 먼저
-- 적용되어 있어야 합니다. 이 모듈은 새 테이블을 만들지 않고, 세 모듈의 테이블/함수를 그대로
-- 조인·재사용하는 순수 조회(RPC) 레이어입니다:
--   - 회계관리: access_keys, verify_access_key(), acct_accounts, acct_statement_lines, acct_pl_kr_extra
--   - 예산관리: bgt_budget_lines, bgt_target_profit, bgt_ga_lines
--   - 자금집행: fund_cash_positions, fund_loans, get_cash_position(), get_dividend_available(),
--     fund_prev_yearmonth() — 자금집행이 만든 함수를 그대로 호출해서 재사용합니다 (중복 구현 없음).
--
-- ⚠ 계정코드 하드코딩 안내: 아래 함수들은 회계관리 seed_accounts.sql의 실제 계정코드를 참조합니다
-- (매출액 500000, 영업이익 799999, 당기순이익 999999, 유동자산합계 BS-L18, 유동부채합계 BS-R52,
-- 부채합계 BS-R58, 자본총계 BS-R68). 회계관리에서 계정과목을 다시 교체하면 이 파일의 해당 코드를
-- 새 코드에 맞게 바꿔서 다시 실행(create or replace)해야 합니다.
--
-- ⚠ 법인 목록 하드코딩 안내: get_performance_aggregate()는 6개 법인 목록을 하드코딩합니다
-- (각 모듈의 config.js CORPORATIONS와 동일한 값). 법인이 추가/변경되면 이 배열도 함께 수정하세요.

-- 전체 법인 목록 (config.js CORPORATIONS.ko 값과 동일하게 유지)
create or replace function perf_all_corps() returns text[]
language sql immutable
as $$
  select array['YJC 포워딩','상해물류센터','흥아물류','윤봉물류','청도 CY','창씽 CY'];
$$;

-- ⚠ 아래 세 함수는 p_office 파라미터가 새로 추가되면서 인자 개수가 바뀌어 create or replace로
-- 대체되지 않고 옛 오버로드가 남으므로 명시적으로 드롭합니다.
drop function if exists get_profitability_series(text, text, text, integer);
drop function if exists get_stability_series(text, text, text, integer);
drop function if exists get_budget_variance_summary(text, text, text);

-- 최근 N개월 수익성 추이 (매출/영업이익/순이익, 흐름지표이므로 프론트에서 기간 합산)
-- p_office가 비어있으면 법인 전체(전 지점 합산), 지정하면 그 지점만.
-- ⚠ office 차원이 생긴 뒤로는 코드당 여러 행(지점별)이 있을 수 있어 반드시 sum()으로 합산합니다.
create or replace function get_profitability_series(
  p_access_key text,
  p_corp text,
  p_yearmonth text,
  p_months_back integer default 12,
  p_office text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_branch_scope text;
  v_corp text;
  v_result jsonb;
begin
  select role, branch_scope into v_role, v_branch_scope from verify_access_key(p_access_key);
  v_corp := coalesce(v_branch_scope, p_corp);

  with months as (
    select to_char(gs, 'YYYY-MM') as yearmonth
    from generate_series(
      date_trunc('month', to_date(p_yearmonth || '-01', 'YYYY-MM-DD')) - ((p_months_back - 1) || ' months')::interval,
      date_trunc('month', to_date(p_yearmonth || '-01', 'YYYY-MM-DD')),
      interval '1 month'
    ) gs
  )
  select jsonb_agg(to_jsonb(x) order by x.yearmonth) into v_result
  from (
    select m.yearmonth,
      coalesce((select sum(amount_cny) from acct_statement_lines where corp = v_corp and yearmonth = m.yearmonth and statement_type = 'PL' and account_code = '500000' and (nullif(p_office, '') is null or office = p_office)), 0) as "revenueCny",
      coalesce((select sum(amount_cny) from acct_statement_lines where corp = v_corp and yearmonth = m.yearmonth and statement_type = 'PL' and account_code = '799999' and (nullif(p_office, '') is null or office = p_office)), 0) as "operatingProfitCny",
      coalesce((select sum(amount_cny) from acct_statement_lines where corp = v_corp and yearmonth = m.yearmonth and statement_type = 'PL' and account_code = '999999' and (nullif(p_office, '') is null or office = p_office)), 0) as "netProfitCny"
    from months m
  ) x;

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

-- 최근 N개월 재무안정성 비율 (부채비율/유동비율, 저량지표이므로 프론트에서 기간말 값만 사용)
-- p_office가 비어있으면 법인 전체(전 지점 합산), 지정하면 그 지점만.
create or replace function get_stability_series(
  p_access_key text,
  p_corp text,
  p_yearmonth text,
  p_months_back integer default 12,
  p_office text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_branch_scope text;
  v_corp text;
  v_result jsonb;
begin
  select role, branch_scope into v_role, v_branch_scope from verify_access_key(p_access_key);
  v_corp := coalesce(v_branch_scope, p_corp);

  with months as (
    select to_char(gs, 'YYYY-MM') as yearmonth
    from generate_series(
      date_trunc('month', to_date(p_yearmonth || '-01', 'YYYY-MM-DD')) - ((p_months_back - 1) || ' months')::interval,
      date_trunc('month', to_date(p_yearmonth || '-01', 'YYYY-MM-DD')),
      interval '1 month'
    ) gs
  ),
  raw as (
    select m.yearmonth,
      coalesce((select sum(amount_cny) from acct_statement_lines where corp = v_corp and yearmonth = m.yearmonth and statement_type = 'BS' and account_code = 'BS-L18' and (nullif(p_office, '') is null or office = p_office)), 0) as current_assets,
      coalesce((select sum(amount_cny) from acct_statement_lines where corp = v_corp and yearmonth = m.yearmonth and statement_type = 'BS' and account_code = 'BS-R52' and (nullif(p_office, '') is null or office = p_office)), 0) as current_liabilities,
      coalesce((select sum(amount_cny) from acct_statement_lines where corp = v_corp and yearmonth = m.yearmonth and statement_type = 'BS' and account_code = 'BS-R58' and (nullif(p_office, '') is null or office = p_office)), 0) as total_liabilities,
      coalesce((select sum(amount_cny) from acct_statement_lines where corp = v_corp and yearmonth = m.yearmonth and statement_type = 'BS' and account_code = 'BS-R68' and (nullif(p_office, '') is null or office = p_office)), 0) as total_equity
    from months m
  )
  select jsonb_agg(to_jsonb(x) order by x.yearmonth) into v_result
  from (
    select yearmonth,
      case when total_equity = 0 then null else round(total_liabilities / total_equity * 100, 1) end as "debtRatioPct",
      case when current_liabilities = 0 then null else round(current_assets / current_liabilities * 100, 1) end as "currentRatioPct"
    from raw
  ) x;

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

-- 목표영업이익/예산 달성 요약 (한 달, 지점 기준). 기존 "예산 대비 실적"(PL 계정별 비교)을
-- 대체합니다: 목표영업이익 달성률(예산관리 bgt_target_profit vs 회계관리 PL_KR 799999)과
-- 일반관리비 예산 진행현황(예산관리 bgt_ga_lines budget vs actual)만 표기합니다.
-- p_office가 비어있으면 법인 전체(전 지점 합산), 지정하면 그 지점만.
create or replace function get_budget_variance_summary(
  p_access_key text,
  p_corp text,
  p_yearmonth text,
  p_office text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_branch_scope text;
  v_corp text;
  v_target numeric;
  v_actual_profit numeric;
  v_ga_budget numeric;
  v_ga_actual numeric;
begin
  select role, branch_scope into v_role, v_branch_scope from verify_access_key(p_access_key);
  v_corp := coalesce(v_branch_scope, p_corp);

  select coalesce(sum(target_operating_profit_cny), 0) into v_target
  from bgt_target_profit
  where corp = v_corp and yearmonth = p_yearmonth and (nullif(p_office, '') is null or office = p_office);

  select coalesce(sum(amount_cny), 0) into v_actual_profit
  from acct_statement_lines
  where corp = v_corp and yearmonth = p_yearmonth and statement_type = 'PL_KR' and account_code = '799999'
    and (nullif(p_office, '') is null or office = p_office);

  select coalesce(sum(fixed_cny + variable_cny), 0) into v_ga_budget
  from bgt_ga_lines
  where corp = v_corp and yearmonth = p_yearmonth and kind = 'budget' and (nullif(p_office, '') is null or office = p_office);

  select coalesce(sum(fixed_cny + variable_cny), 0) into v_ga_actual
  from bgt_ga_lines
  where corp = v_corp and yearmonth = p_yearmonth and kind = 'actual' and (nullif(p_office, '') is null or office = p_office);

  return jsonb_build_object(
    'targetProfitCny', v_target,
    'actualProfitCny', v_actual_profit,
    'profitAchievementPct', case when v_target = 0 then null else round(v_actual_profit / v_target * 100, 1) end,
    'gaBudgetCny', v_ga_budget,
    'gaActualCny', v_ga_actual,
    'gaAchievementPct', case when v_ga_budget = 0 then null else round(v_ga_actual / v_ga_budget * 100, 1) end
  );
end;
$$;

-- 자금 위험 요약 (자금집행의 get_cash_position/get_dividend_available을 그대로 호출해 재사용)
create or replace function get_fund_risk_summary(
  p_access_key text,
  p_corp text,
  p_yearmonth text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_branch_scope text;
  v_corp text;
  v_cash jsonb;
  v_loan_balance numeric;
  v_dividend numeric;
  v_beginning numeric;
  v_ending numeric;
begin
  select role, branch_scope into v_role, v_branch_scope from verify_access_key(p_access_key);
  v_corp := coalesce(v_branch_scope, p_corp);

  v_cash := get_cash_position(p_access_key, v_corp, p_yearmonth);
  v_beginning := (v_cash->>'beginningCny')::numeric;
  v_ending := (v_cash->>'endingCny')::numeric;

  select coalesce(sum(balance_cny), 0) into v_loan_balance from fund_loans where corp = v_corp and active = true;
  v_dividend := get_dividend_available(p_access_key, v_corp, p_yearmonth);

  return jsonb_build_object(
    'endingCny', v_ending,
    'prevEndingCny', v_beginning,
    'cashChangePct', case when v_beginning = 0 then null else round((v_ending - v_beginning) / v_beginning * 100, 1) end,
    'totalLoanBalanceCny', v_loan_balance,
    'dividendAvailableCny', v_dividend
  );
end;
$$;

-- 목표실적 관리표: 법인 산하 지점별 목표영업이익(예산관리) 대비 실적(회계관리 PL_KR) +
-- 인원수/접대비/출장비(회계관리 acct_pl_kr_extra) 종합. p_yearmonth가 속한 해의 1월부터
-- p_yearmonth까지 누계로 집계합니다 (예: 2026-03이면 1~3월 누계). 흐름지표(매출/이익 등)는
-- 합산, 인원수는 값이 입력된 달의 평균을 사용합니다.
-- ⚠ 이 함수도 계정코드를 하드코딩합니다: 매출액 500000, 매출원가 600000, 매출이익 699999,
-- 관리비 700000, 영업이익(한국식) 799999, 당기순이익 999999 (전부 PL_KR statement_type).
create or replace function get_target_performance_report(
  p_access_key text,
  p_corp text,
  p_yearmonth text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_branch_scope text;
  v_corp text;
  v_year text;
  v_start text;
  v_offices text[];
  v_result jsonb := '[]'::jsonb;
  v_total jsonb;
begin
  select role, branch_scope into v_role, v_branch_scope from verify_access_key(p_access_key);
  v_corp := coalesce(v_branch_scope, p_corp);
  v_year := left(p_yearmonth, 4);
  v_start := v_year || '-01';

  select array_agg(distinct o) into v_offices
  from (
    select office as o from acct_statement_lines where corp = v_corp and statement_type = 'PL_KR' and yearmonth between v_start and p_yearmonth
    union
    select office as o from acct_pl_kr_extra where corp = v_corp and yearmonth between v_start and p_yearmonth
    union
    select office as o from bgt_target_profit where corp = v_corp and yearmonth between v_start and p_yearmonth
  ) s;

  select jsonb_agg(to_jsonb(x) order by x.office)
    into v_result
  from (
    select
      o.office,
      coalesce((select sum(target_operating_profit_cny) from bgt_target_profit where corp = v_corp and office = o.office and yearmonth between v_start and p_yearmonth), 0) as "targetOperatingProfitCny",
      coalesce((select sum(amount_cny) from acct_statement_lines where corp = v_corp and office = o.office and yearmonth between v_start and p_yearmonth and statement_type = 'PL_KR' and account_code = '500000'), 0) as "revenueCny",
      coalesce((select sum(amount_cny) from acct_statement_lines where corp = v_corp and office = o.office and yearmonth between v_start and p_yearmonth and statement_type = 'PL_KR' and account_code = '600000'), 0) as "costOfSalesCny",
      coalesce((select sum(amount_cny) from acct_statement_lines where corp = v_corp and office = o.office and yearmonth between v_start and p_yearmonth and statement_type = 'PL_KR' and account_code = '699999'), 0) as "salesProfitCny",
      coalesce((select sum(amount_cny) from acct_statement_lines where corp = v_corp and office = o.office and yearmonth between v_start and p_yearmonth and statement_type = 'PL_KR' and account_code = '700000'), 0) as "gaExpenseCny",
      coalesce((select sum(amount_cny) from acct_statement_lines where corp = v_corp and office = o.office and yearmonth between v_start and p_yearmonth and statement_type = 'PL_KR' and account_code = '799999'), 0) as "operatingProfitCny",
      coalesce((select sum(amount_cny) from acct_statement_lines where corp = v_corp and office = o.office and yearmonth between v_start and p_yearmonth and statement_type = 'PL_KR' and account_code = '999999'), 0) as "netProfitCny",
      (select round(avg(headcount)) from acct_pl_kr_extra where corp = v_corp and office = o.office and yearmonth between v_start and p_yearmonth and headcount is not null) as "headcount",
      coalesce((select sum(entertainment_cny) from acct_pl_kr_extra where corp = v_corp and office = o.office and yearmonth between v_start and p_yearmonth), 0) as "entertainmentCny",
      coalesce((select sum(travel_cny) from acct_pl_kr_extra where corp = v_corp and office = o.office and yearmonth between v_start and p_yearmonth), 0) as "travelCny"
    from (select unnest(coalesce(v_offices, array[]::text[])) as office) o
  ) x;

  -- 합계 행: 비율/생산성은 개별 지점 비율의 평균이 아니라 합산된 원본 수치로 재계산.
  -- 인원수는 지점별 평균의 합(=전체 지점 합산 인원수 근사치)을 사용합니다.
  select jsonb_build_object(
    'office', null,
    'targetOperatingProfitCny', coalesce(sum((r->>'targetOperatingProfitCny')::numeric), 0),
    'revenueCny', coalesce(sum((r->>'revenueCny')::numeric), 0),
    'costOfSalesCny', coalesce(sum((r->>'costOfSalesCny')::numeric), 0),
    'salesProfitCny', coalesce(sum((r->>'salesProfitCny')::numeric), 0),
    'gaExpenseCny', coalesce(sum((r->>'gaExpenseCny')::numeric), 0),
    'operatingProfitCny', coalesce(sum((r->>'operatingProfitCny')::numeric), 0),
    'netProfitCny', coalesce(sum((r->>'netProfitCny')::numeric), 0),
    'headcount', coalesce(sum((r->>'headcount')::numeric), 0),
    'entertainmentCny', coalesce(sum((r->>'entertainmentCny')::numeric), 0),
    'travelCny', coalesce(sum((r->>'travelCny')::numeric), 0)
  ) into v_total
  from jsonb_array_elements(coalesce(v_result, '[]'::jsonb)) r;

  return jsonb_build_object('byOffice', coalesce(v_result, '[]'::jsonb), 'total', v_total);
end;
$$;

-- 전체 법인 비교 (system_admin/finance 전용 - 본사 통합 리포트)
create or replace function get_performance_aggregate(
  p_access_key text,
  p_yearmonth text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_corp text;
  v_result jsonb := '[]'::jsonb;
  v_revenue numeric;
  v_op numeric;
  v_net numeric;
  v_debt numeric;
  v_current numeric;
  v_budget jsonb;
  v_fund jsonb;
begin
  select role into v_role from verify_access_key(p_access_key);
  if v_role not in ('system_admin', 'finance') then
    raise exception 'unauthorized';
  end if;

  foreach v_corp in array perf_all_corps()
  loop
    select coalesce(sum(amount_cny), 0) into v_revenue from acct_statement_lines where corp = v_corp and yearmonth = p_yearmonth and statement_type = 'PL' and account_code = '500000';
    select coalesce(sum(amount_cny), 0) into v_op from acct_statement_lines where corp = v_corp and yearmonth = p_yearmonth and statement_type = 'PL' and account_code = '799999';
    select coalesce(sum(amount_cny), 0) into v_net from acct_statement_lines where corp = v_corp and yearmonth = p_yearmonth and statement_type = 'PL' and account_code = '999999';

    select case when coalesce((select sum(amount_cny) from acct_statement_lines where corp = v_corp and yearmonth = p_yearmonth and statement_type = 'BS' and account_code = 'BS-R68'), 0) = 0
                then null
                else round(coalesce((select sum(amount_cny) from acct_statement_lines where corp = v_corp and yearmonth = p_yearmonth and statement_type = 'BS' and account_code = 'BS-R58'), 0)
                     / (select sum(amount_cny) from acct_statement_lines where corp = v_corp and yearmonth = p_yearmonth and statement_type = 'BS' and account_code = 'BS-R68') * 100, 1)
           end into v_debt;
    select case when coalesce((select sum(amount_cny) from acct_statement_lines where corp = v_corp and yearmonth = p_yearmonth and statement_type = 'BS' and account_code = 'BS-R52'), 0) = 0
                then null
                else round(coalesce((select sum(amount_cny) from acct_statement_lines where corp = v_corp and yearmonth = p_yearmonth and statement_type = 'BS' and account_code = 'BS-L18'), 0)
                     / (select sum(amount_cny) from acct_statement_lines where corp = v_corp and yearmonth = p_yearmonth and statement_type = 'BS' and account_code = 'BS-R52') * 100, 1)
           end into v_current;

    v_budget := get_budget_variance_summary(p_access_key, v_corp, p_yearmonth);
    v_fund := get_fund_risk_summary(p_access_key, v_corp, p_yearmonth);

    v_result := v_result || jsonb_build_array(jsonb_build_object(
      'corp', v_corp,
      'revenueCny', v_revenue,
      'operatingMarginPct', case when v_revenue = 0 then null else round(v_op / v_revenue * 100, 1) end,
      'netMarginPct', case when v_revenue = 0 then null else round(v_net / v_revenue * 100, 1) end,
      'debtRatioPct', v_debt,
      'currentRatioPct', v_current,
      'achievementPct', v_budget->'profitAchievementPct',
      'cashChangePct', v_fund->'cashChangePct',
      'loanBalanceCny', v_fund->'totalLoanBalanceCny'
    ));
  end loop;

  return v_result;
end;
$$;

grant execute on function perf_all_corps() to anon, authenticated;
grant execute on function get_profitability_series(text, text, text, integer, text) to anon, authenticated;
grant execute on function get_stability_series(text, text, text, integer, text) to anon, authenticated;
grant execute on function get_budget_variance_summary(text, text, text, text) to anon, authenticated;
grant execute on function get_fund_risk_summary(text, text, text) to anon, authenticated;
grant execute on function get_target_performance_report(text, text, text) to anon, authenticated;
grant execute on function get_performance_aggregate(text, text) to anon, authenticated;
