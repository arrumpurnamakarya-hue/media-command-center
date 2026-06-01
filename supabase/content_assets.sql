create extension if not exists pgcrypto;

alter table public.contents
  add column if not exists rubric text;

create table if not exists public.content_assets (
  id uuid primary key default gen_random_uuid(),
  content_id uuid references public.contents(id) on delete cascade,
  file_url text,
  file_path text,
  file_type text,
  file_name text,
  asset_type text default 'unknown',
  mime_type text,
  width int,
  height int,
  duration_seconds numeric,
  aspect_ratio numeric,
  is_vertical_video boolean default false,
  is_short_video boolean default false,
  public_url text,
  slide_order int,
  is_cover boolean default false,
  created_at timestamptz default now()
);

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

create index if not exists content_assets_content_id_idx
  on public.content_assets (content_id);

create index if not exists content_assets_slide_order_idx
  on public.content_assets (content_id, slide_order);

alter table public.content_assets enable row level security;

drop policy if exists "Authenticated users can select content assets"
  on public.content_assets;
create policy "Authenticated users can select content assets"
  on public.content_assets
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert content assets"
  on public.content_assets;
create policy "Authenticated users can insert content assets"
  on public.content_assets
  for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update content assets"
  on public.content_assets;
create policy "Authenticated users can update content assets"
  on public.content_assets
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete content assets"
  on public.content_assets;
create policy "Authenticated users can delete content assets"
  on public.content_assets
  for delete
  to authenticated
  using (true);
