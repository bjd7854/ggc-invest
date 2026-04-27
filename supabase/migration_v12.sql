-- ============================================================
-- 🎊 v12 통합 마이그레이션 SQL (Final - 안정판)
-- ============================================================
-- 한 번 실행으로 모든 기능 활성화
-- 학생 삭제 + 1분 변동 보장 + 모든 함수 정상화
-- 안전하게 재실행 가능
-- ============================================================


-- ====== 1. 슬롯머신 제거 (사행성 우려) ======
drop function if exists public.play_slot(uuid);
drop function if exists public.get_slot_status(uuid);
drop table if exists public.slot_plays cascade;


-- ====== 2. 대회 컬럼 ======
alter table public.tournaments
  add column if not exists news_times text default '',
  add column if not exists price_delay_minutes int default 5,
  add column if not exists random_interval_minutes int default 1,
  add column if not exists random_range_pct numeric default 0.3;

update public.tournaments set random_interval_minutes = 1 where random_interval_minutes is null;
update public.tournaments set random_range_pct = 0.3 where random_range_pct is null;
update public.tournaments set price_delay_minutes = 5 where price_delay_minutes is null;

alter table public.tournaments drop constraint if exists tournaments_type_check;
alter table public.tournaments add constraint tournaments_type_check
  check (type in ('short','long','custom'));


-- ====== 3. 시스템 설정 ======
create table if not exists public.system_settings (
  id int primary key default 1,
  idle_cron_interval_minutes int default 10,
  last_random_at timestamptz default now(),
  last_news_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);

insert into public.system_settings(id, idle_cron_interval_minutes)
values (1, 10) on conflict (id) do nothing;

alter table public.system_settings enable row level security;
drop policy if exists "system_settings_select_all" on public.system_settings;
create policy "system_settings_select_all" on public.system_settings for select using (true);
drop policy if exists "system_settings_admin_update" on public.system_settings;
create policy "system_settings_admin_update" on public.system_settings for update 
  using (public.is_admin()) with check (public.is_admin());


-- ====== 4. 실시간 알림 테이블 ======
create table if not exists public.live_notifications (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade,
  type text, title text, message text, emoji text default '📢',
  user_id uuid,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '5 minutes')
);

create index if not exists idx_live_notif_tournament 
  on public.live_notifications(tournament_id, created_at desc);

alter table public.live_notifications enable row level security;
drop policy if exists "live_notif_select_all" on public.live_notifications;
create policy "live_notif_select_all" on public.live_notifications for select using (true);
drop policy if exists "live_notif_insert_admin" on public.live_notifications;
create policy "live_notif_insert_admin" on public.live_notifications for insert 
  with check (public.is_admin() or auth.role() = 'service_role');

do $$ begin
  begin alter publication supabase_realtime add table public.live_notifications;
  exception when duplicate_object then null; end;
end $$;


-- ====== 5. 뉴스 슬롯 RPC ======
create or replace function public.generate_news_slots(p_tournament_id uuid)
returns int language plpgsql security definer as $$
declare
  v_t record; v_times text[]; v_time_str text;
  v_hour int; v_minute int; v_day date;
  v_slot_at timestamptz; v_apply_at timestamptz;
  v_end_day date; v_count int := 0;
begin
  if not public.is_admin() then raise exception '관리자 전용'; end if;
  select * into v_t from public.tournaments where id = p_tournament_id;
  if not found then raise exception '대회를 찾을 수 없습니다'; end if;
  if coalesce(v_t.news_times, '') = '' then return 0; end if;

  delete from public.news_events
    where tournament_id = p_tournament_id and title = '(뉴스 미정)' and is_published = false;

  v_times := string_to_array(replace(v_t.news_times, ' ', ''), ',');
  v_day := v_t.start_at::date;
  v_end_day := v_t.end_at::date;

  while v_day <= v_end_day loop
    foreach v_time_str in array v_times loop
      if position(':' in v_time_str) > 0 then
        v_hour := split_part(v_time_str, ':', 1)::int;
        v_minute := split_part(v_time_str, ':', 2)::int;
        v_slot_at := (v_day::text || ' ' || lpad(v_hour::text, 2, '0') || ':' || lpad(v_minute::text, 2, '0') || ':00+09')::timestamptz;
        v_apply_at := v_slot_at + (v_t.price_delay_minutes || ' minutes')::interval;
        if v_slot_at >= v_t.start_at and v_slot_at <= v_t.end_at then
          insert into public.news_events(tournament_id, title, content, news_at, price_apply_at)
            values (p_tournament_id, '(뉴스 미정)', '', v_slot_at, v_apply_at);
          v_count := v_count + 1;
        end if;
      end if;
    end loop;
    v_day := v_day + 1;
  end loop;
  return v_count;
end; $$;


create or replace function public.fill_news_slot(
  p_news_id uuid, p_template_id uuid default null,
  p_title text default null, p_content text default null,
  p_stock_symbol text default null, p_main_impact_pct numeric default null,
  p_secondary_symbol text default null, p_secondary_impact_pct numeric default null
)
returns uuid language plpgsql security definer as $$
declare
  v_t record; v_main_stock uuid; v_sec_stock uuid;
  v_title text; v_content text;
  v_main_sym text; v_main_pct numeric; v_sec_sym text; v_sec_pct numeric;
