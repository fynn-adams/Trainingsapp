-- Trainingsapp Köln Halbmarathon – Datenbankschema für Supabase.
-- Im Supabase-Dashboard unter "SQL Editor" einmal komplett ausführen.

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  athlete text not null check (athlete in ('fynn', 'louisa')),
  started_at timestamptz not null,
  sport text not null check (sport in ('run', 'bike', 'other')),
  duration_s integer not null check (duration_s > 0),
  distance_m numeric,
  avg_hr smallint,
  max_hr smallint,
  calories integer,
  title text,
  file_name text,
  assigned_session text,
  manual boolean not null default false,
  created_at timestamptz not null default now(),
  -- Dieselbe Aktivität kann nicht doppelt hochgeladen werden.
  unique (athlete, started_at)
);

create table if not exists public.week_flags (
  athlete text not null check (athlete in ('fynn', 'louisa')),
  week_start date not null,
  paused boolean not null default false,
  note text,
  primary key (athlete, week_start)
);

create table if not exists public.athlete_settings (
  athlete text primary key check (athlete in ('fynn', 'louisa')),
  current_pace_s integer not null,
  goal_pace_s integer not null,
  hr_max integer,
  updated_at timestamptz not null default now()
);

-- Zugriff nur für eingeloggte Nutzer. Registrierung im Dashboard deaktivieren
-- (Authentication → Sign In / Providers → "Allow new users to sign up" aus),
-- damit nur eure beiden Accounts existieren.
alter table public.activities enable row level security;
alter table public.week_flags enable row level security;
alter table public.athlete_settings enable row level security;

drop policy if exists "authenticated full access" on public.activities;
drop policy if exists "authenticated full access" on public.week_flags;
drop policy if exists "authenticated full access" on public.athlete_settings;

create policy "authenticated full access" on public.activities
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.week_flags
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.athlete_settings
  for all to authenticated using (true) with check (true);
