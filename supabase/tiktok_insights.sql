-- TikTok Display API connection and insight sync support.
-- Safe to run multiple times. Does not delete existing data.

alter table public.social_accounts
  add column if not exists open_id text,
  add column if not exists scope text,
  add column if not exists refresh_token_expires_at timestamptz,
  add column if not exists source text,
  add column if not exists metadata jsonb default '{}'::jsonb;

alter table public.post_insights
  add column if not exists source text default 'meta_api',
  add column if not exists external_post_id text,
  add column if not exists published_url text,
  add column if not exists post_message text,
  add column if not exists post_created_time timestamptz,
  add column if not exists views bigint default 0,
  add column if not exists impressions bigint default 0,
  add column if not exists reach bigint default 0,
  add column if not exists likes bigint default 0,
  add column if not exists comments bigint default 0,
  add column if not exists shares bigint default 0,
  add column if not exists engagement bigint default 0,
  add column if not exists media_type text,
  add column if not exists cover_image_url text,
  add column if not exists duration_seconds int,
  add column if not exists width int,
  add column if not exists height int,
  add column if not exists raw_data jsonb default '{}'::jsonb,
  add column if not exists synced_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.platform_metrics
  add column if not exists source text default 'legacy',
  add column if not exists total_posts bigint default 0,
  add column if not exists total_views bigint default 0,
  add column if not exists total_reach bigint default 0,
  add column if not exists total_engagement bigint default 0,
  add column if not exists total_likes bigint default 0,
  add column if not exists total_comments bigint default 0,
  add column if not exists total_shares bigint default 0,
  add column if not exists synced_at timestamptz,
  add column if not exists updated_at timestamptz default now();

alter table public.insight_sync_logs
  add column if not exists source text,
  add column if not exists total_items bigint default 0,
  add column if not exists message text;

create unique index if not exists post_insights_platform_external_post_unique
  on public.post_insights (platform, external_post_id)
  where external_post_id is not null;

create unique index if not exists social_accounts_platform_unique_idx
  on public.social_accounts (platform);
