-- 실적분석 마이그레이션 2026-09: 목표실적 관리표 컬럼 순서 고정 + 홍콩 분리
-- 사용법: Supabase 대시보드 > SQL Editor > **New query** 에 이 파일 전체를 붙여넣고 실행하세요.
--         (저장해 둔 기존 스니펫을 다시 실행하면 이 변경이 반영되지 않습니다.)
--
-- 무엇이 바뀌는가
--   1. YJC 포워딩 지점 컬럼이 데이터 유무와 무관하게 본사 양식 순서로 고정됩니다.
--      상해 · 닝보 · 남경 · 천진 · 대련 · 청도 · 위해 · 연태 · 심천 · 광주 · 충칭 · 합계 · 홍콩
--   2. "합계"가 대륙 11개 지점만 더합니다. 기존에는 법인 전체 합산이라 HKD로 기표되는
--      홍콩 지점 금액까지 CNY 합계에 섞여 들어가고 있었습니다. 홍콩은 합계 뒤 별도 컬럼입니다.
--   3. 고정 목록에 없는 지점이 데이터에 있으면 합계에서 조용히 빠지지 않도록 고정 컬럼 뒤에
--      이어 붙이고 합계 대상에도 넣습니다.
--
-- 함수만 교체합니다. 테이블·행은 전혀 건드리지 않습니다.
-- 롤백이 필요하면 이 마이그레이션 이전의 schema.sql을 다시 실행하면 됩니다.

-- YJC 포워딩 목표실적 관리표의 중국 대륙 지점 고정 순서입니다.
-- 이 순서는 본사 제출 양식과 동일해야 하므로 데이터 유무와 무관하게 항상 이 순서로 컬럼을 냅니다.
-- 홍콩은 통화가 달라(HKD) 소계에 합산하면 안 되므로 여기에 넣지 않고 소계 뒤에 별도 컬럼으로 붙입니다.
create or replace function perf_yjc_offices() returns text[]
language sql immutable
as $$
  select array['상해', '닝보', '남경', '천진', '대련', '청도', '위해', '연태', '심천', '광주', '충칭'];
$$;

