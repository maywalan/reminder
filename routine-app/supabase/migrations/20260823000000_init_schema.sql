-- Routine app: initial schema for auth + sync
-- Mirrors src/store/types.ts (Group, Plan, Profile, Settings). One row per user per
-- profile/settings; groups and plans are one-to-many per user. auth.users (from Supabase
-- Auth) is the source of truth for identity — these tables all key off auth.uid().

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles: 1:1 with auth.users
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  avatar_color text not null default '#5B5FEF',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- settings: 1:1 with auth.users
-- ---------------------------------------------------------------------------
create table public.settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  notifications_enabled boolean not null default true,
  live_activities_enabled boolean not null default true,
  theme_mode text not null default 'system' check (theme_mode in ('system', 'light', 'dark')),
  sound_enabled boolean not null default true,
  badges_enabled boolean not null default true,
  alert_style text not null default 'banners' check (alert_style in ('banners', 'persistent')),
  language text not null default 'en' check (language in ('en', 'th', 'zh')),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- groups
-- ---------------------------------------------------------------------------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index groups_user_id_idx on public.groups (user_id);

-- ---------------------------------------------------------------------------
-- plans
-- ---------------------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  date date not null,
  time text not null, -- HH:MM 24h, kept as text to match the client's nominal all-day value
  end_time text,
  all_day boolean not null default false,
  alerts text[] not null default '{}', -- minutes-before offsets, e.g. '{0,5,15}'
  notes text,
  location text,
  photo_uris text[] not null default '{}',
  live boolean not null default false,
  completed boolean not null default false,
  color text not null,
  group_id uuid references public.groups (id) on delete set null,
  repeat_type text not null default 'none',
  repeat_id uuid,
  plan_order integer, -- "order" is a reserved word; matches Plan.order in types.ts
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index plans_user_id_idx on public.plans (user_id);
create index plans_user_id_date_idx on public.plans (user_id, date);
create index plans_group_id_idx on public.plans (group_id);
create index plans_repeat_id_idx on public.plans (repeat_id);

-- ---------------------------------------------------------------------------
-- updated_at bookkeeping (also the field a last-write-wins sync will diff on)
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

create trigger groups_set_updated_at
  before update on public.groups
  for each row execute function public.set_updated_at();

create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- seed a profile + settings row the moment a new auth user is created, so the
-- client never has to special-case "row doesn't exist yet" after signup
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));

  insert into public.settings (user_id) values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security: every table is scoped strictly to auth.uid()
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.groups enable row level security;
alter table public.plans enable row level security;

create policy "profiles: select own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
-- no insert/delete policy: rows are created by handle_new_user() and removed via
-- the auth.users cascade, never directly by clients.

create policy "settings: select own" on public.settings
  for select using (auth.uid() = user_id);
create policy "settings: update own" on public.settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "groups: select own" on public.groups
  for select using (auth.uid() = user_id);
create policy "groups: insert own" on public.groups
  for insert with check (auth.uid() = user_id);
create policy "groups: update own" on public.groups
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "groups: delete own" on public.groups
  for delete using (auth.uid() = user_id);

create policy "plans: select own" on public.plans
  for select using (auth.uid() = user_id);
create policy "plans: insert own" on public.plans
  for insert with check (auth.uid() = user_id);
create policy "plans: update own" on public.plans
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "plans: delete own" on public.plans
  for delete using (auth.uid() = user_id);
