-- Supabase 마이그레이션: 실적분석 (회계관리·예산관리·자금집행 데이터 종합 대시보드)
-- 사용법: Supabase 대시보드 > SQL Editor > New query 에 이 파일 전체를 붙여넣고 실행하세요.
--
-- ⚠ 전제조건: 회계관리, 예산관리, 자금집행의 schema.sql이 모두 같은 Supabase 프로젝트에 먼저
-- 적용되어 있어야 합니다. 이 모듈은 새 테이블을 만들지 않고, 세 모듈의 테이블/함수를 그대로
-- 조인·재사용하는 순수 조회(RPC) 레이어입니다:
--   - 회계관리: access_keys, verify_access_key(), acct_accounts, acct_statement_lines, acct_pl_kr_extra
--   - 예산관리: bgt_target_profit, bgt_ga_lines
--   - 자금집행: fund_cash_positions, fund_loans, get_cash_position(), get_dividend_available()
--
-- ⚠ 계정코드 하드코딩 안내: 아래 함수들은 회계관리 seed_accounts.sql의 실제 계정코드를 참조합니다
-- (매출액 500000, 매출원가 600000, 매출이익 699999, 관리비 700000, 영업이익 799999, 당기순이익
-- 999999, 유동자산합계 BS-L16, 유동부채합계 BS-R42, 부채합계 BS-R47, 자본총계 BS-R56, 자산총계
-- BS-L29). v6(회계관리 BS 58개 재작성)에서 코드가 바뀌면서 이전 버전(BS-L18/BS-R52/BS-R58/
-- BS-R68)이 전부 비활성화된 코드를 가리키고 있던 버그를 이번에 함께 수정했습니다. 회계관리에서
-- 계정과목을 다시 교체하면 이 파일의 해당 코드를 새 코드에 맞게 바꿔서 다시 실행해야 합니다.
--
-- ⚠ 법인 목록 하드코딩 안내: get_performance_aggregate()는 6개 법인 목록을 하드코딩합니다
-- (각 모듈의 config.js CORPORATIONS와 동일한 값). 법인이 추가/변경되면 이 배열도 함께 수정하세요.
--
-- ⚠ office_scope 안내: verify_access_key()는 role/branch_scope/office_scope 3개를 반환합니다.
-- office_scope가 설정된 키(예: 상해지점 전용 키)는 그 지점 데이터만 조회할 수 있도록 아래 모든
-- 함수에서 p_office를 office_scope로 강제 치환합니다 (v_office := coalesce(v_office_scope, p_office)).

-- 전체 법인 목록 (config.js CORPORATIONS.ko 값과 동일하게 유지)
create or replace function perf_all_corps() returns text[]
language sql immutable
as $$
  select array['YJC 포워딩','상해물류센터','흥아물류','윤봉물류','청도 CY','창씽 CY'];
$$;

-- ⚠ 구 버전(office_scope 미반영) 함수 제거 후 재생성
drop function if exists get_target_performance_report(text, text, text);

-- 최근 N개월 수익성 추이 (매출/매출이익/영업이익(한국식)/순이익, 흐름지표이므로 프론트에서 기간 합산).
-- ⚠ statement_type='PL_KR'(한국식 PL)을 사용합니다 - 예산관리/목표실적표와 동일한 기준으로 맞춰서
-- "한국식 영업이익" 표기와 실제 비교 대상이 일치하도록 한 것입니다 (기존에는 statement_type='PL'
-- 이었던 것을 이번 수정에서 통일했습니다).
-- p_office가 비어있으면 법인 전체(전 지점 합산), 지정하면 그 지점만. office_scope가 있으면 강제.
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
  v_office_scope text;
  v_corp text;
  v_office text;
  v_result jsonb;
