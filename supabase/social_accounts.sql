create extension if not exists pgcrypto;

create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  account_name text,
  account_id text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  permissions text[],
  status text default 'not_connected',
  connected_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists social_accounts_platform_idx
  on public.social_accounts (platform);

create unique index if not exists social_accounts_platform_unique_idx
  on public.social_accounts (platform);

create index if not exists social_accounts_status_idx
  on public.social_accounts (status);

alter table public.social_accounts enable row level security;

drop policy if exists "Authenticated users can select social accounts"
  on public.social_accounts;
create policy "Authenticated users can select social accounts"
  on public.social_accounts
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert social accounts"
  on public.social_accounts;
create policy "Authenticated users can insert social accounts"
  on public.social_accounts
  for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update social accounts"
  on public.social_accounts;
create policy "Authenticated users can update social accounts"
  on public.social_accounts
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete social accounts"
  on public.social_accounts;
create policy "Authenticated users can delete social accounts"
  on public.social_accounts
  for delete
  to authenticated
  using (true);
