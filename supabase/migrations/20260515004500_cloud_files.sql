-- 클라우드 모드 2-A: 파일·폴더 메타데이터 + Storage 버킷·정책.
--
-- 모델 (Q1~Q36 결정 반영):
-- - 파일과 폴더는 단일 테이블 cloud_nodes 로 통합 (트리 self-reference)
-- - kind = 'file' | 'folder'
-- - 변환된 파일은 cloud-files 버킷, 원본 백업은 cloud-originals 버킷
-- - 모든 RLS는 owner_id = auth.uid()
-- - 휴지통은 deleted_at 컬럼 (NULL=정상). 30일 후 cloud_purge_trash() 로 영구 삭제 가능
--
-- ─────────────────────────────────────────────

create extension if not exists pgcrypto;

-- 1. 메인 테이블
create table if not exists public.cloud_nodes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  parent_folder_id uuid references public.cloud_nodes(id) on delete cascade,
  kind text not null check (kind in ('file', 'folder')),
  name text not null check (length(name) between 1 and 255),
  file_type text check (file_type in ('doc', 'sheet', 'slide', 'pdf', 'image', 'other')),
  mime_type text,
  size_bytes bigint,
  storage_path text,           -- 자체 포맷·변환본 경로 (cloud-files 버킷 내)
  original_storage_path text,  -- 원본 백업 경로 (cloud-originals 버킷 내)
  meta jsonb not null default '{}'::jsonb,
  starred boolean not null default false,
  deleted_at timestamptz,      -- 휴지통 (NULL=정상, 값=삭제일)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- folder 는 파일 전용 컬럼이 비어 있어야 함
  constraint folder_no_file_fields check (
    kind = 'file' or (
      file_type is null
      and mime_type is null
      and size_bytes is null
      and storage_path is null
      and original_storage_path is null
    )
  ),
  -- file 은 file_type 필수
  constraint file_requires_type check (
    kind = 'folder' or file_type is not null
  )
);

-- 2. updated_at 자동 갱신 (기존 set_updated_at() 재사용)
drop trigger if exists set_cloud_nodes_updated_at on public.cloud_nodes;
create trigger set_cloud_nodes_updated_at
before update on public.cloud_nodes
for each row execute function public.set_updated_at();

-- 3. RLS — owner_id 기반
alter table public.cloud_nodes enable row level security;

drop policy if exists "cloud_nodes select own" on public.cloud_nodes;
create policy "cloud_nodes select own"
on public.cloud_nodes
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "cloud_nodes insert own" on public.cloud_nodes;
create policy "cloud_nodes insert own"
on public.cloud_nodes
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "cloud_nodes update own" on public.cloud_nodes;
create policy "cloud_nodes update own"
on public.cloud_nodes
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "cloud_nodes delete own" on public.cloud_nodes;
create policy "cloud_nodes delete own"
on public.cloud_nodes
for delete
to authenticated
using (owner_id = auth.uid());

-- 4. 인덱스
create index if not exists cloud_nodes_owner_idx on public.cloud_nodes(owner_id);
create index if not exists cloud_nodes_parent_idx on public.cloud_nodes(parent_folder_id);
create index if not exists cloud_nodes_owner_parent_alive_idx
  on public.cloud_nodes(owner_id, parent_folder_id)
  where deleted_at is null;
create index if not exists cloud_nodes_owner_starred_alive_idx
  on public.cloud_nodes(owner_id)
  where starred = true and deleted_at is null;
create index if not exists cloud_nodes_owner_trash_idx
  on public.cloud_nodes(owner_id, deleted_at desc)
  where deleted_at is not null;
create index if not exists cloud_nodes_owner_updated_alive_idx
  on public.cloud_nodes(owner_id, updated_at desc)
  where deleted_at is null;

-- ─────────────────────────────────────────────
-- 5. Storage 버킷 (이미 있으면 유지)
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('cloud-files', 'cloud-files', false, 104857600) -- 100 MB
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit)
values ('cloud-originals', 'cloud-originals', false, 104857600)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────
-- 6. Storage RLS — 경로 첫 폴더 = auth.uid()
--    경로 형식: {user_id}/{file_id}.{ext}
-- ─────────────────────────────────────────────
drop policy if exists "cloud-files own select" on storage.objects;
create policy "cloud-files own select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'cloud-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "cloud-files own insert" on storage.objects;
create policy "cloud-files own insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'cloud-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "cloud-files own update" on storage.objects;
create policy "cloud-files own update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'cloud-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "cloud-files own delete" on storage.objects;
create policy "cloud-files own delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'cloud-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "cloud-originals own select" on storage.objects;
create policy "cloud-originals own select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'cloud-originals'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "cloud-originals own insert" on storage.objects;
create policy "cloud-originals own insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'cloud-originals'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "cloud-originals own update" on storage.objects;
create policy "cloud-originals own update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'cloud-originals'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "cloud-originals own delete" on storage.objects;
create policy "cloud-originals own delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'cloud-originals'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ─────────────────────────────────────────────
-- 7. 휴지통 자동 정리 함수 (30일 후 영구 삭제 — Q17 B 결정)
--    pg_cron 또는 외부 스케줄러에서 주기적으로 호출.
--    storage 객체는 별도로 정리해야 함 (애플리케이션 측 cleanup job).
-- ─────────────────────────────────────────────
create or replace function public.cloud_purge_trash()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  purged int;
begin
  delete from public.cloud_nodes
  where deleted_at is not null
    and deleted_at < now() - interval '30 days';
  get diagnostics purged = row_count;
  return purged;
end;
$$;

grant execute on function public.cloud_purge_trash() to service_role;
