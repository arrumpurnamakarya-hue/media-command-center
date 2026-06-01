-- Instagram Live Publish stage 1-2 support.
-- Safe to run multiple times. Does not delete existing data.

alter table public.publish_queue
  add column if not exists processing_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists external_post_id text,
  add column if not exists external_post_url text,
  add column if not exists published_url text,
  add column if not exists error_message text,
  add column if not exists attempts int default 0,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists publish_mode text default 'dry_run',
  add column if not exists platform_response jsonb,
  add column if not exists updated_at timestamptz default now();

alter table public.post_insights
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
  add column if not exists media_type text,
  add column if not exists synced_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create unique index if not exists post_insights_platform_external_post_unique
  on public.post_insights (platform, external_post_id)
  where external_post_id is not null;
