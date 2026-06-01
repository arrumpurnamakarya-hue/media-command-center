create extension if not exists pgcrypto;

create table if not exists public.publish_queue (
  id uuid primary key default gen_random_uuid(),
  content_id uuid references public.contents(id) on delete cascade,
  platform text not null,
  status text default 'pending',
  scheduled_at timestamptz,
  published_at timestamptz,
  external_post_id text,
  published_url text,
  error_message text,
  attempt_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists publish_queue_content_platform_idx
  on public.publish_queue (content_id, platform);

create index if not exists publish_queue_status_idx
  on public.publish_queue (status);

create index if not exists publish_queue_scheduled_at_idx
  on public.publish_queue (scheduled_at);

alter table public.publish_queue enable row level security;

drop policy if exists "Authenticated users can select publish queue"
  on public.publish_queue;
create policy "Authenticated users can select publish queue"
  on public.publish_queue
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert publish queue"
  on public.publish_queue;
create policy "Authenticated users can insert publish queue"
  on public.publish_queue
  for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update publish queue"
  on public.publish_queue;
create policy "Authenticated users can update publish queue"
  on public.publish_queue
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete publish queue"
  on public.publish_queue;
create policy "Authenticated users can delete publish queue"
  on public.publish_queue
  for delete
  to authenticated
  using (true);
