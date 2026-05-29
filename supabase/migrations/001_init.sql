-- Cadence — initial schema
-- Run this in: Supabase Dashboard → SQL Editor → New query.
-- After running, Goals will sync end-to-end as soon as a user signs in.

create table if not exists public.goals (
  id           text primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  color        text default 'terracotta',
  cadence      text default 'oneoff' check (cadence in ('daily','weekly','monthly','oneoff')),
  recurring    boolean default false,
  deadline     text,
  sequence     jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists goals_user_id_idx on public.goals (user_id);
create index if not exists goals_updated_at_idx on public.goals (user_id, updated_at desc);

-- Keep updated_at fresh on every row change.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists goals_set_updated_at on public.goals;
create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

-- Row-Level Security: every user sees only their own rows.
alter table public.goals enable row level security;

drop policy if exists "users read own goals"   on public.goals;
drop policy if exists "users insert own goals" on public.goals;
drop policy if exists "users update own goals" on public.goals;
drop policy if exists "users delete own goals" on public.goals;

create policy "users read own goals"   on public.goals for select using (auth.uid() = user_id);
create policy "users insert own goals" on public.goals for insert with check (auth.uid() = user_id);
create policy "users update own goals" on public.goals for update using (auth.uid() = user_id);
create policy "users delete own goals" on public.goals for delete using (auth.uid() = user_id);