begin
  select role, branch_scope, office_scope into v_role, v_branch_scope, v_office_scope from verify_access_key(p_access_key);
  v_corp := coalesce(v_branch_scope, p_corp);
  v_office := coalesce(v_office_scope, p_office);

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
      coalesce((select sum(amount_cny) from acct_statement_lines where corp = v_corp and yearmonth = m.yearmonth and statement_type = 'PL_KR' and account_code = '500000' and (nullif(v_office, '') is null or office = v_office)), 0) as "revenueCny",
      coalesce((select sum(amount_cny) from acct_statement_lines where corp = v_corp and yearmonth = m.yearmonth and statement_type = 'PL_KR' and account_code = '699999' and (nullif(v_office, '') is null or office = v_office)), 0) as "salesProfitCny",
      coalesce((select sum(amount_cny) from acct_statement_lines where corp = v_corp and yearmonth = m.yearmonth and statement_type = 'PL_KR' and account_code = '799999' and (nullif(v_office, '') is null or office = v_office)), 0) as "operatingProfitCny",
      coalesce((select sum(amount_cny) from acct_statement_lines where corp = v_corp and yearmonth = m.yearmonth and statement_type = 'PL_KR' and account_code = '999999' and (nullif(v_office, '') is null or office = v_office)), 0) as "netProfitCny"
    from months m
  ) x;

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

-- 최근 N개월 재무안정성 비율 (부채비율/유동비율, 저량지표이므로 프론트에서 기간말 값만 사용)
-- p_office가 비어있으면 법인 전체(전 지점 합산), 지정하면 그 지점만. office_scope가 있으면 강제.
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
  v_office_scope text;
  v_corp text;
  v_office text;
  v_result jsonb;
begin
  select role, branch_scope, office_scope into v_role, v_branch_scope, v_office_scope from verify_access_key(p_access_key);
  v_corp := coalesce(v_branch_scope, p_corp);
  v_office := coalesce(v_office_scope, p_office);

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
      coalesce((select sum(amount_cny) from acct_statement_lines where corp = v_corp and yearmonth = m.yearmonth and statement_type = 'BS' and account_code = 'BS-L16' and (nullif(v_office, '') is null or office = v_office)), 0) as current_assets,
      coalesce((select sum(amount_cny) from acct_statement_lines where corp = v_corp and yearmonth = m.yearmonth and statement_type = 'BS' and account_code = 'BS-R42' and (nullif(v_office, '') is null or office = v_office)), 0) as current_liabilities,
      coalesce((select sum(amount_cny) from acct_statement_lines where corp = v_corp and yearmonth = m.yearmonth and statement_type = 'BS' and account_code = 'BS-R47' and (nullif(v_office, '') is null or office = v_office)), 0) as total_liabilities,
      coalesce((select sum(amount_cny) from acct_statement_lines where corp = v_corp and yearmonth = m.yearmonth and statement_type = 'BS' and account_code = 'BS-R56' and (nullif(v_office, '') is null or office = v_office)), 0) as total_equity
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

-- 목표영업이익/예산 달성 요약 (한 달, 지점 기준).
-- p_office가 비어있으면 법인 전체(전 지점 합산), 지정하면 그 지점만. office_scope가 있으면 강제.
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
  v_office_scope text;
  v_corp text;
  v_office text;
  v_target numeric;
  v_actual_profit numeric;
  v_ga_budget numeric;
  v_ga_actual numeric;
begin
  select role, branch_scope, office_scope into v_role, v_branch_scope, v_office_scope from verify_access_key(p_access_key);
  v_corp := coalesce(v_branch_scope, p_corp);
  v_office := coalesce(v_office_scope, p_office);

  select coalesce(sum(target_operating_profit_cny), 0) into v_target
  from bgt_target_profit
  where corp = v_corp and yearmonth = p_yearmonth and (nullif(v_office, '') is null or office = v_office);

  select coalesce(sum(amount_cny), 0) into v_actual_profit
  from acct_statement_lines
  where corp = v_corp and yearmonth = p_yearmonth and statement_type = 'PL_KR' and account_code = '799999'
    and (nullif(v_office, '') is null or office = v_office);

  select coalesce(sum(fixed_cny + variable_cny), 0) into v_ga_budget
  from bgt_ga_lines
  where corp = v_corp and yearmonth = p_yearmonth and kind = 'budget' and (nullif(v_office, '') is null or office = v_office);

  select coalesce(sum(fixed_cny + variable_cny), 0) into v_ga_actual
  from bgt_ga_lines
  where corp = v_corp and yearmonth = p_yearmonth and kind = 'actual' and (nullif(v_office, '') is null or office = v_office);

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

