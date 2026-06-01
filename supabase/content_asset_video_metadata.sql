-- Content asset media metadata for video vertical 9:16 readiness.
-- Safe to run multiple times. Does not delete existing data.

alter table public.content_assets
  add column if not exists asset_type text default 'unknown',
  add column if not exists mime_type text,
  add column if not exists width int,
  add column if not exists height int,
  add column if not exists duration_seconds numeric,
  add column if not exists aspect_ratio numeric,
  add column if not exists is_vertical_video boolean default false,
  add column if not exists is_short_video boolean default false,
  add column if not exists public_url text;

update public.content_assets
set
  asset_type = case
    when coalesce(asset_type, '') in ('image', 'video', 'unknown') and asset_type is not null then asset_type
    when lower(coalesce(file_type, mime_type, '')) like 'image/%' then 'image'
    when lower(coalesce(file_type, mime_type, '')) like 'video/%' then 'video'
    else 'unknown'
  end,
  mime_type = coalesce(mime_type, file_type),
  public_url = coalesce(public_url, file_url)
where asset_type is null
  or mime_type is null
  or public_url is null;
