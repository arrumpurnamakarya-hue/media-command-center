-- Content publishing metadata and Facebook live monitoring seed support.
-- Safe to run multiple times. Does not delete existing data.

create extension if not exists pgcrypto;

alter table public.contents
  add column if not exists scheduled_at timestamptz,
  add column if not exists publish_metadata jsonb default '{}'::jsonb;

alter table public.content_assets
  add column if not exists publish_metadata jsonb default '{}'::jsonb;

create table if not exists public.post_insights (
  id uuid primary key default gen_random_uuid(),
  content_id uuid null references public.contents(id) on delete set null,
  platform text not null,
  created_at timestamptz default now()
);

alter table public.post_insights
  add column if not exists content_id uuid null references public.contents(id) on delete set null,
  add column if not exists source text default 'meta_api',
  add column if not exists external_post_id text,
  add column if not exists published_url text,
  add column if not exists post_message text,
  add column if not exists post_created_time timestamptz,
  add column if not exists likes bigint default 0,
  add column if not exists comments bigint default 0,
  add column if not exists shares bigint default 0,
  add column if not exists engagement bigint default 0,
  add column if not exists reach bigint default 0,
  add column if not exists impressions bigint default 0,
  add column if not exists synced_at timestamptz default now(),
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create unique index if not exists post_insights_platform_external_post_unique
  on public.post_insights (platform, external_post_id)
  where external_post_id is not null;
