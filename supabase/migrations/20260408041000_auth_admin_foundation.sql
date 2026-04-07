-- Auth and admin foundation for the first public beta.
-- After the first owner signs up, run:
-- update public.profiles set role = 'owner' where email = 'YOUR_EMAIL@example.com';

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('user', 'admin', 'owner')),
  plan text not null default 'free' check (plan in ('free', 'premium', 'pro')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  mode text not null,
  premium_domain text,
  status text not null default 'success' check (status in ('success', 'error')),
  estimated_cost numeric(12, 6) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, plan, last_seen_at)
  values (new.id, new.email, 'user', 'free', now())
  on conflict (id) do update
    set email = excluded.email,
        last_seen_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin(user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and role in ('admin', 'owner')
  );
$$;

create or replace function public.touch_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  insert into public.profiles (id, email, role, plan, last_seen_at)
  values (auth.uid(), auth.jwt() ->> 'email', 'user', 'free', now())
  on conflict (id) do update
    set email = coalesce(excluded.email, public.profiles.email),
        last_seen_at = now();
end;
$$;

alter table public.profiles enable row level security;
alter table public.usage_events enable row level security;
alter table public.admin_audit_logs enable row level security;

drop policy if exists "profiles select self or admin" on public.profiles;
create policy "profiles select self or admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles insert own safe default" on public.profiles;
create policy "profiles insert own safe default"
on public.profiles
for insert
to authenticated
with check (id = auth.uid() and role = 'user' and plan = 'free');

drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "usage select admin" on public.usage_events;
create policy "usage select admin"
on public.usage_events
for select
to authenticated
using (public.is_admin());

drop policy if exists "usage insert own" on public.usage_events;
create policy "usage insert own"
on public.usage_events
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "audit select admin" on public.admin_audit_logs;
create policy "audit select admin"
on public.admin_audit_logs
for select
to authenticated
using (public.is_admin());

drop policy if exists "audit insert admin" on public.admin_audit_logs;
create policy "audit insert admin"
on public.admin_audit_logs
for insert
to authenticated
with check (public.is_admin() and admin_user_id = auth.uid());

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_plan_idx on public.profiles(plan);
create index if not exists profiles_created_at_idx on public.profiles(created_at desc);
create index if not exists usage_events_created_at_idx on public.usage_events(created_at desc);
create index if not exists usage_events_user_id_idx on public.usage_events(user_id);
create index if not exists admin_audit_logs_created_at_idx on public.admin_audit_logs(created_at desc);
