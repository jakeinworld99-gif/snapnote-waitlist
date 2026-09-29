-- SnapNote waitlist — initial schema
-- Matches the task contract: email text unique, id uuid default gen_random_uuid(),
-- created_at timestamptz default now()
-- Run with: psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql
--            or apply in the Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.waitlist_signups enable row level security;

-- The server action uses the service role to insert and select, so no
-- anon/authenticated policies are needed for the form to work. Keep reads
-- blocked for anon so a casual visitor cannot list the waitlist.
drop policy if exists waitlist_signups_no_read_anon on public.waitlist_signups;
create policy waitlist_signups_no_read_anon on public.waitlist_signups
  for select
  to anon
  using (false);