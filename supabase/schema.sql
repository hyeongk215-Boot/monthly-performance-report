-- Supabase 마이그레이션: 실적분석 (회계관리·예산관리·자금집행 데이터 종합 대시보드)
-- 사용법: Supabase 대시보드 > SQL Editor > New query 에 이 파일 전체를 붙여넣고 실행하세요.
--
-- ⚠ 전제조건: 회계관리, 예산관리, 자금집행의 schema.sql이 모두 같은 Supabase 프로젝트에 먼저
-- 적용되어 있어야 합니다. 이 모듈은 새 테이블을 만들지 않고, 세 모듈의 테이블/함수를 그대로
-- 조인·재사용하는 순수 조회(RPC) 레이어입니다:
--   - 회계관리: access_keys, verify_access_key(), acct_accounts, acct_statement_lines
--   - 예산관리: bgt_budget_lines
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

-- 최근 N개월 수익성 추이 (매출/영업이익/순이익, 흐름지표이므로 프론트에서 기간 합산)
create or replace function get_profitability_series(
  p_access_key text,
  p_corp text,
  p_yearmonth text,
  p_months_back integer default 12
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
      coalesce((select amount_cny from acct_statement_lines where corp = v_corp and yearmonth = m.yearmonth and statement_type = 'PL' and account_code = '500000'), 0) as "revenueCny",
      coalesce((select amount_cny from acct_statement_lines where corp = v_corp and yearmonth = m.yearmonth and statement_type = 'PL' and account_code = '799999'), 0) as "operatingProfitCny",
      coalesce((select amount_cny from acct_statement_lines where corp = v_corp and yearmonth = m.yearmonth and statement_type = 'PL' and account_code = '999999'), 0) as "netProfitCny"
    from months m
  ) x;

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

-- 최근 N개월 재무안정성 비율 (부채비율/유동비율, 저량지표이므로 프론트에서 기간말 값만 사용)
create or replace function get_stability_series(
  p_access_key text,
  p_corp text,
  p_yearmonth text,
  p_months_back integer default 12
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
      coalesce((select amount_cny from acct_statement_lines where corp = v_corp and yearmonth = m.yearmonth and statement_type = 'BS' and account_code = 'BS-L18'), 0) as current_assets,
      coalesce((select amount_cny from acct_statement_lines where corp = v_corp and yearmonth = m.yearmonth and statement_type = 'BS' and account_code = 'BS-R52'), 0) as current_liabilities,
      coalesce((select amount_cny from acct_statement_lines where corp = v_corp and yearmonth = m.yearmonth and statement_type = 'BS' and account_code = 'BS-R58'), 0) as total_liabilities,
      coalesce((select amount_cny from acct_statement_lines where corp = v_corp and yearmonth = m.yearmonth and statement_type = 'BS' and account_code = 'BS-R68'), 0) as total_equity
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

-- 예산 대비 실적 요약 (한 달, PL 비소계 계정 기준)
create or replace function get_budget_variance_summary(
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
  v_total_budget numeric;
  v_total_actual numeric;
  v_over jsonb;
begin
  select role, branch_scope into v_role, v_branch_scope from verify_access_key(p_access_key);
  v_corp := coalesce(v_branch_scope, p_corp);

  select coalesce(sum(coalesce(b.amount_cny, 0)), 0), coalesce(sum(coalesce(act.amount_cny, 0)), 0)
    into v_total_budget, v_total_actual
  from acct_accounts a
  left join bgt_budget_lines b on b.corp = v_corp and b.yearmonth = p_yearmonth and b.account_code = a.code
  left join acct_statement_lines act on act.corp = v_corp and act.yearmonth = p_yearmonth
    and act.statement_type = 'PL' and act.account_code = a.code
  where a.statement_type = 'PL' and a.active = true and a.is_subtotal = false;

  select coalesce(jsonb_agg(to_jsonb(x) order by x."accountCode"), '[]'::jsonb) into v_over
  from (
    select a.code as "accountCode", a.name_ko as "nameKo", a.name_zh as "nameZh",
           coalesce(b.amount_cny, 0) as "budgetCny", coalesce(act.amount_cny, 0) as "actualCny"
    from acct_accounts a
    left join bgt_budget_lines b on b.corp = v_corp and b.yearmonth = p_yearmonth and b.account_code = a.code
    left join acct_statement_lines act on act.corp = v_corp and act.yearmonth = p_yearmonth
      and act.statement_type = 'PL' and act.account_code = a.code
    where a.statement_type = 'PL' and a.active = true and a.is_subtotal = false
      and coalesce(b.amount_cny, 0) > 0 and coalesce(act.amount_cny, 0) > coalesce(b.amount_cny, 0)
  ) x;

  return jsonb_build_object(
    'totalBudgetCny', v_total_budget,
    'totalActualCny', v_total_actual,
    'achievementPct', case when v_total_budget = 0 then null else round(v_total_actual / v_total_budget * 100, 1) end,
    'overAccounts', v_over
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
    select coalesce(amount_cny, 0) into v_revenue from acct_statement_lines where corp = v_corp and yearmonth = p_yearmonth and statement_type = 'PL' and account_code = '500000';
    select coalesce(amount_cny, 0) into v_op from acct_statement_lines where corp = v_corp and yearmonth = p_yearmonth and statement_type = 'PL' and account_code = '799999';
    select coalesce(amount_cny, 0) into v_net from acct_statement_lines where corp = v_corp and yearmonth = p_yearmonth and statement_type = 'PL' and account_code = '999999';

    select case when coalesce((select amount_cny from acct_statement_lines where corp = v_corp and yearmonth = p_yearmonth and statement_type = 'BS' and account_code = 'BS-R68'), 0) = 0
                then null
                else round(coalesce((select amount_cny from acct_statement_lines where corp = v_corp and yearmonth = p_yearmonth and statement_type = 'BS' and account_code = 'BS-R58'), 0)
                     / (select amount_cny from acct_statement_lines where corp = v_corp and yearmonth = p_yearmonth and statement_type = 'BS' and account_code = 'BS-R68') * 100, 1)
           end into v_debt;
    select case when coalesce((select amount_cny from acct_statement_lines where corp = v_corp and yearmonth = p_yearmonth and statement_type = 'BS' and account_code = 'BS-R52'), 0) = 0
                then null
                else round(coalesce((select amount_cny from acct_statement_lines where corp = v_corp and yearmonth = p_yearmonth and statement_type = 'BS' and account_code = 'BS-L18'), 0)
                     / (select amount_cny from acct_statement_lines where corp = v_corp and yearmonth = p_yearmonth and statement_type = 'BS' and account_code = 'BS-R52') * 100, 1)
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
      'achievementPct', v_budget->'achievementPct',
      'cashChangePct', v_fund->'cashChangePct',
      'loanBalanceCny', v_fund->'totalLoanBalanceCny'
    ));
  end loop;

  return v_result;
end;
$$;

grant execute on function perf_all_corps() to anon, authenticated;
grant execute on function get_profitability_series(text, text, text, integer) to anon, authenticated;
grant execute on function get_stability_series(text, text, text, integer) to anon, authenticated;
grant execute on function get_budget_variance_summary(text, text, text) to anon, authenticated;
grant execute on function get_fund_risk_summary(text, text, text) to anon, authenticated;
grant execute on function get_performance_aggregate(text, text) to anon, authenticated;
