-- Per-user Pro entitlement. Read-only from the app in Build 1; Build 2's Cashfree
-- webhook (service role) writes rows after a successful web payment.
create table if not exists public.entitlements (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  plan       text not null default 'free',
  source     text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.entitlements enable row level security;
create policy "read own entitlement"  on public.entitlements for select using (auth.uid() = user_id);
create policy "write own entitlement" on public.entitlements for all    using (auth.uid() = user_id) with check (auth.uid() = user_id);
