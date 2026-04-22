-- AI 어시스턴트 - 이미지·동영상 생성 모듈용 테이블.
-- 원본 이미지 blob은 클라이언트 IndexedDB(mediaBlobs).
-- 동영상은 원격 URL만 저장 (용량상 로컬 저장 비현실).

create table if not exists public.media_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('image', 'video')),
  prompt text not null default '',
  style text,
  aspect_ratio text not null default '1:1' check (aspect_ratio in ('1:1', '16:9', '9:16')),
  status text not null default 'generating' check (status in ('queued','generating','ready','error')),
  blob_ref text,
  result_url text,
  thumbnail_url text,
  mime_type text,
  duration_sec integer,
  model text,
  error_message text,
  job_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists media_items_user_idx
  on public.media_items (user_id, created_at desc);

create trigger media_items_set_updated_at
  before update on public.media_items
  for each row execute function public.set_updated_at();

alter table public.media_items enable row level security;

drop policy if exists "media_items_select_own" on public.media_items;
create policy "media_items_select_own" on public.media_items
  for select using (auth.uid() = user_id);

drop policy if exists "media_items_insert_own" on public.media_items;
create policy "media_items_insert_own" on public.media_items
  for insert with check (auth.uid() = user_id);

drop policy if exists "media_items_update_own" on public.media_items;
create policy "media_items_update_own" on public.media_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "media_items_delete_own" on public.media_items;
create policy "media_items_delete_own" on public.media_items
  for delete using (auth.uid() = user_id);

-- 월 사용량 (이미지 장수 + 동영상 초수)
create table if not exists public.media_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  year_month text not null,
  images_used integer not null default 0,
  video_seconds_used integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, year_month)
);

create trigger media_usage_set_updated_at
  before update on public.media_usage
  for each row execute function public.set_updated_at();

alter table public.media_usage enable row level security;

drop policy if exists "media_usage_select_own" on public.media_usage;
create policy "media_usage_select_own" on public.media_usage
  for select using (auth.uid() = user_id);

drop policy if exists "media_usage_insert_own" on public.media_usage;
create policy "media_usage_insert_own" on public.media_usage
  for insert with check (auth.uid() = user_id);

drop policy if exists "media_usage_update_own" on public.media_usage;
create policy "media_usage_update_own" on public.media_usage
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
