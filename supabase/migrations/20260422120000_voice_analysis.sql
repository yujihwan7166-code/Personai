-- AI 어시스턴트 음성 분석(녹음 분석) 모듈용 테이블.
-- 메타/전사/요약/챕터/액션아이템은 Supabase, 원본 오디오 blob은 클라이언트 IndexedDB(voiceBlobs).

create table if not exists public.voice_recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  audio_blob_ref text,               -- IndexedDB 키. 클라이언트에서만 의미 있음.
  mime_type text,
  duration_sec integer not null default 0,
  transcript jsonb not null default '[]'::jsonb,     -- VoiceTranscriptSegment[]
  summary text not null default '',
  chapters jsonb not null default '[]'::jsonb,       -- VoiceChapter[]
  action_items jsonb not null default '[]'::jsonb,   -- VoiceActionItem[]
  status text not null default 'transcribing' check (status in ('uploading','transcribing','analyzing','ready','error')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists voice_recordings_user_idx
  on public.voice_recordings (user_id, created_at desc);

create trigger voice_recordings_set_updated_at
  before update on public.voice_recordings
  for each row execute function public.set_updated_at();

alter table public.voice_recordings enable row level security;

-- 본인 데이터만 접근
drop policy if exists "voice_recordings_select_own" on public.voice_recordings;
create policy "voice_recordings_select_own" on public.voice_recordings
  for select using (auth.uid() = user_id);

drop policy if exists "voice_recordings_insert_own" on public.voice_recordings;
create policy "voice_recordings_insert_own" on public.voice_recordings
  for insert with check (auth.uid() = user_id);

drop policy if exists "voice_recordings_update_own" on public.voice_recordings;
create policy "voice_recordings_update_own" on public.voice_recordings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "voice_recordings_delete_own" on public.voice_recordings;
create policy "voice_recordings_delete_own" on public.voice_recordings
  for delete using (auth.uid() = user_id);

-- 월 사용량 집계 (Whisper 사용 시간 초 단위)
create table if not exists public.voice_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  year_month text not null,   -- 'YYYY-MM' (KST 기준)
  seconds_used integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, year_month)
);

create trigger voice_usage_set_updated_at
  before update on public.voice_usage
  for each row execute function public.set_updated_at();

alter table public.voice_usage enable row level security;

drop policy if exists "voice_usage_select_own" on public.voice_usage;
create policy "voice_usage_select_own" on public.voice_usage
  for select using (auth.uid() = user_id);

drop policy if exists "voice_usage_upsert_own" on public.voice_usage;
create policy "voice_usage_upsert_own" on public.voice_usage
  for insert with check (auth.uid() = user_id);

drop policy if exists "voice_usage_update_own" on public.voice_usage;
create policy "voice_usage_update_own" on public.voice_usage
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