-- 법인 단위 재무비율: ROE/ROI/부채비율/자기자본비율 (지점 세분화 없음 - 사용자 확정 사항).
-- ROE = 당기순이익/자본총계, ROI = 당기순이익/자산총계(총자산이익률), 부채비율 = 부채총계/자본총계,
-- 자기자본비율 = 자본총계/자산총계.
create or replace function get_financial_ratios(
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
  v_net_profit numeric;
  v_total_assets numeric;
  v_total_equity numeric;
  v_total_liabilities numeric;
begin
  select role, branch_scope into v_role, v_branch_scope from verify_access_key(p_access_key);
  v_corp := coalesce(v_branch_scope, p_corp);

  select coalesce(sum(amount_cny), 0) into v_net_profit from acct_statement_lines
    where corp = v_corp and yearmonth = p_yearmonth and statement_type = 'PL' and account_code = '999999';
  select coalesce(sum(amount_cny), 0) into v_total_assets from acct_statement_lines
    where corp = v_corp and yearmonth = p_yearmonth and statement_type = 'BS' and account_code = 'BS-L29';
  select coalesce(sum(amount_cny), 0) into v_total_equity from acct_statement_lines
    where corp = v_corp and yearmonth = p_yearmonth and statement_type = 'BS' and account_code = 'BS-R56';
  select coalesce(sum(amount_cny), 0) into v_total_liabilities from acct_statement_lines
    where corp = v_corp and yearmonth = p_yearmonth and statement_type = 'BS' and account_code = 'BS-R47';

  return jsonb_build_object(
    'netProfitCny', v_net_profit,
    'totalAssetsCny', v_total_assets,
    'totalEquityCny', v_total_equity,
    'totalLiabilitiesCny', v_total_liabilities,
    'roePct', case when v_total_equity = 0 then null else round(v_net_profit / v_total_equity * 100, 1) end,
    'roiPct', case when v_total_assets = 0 then null else round(v_net_profit / v_total_assets * 100, 1) end,
    'debtRatioPct', case when v_total_equity = 0 then null else round(v_total_liabilities / v_total_equity * 100, 1) end,
    'equityRatioPct', case when v_total_assets = 0 then null else round(v_total_equity / v_total_assets * 100, 1) end
  );
end;
$$;

-- 내부 헬퍼(그랜트 없음, RPC로 직접 호출 불가): 지정된 법인/지점/기간(YYYY-MM~YYYY-MM)의
-- 목표실적 관리표 한 구간(월/분기/반기/연간 버킷 1개) 데이터를 계산합니다.
-- p_office가 null/빈 문자열이면 그 법인의 전 지점 합산.
create or replace function perf_target_bucket(
  p_corp text,
  p_office text,
  p_start_ym text,
  p_end_ym text
) returns jsonb
language plpgsql
stable
as $$
declare
  v_target numeric;
  v_revenue numeric;
  v_cost numeric;
  v_sales_profit numeric;
  v_ga numeric;
  v_op numeric;
  v_net numeric;
  v_headcount numeric;
  v_entertainment numeric;
  v_travel numeric;
begin
  select coalesce(sum(target_operating_profit_cny), 0) into v_target from bgt_target_profit
    where corp = p_corp and (nullif(p_office, '') is null or office = p_office) and yearmonth between p_start_ym and p_end_ym;
  select coalesce(sum(amount_cny), 0) into v_revenue from acct_statement_lines
    where corp = p_corp and (nullif(p_office, '') is null or office = p_office) and yearmonth between p_start_ym and p_end_ym and statement_type = 'PL_KR' and account_code = '500000';
  select coalesce(sum(amount_cny), 0) into v_cost from acct_statement_lines
    where corp = p_corp and (nullif(p_office, '') is null or office = p_office) and yearmonth between p_start_ym and p_end_ym and statement_type = 'PL_KR' and account_code = '600000';
  select coalesce(sum(amount_cny), 0) into v_sales_profit from acct_statement_lines
    where corp = p_corp and (nullif(p_office, '') is null or office = p_office) and yearmonth between p_start_ym and p_end_ym and statement_type = 'PL_KR' and account_code = '699999';
  select coalesce(sum(amount_cny), 0) into v_ga from acct_statement_lines
    where corp = p_corp and (nullif(p_office, '') is null or office = p_office) and yearmonth between p_start_ym and p_end_ym and statement_type = 'PL_KR' and account_code = '700000';
  select coalesce(sum(amount_cny), 0) into v_op from acct_statement_lines
    where corp = p_corp and (nullif(p_office, '') is null or office = p_office) and yearmonth between p_start_ym and p_end_ym and statement_type = 'PL_KR' and account_code = '799999';
  select coalesce(sum(amount_cny), 0) into v_net from acct_statement_lines
    where corp = p_corp and (nullif(p_office, '') is null or office = p_office) and yearmonth between p_start_ym and p_end_ym and statement_type = 'PL_KR' and account_code = '999999';
  select round(avg(headcount)) into v_headcount from acct_pl_kr_extra
    where corp = p_corp and (nullif(p_office, '') is null or office = p_office) and yearmonth between p_start_ym and p_end_ym and headcount is not null;
  select coalesce(sum(entertainment_cny), 0) into v_entertainment from acct_pl_kr_extra
    where corp = p_corp and (nullif(p_office, '') is null or office = p_office) and yearmonth between p_start_ym and p_end_ym;
  select coalesce(sum(travel_cny), 0) into v_travel from acct_pl_kr_extra
    where corp = p_corp and (nullif(p_office, '') is null or office = p_office) and yearmonth between p_start_ym and p_end_ym;

  return jsonb_build_object(
    'targetOperatingProfitCny', v_target,
    'operatingProfitCny', v_op,
    'overachievedCny', v_op - v_target,
    'achievementPct', case when v_target = 0 then null else round(v_op / v_target * 100, 1) end,
    'headcount', coalesce(v_headcount, 0),
    'productivity', case when coalesce(v_headcount, 0) = 0 then null else round(v_op / v_headcount, 0) end,
    'revenueCny', v_revenue,
    'costOfSalesCny', v_cost,
    'salesProfitCny', v_sales_profit,
    'gaExpenseCny', v_ga,
    'netProfitCny', v_net,
    'entertainmentCny', v_entertainment,
    'travelCny', v_travel
  );
end;
$$;

-- 목표실적 관리표 (단일 지점, 기간 시계열). 지점 화면: 접속 지점의 1~선택월까지 월별 컬럼(월 선택시),
-- 각 분기/반기 누계(분기/반기 선택시), 연간 누계 1컬럼(연간 선택시) + 맨 끝에 "합계" 컬럼을 반환합니다.
-- 관리자 화면의 "지점 선택" 모드(1~12월 + 합계)에서도 재사용합니다. office_scope가 있으면 강제.
create or replace function get_target_performance_series(
  p_access_key text,
  p_corp text,
  p_office text,
  p_year text,
  p_end_month text,
  p_period_type text default 'month'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_branch_scope text;
  v_office_scope text;
  v_corp text;
  v_office text;
  v_end_num int;
  v_result jsonb := '[]'::jsonb;
  v_bucket_start int;
  v_bucket_end int;
  v_start_ym text;
  v_end_ym text;
  v_row jsonb;
  i int;
begin
  select role, branch_scope, office_scope into v_role, v_branch_scope, v_office_scope from verify_access_key(p_access_key);
  v_corp := coalesce(v_branch_scope, p_corp);
  v_office := coalesce(v_office_scope, p_office);
  v_end_num := p_end_month::int;

  if p_period_type = 'annual' then
    v_row := perf_target_bucket(v_corp, v_office, p_year || '-01', p_year || '-' || lpad(p_end_month, 2, '0'));
    v_result := jsonb_build_array(jsonb_set(v_row, '{label}', to_jsonb(p_year || '년')));
  elsif p_period_type = 'half' then
    for i in 1..ceil(v_end_num / 6.0)::int loop
      v_bucket_start := (i - 1) * 6 + 1;
      v_bucket_end := least(i * 6, v_end_num);
      v_start_ym := p_year || '-' || lpad(v_bucket_start::text, 2, '0');
      v_end_ym := p_year || '-' || lpad(v_bucket_end::text, 2, '0');
      v_row := perf_target_bucket(v_corp, v_office, v_start_ym, v_end_ym);
      v_result := v_result || jsonb_build_array(jsonb_set(v_row, '{label}', to_jsonb(case when i = 1 then '상반기' else '하반기' end)));
    end loop;
  elsif p_period_type = 'quarter' then
    for i in 1..ceil(v_end_num / 3.0)::int loop
      v_bucket_start := (i - 1) * 3 + 1;
      v_bucket_end := least(i * 3, v_end_num);
      v_start_ym := p_year || '-' || lpad(v_bucket_start::text, 2, '0');
      v_end_ym := p_year || '-' || lpad(v_bucket_end::text, 2, '0');
      v_row := perf_target_bucket(v_corp, v_office, v_start_ym, v_end_ym);
      v_result := v_result || jsonb_build_array(jsonb_set(v_row, '{label}', to_jsonb(i || '분기')));
    end loop;
  else
    for i in 1..v_end_num loop
      v_start_ym := p_year || '-' || lpad(i::text, 2, '0');
      v_row := perf_target_bucket(v_corp, v_office, v_start_ym, v_start_ym);
      v_result := v_result || jsonb_build_array(jsonb_set(v_row, '{label}', to_jsonb(i || '월')));
    end loop;
  end if;

  v_row := perf_target_bucket(v_corp, v_office, p_year || '-01', p_year || '-' || lpad(p_end_month, 2, '0'));
  v_result := v_result || jsonb_build_array(jsonb_set(v_row, '{label}', to_jsonb('합계')));

  return jsonb_build_object('corp', v_corp, 'office', v_office, 'periods', v_result);
end;
$$;

-- 목표실적 관리표 (관리자용, 법인 그룹 × 기간 1개). p_group='yjc'면 YJC 포워딩 단독(지점별 컬럼 +
-- 합계). p_group='other'면 흥아물류(지점별 컬럼 + 흥아물류 합계) 뒤에 상해물류센터/윤봉물류/
-- 창씽 CY/청도 CY를 각각 법인 단일 컬럼으로 이어붙여 첨부 엑셀 원본과 동일한 컬럼 구성을 만듭니다.
-- 각 컬럼은 선택 기간(p_period_type/p_period_value)의 당해 실적과 전년동기 실적을 함께 반환하여
-- 프론트에서 "전년동기대비 증감" 블록을 추가 호출 없이 계산할 수 있게 합니다. system_admin/finance 전용.
create or replace function get_target_performance_group(
  p_access_key text,
  p_group text,
  p_year text,
  p_period_type text default 'month',
  p_period_value text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_start_ym text;
  v_end_ym text;
  v_prior_start text;
  v_prior_end text;
  v_cols jsonb := '[]'::jsonb;
  v_columns jsonb := '[]'::jsonb;
  v_corp text;
  rec record;
begin
  select role into v_role from verify_access_key(p_access_key);
  if v_role not in ('system_admin', 'finance') then
    raise exception 'unauthorized';
  end if;

  if p_period_type = 'annual' then
    v_start_ym := p_year || '-01'; v_end_ym := p_year || '-12';
  elsif p_period_type = 'half' then
    if p_period_value = 'H1' then v_start_ym := p_year || '-01'; v_end_ym := p_year || '-06';
    else v_start_ym := p_year || '-07'; v_end_ym := p_year || '-12'; end if;
  elsif p_period_type = 'quarter' then
    v_start_ym := p_year || '-' || lpad(((p_period_value::int - 1) * 3 + 1)::text, 2, '0');
    v_end_ym := p_year || '-' || lpad((p_period_value::int * 3)::text, 2, '0');
  else
    v_start_ym := p_year || '-' || lpad(p_period_value, 2, '0');
    v_end_ym := v_start_ym;
  end if;

  v_prior_start := (left(v_start_ym, 4)::int - 1)::text || right(v_start_ym, 3);
  v_prior_end := (left(v_end_ym, 4)::int - 1)::text || right(v_end_ym, 3);

  if p_group = 'yjc' then
    for rec in
      select distinct office from (
        select office from acct_statement_lines where corp = 'YJC 포워딩' and statement_type = 'PL_KR' and yearmonth between v_start_ym and v_end_ym
        union
        select office from acct_pl_kr_extra where corp = 'YJC 포워딩' and yearmonth between v_start_ym and v_end_ym
        union
        select office from bgt_target_profit where corp = 'YJC 포워딩' and yearmonth between v_start_ym and v_end_ym
      ) s where office is not null and office <> '' order by office
    loop
      v_cols := v_cols || jsonb_build_array(jsonb_build_object('label', rec.office, 'corp', 'YJC 포워딩', 'office', rec.office));
    end loop;
    v_cols := v_cols || jsonb_build_array(jsonb_build_object('label', '합계', 'corp', 'YJC 포워딩', 'office', null));
  else
    for rec in
      select distinct office from (
        select office from acct_statement_lines where corp = '흥아물류' and statement_type = 'PL_KR' and yearmonth between v_start_ym and v_end_ym
        union
        select office from acct_pl_kr_extra where corp = '흥아물류' and yearmonth between v_start_ym and v_end_ym
        union
        select office from bgt_target_profit where corp = '흥아물류' and yearmonth between v_start_ym and v_end_ym
      ) s where office is not null and office <> '' order by office
    loop
      v_cols := v_cols || jsonb_build_array(jsonb_build_object('label', rec.office, 'corp', '흥아물류', 'office', rec.office));
    end loop;
    v_cols := v_cols || jsonb_build_array(jsonb_build_object('label', '흥아물류 합계', 'corp', '흥아물류', 'office', null));
    foreach v_corp in array array['상해물류센터', '윤봉물류', '창씽 CY', '청도 CY']
    loop
      v_cols := v_cols || jsonb_build_array(jsonb_build_object('label', v_corp, 'corp', v_corp, 'office', null));
    end loop;
  end if;

  for rec in select * from jsonb_to_recordset(v_cols) as x(label text, corp text, office text)
  loop
    v_columns := v_columns || jsonb_build_array(jsonb_build_object(
      'label', rec.label,
      'current', perf_target_bucket(rec.corp, rec.office, v_start_ym, v_end_ym),
      'prior', perf_target_bucket(rec.corp, rec.office, v_prior_start, v_prior_end)
    ));
  end loop;

  return jsonb_build_object('startYm', v_start_ym, 'endYm', v_end_ym, 'priorStartYm', v_prior_start, 'priorEndYm', v_prior_end, 'columns', v_columns);
end;
$$;

-- 전체 법인 비교 (system_admin/finance 전용 - 본사 통합 리포트, 경영지표 페이지에서 사용)
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
  v_assets numeric;
  v_equity numeric;
  v_liabilities numeric;
  v_current_assets numeric;
  v_current_liabilities numeric;
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

    select coalesce(sum(amount_cny), 0) into v_assets from acct_statement_lines where corp = v_corp and yearmonth = p_yearmonth and statement_type = 'BS' and account_code = 'BS-L29';
    select coalesce(sum(amount_cny), 0) into v_equity from acct_statement_lines where corp = v_corp and yearmonth = p_yearmonth and statement_type = 'BS' and account_code = 'BS-R56';
    select coalesce(sum(amount_cny), 0) into v_liabilities from acct_statement_lines where corp = v_corp and yearmonth = p_yearmonth and statement_type = 'BS' and account_code = 'BS-R47';
    select coalesce(sum(amount_cny), 0) into v_current_assets from acct_statement_lines where corp = v_corp and yearmonth = p_yearmonth and statement_type = 'BS' and account_code = 'BS-L16';
    select coalesce(sum(amount_cny), 0) into v_current_liabilities from acct_statement_lines where corp = v_corp and yearmonth = p_yearmonth and statement_type = 'BS' and account_code = 'BS-R42';

    v_budget := get_budget_variance_summary(p_access_key, v_corp, p_yearmonth);
    v_fund := get_fund_risk_summary(p_access_key, v_corp, p_yearmonth);

    v_result := v_result || jsonb_build_array(jsonb_build_object(
      'corp', v_corp,
      'revenueCny', v_revenue,
      'operatingMarginPct', case when v_revenue = 0 then null else round(v_op / v_revenue * 100, 1) end,
      'netMarginPct', case when v_revenue = 0 then null else round(v_net / v_revenue * 100, 1) end,
      'debtRatioPct', case when v_equity = 0 then null else round(v_liabilities / v_equity * 100, 1) end,
      'currentRatioPct', case when v_current_liabilities = 0 then null else round(v_current_assets / v_current_liabilities * 100, 1) end,
      'roePct', case when v_equity = 0 then null else round(v_net / v_equity * 100, 1) end,
      'roiPct', case when v_assets = 0 then null else round(v_net / v_assets * 100, 1) end,
      'equityRatioPct', case when v_assets = 0 then null else round(v_equity / v_assets * 100, 1) end,
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
grant execute on function get_financial_ratios(text, text, text) to anon, authenticated;
grant execute on function get_target_performance_series(text, text, text, text, text, text) to anon, authenticated;
grant execute on function get_target_performance_group(text, text, text, text, text) to anon, authenticated;
grant execute on function get_performance_aggregate(text, text) to anon, authenticated;
