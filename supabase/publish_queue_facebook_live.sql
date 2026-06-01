-- Facebook Live Publish readiness.
-- Safe to run multiple times. Does not delete existing publish_queue data.

alter table public.publish_queue
  add column if not exists status text default 'pending',
  add column if not exists scheduled_at timestamptz,
  add column if not exists processing_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists external_post_id text,
  add column if not exists external_post_url text,
  add column if not exists published_url text,
  add column if not exists error_message text,
  add column if not exists attempts int default 0,
  add column if not exists attempt_count int default 0,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists publish_mode text default 'dry_run',
  add column if not exists platform_response jsonb,
  add column if not exists updated_at timestamptz default now();

alter table public.publish_queue
  alter column status set default 'pending',
  alter column updated_at set default now();

update public.publish_queue
set attempts = coalesce(attempts, attempt_count, 0)
where attempts is null;

update public.publish_queue
set external_post_url = coalesce(external_post_url, published_url)
where external_post_url is null
  and published_url is not null;

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

-- Duplicate detector. Resolve these manually before enforcing the unique index.
select content_id, platform, count(*) as duplicate_count
from public.publish_queue
where content_id is not null
  and platform is not null
group by content_id, platform
having count(*) > 1;

do $$
begin
  if exists (
    select 1
    from public.publish_queue
    where content_id is not null
      and platform is not null
    group by content_id, platform
    having count(*) > 1
  ) then
    raise notice 'Duplicate publish_queue content_id + platform rows found. Unique index publish_queue_content_platform_unique was not created. Resolve duplicates manually first.';
  else
    create unique index if not exists publish_queue_content_platform_unique
      on public.publish_queue (content_id, platform);
  end if;
end $$;