begin
  if not public.is_admin() then raise exception '관리자 전용'; end if;
  if p_template_id is not null then
    select * into v_t from public.news_templates where id = p_template_id;
    if not found then raise exception '템플릿을 찾을 수 없습니다'; end if;
    v_title := v_t.title; v_content := v_t.content;
    v_main_sym := v_t.stock_symbol; v_main_pct := v_t.main_impact_pct;
    v_sec_sym := v_t.secondary_symbol; v_sec_pct := v_t.secondary_impact_pct;
  else
    v_title := p_title; v_content := p_content;
    v_main_sym := p_stock_symbol; v_main_pct := p_main_impact_pct;
    v_sec_sym := p_secondary_symbol; v_sec_pct := p_secondary_impact_pct;
  end if;

  update public.news_events set title = v_title, content = v_content where id = p_news_id;
  delete from public.news_stock_impacts where news_id = p_news_id;

  if v_main_sym is not null then
    select id into v_main_stock from public.stocks where symbol = upper(v_main_sym);
    if v_main_stock is not null then
      insert into public.news_stock_impacts(news_id, stock_id, impact_pct)
        values (p_news_id, v_main_stock, v_main_pct);
    end if;
  end if;

  if v_sec_sym is not null and v_sec_sym != '' then
    select id into v_sec_stock from public.stocks where symbol = upper(v_sec_sym);
    if v_sec_stock is not null then
      insert into public.news_stock_impacts(news_id, stock_id, impact_pct)
        values (p_news_id, v_sec_stock, coalesce(v_sec_pct, 0));
    end if;
  end if;
  return p_news_id;
end; $$;


-- ====== 6. price_applied 컬럼 + apply_pending_news_prices 함수 ======
alter table public.news_events 
  add column if not exists price_applied boolean default false;

create or replace function public.apply_pending_news_prices()
returns void language plpgsql security definer 
set search_path = public as $$
declare
  v_news record; v_impact record; v_new_price bigint;
begin
  for v_news in 
    select n.* from public.news_events n
    where n.is_published = true
      and n.price_apply_at <= now()
      and coalesce(n.price_applied, false) = false
  loop
    for v_impact in 
      select i.*, s.current_price as cur_price, s.id as stock_id
      from public.news_stock_impacts i
      join public.stocks s on s.id = i.stock_id
      where i.news_id = v_news.id
    loop
      v_new_price := greatest(100, floor(v_impact.cur_price * (1 + v_impact.impact_pct / 100.0))::bigint);
      update public.stocks
        set previous_price = current_price, current_price = v_new_price, updated_at = now()
        where id = v_impact.stock_id;
      insert into public.price_history(stock_id, price) values (v_impact.stock_id, v_new_price);
    end loop;
    update public.news_events set price_applied = true where id = v_news.id;
  end loop;
end; $$;

grant execute on function public.apply_pending_news_prices() to anon, authenticated, service_role;


-- ====== 7. 가격 변동 함수 (단순화 - 무조건 변동) ======
drop function if exists public.small_fluctuate_untouched() cascade;

create function public.small_fluctuate_untouched()
returns void language plpgsql security definer as $$
declare
  v_stock record; v_change numeric; v_new_price bigint;
  v_range numeric := 0.5;
begin
  -- 활성 대회의 변동폭 가져오기 (없으면 기본 0.5%)
  select coalesce(random_range_pct, 0.5) into v_range
  from public.tournaments where status = 'active' limit 1;
  
  -- 활성 대회 없으면 종료
  if v_range is null then return; end if;
  
  -- 모든 종목에 무조건 변동 적용
  for v_stock in select * from public.stocks loop
    v_change := (random() - 0.5) * 2 * (v_range / 100.0);
    v_new_price := greatest(100, floor(v_stock.current_price * (1 + v_change))::bigint);
    update public.stocks
      set previous_price = current_price, current_price = v_new_price, updated_at = now()
      where id = v_stock.id;
    insert into public.price_history(stock_id, price) values (v_stock.id, v_new_price);
  end loop;
end; $$;


-- ====== 8. 클라이언트 트리거 함수 (50초 락) ======
drop function if exists public.trigger_price_tick() cascade;

create function public.trigger_price_tick()
returns json language plpgsql security definer as $$
declare
  v_setting record; v_now timestamptz := now();
  v_random_done boolean := false; v_news_done boolean := false;
  v_lock_interval interval := interval '50 seconds';
begin
  select * into v_setting from public.system_settings where id = 1 for update;
  if not found then
    insert into public.system_settings(id) values (1);
    select * into v_setting from public.system_settings where id = 1 for update;
  end if;
  
  if v_setting.last_random_at < v_now - v_lock_interval then
    perform public.small_fluctuate_untouched();
    update public.system_settings set last_random_at = v_now, updated_at = v_now where id = 1;
    v_random_done := true;
  end if;
  
  if v_setting.last_news_at < v_now - v_lock_interval then
    perform public.apply_pending_news_prices();
    update public.system_settings set last_news_at = v_now, updated_at = v_now where id = 1;
    v_news_done := true;
  end if;
  
  return json_build_object(
    'random_done', v_random_done,
    'news_done', v_news_done,
    'idle_interval', v_setting.idle_cron_interval_minutes
  );
