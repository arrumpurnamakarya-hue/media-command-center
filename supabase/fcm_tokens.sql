create extension if not exists pgcrypto;

create table if not exists public.fcm_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  device_name text not null default 'Android Device',
  platform text not null default 'android',
  user_id text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists fcm_tokens_platform_idx
  on public.fcm_tokens (platform);

create index if not exists fcm_tokens_user_id_idx
  on public.fcm_tokens (user_id);

alter table public.fcm_tokens enable row level security;
