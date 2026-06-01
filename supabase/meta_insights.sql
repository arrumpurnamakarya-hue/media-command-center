create extension if not exists pgcrypto;

create table if not exists public.platform_metrics (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  source text default 'legacy',
  metric_date date not null,
  reach bigint default 0,
  impressions bigint default 0,
  engagement bigint default 0,
  followers bigint default 0,
  posts_count bigint default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists platform_metrics_platform_metric_date_unique_idx
  on public.platform_metrics (platform, metric_date);

create index if not exists platform_metrics_platform_idx
  on public.platform_metrics (platform);

create table if not exists public.post_insights (
  id uuid primary key default gen_random_uuid(),
  content_id uuid null references public.contents(id) on delete set null,
  platform text not null,
  source text default 'meta_api',
  external_post_id text,
  published_url text,
  post_message text,
  post_created_time timestamptz,
  reach bigint default 0,
  impressions bigint default 0,
  engagement bigint default 0,
  likes bigint default 0,
  comments bigint default 0,
  shares bigint default 0,
  saves bigint default 0,
  views bigint default 0,
  synced_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists post_insights_platform_external_post_id_unique_idx
  on public.post_insights (platform, external_post_id);

create index if not exists post_insights_platform_idx
  on public.post_insights (platform);

create table if not exists public.insight_sync_logs (
  id uuid primary key default gen_random_uuid(),
  platform text,
  status text,
  started_at timestamptz default now(),
  finished_at timestamptz,
  error_message text
);

alter table public.platform_metrics enable row level security;
alter table public.post_insights enable row level security;
alter table public.insight_sync_logs enable row level security;

drop policy if exists "Authenticated users can select platform metrics"
  on public.platform_metrics;
create policy "Authenticated users can select platform metrics"
  on public.platform_metrics
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert platform metrics"
  on public.platform_metrics;
create policy "Authenticated users can insert platform metrics"
  on public.platform_metrics
  for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update platform metrics"
  on public.platform_metrics;
create policy "Authenticated users can update platform metrics"
  on public.platform_metrics
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete platform metrics"
  on public.platform_metrics;
create policy "Authenticated users can delete platform metrics"
  on public.platform_metrics
  for delete
  to authenticated
  using (true);

drop policy if exists "Authenticated users can select post insights"
  on public.post_insights;
create policy "Authenticated users can select post insights"
  on public.post_insights
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert post insights"
  on public.post_insights;
create policy "Authenticated users can insert post insights"
  on public.post_insights
  for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update post insights"
  on public.post_insights;
create policy "Authenticated users can update post insights"
  on public.post_insights
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete post insights"
  on public.post_insights;
create policy "Authenticated users can delete post insights"
  on public.post_insights
  for delete
  to authenticated
  using (true);

drop policy if exists "Authenticated users can select insight sync logs"
  on public.insight_sync_logs;
create policy "Authenticated users can select insight sync logs"
  on public.insight_sync_logs
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert insight sync logs"
  on public.insight_sync_logs;
create policy "Authenticated users can insert insight sync logs"
  on public.insight_sync_logs
  for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update insight sync logs"
  on public.insight_sync_logs;
create policy "Authenticated users can update insight sync logs"
  on public.insight_sync_logs
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete insight sync logs"
  on public.insight_sync_logs;
create policy "Authenticated users can delete insight sync logs"
  on public.insight_sync_logs
  for delete
  to authenticated
  using (true);
