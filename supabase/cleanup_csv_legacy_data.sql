-- Cleanup legacy CSV/import data so the main dashboard only reads Meta API rows.
-- Run this in Supabase SQL Editor, then run Integrasi -> Sync Insight Facebook once.

-- 1) Add source markers.
alter table if exists public.platform_metrics
  add column if not exists source text;

update public.platform_metrics
set source = 'legacy'
where source is null;

alter table if exists public.platform_metrics
  alter column source set default 'legacy';

alter table if exists public.post_insights
  add column if not exists source text;

update public.post_insights
set source = 'meta_api'
where source is null;

alter table if exists public.post_insights
  alter column source set default 'meta_api';

alter table if exists public.performance_recaps
  add column if not exists source text;

do $$
begin
  if to_regclass('public.performance_recaps') is not null then
    execute 'update public.performance_recaps set source = ''legacy'' where source is null';
    execute 'alter table public.performance_recaps alter column source set default ''legacy''';
  else
    raise notice 'public.performance_recaps tidak ditemukan; bagian performance_recaps dilewati.';
  end if;
end $$;

-- 2) Backup/count check before delete.
select count(*) as platform_metrics_rows_to_delete
from public.platform_metrics
where coalesce(source, 'legacy') <> 'meta_api';

do $$
declare
  rows_to_delete bigint;
begin
  if to_regclass('public.performance_recaps') is not null then
    execute 'select count(*) from public.performance_recaps where coalesce(source, ''legacy'') <> ''meta_api'''
      into rows_to_delete;
    raise notice 'performance_recaps_rows_to_delete: %', rows_to_delete;
  else
    raise notice 'performance_recaps_rows_to_delete: table not found';
  end if;
end $$;

-- If public.performance_recaps exists and you want a result-grid count,
-- this is the direct backup SELECT requested before deletion:
-- select count(*) as performance_recaps_rows_to_delete
-- from public.performance_recaps
-- where coalesce(source, 'legacy') <> 'meta_api';

-- Optional manual audit only. Do not delete automatically from contents because
-- contents is also used by Asset Konten, Planning, Jobdesk, and Reports.
-- Recap CSV rows created by the old importer are usually marked pillar = 'Imported Data'.
select count(*) as contents_imported_data_rows_for_manual_review
from public.contents
where pillar = 'Imported Data'
  and coalesce(is_content_library, false) = false;

-- articles is not cleaned here because it is used by WordPress/article sync,
-- not confirmed as CSV performance import data.

-- 3) Delete only rows that are explicitly non-Meta API.
delete from public.platform_metrics
where coalesce(source, 'legacy') <> 'meta_api';

do $$
begin
  if to_regclass('public.performance_recaps') is not null then
    execute 'delete from public.performance_recaps where coalesce(source, ''legacy'') <> ''meta_api''';
  end if;
end $$;

-- 4) Safety checks after cleanup.
select count(*) as platform_metrics_meta_api_rows
from public.platform_metrics
where source = 'meta_api';

select count(*) as post_insights_meta_api_rows
from public.post_insights
where source = 'meta_api';

-- Tables intentionally untouched:
-- public.post_insights rows with source = 'meta_api'
-- public.social_accounts
-- public.publish_queue
-- public.content_assets
-- public.contents rows for Asset Konten / Planning / Jobdesk / manual dashboard content
