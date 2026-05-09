-- ============================================================
-- 🎊 v19 SQL - 5분 차트 + 퀴즈 사진 인프라
-- ============================================================
-- (1분 변동, 종목 CRUD 는 이미 v18에서 적용됨)
-- ============================================================


-- ============================================================
-- 📸 PART 1: 퀴즈 사진 (Storage)
-- ============================================================

-- 1-1. Storage 버킷 생성
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'quiz-images',
  'quiz-images',
  true,
  5242880,  -- 5MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];


-- 1-2. RLS 정책
drop policy if exists "quiz_images_public_read" on storage.objects;
create policy "quiz_images_public_read" 
  on storage.objects for select 
  using (bucket_id = 'quiz-images');

drop policy if exists "quiz_images_admin_insert" on storage.objects;
create policy "quiz_images_admin_insert" 
  on storage.objects for insert 
  with check (
    bucket_id = 'quiz-images' 
    and auth.uid() in (select id from public.profiles where role = 'admin')
  );

drop policy if exists "quiz_images_admin_delete" on storage.objects;
create policy "quiz_images_admin_delete" 
  on storage.objects for delete 
  using (
    bucket_id = 'quiz-images' 
    and auth.uid() in (select id from public.profiles where role = 'admin')
  );


-- 1-3. quizzes 테이블에 image_url 컬럼 추가
alter table public.quizzes 
  add column if not exists image_url text default null;


-- 1-4. 퀴즈 사진 삭제 함수
create or replace function public.delete_quiz_image(p_image_url text)
returns void language plpgsql security definer as $$
declare
  v_path text;
begin
  if not public.is_admin() then 
    raise exception '관리자만 가능합니다';
  end if;
  
  if p_image_url is null or p_image_url = '' then return; end if;
  
  v_path := substring(p_image_url from 'quiz-images/(.+)$');
  
  if v_path is not null then
    delete from storage.objects 
    where bucket_id = 'quiz-images' 
      and name = v_path;
  end if;
end;
$$;

grant execute on function public.delete_quiz_image(text) to authenticated;


-- ============================================================
-- 📊 PART 2: 5분 차트
-- ============================================================

-- 2-1. 5분 단위 view
create or replace view public.price_history_5min as
select 
  stock_id,
  date_trunc('hour', recorded_at) + 
    (interval '5 minutes' * (extract(minute from recorded_at)::int / 5))
    as bucket_at,
  (array_agg(price order by recorded_at))[1] as open_price,
  (array_agg(price order by recorded_at desc))[1] as close_price,
  max(price) as high_price,
  min(price) as low_price,
  count(*) as tick_count
from public.price_history
group by stock_id, bucket_at
order by stock_id, bucket_at;


-- 2-2. 5분 차트 RPC
create or replace function public.get_chart_5min(
  p_stock_id uuid,
  p_hours int default 24
)
returns table (
  bucket_at timestamptz,
  open_price bigint,
  close_price bigint,
  high_price bigint,
  low_price bigint
)
language sql security definer as $$
  select 
    bucket_at, open_price, close_price, high_price, low_price
  from public.price_history_5min
  where stock_id = p_stock_id
    and bucket_at > now() - (p_hours || ' hours')::interval
  order by bucket_at asc;
$$;

grant execute on function public.get_chart_5min(uuid, int) to anon, authenticated;


-- ============================================================
-- ✅ 확인
-- ============================================================

-- 1. Storage 버킷
select id, name, public 
from storage.buckets 
where id = 'quiz-images';

-- 2. quizzes.image_url 컬럼
select column_name 
from information_schema.columns
where table_name = 'quizzes' and column_name = 'image_url';

-- 3. 5분 차트 view 확인
select count(*) as 데이터수 from public.price_history_5min;