-- 목표실적 관리표 한 구간(월/분기/반기/연간 버킷 1개) 데이터를 계산합니다.
-- p_offices가 null이면 그 법인의 전 지점 합산, 배열이면 그 지점들만 합산합니다.
-- (지점 여러 개를 골라 합산해야 하는 이유: YJC 소계는 홍콩을 제외한 대륙 11개 지점만 더해야 합니다.)
create or replace function perf_target_bucket_offices(
  p_corp text,
  p_offices text[],
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
    where corp = p_corp and (p_offices is null or office = any(p_offices)) and yearmonth between p_start_ym and p_end_ym;
  select coalesce(sum(amount_cny), 0) into v_revenue from acct_statement_lines
    where corp = p_corp and (p_offices is null or office = any(p_offices)) and yearmonth between p_start_ym and p_end_ym and statement_type = 'PL_KR' and account_code = '500000';
  select coalesce(sum(amount_cny), 0) into v_cost from acct_statement_lines
    where corp = p_corp and (p_offices is null or office = any(p_offices)) and yearmonth between p_start_ym and p_end_ym and statement_type = 'PL_KR' and account_code = '600000';
  select coalesce(sum(amount_cny), 0) into v_sales_profit from acct_statement_lines
    where corp = p_corp and (p_offices is null or office = any(p_offices)) and yearmonth between p_start_ym and p_end_ym and statement_type = 'PL_KR' and account_code = '699999';
  select coalesce(sum(amount_cny), 0) into v_ga from acct_statement_lines
    where corp = p_corp and (p_offices is null or office = any(p_offices)) and yearmonth between p_start_ym and p_end_ym and statement_type = 'PL_KR' and account_code = '700000';
  select coalesce(sum(amount_cny), 0) into v_op from acct_statement_lines
    where corp = p_corp and (p_offices is null or office = any(p_offices)) and yearmonth between p_start_ym and p_end_ym and statement_type = 'PL_KR' and account_code = '799999';
  select coalesce(sum(amount_cny), 0) into v_net from acct_statement_lines
    where corp = p_corp and (p_offices is null or office = any(p_offices)) and yearmonth between p_start_ym and p_end_ym and statement_type = 'PL_KR' and account_code = '999999';
  select round(avg(headcount)) into v_headcount from acct_pl_kr_extra
    where corp = p_corp and (p_offices is null or office = any(p_offices)) and yearmonth between p_start_ym and p_end_ym and headcount is not null;
  select coalesce(sum(entertainment_cny), 0) into v_entertainment from acct_pl_kr_extra
    where corp = p_corp and (p_offices is null or office = any(p_offices)) and yearmonth between p_start_ym and p_end_ym;
  select coalesce(sum(travel_cny), 0) into v_travel from acct_pl_kr_extra
    where corp = p_corp and (p_offices is null or office = any(p_offices)) and yearmonth between p_start_ym and p_end_ym;

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

-- 지점 1개(또는 법인 전체) 버전. 기존 호출부가 그대로 쓰도록 시그니처를 유지한 얇은 래퍼입니다.
-- p_office가 null/빈 문자열이면 그 법인의 전 지점 합산.
create or replace function perf_target_bucket(
  p_corp text,
  p_office text,
  p_start_ym text,
  p_end_ym text
) returns jsonb
language sql
stable
as $$
  select perf_target_bucket_offices(
    p_corp,
    case when nullif(p_office, '') is null then null else array[p_office] end,
    p_start_ym,
    p_end_ym
  );
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
  v_fixed text[];
  v_subtotal text[];
  v_office text;
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
    -- 대륙 11개 지점은 본사 양식과 같은 순서로 고정합니다. 해당 기간에 데이터가 없어도 컬럼은
    -- 그대로 내보내서 달마다 컬럼 순서가 달라지지 않게 합니다.
    v_fixed := perf_yjc_offices();
    v_subtotal := v_fixed;
    foreach v_office in array v_fixed
    loop
      v_cols := v_cols || jsonb_build_array(jsonb_build_object('label', v_office, 'corp', 'YJC 포워딩', 'offices', to_jsonb(array[v_office])));
    end loop;

    -- 고정 목록에도 홍콩에도 없는 지점이 실제 데이터에 있으면 소계에서 조용히 누락되지 않도록
    -- 고정 컬럼 뒤에 이어 붙이고 소계 대상에도 포함시킵니다.
    for rec in
      select distinct office from (
        select office from acct_statement_lines where corp = 'YJC 포워딩' and statement_type = 'PL_KR' and yearmonth between v_start_ym and v_end_ym
        union
        select office from acct_pl_kr_extra where corp = 'YJC 포워딩' and yearmonth between v_start_ym and v_end_ym
        union
        select office from bgt_target_profit where corp = 'YJC 포워딩' and yearmonth between v_start_ym and v_end_ym
      ) s
      where office is not null and office <> '' and office <> '홍콩' and not (office = any(v_fixed))
      order by office
    loop
      v_subtotal := v_subtotal || rec.office;
      v_cols := v_cols || jsonb_build_array(jsonb_build_object('label', rec.office, 'corp', 'YJC 포워딩', 'offices', to_jsonb(array[rec.office])));
    end loop;

    -- 소계는 대륙 지점만 더합니다. 홍콩은 HKD라 합산하면 통화가 섞이므로 소계 뒤 별도 컬럼입니다.
    v_cols := v_cols || jsonb_build_array(jsonb_build_object('label', '합계', 'corp', 'YJC 포워딩', 'offices', to_jsonb(v_subtotal)));
    v_cols := v_cols || jsonb_build_array(jsonb_build_object('label', '홍콩', 'corp', 'YJC 포워딩', 'offices', to_jsonb(array['홍콩'::text])));
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
      v_cols := v_cols || jsonb_build_array(jsonb_build_object('label', rec.office, 'corp', '흥아물류', 'offices', to_jsonb(array[rec.office])));
    end loop;
    v_cols := v_cols || jsonb_build_array(jsonb_build_object('label', '흥아물류 합계', 'corp', '흥아물류', 'offices', null));
    foreach v_corp in array array['상해물류센터', '윤봉물류', '창씽 CY', '청도 CY']
    loop
      v_cols := v_cols || jsonb_build_array(jsonb_build_object('label', v_corp, 'corp', v_corp, 'offices', null));
    end loop;
  end if;

  for rec in select * from jsonb_to_recordset(v_cols) as x(label text, corp text, offices text[])
  loop
    v_columns := v_columns || jsonb_build_array(jsonb_build_object(
      'label', rec.label,
      'current', perf_target_bucket_offices(rec.corp, rec.offices, v_start_ym, v_end_ym),
      'prior', perf_target_bucket_offices(rec.corp, rec.offices, v_prior_start, v_prior_end)
    ));
  end loop;

  return jsonb_build_object('startYm', v_start_ym, 'endYm', v_end_ym, 'priorStartYm', v_prior_start, 'priorEndYm', v_prior_end, 'columns', v_columns);
end;
$$;


grant execute on function perf_yjc_offices() to anon, authenticated;
grant execute on function perf_target_bucket_offices(text, text[], text, text) to anon, authenticated;
grant execute on function perf_target_bucket(text, text, text, text) to anon, authenticated;
grant execute on function get_target_performance_group(text, text, text, text, text) to anon, authenticated;

-- 배포 확인용 (모두 true여야 합니다)
select
  (select count(*) from pg_proc where proname = 'perf_yjc_offices') = 1 as yjc_offices_added,
  (select count(*) from pg_proc where proname = 'perf_target_bucket_offices') = 1 as bucket_offices_added,
  (select array_length(perf_yjc_offices(), 1)) = 11 as mainland_11,
  not ('홍콩' = any(perf_yjc_offices())) as hk_excluded_from_subtotal;