end; $$;

grant execute on function public.trigger_price_tick() to anon, authenticated;


-- ====== 9. cron 백업 함수 ======
create or replace function public.cron_idle_tick()
returns json language plpgsql security definer as $$
declare
  v_setting record; v_now timestamptz := now();
  v_idle_interval interval; v_done boolean := false;
begin
  select * into v_setting from public.system_settings where id = 1 for update;
  if not found then return json_build_object('done', false); end if;
  v_idle_interval := (v_setting.idle_cron_interval_minutes || ' minutes')::interval;
  if v_setting.last_random_at < v_now - v_idle_interval then
    perform public.small_fluctuate_untouched();
    perform public.apply_pending_news_prices();
    update public.system_settings 
    set last_random_at = v_now, last_news_at = v_now, updated_at = v_now where id = 1;
    v_done := true;
  end if;
  return json_build_object('done', v_done);
end; $$;


-- ====== 10. 관리자 RPC ======
create or replace function public.set_idle_interval(p_minutes int)
returns json language plpgsql security definer as $$
begin
  if not public.is_admin() then raise exception '관리자만 설정 가능합니다'; end if;
  if p_minutes < 1 or p_minutes > 1440 then
    raise exception '1분 ~ 1440분 사이로 설정해주세요';
  end if;
  update public.system_settings
  set idle_cron_interval_minutes = p_minutes, updated_at = now() where id = 1;
  return json_build_object('success', true, 'interval_minutes', p_minutes);
end; $$;

grant execute on function public.set_idle_interval(int) to authenticated;

create or replace function public.admin_send_notification(
  p_title text, p_message text,
  p_emoji text default '🎉', p_type text default 'event'
)
returns json language plpgsql security definer as $$
declare v_active_t uuid; v_id uuid;
begin
  if not public.is_admin() then raise exception '관리자만 발동 가능합니다'; end if;
  select id into v_active_t from public.tournaments where status = 'active' limit 1;
  insert into public.live_notifications(tournament_id, type, title, message, emoji)
  values (v_active_t, p_type, p_title, p_message, p_emoji)
  returning id into v_id;
  return json_build_object('success', true, 'id', v_id);
end; $$;

grant execute on function public.admin_send_notification(text, text, text, text) to authenticated;


-- ====== 11. ⭐ 학생 삭제 함수 ======
create or replace function public.admin_delete_student(p_user_id uuid)
returns json language plpgsql security definer as $$
declare
  v_name text; v_role text;
begin
  if not public.is_admin() then raise exception '관리자만 가능합니다'; end if;
  if p_user_id = auth.uid() then raise exception '본인 계정은 삭제할 수 없습니다'; end if;
  
  select name, role into v_name, v_role from public.profiles where id = p_user_id;
  if not found then raise exception '해당 학생을 찾을 수 없습니다'; end if;
  if v_role = 'admin' then raise exception '관리자 계정은 삭제할 수 없습니다'; end if;
  
  delete from public.transactions where user_id = p_user_id;
  delete from public.holdings where user_id = p_user_id;
  delete from public.tournament_participants where user_id = p_user_id;
  delete from public.news_reads where user_id = p_user_id;
  delete from public.live_notifications where user_id = p_user_id;
  
  begin
    delete from public.quiz_attempts where user_id = p_user_id;
  exception when undefined_table then null; end;
  
  delete from public.profiles where id = p_user_id;
  delete from auth.users where id = p_user_id;
  
  return json_build_object('success', true, 'deleted_name', v_name);
end; $$;

grant execute on function public.admin_delete_student(uuid) to authenticated;


-- ====== 12. pg_cron 등록 ======
create extension if not exists pg_cron;

do $$ declare r record; begin
  for r in select jobid from cron.job 
    where command ilike '%fluctuate%' or command ilike '%apply_pending%' 
       or command ilike '%idle_tick%'
  loop perform cron.unschedule(r.jobid); end loop;
end $$;

select cron.schedule('price-idle-tick', '* * * * *', $$ select public.cron_idle_tick(); $$);


-- ====== 13. Realtime 활성화 ======
do $$ begin
  begin alter publication supabase_realtime add table public.stocks;
  exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.news_events;
  exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.holdings;
  exception when duplicate_object then null; end;
end $$;

alter table public.stocks replica identity full;
alter table public.news_events replica identity full;
alter table public.holdings replica identity full;


-- ====== 14. 활성 대회 강제 1분 / 0.5% 통일 ======
update public.tournaments 
set random_interval_minutes = 1, random_range_pct = 0.5
where status = 'active';


-- ============================================================
-- ✅ 즉시 테스트
-- ============================================================
select public.trigger_price_tick();
