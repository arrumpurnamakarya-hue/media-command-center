"use client";
import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileImage,
  FileVideo,
  Loader2,
  Maximize2,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { analyzeContentAssets, AssetAnalysisResult } from '../lib/publish/assetAnalyzer';
import { checkPlatformReadiness, PlatformReadinessResult } from '../lib/publish/platformReadiness';

type FormatOption = 'Feed' | 'Carousel' | 'Reels' | 'Story' | 'Artikel';
type PillarOption = 'Informative' | 'Educational' | 'Entertaining' | 'Promotional' | 'Commemorative Day';
type RubricOption =
  | 'Khazanah'
  | 'DPRD Ngapain Aja?'
  | 'Garut Butuh Jawaban'
  | 'PKB Peduli'
  | 'E-Koran'
  | 'Ucapan Hari Besar'
  | 'Kegiatan DPC'
  | 'Kegiatan DPRD'
  | 'Aspirasi Warga'
  | 'UMKM Lokal'
  | 'Behind The Scene'
  | 'Lainnya';
type ProdStatus = 'Ideation' | 'Drafting' | 'Editing/Design' | 'Ready to Post';
type PubStatus = 'Draft' | 'Scheduled' | 'Posted';

type PublishMetadata = {
  people_tags?: string[];
  location_name?: string;
  music_note?: string;
  publish_note?: string;
};

type ContentAsset = {
  id: string;
  content_id: string;
  file_url?: string | null;
  file_path?: string | null;
  file_type?: string | null;
  file_name?: string | null;
  asset_type?: string | null;
  mime_type?: string | null;
  width?: number | string | null;
  height?: number | string | null;
  duration_seconds?: number | string | null;
  aspect_ratio?: number | string | null;
  is_vertical_video?: boolean | null;
  is_short_video?: boolean | null;
  public_url?: string | null;
  slide_order?: number | null;
  is_cover?: boolean | null;
  created_at?: string | null;
};

type PublishQueueItem = {
  id: string;
  content_id: string;
  platform: string;
  status?: string | null;
  scheduled_at?: string | null;
  processing_at?: string | null;
  published_at?: string | null;
  external_post_id?: string | null;
  external_post_url?: string | null;
  published_url?: string | null;
  error_message?: string | null;
  attempts?: number | null;
  attempt_count?: number | null;
  last_attempt_at?: string | null;
  publish_mode?: string | null;
  platform_response?: any;
  created_at?: string | null;
  updated_at?: string | null;
};

type ContentLibraryItem = {
  id: string;
  title: string;
  pillar?: string | null;
  rubric?: string | null;
  format?: string | null;
  caption?: string | null;
  hashtags?: string | null;
  platforms?: string[] | null;
  publish_date?: string | null;
  publish_time?: string | null;
  scheduled_at?: string | null;
  publish_metadata?: PublishMetadata | null;
  prod_status?: string | null;
  pub_status?: string | null;
  asset_url?: string | null;
  asset_path?: string | null;
  asset_type?: string | null;
  assets?: ContentAsset[];
  publish_queue?: PublishQueueItem[];
};

type ContentLibraryProps = {
  isDarkMode?: boolean;
  onContentSaved?: () => void;
};

type BulkLiveUiResult = {
  platform: string;
  action: 'published' | 'skipped' | 'failed';
  status: string;
  reason: string;
  external_post_url?: string | null;
};

type FormState = {
  title: string;
  pillar: PillarOption;
  rubric: RubricOption;
  format: FormatOption;
  caption: string;
  hashtags: string;
  platforms: string[];
  publish_date: string;
  publish_time: string;
  people_tags: string;
  location_name: string;
  music_note: string;
  publish_note: string;
  prod_status: ProdStatus;
  pub_status: PubStatus;
};

const PILLARS: PillarOption[] = ['Informative', 'Educational', 'Entertaining', 'Promotional', 'Commemorative Day'];
const RUBRICS: RubricOption[] = [
  'Khazanah',
  'DPRD Ngapain Aja?',
  'Garut Butuh Jawaban',
  'PKB Peduli',
  'E-Koran',
  'Ucapan Hari Besar',
  'Kegiatan DPC',
  'Kegiatan DPRD',
  'Aspirasi Warga',
  'UMKM Lokal',
  'Behind The Scene',
  'Lainnya',
];
const FORMATS: FormatOption[] = ['Feed', 'Carousel', 'Reels', 'Story', 'Artikel'];
const PROD_STATUSES: ProdStatus[] = ['Ideation', 'Drafting', 'Editing/Design', 'Ready to Post'];
const PUB_STATUSES: PubStatus[] = ['Draft', 'Scheduled', 'Posted'];
const RUBRIC_SQL = 'alter table public.contents add column if not exists rubric text;';
const PUBLISH_METADATA_SQL = `alter table public.contents
  add column if not exists scheduled_at timestamptz,
  add column if not exists publish_metadata jsonb default '{}'::jsonb;

alter table public.content_assets
  add column if not exists publish_metadata jsonb default '{}'::jsonb;`;
const CONTENT_ASSETS_SQL = `create extension if not exists pgcrypto;

alter table public.contents
  add column if not exists rubric text,
  add column if not exists scheduled_at timestamptz,
  add column if not exists publish_metadata jsonb default '{}'::jsonb;

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
  publish_metadata jsonb default '{}'::jsonb,
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
  on public.content_assets for select to authenticated using (true);

drop policy if exists "Authenticated users can insert content assets"
  on public.content_assets;
create policy "Authenticated users can insert content assets"
  on public.content_assets for insert to authenticated with check (true);

drop policy if exists "Authenticated users can update content assets"
  on public.content_assets;
create policy "Authenticated users can update content assets"
  on public.content_assets for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can delete content assets"
  on public.content_assets;
create policy "Authenticated users can delete content assets"
  on public.content_assets for delete to authenticated using (true);`;
const PUBLISH_QUEUE_SQL = `create extension if not exists pgcrypto;

create table if not exists public.publish_queue (
  id uuid primary key default gen_random_uuid(),
  content_id uuid references public.contents(id) on delete cascade,
  platform text not null,
  status text default 'pending',
  scheduled_at timestamptz,
  processing_at timestamptz,
  published_at timestamptz,
  external_post_id text,
  external_post_url text,
  published_url text,
  error_message text,
  attempts int default 0,
  attempt_count int default 0,
  last_attempt_at timestamptz,
  publish_mode text default 'dry_run',
  platform_response jsonb,
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
  on public.publish_queue for select to authenticated using (true);

drop policy if exists "Authenticated users can insert publish queue"
  on public.publish_queue;
create policy "Authenticated users can insert publish queue"
  on public.publish_queue for insert to authenticated with check (true);

drop policy if exists "Authenticated users can update publish queue"
  on public.publish_queue;
create policy "Authenticated users can update publish queue"
  on public.publish_queue for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can delete publish queue"
  on public.publish_queue;
create policy "Authenticated users can delete publish queue"
  on public.publish_queue for delete to authenticated using (true);`;
const PLATFORM_OPTIONS = [
  { value: 'IG', label: 'IG' },
  { value: 'FB', label: 'FB' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'X', label: 'X' },
  { value: 'YT', label: 'YT' },
];

const JAKARTA_TIME_ZONE = 'Asia/Jakarta';

function getJakartaDateInput(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: JAKARTA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const getPart = (type: string) => parts.find(part => part.type === type)?.value || '';

  return `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
}

function getJakartaTimeInput(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: JAKARTA_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const getPart = (type: string) => parts.find(part => part.type === type)?.value || '';

  return `${getPart('hour')}:${getPart('minute')}`;
}

function getInitialFormState(): FormState {
  return {
    title: '',
    pillar: 'Informative',
    rubric: 'Khazanah',
    format: 'Feed',
    caption: '',
    hashtags: '',
    platforms: [],
    publish_date: getJakartaDateInput(),
    publish_time: '09:00',
    people_tags: '',
    location_name: '',
    music_note: '',
    publish_note: '',
    prod_status: 'Ideation',
    pub_status: 'Draft',
  };
}

const QUICK_SCHEDULE_OPTIONS = [
  { label: 'Hari ini 09:00', type: 'today', time: '09:00' },
  { label: 'Hari ini 19:00', type: 'today', time: '19:00' },
  { label: 'Besok 09:00', type: 'tomorrow', time: '09:00' },
  { label: 'Besok 19:00', type: 'tomorrow', time: '19:00' },
  { label: '+1 Jam', type: 'plus_hours', hours: 1 },
  { label: '+3 Jam', type: 'plus_hours', hours: 3 },
] as const;

type QuickScheduleOption = typeof QUICK_SCHEDULE_OPTIONS[number];

const getQuickScheduleValue = (option: QuickScheduleOption) => {
  const now = new Date();

  if (option.type === 'plus_hours') {
    const targetDate = new Date(now.getTime() + option.hours * 60 * 60 * 1000);

    return {
      publish_date: getJakartaDateInput(targetDate),
      publish_time: getJakartaTimeInput(targetDate),
    };
  }

  const targetDate = option.type === 'tomorrow'
    ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
    : now;

  return {
    publish_date: getJakartaDateInput(targetDate),
    publish_time: option.time,
  };
};

const getPlatformLabel = (platform: string) => {
  if (platform.toUpperCase() === 'TIKTOK') return 'TikTok';
  return platform;
};

const getShortCaption = (caption?: string | null) => {
  if (!caption) return 'Belum ada caption.';
  return caption.length > 120 ? `${caption.slice(0, 120)}...` : caption;
};

const getOrderedAssets = (item: ContentLibraryItem) => {
  const assets = [...(item.assets || [])].sort((a, b) => Number(a.slide_order || 0) - Number(b.slide_order || 0));

  if (assets.length > 0) return assets;

  if (!item.asset_url) return [];

  return [{
    id: `${item.id}-cover`,
    content_id: item.id,
    file_url: item.asset_url,
    file_path: item.asset_path,
    file_type: item.asset_type,
    asset_type: getAssetTypeFromMime(item.asset_type || ''),
    mime_type: item.asset_type || null,
    public_url: item.asset_url,
    file_name: item.title,
    slide_order: 1,
    is_cover: true,
  }];
};

const getCoverAsset = (item: ContentLibraryItem) => {
  const orderedAssets = getOrderedAssets(item);
  return orderedAssets.find(asset => asset.is_cover) || orderedAssets[0];
};

const getStatusBadges = (item: ContentLibraryItem) => {
  const statuses: string[] = [];
  const addStatus = (status?: string | null) => {
    if (status && ['Draft', 'Editing/Design', 'Ready to Post', 'Scheduled', 'Posted', 'Failed'].includes(status) && !statuses.includes(status)) {
      statuses.push(status);
    }
  };

  addStatus(item.pub_status);
  addStatus(item.prod_status);
  if (isOnlyFacebookPublished(item)) addStatus('Posted');

  return statuses.length > 0 ? statuses : ['Draft'];
};

const getStatusBadgeClass = (status: string) => {
  if (status === 'Ready to Post') return 'bg-emerald-500/10 text-emerald-400';
  if (status === 'Scheduled') return 'bg-sky-500/10 text-sky-400';
  if (status === 'Posted') return 'bg-blue-500/10 text-blue-400';
  if (status === 'Failed') return 'bg-rose-500/10 text-rose-400';
  if (status === 'Editing/Design') return 'bg-amber-500/10 text-amber-400';
  return 'bg-gray-500/10 text-gray-400';
};

const getQueueStatusClass = (status: string) => {
  const normalizedStatus = status.toLowerCase();
  if (normalizedStatus === 'published') return 'bg-blue-500/10 text-blue-400';
  if (normalizedStatus === 'manual_published') return 'bg-purple-500/10 text-purple-400';
  if (normalizedStatus === 'dry_run_success') return 'bg-emerald-500/10 text-emerald-400';
  if (normalizedStatus === 'ready_to_publish') return 'bg-sky-500/10 text-sky-400';
  if (normalizedStatus === 'failed') return 'bg-rose-500/10 text-rose-400';
  if (normalizedStatus === 'processing') return 'bg-amber-500/10 text-amber-400';
  if (normalizedStatus === 'cancelled') return 'bg-gray-500/10 text-gray-500';
  if (normalizedStatus === 'not queued') return 'bg-gray-500/10 text-gray-400';
  return 'bg-emerald-500/10 text-emerald-400';
};

const getQueueStatusLabel = (status: string) => {
  const normalizedStatus = status.toLowerCase();
  if (normalizedStatus === 'dry_run_success') return 'DRY RUN SUCCESS';
  if (normalizedStatus === 'ready_to_publish') return 'READY';
  if (normalizedStatus === 'manual_published') return 'MANUAL PUBLISHED';
  if (normalizedStatus === 'not queued') return 'NOT QUEUED';
  return status.replace(/_/g, ' ').toUpperCase();
};

const getQueueSummary = (item: ContentLibraryItem) => {
  const queue = item.publish_queue || [];
  return {
    pending: queue.filter(row => (row.status || '').toLowerCase() === 'pending').length,
    published: queue.filter(row => ['published', 'manual_published'].includes((row.status || '').toLowerCase())).length,
    failed: queue.filter(row => (row.status || '').toLowerCase() === 'failed').length,
  };
};

const isOnlyFacebookPublished = (item: ContentLibraryItem) => {
  const platforms = item.platforms || [];
  if (platforms.length !== 1 || platforms[0] !== 'FB') return false;
  const fbQueue = (item.publish_queue || []).find(row => row.platform === 'FB');
  return (fbQueue?.status || '').toLowerCase() === 'published' || Boolean(fbQueue?.external_post_id);
};

const isDryRunEligible = (item: ContentLibraryItem) => {
  const statuses = [item.prod_status, item.pub_status]
    .filter(Boolean)
    .map(status => String(status).toLowerCase().replace(/[-\s]+/g, '_'));

  return statuses.some(status => ['ready_to_post', 'scheduled', 'approved'].includes(status));
};

const isFacebookLiveEligible = (
  item: ContentLibraryItem,
  queueRow: PublishQueueItem | undefined,
  platform: string,
) => {
  if (platform !== 'FB' || !queueRow?.id || !isDryRunEligible(item)) return false;

  const status = (queueRow.status || '').toLowerCase();
  const publishMode = (queueRow.publish_mode || '').toLowerCase();

  return ['dry_run_success', 'ready_to_publish'].includes(status)
    && ['dry_run', 'facebook_live_ready'].includes(publishMode)
    && !queueRow.external_post_id
    && status !== 'published';
};

const isInstagramLiveEligible = (
  item: ContentLibraryItem,
  queueRow: PublishQueueItem | undefined,
  platform: string,
) => {
  if (platform !== 'IG' || !queueRow?.id || !isDryRunEligible(item)) return false;

  const status = (queueRow.status || '').toLowerCase();
  const readiness = getReadinessForPlatform(item, platform, queueRow);

  return ['dry_run_success', 'ready_to_publish'].includes(status)
    && readiness.ready_for_live
    && !queueRow.external_post_id
    && status !== 'published';
};

const getPreviewAspectClass = (format?: string | null) => {
  const normalizedFormat = (format || '').toLowerCase();

  if (
    normalizedFormat.includes('reels') ||
    normalizedFormat.includes('story') ||
    normalizedFormat.includes('tiktok') ||
    normalizedFormat.includes('vertical') ||
    normalizedFormat.includes('vertikal')
  ) {
    return 'w-full max-w-[min(100%,38vh)] aspect-[9/16]';
  }

  return 'w-full max-w-[min(100%,54vh)] aspect-[4/5]';
};

const buildScheduledAt = (publishDate?: string | null, publishTime?: string | null) => {
  if (!publishDate) return null;
  const normalizedTime = publishTime ? (publishTime.length === 5 ? `${publishTime}:00` : publishTime) : '09:00:00';
  return new Date(`${publishDate}T${normalizedTime}+07:00`).toISOString();
};

const normalizeTimeInput = (publishTime?: string | null) => {
  if (!publishTime) return '09:00';
  return publishTime.length >= 5 ? publishTime.slice(0, 5) : publishTime;
};

const splitScheduledAt = (scheduledAt?: string | null) => {
  if (!scheduledAt) return { publish_date: null, publish_time: null };

  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) return { publish_date: null, publish_time: null };

  return {
    publish_date: getJakartaDateInput(date),
    publish_time: getJakartaTimeInput(date),
  };
};

const formatScheduleDisplay = (
  publishDate?: string | null,
  publishTime?: string | null,
  scheduledAt?: string | null,
) => {
  const isoSchedule = scheduledAt || buildScheduledAt(publishDate, publishTime);
  if (!isoSchedule) return 'Belum dijadwalkan';

  const date = new Date(isoSchedule);
  if (Number.isNaN(date.getTime())) return 'Belum dijadwalkan';

  const parts = new Intl.DateTimeFormat('id-ID', {
    timeZone: JAKARTA_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const getPart = (type: string) => parts.find(part => part.type === type)?.value || '';

  return `${getPart('day')} ${getPart('month')} ${getPart('year')}, ${getPart('hour')}.${getPart('minute')}`;
};

const parsePeopleTags = (value?: string | null) =>
  (value || '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const stringValue = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
};

const normalizePublishMetadata = (value: unknown): PublishMetadata => {
  let metadataValue = value;

  if (typeof value === 'string') {
    try {
      metadataValue = JSON.parse(value);
    } catch {
      metadataValue = {};
    }
  }

  if (!isRecord(metadataValue)) return {};

  const peopleTagsValue = metadataValue.people_tags;
  const peopleTags = Array.isArray(peopleTagsValue)
    ? peopleTagsValue.map(tag => stringValue(tag).trim()).filter(Boolean)
    : parsePeopleTags(stringValue(peopleTagsValue));

  return {
    ...(peopleTags.length > 0 ? { people_tags: peopleTags } : {}),
    ...(stringValue(metadataValue.location_name).trim() ? { location_name: stringValue(metadataValue.location_name).trim() } : {}),
    ...(stringValue(metadataValue.music_note).trim() ? { music_note: stringValue(metadataValue.music_note).trim() } : {}),
    ...(stringValue(metadataValue.publish_note).trim() ? { publish_note: stringValue(metadataValue.publish_note).trim() } : {}),
  };
};

const buildPublishMetadata = (form: FormState): PublishMetadata => {
  const peopleTags = parsePeopleTags(form.people_tags);

  return {
    ...(peopleTags.length > 0 ? { people_tags: peopleTags } : {}),
    ...(form.location_name.trim() ? { location_name: form.location_name.trim() } : {}),
    ...(form.music_note.trim() ? { music_note: form.music_note.trim() } : {}),
    ...(form.publish_note.trim() ? { publish_note: form.publish_note.trim() } : {}),
  };
};

const getPublishMetadataRows = (metadata?: PublishMetadata | null) => {
  const normalizedMetadata = normalizePublishMetadata(metadata);

  return [
    { label: 'Tag Orang', value: normalizedMetadata.people_tags?.join(', ') || '' },
    { label: 'Lokasi', value: normalizedMetadata.location_name || '' },
    { label: 'Musik', value: normalizedMetadata.music_note || '' },
    { label: 'Catatan Publish', value: normalizedMetadata.publish_note || '' },
  ].filter(item => item.value);
};

const normalizeContentLibraryItem = (item: any): ContentLibraryItem => {
  const scheduledParts = splitScheduledAt(item.scheduled_at);
  const publishDate = item.publish_date || scheduledParts.publish_date || null;
  const publishTime = normalizeTimeInput(item.publish_time || scheduledParts.publish_time || '09:00');

  return {
    ...item,
    publish_date: publishDate,
    publish_time: publishTime,
    scheduled_at: item.scheduled_at || null,
    publish_metadata: normalizePublishMetadata(item.publish_metadata),
  };
};

const getStoredReadiness = (queueRow?: PublishQueueItem): PlatformReadinessResult | null => {
  const response = queueRow?.platform_response;
  if (!isRecord(response)) return null;

  const readiness = response.readiness;
  if (!isRecord(readiness)) return null;

  const platform = stringValue(readiness.platform || queueRow?.platform);
  const status = stringValue(readiness.status);
  const suggestedAssetType = stringValue(readiness.suggested_asset_type);

  if (!platform || !['ready', 'warning', 'not_ready'].includes(status)) return null;

  return {
    platform,
    ready_for_dry_run: Boolean(readiness.ready_for_dry_run),
    ready_for_live: Boolean(readiness.ready_for_live),
    status: status as PlatformReadinessResult['status'],
    reason: stringValue(readiness.reason),
    requirements: Array.isArray(readiness.requirements)
      ? readiness.requirements.map(item => stringValue(item)).filter(Boolean)
      : [],
    variant_needed: Boolean(readiness.variant_needed),
    suggested_asset_type: ['image', 'carousel', 'video_9_16', 'text'].includes(suggestedAssetType)
      ? suggestedAssetType as PlatformReadinessResult['suggested_asset_type']
      : 'text',
    suggested_caption_note: stringValue(readiness.suggested_caption_note) || undefined,
  };
};

const getReadinessForPlatform = (
  item: ContentLibraryItem,
  platform: string,
  queueRow?: PublishQueueItem,
) => getStoredReadiness(queueRow) || checkPlatformReadiness(item, getOrderedAssets(item), platform);

const getAssetAnalysisFormatLabel = (analysis: AssetAnalysisResult) => {
  if (analysis.is_single_image) return 'Single Image';
  if (analysis.is_carousel_image) return 'Carousel Image';
  if (analysis.is_single_video) return 'Single Video';
  if (analysis.has_mixed_media) return 'Mixed Media';
  if (analysis.total_assets === 0) return 'No Asset';
  return 'Unknown';
};

const formatDurationSeconds = (duration: number | null) => {
  if (duration === null) return '-';
  const minutes = Math.floor(duration / 60);
  const seconds = Math.round(duration % 60);
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
};

const getAssetAnalysisStatus = (analysis: AssetAnalysisResult) => {
  if (analysis.is_single_video && analysis.vertical_video_ready && analysis.short_video_ready) {
    return 'Cocok untuk Short Video';
  }
  if (analysis.is_single_video && analysis.reasons.length > 0) return 'Butuh Penyesuaian';
  if (analysis.has_mixed_media) return 'Butuh Penyesuaian';
  return analysis.has_video ? 'Periksa Manual' : 'Asset Gambar';
};

const getReadinessBadgeLabel = (readiness: PlatformReadinessResult) => {
  const requirements = readiness.requirements.map(requirement => requirement.toLowerCase());
  const reason = readiness.reason.toLowerCase();

  if (requirements.some(requirement => requirement.includes('need video 9:16')) || reason.includes('membutuhkan video vertical 9:16')) return 'NEED VIDEO 9:16';
  if (requirements.some(requirement => requirement.includes('need video'))) return 'NEED VIDEO';
  if (requirements.some(requirement => requirement.includes('need single image'))) return 'NEED SINGLE IMAGE';
  if (requirements.some(requirement => requirement.includes('need carousel support'))) return 'NEED CAROUSEL SUPPORT';
  if (reason.includes('siap secara format')) return 'FORMAT READY / LIVE BELUM AKTIF';
  if (reason.includes('instagram reels live belum')) return 'REELS FORMAT READY / LIVE BELUM AKTIF';
  if (reason.includes('facebook reels/video live belum')) return 'VIDEO FORMAT READY / LIVE BELUM AKTIF';
  if (readiness.status === 'warning') return 'WARNING';
  if (readiness.status === 'not_ready') return 'NOT READY';
  return 'READY';
};

const getReadinessBadgeClass = (label: string) => {
  if (label === 'READY') return 'bg-emerald-500/10 text-emerald-400';
  if (label.includes('FORMAT READY')) return 'bg-cyan-500/10 text-cyan-400';
  if (label === 'WARNING') return 'bg-amber-500/10 text-amber-400';
  if (label === 'NEED VIDEO' || label === 'NEED VIDEO 9:16') return 'bg-orange-500/10 text-orange-400';
  if (label === 'NEED SINGLE IMAGE' || label === 'NEED CAROUSEL SUPPORT') return 'bg-sky-500/10 text-sky-400';
  return 'bg-rose-500/10 text-rose-400';
};

const getDistributionSummary = (item: ContentLibraryItem) => {
  const platforms = item.platforms || [];
  return platforms.reduce((summary, platform) => {
    const queueRow = (item.publish_queue || []).find(row => row.platform === platform);
    const queueStatus = (queueRow?.status || '').toLowerCase();
    const readiness = getReadinessForPlatform(item, platform, queueRow);

    if (queueStatus === 'published' || queueStatus === 'manual_published' || queueRow?.external_post_id) {
      summary.published += 1;
      return summary;
    }

    if (!queueRow) {
      summary.skipped += 1;
      return summary;
    }

    if (
      ['dry_run_success', 'ready_to_publish'].includes(queueStatus) &&
      readiness.ready_for_live
    ) {
      summary.readyForLive += 1;
    } else {
      summary.skipped += 1;
    }

    if (queueStatus === 'failed' || readiness.status === 'not_ready') {
      summary.failed += 1;
      return summary;
    }

    if (readiness.status === 'warning') {
      summary.warning += 1;
      return summary;
    }

    summary.ready += 1;
    return summary;
  }, {
    total: platforms.length,
    ready: 0,
    warning: 0,
    failed: 0,
    published: 0,
    readyForLive: 0,
    skipped: 0,
  });
};

const hasBulkLiveCandidate = (item: ContentLibraryItem) =>
  (item.publish_queue || []).some(queueRow => {
    const status = (queueRow.status || '').toLowerCase();
    return ['dry_run_success', 'ready_to_publish'].includes(status)
      && status !== 'published'
      && !queueRow.external_post_id;
  });

const getLastAttemptDisplay = (queueRow?: PublishQueueItem) => {
  if (!queueRow?.last_attempt_at) return 'Belum pernah dites';
  return formatScheduleDisplay(null, null, queueRow.last_attempt_at);
};

const sanitizeFileName = (fileName: string) =>
  fileName
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

type FileAssetMetadata = {
  asset_type: 'image' | 'video' | 'unknown';
  mime_type: string;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  aspect_ratio: number | null;
  is_vertical_video: boolean;
  is_short_video: boolean;
};

const getAssetTypeFromMime = (mimeType: string): FileAssetMetadata['asset_type'] => {
  if (mimeType.toLowerCase().startsWith('image/')) return 'image';
  if (mimeType.toLowerCase().startsWith('video/')) return 'video';
  return 'unknown';
};

const isVerticalNineBySixteen = (width: number | null, height: number | null) => {
  if (!width || !height || height <= width) return false;
  const ratio = width / height;
  return ratio >= 0.52 && ratio <= 0.60;
};

const buildFallbackFileMetadata = (file: File): FileAssetMetadata => ({
  asset_type: getAssetTypeFromMime(file.type),
  mime_type: file.type || 'application/octet-stream',
  width: null,
  height: null,
  duration_seconds: null,
  aspect_ratio: null,
  is_vertical_video: false,
  is_short_video: false,
});

const readFileAssetMetadata = async (file: File): Promise<FileAssetMetadata> => {
  const fallback = buildFallbackFileMetadata(file);

  if (fallback.asset_type === 'unknown') return fallback;

  return new Promise(resolve => {
    const objectUrl = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(objectUrl);
    const timeout = window.setTimeout(() => {
      cleanup();
      resolve(fallback);
    }, 5000);

    if (fallback.asset_type === 'image') {
      const image = new Image();
      image.onload = () => {
        window.clearTimeout(timeout);
        cleanup();
        const width = image.naturalWidth || null;
        const height = image.naturalHeight || null;
        resolve({
          ...fallback,
          width,
          height,
          aspect_ratio: width && height ? Number((width / height).toFixed(4)) : null,
        });
      };
      image.onerror = () => {
        window.clearTimeout(timeout);
        cleanup();
        resolve(fallback);
      };
      image.src = objectUrl;
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.clearTimeout(timeout);
      const width = video.videoWidth || null;
      const height = video.videoHeight || null;
      const durationSeconds = Number.isFinite(video.duration) ? Number(video.duration.toFixed(2)) : null;
      cleanup();
      resolve({
        ...fallback,
        width,
        height,
        duration_seconds: durationSeconds,
        aspect_ratio: width && height ? Number((width / height).toFixed(4)) : null,
        is_vertical_video: isVerticalNineBySixteen(width, height),
        is_short_video: durationSeconds !== null && durationSeconds <= 60,
      });
    };
    video.onerror = () => {
      window.clearTimeout(timeout);
      cleanup();
      resolve(fallback);
    };
    video.src = objectUrl;
  });
};

const isMissingRubricColumnError = (error: any) => {
  const message = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
  return error?.code === '42703' || error?.code === 'PGRST204' || (message.includes('rubric') && message.includes('column'));
};

const isMissingPublishMetadataColumnError = (error: any) => {
  const message = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    message.includes('publish_metadata') ||
    message.includes('scheduled_at')
  );
};

const isMissingContentAssetsTableError = (error: any) => {
  const message = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
  return (
    error?.code === '42P01' ||
    error?.code === '42703' ||
    error?.code === 'PGRST205' ||
    error?.code === 'PGRST204' ||
    message.includes('relation "content_assets" does not exist') ||
    message.includes('relation "public.content_assets" does not exist') ||
    message.includes('asset_type') ||
    message.includes('mime_type') ||
    message.includes('duration_seconds') ||
    message.includes('aspect_ratio') ||
    message.includes('is_vertical_video') ||
    message.includes('is_short_video') ||
    message.includes('public_url') ||
    (message.includes('schema cache') && message.includes('content_assets'))
  );
};

const isMissingPublishQueueTableError = (error: any) => {
  const message = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    message.includes('relation "publish_queue" does not exist') ||
    message.includes('relation "public.publish_queue" does not exist') ||
    (message.includes('schema cache') && message.includes('publish_queue'))
  );
};

export default function ContentLibrary({ isDarkMode = true, onContentSaved }: ContentLibraryProps) {
  const [formData, setFormData] = useState<FormState>(() => getInitialFormState());
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [items, setItems] = useState<ContentLibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showRubricSql, setShowRubricSql] = useState(false);
  const [showContentAssetsSql, setShowContentAssetsSql] = useState(false);
  const [showPublishQueueSql, setShowPublishQueueSql] = useState(false);
  const [showPublishMetadataSql, setShowPublishMetadataSql] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<ContentLibraryItem | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [dryRunningQueueId, setDryRunningQueueId] = useState<string | null>(null);
  const [facebookLiveQueueId, setFacebookLiveQueueId] = useState<string | null>(null);
  const [instagramLiveQueueId, setInstagramLiveQueueId] = useState<string | null>(null);
  const [bulkDryRunningContentId, setBulkDryRunningContentId] = useState<string | null>(null);
  const [bulkLivePublishingContentId, setBulkLivePublishingContentId] = useState<string | null>(null);
  const [bulkLiveResults, setBulkLiveResults] = useState<BulkLiveUiResult[] | null>(null);
  const [manualTikTokPublishingKey, setManualTikTokPublishingKey] = useState<string | null>(null);
  const [manualTikTokUrls, setManualTikTokUrls] = useState<Record<string, string>>({});
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [zoomAsset, setZoomAsset] = useState<ContentAsset | null>(null);

  const cardClass = isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200';
  const innerClass = isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900';
  const mutedText = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const titleText = isDarkMode ? 'text-white' : 'text-gray-900';

  const selectedAssetMeta = useMemo(() => {
    if (selectedFiles.length === 0) return [];

    return selectedFiles.map(file => {
      const isVideo = file.type.startsWith('video/');
      return {
        name: file.name,
        typeLabel: isVideo ? 'Video' : 'Gambar',
        icon: isVideo ? <FileVideo size={16} /> : <FileImage size={16} />,
      };
    });
  }, [selectedFiles]);

  const fetchLibraryContents = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setShowContentAssetsSql(false);
    setShowPublishQueueSql(false);

    try {
      const { data, error } = await supabase
        .from('contents')
        .select('*')
        .eq('is_content_library', true)
        .order('publish_date', { ascending: true });

      if (error) throw error;

      const sortedData: ContentLibraryItem[] = (data || []).map(normalizeContentLibraryItem).sort((a, b) => {
        const dateA = a.scheduled_at || buildScheduledAt(a.publish_date, a.publish_time) || '9999-12-31T99:99:00';
        const dateB = b.scheduled_at || buildScheduledAt(b.publish_date, b.publish_time) || '9999-12-31T99:99:00';
        return dateA.localeCompare(dateB);
      });

      const contentIds = sortedData.map(item => item.id);

      if (contentIds.length > 0) {
        const { data: assetRows, error: assetsError } = await supabase
          .from('content_assets')
          .select('*')
          .in('content_id', contentIds)
          .order('slide_order', { ascending: true });

        if (assetsError) {
          if (isMissingContentAssetsTableError(assetsError)) {
            setShowContentAssetsSql(true);
            setErrorMessage('Tabel content_assets belum ada. Jalankan migration SQL agar Carousel multi-slide aktif.');
          } else {
            throw assetsError;
          }
        } else {
          const assetsByContent = (assetRows || []).reduce((acc, asset) => {
            const contentId = asset.content_id as string;
            if (!acc[contentId]) acc[contentId] = [];
            acc[contentId].push(asset as ContentAsset);
            return acc;
          }, {} as Record<string, ContentAsset[]>);

          sortedData.forEach(item => {
            item.assets = assetsByContent[item.id] || [];
          });
        }

        const { data: queueRows, error: queueError } = await supabase
          .from('publish_queue')
          .select('*')
          .in('content_id', contentIds)
          .order('created_at', { ascending: true });

        if (queueError) {
          if (isMissingPublishQueueTableError(queueError)) {
            setShowPublishQueueSql(true);
            setErrorMessage('Tabel publish_queue belum ada. Jalankan migration SQL agar antrean auto publish aktif.');
          } else {
            throw queueError;
          }
        } else {
          const queueByContent = (queueRows || []).reduce((acc, row) => {
            const contentId = row.content_id as string;
            if (!acc[contentId]) acc[contentId] = [];
            acc[contentId].push(row as PublishQueueItem);
            return acc;
          }, {} as Record<string, PublishQueueItem[]>);

          sortedData.forEach(item => {
            item.publish_queue = queueByContent[item.id] || [];
          });
        }
      }

      setItems(sortedData);
      setSelectedDetail(prev => {
        if (!prev) return prev;
        return sortedData.find(item => item.id === prev.id) || prev;
      });
    } catch (error: any) {
      setErrorMessage(error?.message || 'Gagal memuat asset konten.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLibraryContents();
  }, []);

  useEffect(() => {
    setActiveSlideIndex(0);
    setZoomAsset(null);
    setBulkLiveResults(null);
  }, [selectedDetail?.id]);

  const handleInputChange = (field: keyof FormState, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFormatChange = (format: FormatOption) => {
    setFormData(prev => ({ ...prev, format }));
    if (format !== 'Carousel') {
      setSelectedFiles(prev => prev.slice(0, 1));
    }
  };

  const handleFileChange = (fileList: FileList | null) => {
    const files = Array.from(fileList || []);
    setSelectedFiles(formData.format === 'Carousel' ? files : files.slice(0, 1));
  };

  const handlePlatformToggle = (platform: string) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(item => item !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const handleQuickSchedule = (option: QuickScheduleOption) => {
    const schedule = getQuickScheduleValue(option);
    setFormData(prev => ({
      ...prev,
      publish_date: schedule.publish_date,
      publish_time: schedule.publish_time,
    }));
  };

  const resetForm = () => {
    setFormData(getInitialFormState());
    setSelectedFiles([]);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const filesToUpload = formData.format === 'Carousel' ? selectedFiles : selectedFiles.slice(0, 1);

    if (!formData.title.trim()) {
      setErrorMessage('Judul konten wajib diisi.');
      return;
    }

    if (filesToUpload.length === 0) {
      setErrorMessage('File gambar atau video wajib diupload.');
      return;
    }

    const scheduledAt = buildScheduledAt(formData.publish_date, formData.publish_time);

    if (formData.pub_status.toLowerCase() === 'scheduled' && !scheduledAt) {
      setErrorMessage('Jadwal wajib tersedia untuk konten Scheduled.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setShowRubricSql(false);
    setShowContentAssetsSql(false);
    setShowPublishMetadataSql(false);

    let createdContentId = '';
    const uploadedFilePaths: string[] = [];

    try {
      const publishMetadata = buildPublishMetadata(formData);
      const payload = {
        title: formData.title.trim(),
        pillar: formData.pillar,
        rubric: formData.rubric,
        format: formData.format,
        caption: formData.caption.trim(),
        hashtags: formData.hashtags.trim(),
        platforms: formData.platforms,
        publish_date: formData.publish_date || null,
        publish_time: formData.publish_time || '09:00',
        scheduled_at: scheduledAt,
        publish_metadata: publishMetadata,
        prod_status: formData.prod_status,
        pub_status: formData.pub_status,
        is_content_library: true,
      };

      const { data: createdContent, error: contentError } = await supabase
        .from('contents')
        .insert([payload])
        .select('id')
        .single();

      if (contentError) throw contentError;
      if (!createdContent?.id) throw new Error('Konten tersimpan tanpa ID. Upload asset dibatalkan.');

      createdContentId = createdContent.id;

      const assetRows = [];

      for (const [index, file] of filesToUpload.entries()) {
        const safeFileName = sanitizeFileName(file.name) || 'asset';
        const slideOrder = index + 1;
        const assetType = file.type || 'application/octet-stream';
        const fileMetadata = await readFileAssetMetadata(file);
        const assetPath = `library/${createdContentId}/${String(slideOrder).padStart(2, '0')}-${Date.now()}-${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from('content-assets')
          .upload(assetPath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: assetType,
          });

        if (uploadError) throw uploadError;
        uploadedFilePaths.push(assetPath);

        const { data: publicUrlData } = supabase.storage
          .from('content-assets')
          .getPublicUrl(assetPath);

        assetRows.push({
          content_id: createdContentId,
          file_url: publicUrlData.publicUrl,
          file_path: assetPath,
          file_type: assetType,
          file_name: file.name,
          asset_type: fileMetadata.asset_type,
          mime_type: fileMetadata.mime_type,
          width: fileMetadata.width,
          height: fileMetadata.height,
          duration_seconds: fileMetadata.duration_seconds,
          aspect_ratio: fileMetadata.aspect_ratio,
          is_vertical_video: fileMetadata.is_vertical_video,
          is_short_video: fileMetadata.is_short_video,
          public_url: publicUrlData.publicUrl,
          slide_order: slideOrder,
          is_cover: index === 0,
        });
      }

      const coverAsset = assetRows[0];
      const { error: coverError } = await supabase
        .from('contents')
        .update({
          asset_url: coverAsset.file_url,
          asset_path: coverAsset.file_path,
          asset_type: coverAsset.file_type,
        })
        .eq('id', createdContentId);

      if (coverError) throw coverError;

      const { error: assetsError } = await supabase
        .from('content_assets')
        .insert(assetRows);

      if (assetsError) throw assetsError;

      resetForm();
      setSuccessMessage('Asset konten berhasil disimpan.');
      await fetchLibraryContents();
      if (onContentSaved) onContentSaved();
    } catch (error: any) {
      if (uploadedFilePaths.length > 0) {
        await supabase.storage.from('content-assets').remove(uploadedFilePaths);
      }

      if (createdContentId) {
        await supabase.from('contents').delete().eq('id', createdContentId);
      }

      if (isMissingRubricColumnError(error)) {
        setShowRubricSql(true);
        setErrorMessage('Kolom rubric belum ada di tabel contents. Jalankan SQL berikut di Supabase SQL Editor.');
      } else if (isMissingPublishMetadataColumnError(error)) {
        setShowPublishMetadataSql(true);
        setErrorMessage('Kolom scheduled_at/publish_metadata belum ada. Jalankan SQL berikut di Supabase SQL Editor.');
      } else if (isMissingContentAssetsTableError(error)) {
        setShowContentAssetsSql(true);
        setErrorMessage('Tabel content_assets belum ada. Jalankan migration SQL berikut di Supabase SQL Editor.');
      } else {
        setErrorMessage(error?.message || 'Gagal menyimpan asset konten.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (item: ContentLibraryItem) => {
    if (!window.confirm(`Hapus asset konten "${item.title}"?`)) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const pathsToDelete = new Set<string>();

      (item.assets || []).forEach(asset => {
        if (asset.file_path) pathsToDelete.add(asset.file_path);
      });

      if (item.asset_path) pathsToDelete.add(item.asset_path);

      const { data: remoteAssets, error: remoteAssetsError } = await supabase
        .from('content_assets')
        .select('file_path')
        .eq('content_id', item.id);

      if (remoteAssetsError && !isMissingContentAssetsTableError(remoteAssetsError)) {
        throw remoteAssetsError;
      }

      (remoteAssets || []).forEach(asset => {
        if (asset.file_path) pathsToDelete.add(asset.file_path as string);
      });

      const storagePaths = Array.from(pathsToDelete);
      if (storagePaths.length > 0) {
        const { error: storageDeleteError } = await supabase.storage
          .from('content-assets')
          .remove(storagePaths);

        if (storageDeleteError) throw storageDeleteError;
      }

      const { error: assetsDeleteError } = await supabase
        .from('content_assets')
        .delete()
        .eq('content_id', item.id);

      if (assetsDeleteError && !isMissingContentAssetsTableError(assetsDeleteError)) {
        throw assetsDeleteError;
      }

      const { error } = await supabase.from('contents').delete().eq('id', item.id);
      if (error) throw error;

      setItems(prev => prev.filter(content => content.id !== item.id));
      setSuccessMessage('Asset konten berhasil dihapus.');
      if (onContentSaved) onContentSaved();
    } catch (error: any) {
      setErrorMessage(error?.message || 'Gagal menghapus asset konten.');
      await fetchLibraryContents();
    }
  };

  const handleApprove = async () => {
    if (!selectedDetail) return;

    setIsApproving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setShowPublishQueueSql(false);

    try {
      const selectedPlatforms = selectedDetail.platforms || [];
      const scheduledAt = buildScheduledAt(selectedDetail.publish_date, selectedDetail.publish_time);
      let updatedQueue: PublishQueueItem[] = [];

      if (selectedPlatforms.length > 0) {
        const queueRows = selectedPlatforms.map(platform => ({
          content_id: selectedDetail.id,
          platform,
          status: 'pending',
          scheduled_at: scheduledAt,
        }));

        const { error: queueError } = await supabase
          .from('publish_queue')
          .upsert(queueRows, {
            onConflict: 'content_id,platform',
            ignoreDuplicates: true,
          });

        if (queueError) throw queueError;

        const { data: queueData, error: queueFetchError } = await supabase
          .from('publish_queue')
          .select('*')
          .eq('content_id', selectedDetail.id)
          .order('created_at', { ascending: true });

        if (queueFetchError) throw queueFetchError;
        updatedQueue = (queueData || []) as PublishQueueItem[];
      }

      const { error: contentError } = await supabase
        .from('contents')
        .update({
          prod_status: 'Ready to Post',
          pub_status: 'Scheduled',
        })
        .eq('id', selectedDetail.id);

      if (contentError) throw contentError;

      const approvedItem = {
        ...selectedDetail,
        prod_status: 'Ready to Post',
        pub_status: 'Scheduled',
        publish_queue: updatedQueue,
      };

      setItems(prev => prev.map(item => item.id === approvedItem.id ? approvedItem : item));
      setSelectedDetail(approvedItem);
      setSuccessMessage('Asset konten disetujui dan masuk publish queue.');
      if (onContentSaved) onContentSaved();
    } catch (error: any) {
      if (isMissingPublishQueueTableError(error)) {
        setShowPublishQueueSql(true);
        setErrorMessage('Tabel publish_queue belum ada. Jalankan migration SQL berikut di Supabase SQL Editor.');
      } else {
        setErrorMessage(error?.message || 'Gagal menyetujui asset konten.');
      }
    } finally {
      setIsApproving(false);
    }
  };

  const handleDryRunPublish = async (
    queueRow: PublishQueueItem | undefined,
    content: ContentLibraryItem,
    platform: string,
  ) => {
    const loadingKey = queueRow?.id || `${content.id}:${platform}`;

    setDryRunningQueueId(loadingKey);
    setErrorMessage(null);
    setSuccessMessage(null);
    setShowPublishQueueSql(false);

    try {
      const response = await fetch('/api/publish/dry-run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(queueRow?.id
          ? { queue_id: queueRow.id }
          : { content_id: content.id, platform }),
      });
      const responseText = await response.text();
      let payload: any = null;

      try {
        payload = responseText ? JSON.parse(responseText) : null;
      } catch {
        payload = null;
      }

      if (!response.ok || !payload?.ok) {
        setErrorMessage(payload?.message || payload?.error_message || 'Dry-run publish gagal.');
        await fetchLibraryContents();
        return;
      }

      setSuccessMessage(payload?.message || 'Dry-run publish berhasil. Tidak ada konten live yang dikirim.');
      await fetchLibraryContents();
    } catch (error: any) {
      setErrorMessage(error?.message || 'Dry-run publish gagal.');
    } finally {
      setDryRunningQueueId(null);
    }
  };

  const handleBulkDryRun = async (content: ContentLibraryItem) => {
    if (!content.id || (content.platforms || []).length === 0) {
      setErrorMessage('Pilih minimal satu platform sebelum bulk dry-run.');
      return;
    }

    setBulkDryRunningContentId(content.id);
    setErrorMessage(null);
    setSuccessMessage(null);
    setBulkLiveResults(null);
    setShowPublishQueueSql(false);

    try {
      const response = await fetch('/api/publish/bulk-dry-run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content_id: content.id }),
      });
      const responseText = await response.text();
      let payload: any = null;

      try {
        payload = responseText ? JSON.parse(responseText) : null;
      } catch {
        throw new Error(responseText || 'API route error. Cek terminal Next.js.');
      }

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error_message || payload?.message || 'Bulk dry-run gagal.');
      }

      const failedCount = Array.isArray(payload.results)
        ? payload.results.filter((result: any) => !result?.ok).length
        : 0;

      setSuccessMessage(failedCount > 0
        ? `${payload.message || 'Bulk dry-run selesai.'} ${failedCount} platform perlu dicek.`
        : payload.message || 'Bulk dry-run selesai.');
      await fetchLibraryContents();
    } catch (error: any) {
      setErrorMessage(error?.message || 'Bulk dry-run gagal.');
    } finally {
      setBulkDryRunningContentId(null);
    }
  };

  const handleBulkLivePublish = async (content: ContentLibraryItem) => {
    if (!content.id || !hasBulkLiveCandidate(content)) {
      setErrorMessage('Belum ada platform yang siap untuk publish live.');
      return;
    }

    const confirmed = window.confirm('Publish semua platform yang sudah siap? Untuk saat ini hanya Facebook yang akan dikirim live. Platform lain akan dilewati.');
    if (!confirmed) return;

    setBulkLivePublishingContentId(content.id);
    setBulkLiveResults(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/publish/bulk-live', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content_id: content.id,
          confirm: true,
        }),
      });
      const responseText = await response.text();
      let payload: any = null;

      try {
        payload = responseText ? JSON.parse(responseText) : null;
      } catch {
        throw new Error(responseText || 'API route error. Cek terminal Next.js.');
      }

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error_message || payload?.message || 'Bulk live publish gagal.');
      }

      const results = Array.isArray(payload.results) ? payload.results as BulkLiveUiResult[] : [];
      const publishedCount = results.filter(result => result.action === 'published').length;
      const failedCount = results.filter(result => result.action === 'failed').length;
      setBulkLiveResults(results);
      setSuccessMessage(`${payload.message || 'Bulk live publish selesai.'} Published: ${publishedCount}. Failed: ${failedCount}.`);
      await fetchLibraryContents();
    } catch (error: any) {
      setErrorMessage(error?.message || 'Bulk live publish gagal.');
    } finally {
      setBulkLivePublishingContentId(null);
    }
  };

  const handleMarkTikTokManualPublished = async (
    item: ContentLibraryItem,
    queueRow: PublishQueueItem | undefined,
    platform: string,
  ) => {
    const normalizedPlatform = platform.toUpperCase();
    if (normalizedPlatform !== 'TIKTOK') return;

    const key = queueRow?.id || `${item.id}:${normalizedPlatform}`;
    const url = (manualTikTokUrls[key] || queueRow?.external_post_url || queueRow?.published_url || '').trim();
    setManualTikTokPublishingKey(key);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const now = new Date().toISOString();
      const payload = {
        content_id: item.id,
        platform: normalizedPlatform,
        status: 'manual_published',
        publish_mode: 'manual',
        published_at: now,
        external_post_url: url || null,
        published_url: url || null,
        error_message: null,
        platform_response: {
          mode: 'manual',
          note: 'Dipublish manual melalui HP. Insight akan masuk saat Sync TikTok berikutnya.',
          external_post_url: url || null,
        },
        updated_at: now,
      };

      if (queueRow?.id) {
        const { error } = await supabase
          .from('publish_queue')
          .update(payload)
          .eq('id', queueRow.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('publish_queue')
          .upsert([{
            ...payload,
            scheduled_at: item.scheduled_at || buildScheduledAt(item.publish_date, item.publish_time),
          }], { onConflict: 'content_id,platform' });

        if (error) throw error;
      }

      setSuccessMessage('TikTok ditandai sudah upload manual. Insight akan masuk saat Sync TikTok berikutnya.');
      await fetchLibraryContents();
      if (onContentSaved) onContentSaved();
    } catch (error: any) {
      if (isMissingPublishQueueTableError(error)) {
        setShowPublishQueueSql(true);
        setErrorMessage('Tabel publish_queue belum ada. Jalankan migration SQL agar status upload manual TikTok dapat disimpan.');
      } else {
        setErrorMessage(error?.message || 'Gagal menandai TikTok upload manual.');
      }
    } finally {
      setManualTikTokPublishingKey(null);
    }
  };

  const handleFacebookLivePublish = async (queueRow: PublishQueueItem | undefined) => {
    if (!queueRow?.id) {
      setErrorMessage('Jalankan dry-run terlebih dahulu sebelum publish live Facebook.');
      return;
    }

    const confirmed = window.confirm('Publish konten ini ke Facebook? Text, single image, dan multi-image didukung. Video belum didukung.');
    if (!confirmed) return;

    setFacebookLiveQueueId(queueRow.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/publish/facebook-live', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queue_id: queueRow.id,
          confirm: true,
        }),
      });
      const responseText = await response.text();
      let payload: any = null;

      try {
        payload = responseText ? JSON.parse(responseText) : null;
      } catch {
        throw new Error(responseText || 'API route error. Cek terminal Next.js.');
      }

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error_message || payload?.message || 'Publish Facebook live gagal.');
      }

      setSuccessMessage(payload?.message || 'Konten berhasil dipublish ke Facebook dan masuk monitoring.');
      await fetchLibraryContents();
    } catch (error: any) {
      setErrorMessage(error?.message || 'Publish Facebook live gagal.');
    } finally {
      setFacebookLiveQueueId(null);
    }
  };

  const handleInstagramLivePublish = async (queueRow: PublishQueueItem | undefined) => {
    if (!queueRow?.id) {
      setErrorMessage('Jalankan dry-run terlebih dahulu sebelum publish live Instagram.');
      return;
    }

    const confirmed = window.confirm('Publish konten ini ke Instagram? Single image dan carousel image didukung. Video/reels belum didukung.');
    if (!confirmed) return;

    setInstagramLiveQueueId(queueRow.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/publish/instagram-live', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queue_id: queueRow.id,
          confirm: true,
        }),
      });
      const responseText = await response.text();
      let payload: any = null;

      try {
        payload = responseText ? JSON.parse(responseText) : null;
      } catch {
        throw new Error(responseText || 'API route error. Cek terminal Next.js.');
      }

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error_message || payload?.message || 'Publish Instagram live gagal.');
      }

      setSuccessMessage(payload?.message || 'Konten berhasil dipublish ke Instagram dan masuk monitoring.');
      await fetchLibraryContents();
    } catch (error: any) {
      setErrorMessage(error?.message || 'Publish Instagram live gagal.');
    } finally {
      setInstagramLiveQueueId(null);
    }
  };

  const renderAssetMedia = (asset: ContentAsset | undefined, title: string, className = 'w-full h-full object-cover') => {
    if (!asset?.file_url) {
      return (
        <div className={`w-full h-full flex flex-col items-center justify-center gap-2 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
          <Archive size={26} />
          <span className="text-[9px] font-black uppercase tracking-widest">No Preview</span>
        </div>
      );
    }

    if ((asset.file_type || '').startsWith('video/')) {
      return <video src={asset.file_url} controls className={`${className} bg-black`} />;
    }

    return <img src={asset.file_url} alt={title} className={className} />;
  };

  const renderPreview = (item: ContentLibraryItem) => {
    return renderAssetMedia(getCoverAsset(item), item.title);
  };

  const detailAssets = selectedDetail ? getOrderedAssets(selectedDetail) : [];
  const detailCoverAsset = selectedDetail ? getCoverAsset(selectedDetail) : undefined;
  const detailStatusBadges = selectedDetail ? getStatusBadges(selectedDetail) : [];
  const detailQueue = selectedDetail?.publish_queue || [];
  const isDetailCarousel = selectedDetail?.format === 'Carousel' && detailAssets.length > 0;
  const detailAssetAnalysis = analyzeContentAssets(detailAssets);
  const activeDetailSlideIndex = detailAssets.length > 0 ? Math.min(activeSlideIndex, detailAssets.length - 1) : 0;
  const activeDetailAsset = isDetailCarousel ? detailAssets[activeDetailSlideIndex] || detailAssets[0] : detailCoverAsset;
  const detailPreviewAspectClass = getPreviewAspectClass(selectedDetail?.format);
  const isAlreadyApproved = selectedDetail?.pub_status === 'Scheduled' || selectedDetail?.pub_status === 'Posted';
  const isDetailFacebookOnlyPublished = selectedDetail ? isOnlyFacebookPublished(selectedDetail) : false;
  const detailPublishMetadataRows = selectedDetail ? getPublishMetadataRows(selectedDetail.publish_metadata) : [];
  const detailDistributionSummary = selectedDetail
    ? getDistributionSummary(selectedDetail)
    : { total: 0, ready: 0, warning: 0, failed: 0, published: 0, readyForLive: 0, skipped: 0 };
  const approveButtonLabel = selectedDetail?.pub_status === 'Posted'
    ? 'Sudah Posted'
    : selectedDetail?.pub_status === 'Scheduled'
      ? 'Sudah Scheduled'
      : 'Approve / Siap Publish';

  const goToPrevSlide = () => {
    if (detailAssets.length === 0) return;
    setActiveSlideIndex(prev => (prev === 0 ? detailAssets.length - 1 : prev - 1));
  };

  const goToNextSlide = () => {
    if (detailAssets.length === 0) return;
    setActiveSlideIndex(prev => (prev + 1) % detailAssets.length);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn relative font-inter">
      <div className={`p-6 md:p-8 rounded-[35px] border shadow-sm flex flex-col xl:flex-row justify-between gap-6 ${cardClass}`}>
        <div>
          <h2 className={`text-2xl font-black uppercase tracking-tight flex items-center gap-3 ${titleText}`}>
            <Archive className="text-[#008234]" size={26} />
            Asset Konten
          </h2>
          <p className={`text-[10px] font-black uppercase tracking-widest mt-2 ${mutedText}`}>
            Content Library
          </p>
        </div>
        <div className={`grid grid-cols-2 gap-3 min-w-full xl:min-w-[340px]`}>
          <div className={`p-4 rounded-2xl border ${innerClass}`}>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Total Asset</p>
            <div className="text-3xl font-black mt-2">{items.length}</div>
          </div>
          <div className={`p-4 rounded-2xl border ${innerClass}`}>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Scheduled</p>
            <div className="text-3xl font-black mt-2 text-emerald-400">
              {items.filter(item => item.pub_status === 'Scheduled').length}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
        <form onSubmit={handleSave} className={`p-6 md:p-7 rounded-[30px] border shadow-sm space-y-5 ${cardClass}`}>
          <div className="flex items-center justify-between gap-4 border-b border-gray-500/10 pb-5">
            <div>
              <h3 className={`text-sm font-black uppercase tracking-widest ${titleText}`}>Tambah Konten</h3>
              <p className={`text-[10px] font-bold mt-1 ${mutedText}`}>Asset visual dan jadwal publikasi.</p>
            </div>
            <div className="p-3 rounded-2xl bg-[#008234]/10 text-[#008234]">
              <Plus size={18} />
            </div>
          </div>

          {(errorMessage || successMessage) && (
            <div className={`p-4 rounded-2xl border text-[11px] font-bold leading-relaxed ${
              errorMessage
                ? isDarkMode ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'
                : isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}>
              <p>{errorMessage || successMessage}</p>
              {showRubricSql && (
                <pre className={`mt-3 overflow-x-auto rounded-xl border p-3 text-[10px] font-mono whitespace-pre-wrap ${
                  isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-gray-200' : 'bg-white border-rose-200 text-gray-800'
                }`}>
                  {RUBRIC_SQL}
                </pre>
              )}
              {showContentAssetsSql && (
                <pre className={`mt-3 max-h-80 overflow-auto rounded-xl border p-3 text-[10px] font-mono whitespace-pre-wrap ${
                  isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-gray-200' : 'bg-white border-rose-200 text-gray-800'
                }`}>
                  {CONTENT_ASSETS_SQL}
                </pre>
              )}
              {showPublishQueueSql && (
                <pre className={`mt-3 max-h-80 overflow-auto rounded-xl border p-3 text-[10px] font-mono whitespace-pre-wrap ${
                  isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-gray-200' : 'bg-white border-rose-200 text-gray-800'
                }`}>
                  {PUBLISH_QUEUE_SQL}
                </pre>
              )}
              {showPublishMetadataSql && (
                <pre className={`mt-3 max-h-80 overflow-auto rounded-xl border p-3 text-[10px] font-mono whitespace-pre-wrap ${
                  isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-gray-200' : 'bg-white border-rose-200 text-gray-800'
                }`}>
                  {PUBLISH_METADATA_SQL}
                </pre>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={event => handleInputChange('title', event.target.value)}
              className={`w-full p-4 rounded-2xl border text-sm font-bold focus:outline-none focus:border-[#008234] ${innerClass}`}
              placeholder="Judul asset konten"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Pillar / Category</label>
              <select
                value={formData.pillar}
                onChange={event => handleInputChange('pillar', event.target.value as PillarOption)}
                className={`w-full p-4 rounded-2xl border text-xs font-black focus:outline-none focus:border-[#008234] ${innerClass}`}
              >
                {PILLARS.map(pillar => <option key={pillar} value={pillar}>{pillar}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Rubric</label>
              <select
                value={formData.rubric}
                onChange={event => handleInputChange('rubric', event.target.value as RubricOption)}
                className={`w-full p-4 rounded-2xl border text-xs font-black focus:outline-none focus:border-[#008234] ${innerClass}`}
              >
                {RUBRICS.map(rubric => <option key={rubric} value={rubric}>{rubric}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Format</label>
            <select
              value={formData.format}
              onChange={event => handleFormatChange(event.target.value as FormatOption)}
              className={`w-full p-4 rounded-2xl border text-xs font-black focus:outline-none focus:border-[#008234] ${innerClass}`}
            >
              {FORMATS.map(format => <option key={format} value={format}>{format}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Caption</label>
            <textarea
              value={formData.caption}
              onChange={event => handleInputChange('caption', event.target.value)}
              rows={4}
              className={`w-full p-4 rounded-2xl border text-xs font-medium leading-relaxed resize-none focus:outline-none focus:border-[#008234] ${innerClass}`}
              placeholder="Caption konten"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Hashtags</label>
            <input
              type="text"
              value={formData.hashtags}
              onChange={event => handleInputChange('hashtags', event.target.value)}
              className={`w-full p-4 rounded-2xl border text-xs font-bold focus:outline-none focus:border-[#008234] ${innerClass}`}
              placeholder="#MediaCenter #PKBGarut"
            />
          </div>

          <div className={`p-4 rounded-2xl border space-y-4 ${isDarkMode ? 'bg-[#0b0d10] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Publishing Metadata</p>
              <p className={`text-[10px] font-bold mt-1 ${mutedText}`}>Informasi editorial, belum dikirim otomatis ke platform.</p>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Tag Orang</label>
              <input
                type="text"
                value={formData.people_tags}
                onChange={event => handleInputChange('people_tags', event.target.value)}
                className={`w-full p-4 rounded-2xl border text-xs font-bold focus:outline-none focus:border-[#008234] ${innerClass}`}
                placeholder="@username, @akunlain"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Lokasi</label>
              <input
                type="text"
                value={formData.location_name}
                onChange={event => handleInputChange('location_name', event.target.value)}
                className={`w-full p-4 rounded-2xl border text-xs font-bold focus:outline-none focus:border-[#008234] ${innerClass}`}
                placeholder="Garut, Jawa Barat"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Music / Audio Note</label>
              <input
                type="text"
                value={formData.music_note}
                onChange={event => handleInputChange('music_note', event.target.value)}
                className={`w-full p-4 rounded-2xl border text-xs font-bold focus:outline-none focus:border-[#008234] ${innerClass}`}
                placeholder="Judul musik/audio jika dipakai manual"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Catatan Publish</label>
              <textarea
                value={formData.publish_note}
                onChange={event => handleInputChange('publish_note', event.target.value)}
                rows={3}
                className={`w-full p-4 rounded-2xl border text-xs font-medium leading-relaxed resize-none focus:outline-none focus:border-[#008234] ${innerClass}`}
                placeholder="Catatan untuk admin posting"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Platforms</label>
            <div className="grid grid-cols-5 gap-2">
              {PLATFORM_OPTIONS.map(platform => {
                const active = formData.platforms.includes(platform.value);
                return (
                  <button
                    type="button"
                    key={platform.value}
                    onClick={() => handlePlatformToggle(platform.value)}
                    className={`py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                      active
                        ? 'bg-[#008234] border-[#008234] text-white shadow-lg shadow-green-900/20'
                        : isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-gray-400 hover:border-[#008234]/60' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-[#008234]/60'
                    }`}
                  >
                    {platform.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Publish Date</label>
              <input
                type="date"
                value={formData.publish_date}
                onChange={event => handleInputChange('publish_date', event.target.value)}
                className={`w-full p-4 rounded-2xl border text-xs font-mono focus:outline-none focus:border-[#008234] ${innerClass}`}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Publish Time</label>
              <input
                type="time"
                value={formData.publish_time}
                onChange={event => handleInputChange('publish_time', event.target.value)}
                className={`w-full p-4 rounded-2xl border text-xs font-mono focus:outline-none focus:border-[#008234] ${innerClass}`}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {QUICK_SCHEDULE_OPTIONS.map(option => (
              <button
                key={option.label}
                type="button"
                onClick={() => handleQuickSchedule(option)}
                className={`px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                  isDarkMode
                    ? 'bg-[#0b0d10] border-gray-800 text-gray-300 hover:border-[#008234]/60 hover:text-emerald-300'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-[#008234]/60 hover:text-emerald-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Prod Status</label>
              <select
                value={formData.prod_status}
                onChange={event => handleInputChange('prod_status', event.target.value as ProdStatus)}
                className={`w-full p-4 rounded-2xl border text-xs font-black focus:outline-none focus:border-[#008234] ${innerClass}`}
              >
                {PROD_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Pub Status</label>
              <select
                value={formData.pub_status}
                onChange={event => handleInputChange('pub_status', event.target.value as PubStatus)}
                className={`w-full p-4 rounded-2xl border text-xs font-black focus:outline-none focus:border-[#008234] ${innerClass}`}
              >
                {PUB_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">File Gambar / Video</label>
            <label className={`min-h-[120px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
              isDarkMode ? 'border-gray-700 bg-[#0b0d10] hover:border-[#008234]/60' : 'border-gray-300 bg-gray-50 hover:border-[#008234]/60'
            }`}>
              <input
                type="file"
                accept="image/*,video/*"
                multiple={formData.format === 'Carousel'}
                onChange={event => handleFileChange(event.target.files)}
                className="hidden"
              />
              <UploadCloud size={24} className="text-[#008234]" />
              {selectedAssetMeta.length > 0 ? (
                <div className="w-full max-w-full px-4 space-y-2">
                  <div className={`text-center text-[10px] font-black uppercase tracking-widest ${mutedText}`}>
                    {formData.format === 'Carousel' ? `${selectedAssetMeta.length} slide dipilih` : '1 file dipilih'}
                  </div>
                  <div className="space-y-1.5">
                    {selectedAssetMeta.slice(0, 4).map((asset, index) => (
                      <div key={`${asset.name}-${index}`} className={`flex items-center gap-2 text-xs font-bold ${titleText}`}>
                        {asset.icon}
                        <span className="truncate">{asset.name}</span>
                        <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-gray-500">{asset.typeLabel}</span>
                      </div>
                    ))}
                  </div>
                  {selectedAssetMeta.length > 4 && (
                    <div className="text-center text-[9px] font-black uppercase tracking-widest text-gray-500">
                      +{selectedAssetMeta.length - 4} file lainnya
                    </div>
                  )}
                </div>
              ) : (
                <span className={`text-[10px] font-black uppercase tracking-widest ${mutedText}`}>
                  {formData.format === 'Carousel' ? 'Upload Slide Carousel' : 'Upload Asset'}
                </span>
              )}
            </label>
            <p className={`text-[10px] font-bold ${mutedText}`}>
              {formData.format === 'Carousel' ? 'Carousel dapat memakai banyak gambar/video. File pertama menjadi cover.' : 'Format ini memakai satu file sebagai cover.'}
            </p>
            <p className={`text-[10px] font-bold ${mutedText}`}>
              Untuk TikTok, Reels, dan Shorts gunakan video vertical 9:16.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl bg-[#008234] hover:bg-[#006b2a] disabled:opacity-60 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-green-900/20 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
            Simpan Asset
          </button>
        </form>

        <div className={`rounded-[30px] border shadow-sm overflow-hidden ${cardClass}`}>
          <div className="p-6 md:p-7 border-b border-gray-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className={`text-sm font-black uppercase tracking-widest ${titleText}`}>Daftar Asset</h3>
              <p className={`text-[10px] font-bold mt-1 ${mutedText}`}>Arsip visual redaksi.</p>
            </div>
            <div className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest ${innerClass}`}>
              {isLoading ? 'Memuat' : `${items.length} Asset`}
            </div>
          </div>

          <div className="p-4 md:p-6">
            {isLoading ? (
              <div className="h-80 flex items-center justify-center text-[#008234]">
                <Loader2 size={28} className="animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className={`h-80 flex flex-col items-center justify-center rounded-3xl border border-dashed ${isDarkMode ? 'border-gray-800 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                <Archive size={34} className="mb-3 opacity-50" />
                <p className="text-[10px] font-black uppercase tracking-widest">Belum ada asset konten</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {items.map(item => {
                  const slideCount = item.assets?.length || (item.asset_url ? 1 : 0);
                  const statusBadges = getStatusBadges(item);
                  const queueSummary = getQueueSummary(item);

                  return (
                  <article key={item.id} className={`rounded-3xl border overflow-hidden group transition-all hover:border-[#008234]/60 ${innerClass}`}>
                    <div className="aspect-video bg-black/20 overflow-hidden">
                      {renderPreview(item)}
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="px-2 py-1 rounded-lg bg-[#008234]/10 text-[#008234] text-[8px] font-black uppercase tracking-widest">{item.format || 'Asset'}</span>
                            {item.rubric && (
                              <span className="px-2 py-1 rounded-lg bg-purple-500/10 text-purple-400 text-[8px] font-black uppercase tracking-widest">{item.rubric}</span>
                            )}
                            {slideCount > 1 && (
                              <span className="px-2 py-1 rounded-lg bg-sky-500/10 text-sky-400 text-[8px] font-black uppercase tracking-widest">
                                Carousel: {slideCount} slide
                              </span>
                            )}
                            {statusBadges.map(status => (
                              <span key={status} className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${getStatusBadgeClass(status)}`}>
                                {status}
                              </span>
                            ))}
                          </div>
                          <h4 className={`text-sm font-black leading-snug line-clamp-2 ${titleText}`}>{item.title}</h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
                          aria-label={`Hapus ${item.title}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <p className={`text-[11px] leading-relaxed line-clamp-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {getShortCaption(item.caption)}
                      </p>

                      {item.hashtags && (
                        <p className="text-[10px] font-bold text-blue-400 line-clamp-1">{item.hashtags}</p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {item.pillar && (
                          <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-[#12151a] text-gray-300' : 'bg-white text-gray-700'}`}>
                            {item.pillar}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {(item.platforms || []).map(platform => (
                          <span key={platform} className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                            {getPlatformLabel(platform)}
                          </span>
                        ))}
                        {(item.platforms || []).length === 0 && (
                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">No Platform</span>
                        )}
                      </div>

                      <div className={`grid grid-cols-3 gap-2 rounded-2xl border p-2 ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
                        {[
                          { label: 'Pending', value: queueSummary.pending, className: 'text-emerald-400' },
                          { label: 'Published', value: queueSummary.published, className: 'text-blue-400' },
                          { label: 'Failed', value: queueSummary.failed, className: 'text-rose-400' },
                        ].map(summary => (
                          <div key={summary.label} className="text-center">
                            <p className={`text-sm font-black ${summary.className}`}>{summary.value}</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-gray-500">{summary.label}</p>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedDetail(item)}
                        className={`w-full py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                          isDarkMode ? 'bg-[#12151a] border-gray-800 text-gray-300 hover:border-[#008234]/60 hover:text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-[#008234]/60'
                        }`}
                      >
                        <Eye size={14} />
                        Lihat Detail
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
                          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-500">
                            <CalendarDays size={12} />
                            Jadwal
                          </div>
                          <p className={`mt-1 text-xs font-bold ${titleText}`}>{formatScheduleDisplay(item.publish_date, item.publish_time, item.scheduled_at)}</p>
                        </div>
                        <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
                          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-500">
                            <Clock size={12} />
                            Produksi
                          </div>
                          <p className={`mt-1 text-xs font-bold ${titleText}`}>{item.prod_status || '-'}</p>
                        </div>
                      </div>
                    </div>
                  </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className={`w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-[30px] border shadow-2xl flex flex-col ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className={`sticky top-0 z-20 p-5 md:p-6 border-b border-gray-500/10 flex items-start justify-between gap-4 shrink-0 ${isDarkMode ? 'bg-[#12151a]' : 'bg-white'}`}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {detailStatusBadges.map(status => (
                    <span key={status} className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${getStatusBadgeClass(status)}`}>
                      {status}
                    </span>
                  ))}
                </div>
                <h3 className={`text-xl md:text-2xl font-black leading-tight uppercase tracking-tight ${titleText}`}>{selectedDetail.title}</h3>
                <p className={`text-[10px] font-black uppercase tracking-widest mt-2 ${mutedText}`}>{selectedDetail.format || 'Asset Konten'}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className={`p-2 rounded-xl transition-all ${isDarkMode ? 'bg-[#0b0d10] text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900'}`}
                aria-label="Tutup detail asset"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 md:p-6 custom-scrollbar">
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] gap-6">
                <div className="space-y-5">
                  <div className={`rounded-3xl border overflow-hidden ${isDarkMode ? 'bg-[#0b0d10] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="p-4 bg-[#05070a]">
                      <div className={`relative mx-auto max-h-[68vh] ${detailPreviewAspectClass}`}>
                        {renderAssetMedia(activeDetailAsset, selectedDetail.title, 'w-full h-full object-contain')}
                        {activeDetailAsset?.file_url && (
                          <button
                            type="button"
                            onClick={() => setZoomAsset(activeDetailAsset)}
                            className="absolute right-3 top-3 p-2.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all"
                            aria-label="Zoom preview"
                          >
                            <Maximize2 size={18} />
                          </button>
                        )}
                      {isDetailCarousel && detailAssets.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={goToPrevSlide}
                            className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/55 text-white hover:bg-black/75 transition-all"
                            aria-label="Slide sebelumnya"
                          >
                            <ChevronLeft size={20} />
                          </button>
                          <button
                            type="button"
                            onClick={goToNextSlide}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/55 text-white hover:bg-black/75 transition-all"
                            aria-label="Slide berikutnya"
                          >
                            <ChevronRight size={20} />
                          </button>
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/60 text-white text-[10px] font-black uppercase tracking-widest">
                            Slide {activeDetailSlideIndex + 1} / {detailAssets.length}
                          </div>
                        </>
                      )}
                      </div>
                    </div>
                    <div className="p-4 flex flex-col gap-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          {isDetailCarousel ? `Slide aktif: ${activeDetailSlideIndex + 1}` : 'Preview Asset'}
                        </span>
                        {isDetailCarousel && detailAssets.length > 1 && (
                          <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 text-[8px] font-black uppercase tracking-widest">
                            Carousel: {detailAssets.length} slide
                          </span>
                        )}
                      </div>

                      {isDetailCarousel && (
                        <div className="flex gap-3 overflow-x-auto pb-1 custom-scrollbar">
                          {detailAssets.map((asset, index) => {
                            const isActive = index === activeDetailSlideIndex;

                            return (
                              <button
                                key={asset.id || `${asset.file_path}-${index}`}
                                type="button"
                                onClick={() => setActiveSlideIndex(index)}
                                className={`shrink-0 w-20 rounded-2xl border overflow-hidden text-left transition-all ${
                                  isActive
                                    ? 'border-[#008234] ring-2 ring-[#008234]/30'
                                    : isDarkMode ? 'border-gray-800 hover:border-gray-600' : 'border-gray-200 hover:border-gray-300'
                                }`}
                                aria-label={`Buka slide ${index + 1}`}
                              >
                                <div className="aspect-square bg-black/20">
                                  {renderAssetMedia(asset, `${selectedDetail.title} thumbnail ${index + 1}`, 'w-full h-full object-contain')}
                                </div>
                                <div className={`px-2 py-1.5 ${isDarkMode ? 'bg-[#12151a]' : 'bg-white'}`}>
                                  <div className={`text-[9px] font-black uppercase tracking-widest ${titleText}`}>Slide {index + 1}</div>
                                  {index === 0 && (
                                    <div className="text-[8px] font-black uppercase tracking-widest text-[#008234] mt-0.5">Cover</div>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {!isDetailCarousel && detailCoverAsset?.is_cover && (
                        <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 text-[8px] font-black uppercase tracking-widest">
                          Cover
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className={`rounded-3xl border p-5 ${isDarkMode ? 'bg-[#0b0d10] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { label: 'Title', value: selectedDetail.title },
                        { label: 'Pillar', value: selectedDetail.pillar || '-' },
                        { label: 'Rubric', value: selectedDetail.rubric || '-' },
                        { label: 'Format', value: selectedDetail.format || '-' },
                        { label: 'Jadwal', value: formatScheduleDisplay(selectedDetail.publish_date, selectedDetail.publish_time, selectedDetail.scheduled_at) },
                        { label: 'Prod Status', value: selectedDetail.prod_status || '-' },
                        { label: 'Pub Status', value: isDetailFacebookOnlyPublished ? 'Sudah Dipublish' : selectedDetail.pub_status || '-' },
                      ].map(item => (
                        <div key={item.label} className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">{item.label}</p>
                          <p className={`mt-1 text-xs font-bold break-words ${titleText}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Asset Analysis</p>
                            <p className={`mt-1 text-xs font-black ${titleText}`}>{getAssetAnalysisFormatLabel(detailAssetAnalysis)}</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                            detailAssetAnalysis.is_single_video && detailAssetAnalysis.vertical_video_ready && detailAssetAnalysis.short_video_ready
                              ? 'bg-cyan-500/10 text-cyan-400'
                              : detailAssetAnalysis.has_video ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {getAssetAnalysisStatus(detailAssetAnalysis)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: 'Total', value: detailAssetAnalysis.total_assets },
                            { label: 'Image', value: detailAssetAnalysis.image_count },
                            { label: 'Video', value: detailAssetAnalysis.video_count },
                            {
                              label: 'Rasio',
                              value: detailAssetAnalysis.video_width && detailAssetAnalysis.video_height
                                ? `${detailAssetAnalysis.video_width}x${detailAssetAnalysis.video_height}`
                                : '-',
                            },
                            {
                              label: 'Aspect',
                              value: detailAssetAnalysis.video_aspect_ratio !== null ? detailAssetAnalysis.video_aspect_ratio : '-',
                            },
                            {
                              label: 'Durasi',
                              value: formatDurationSeconds(detailAssetAnalysis.video_duration_seconds),
                            },
                          ].map(item => (
                            <div key={item.label} className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-[#0b0d10] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                              <p className="text-[8px] font-black uppercase tracking-widest text-gray-500">{item.label}</p>
                              <p className={`mt-1 text-xs font-black ${titleText}`}>{item.value}</p>
                            </div>
                          ))}
                        </div>
                        {detailAssetAnalysis.reasons.length > 0 && (
                          <div className="mt-3 space-y-1">
                            {detailAssetAnalysis.reasons.map(reason => (
                              <p key={reason} className="text-[9px] font-bold text-amber-400">{reason}</p>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">Platforms</p>
                        <div className="flex flex-wrap gap-2">
                          {(selectedDetail.platforms || []).map(platform => (
                            <span key={platform} className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                              {getPlatformLabel(platform)}
                            </span>
                          ))}
                          {(selectedDetail.platforms || []).length === 0 && (
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">No Platform</span>
                          )}
                        </div>
                      </div>

                      {detailPublishMetadataRows.length > 0 && (
                        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-3">Publishing Metadata</p>
                          <div className="space-y-2">
                            {detailPublishMetadataRows.map(item => (
                              <div key={item.label}>
                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-500">{item.label}</p>
                                <p className={`mt-1 text-xs font-bold break-words whitespace-pre-wrap ${titleText}`}>{item.value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Multi-Platform Distribution</p>
                            <p className={`text-[10px] font-bold mt-1 ${mutedText}`}>Bulk dry-run tidak mengirim konten live.</p>
                          </div>
                          <div className="flex flex-col sm:items-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleBulkDryRun(selectedDetail)}
                              disabled={(selectedDetail.platforms || []).length === 0 || bulkDryRunningContentId === selectedDetail.id}
                              className={`px-3 py-2 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                                (selectedDetail.platforms || []).length > 0
                                  ? isDarkMode ? 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                  : isDarkMode ? 'border-gray-800 text-gray-600 cursor-not-allowed' : 'border-gray-200 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              {bulkDryRunningContentId === selectedDetail.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                              Test Semua Platform / Bulk Dry Run
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBulkLivePublish(selectedDetail)}
                              disabled={!hasBulkLiveCandidate(selectedDetail) || bulkLivePublishingContentId === selectedDetail.id}
                              className={`px-3 py-2 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                                hasBulkLiveCandidate(selectedDetail)
                                  ? isDarkMode ? 'border-blue-500/30 text-blue-300 hover:bg-blue-500/10' : 'border-blue-200 text-blue-700 hover:bg-blue-50'
                                  : isDarkMode ? 'border-gray-800 text-gray-600 cursor-not-allowed' : 'border-gray-200 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              {bulkLivePublishingContentId === selectedDetail.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                              Publish Semua yang Siap
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {[
                            { label: 'Platform', value: detailDistributionSummary.total, className: titleText },
                            { label: 'Ready Live', value: detailDistributionSummary.readyForLive, className: 'text-emerald-400' },
                            { label: 'Skipped', value: detailDistributionSummary.skipped, className: 'text-amber-400' },
                            { label: 'Published', value: detailDistributionSummary.published, className: 'text-blue-400' },
                            { label: 'Failed', value: detailDistributionSummary.failed, className: 'text-rose-400' },
                          ].map(summary => (
                            <div key={summary.label} className={`p-2 rounded-xl border text-center ${isDarkMode ? 'bg-[#0b0d10] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                              <p className={`text-sm font-black ${summary.className}`}>{summary.value}</p>
                              <p className="text-[8px] font-black uppercase tracking-widest text-gray-500">{summary.label}</p>
                            </div>
                          ))}
                        </div>
                        {bulkLiveResults && bulkLiveResults.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {bulkLiveResults.map(result => (
                              <div key={`${result.platform}-${result.action}`} className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-[#0b0d10] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className={`text-[10px] font-black uppercase tracking-widest ${titleText}`}>{getPlatformLabel(result.platform)}</p>
                                  <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                                    result.action === 'published'
                                      ? 'bg-blue-500/10 text-blue-400'
                                      : result.action === 'failed'
                                        ? 'bg-rose-500/10 text-rose-400'
                                        : 'bg-amber-500/10 text-amber-400'
                                  }`}>
                                    {result.action}
                                  </span>
                                </div>
                                <p className="mt-1 text-[9px] font-bold text-gray-500">{result.reason}</p>
                                {result.external_post_url && (
                                  <a
                                    href={result.external_post_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex mt-2 text-[9px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300"
                                  >
                                    Lihat Post Live
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-3">Publish Queue</p>
                        <div className="space-y-2">
                          {(selectedDetail.platforms || []).map(platform => {
                            const queueRow = detailQueue.find(row => row.platform === platform);
                            const queueStatus = queueRow?.status || 'not queued';
                            const normalizedQueueStatus = queueStatus.toLowerCase();
                            const dryRunLoadingKey = queueRow?.id || `${selectedDetail.id}:${platform}`;
                            const isTikTokPlatform = platform.toUpperCase() === 'TIKTOK';
                            const manualTikTokKey = queueRow?.id || `${selectedDetail.id}:TIKTOK`;
                            const isManualTikTokLoading = manualTikTokPublishingKey === manualTikTokKey;
                            const tiktokUrlValue = manualTikTokUrls[manualTikTokKey] ?? queueRow?.external_post_url ?? queueRow?.published_url ?? '';
                            const isQueuePublished = ['published', 'manual_published'].includes(normalizedQueueStatus) || Boolean(queueRow?.external_post_id);
                            const canDryRun = Boolean(selectedDetail.id && isDryRunEligible(selectedDetail) && !isQueuePublished);
                            const livePostUrl = queueRow?.external_post_url || queueRow?.published_url;
                            const canFacebookLive = isFacebookLiveEligible(selectedDetail, queueRow, platform);
                            const isFacebookLiveLoading = Boolean(queueRow?.id && facebookLiveQueueId === queueRow.id);
                            const canInstagramLive = isInstagramLiveEligible(selectedDetail, queueRow, platform);
                            const isInstagramLiveLoading = Boolean(queueRow?.id && instagramLiveQueueId === queueRow.id);
                            const readiness = getReadinessForPlatform(selectedDetail, platform, queueRow);
                            const readinessLabel = getReadinessBadgeLabel(readiness);

                            return (
                              <div key={platform} className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${isDarkMode ? 'bg-[#0b0d10] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                <div>
                                  <p className={`text-xs font-black uppercase tracking-widest ${titleText}`}>{getPlatformLabel(platform)}</p>
                                  <p className="text-[9px] font-bold text-gray-500 mt-1">
                                    {queueRow?.scheduled_at ? formatScheduleDisplay(null, null, queueRow.scheduled_at) : 'Belum masuk antrean'}
                                  </p>
                                  <p className={`text-[9px] font-bold mt-1 ${readiness.status === 'warning' ? 'text-amber-400' : readiness.status === 'not_ready' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                    {readiness.reason}
                                  </p>
                                  <p className="text-[9px] font-bold text-gray-500 mt-1">
                                    Last attempt: {getLastAttemptDisplay(queueRow)}
                                  </p>
                                  {isTikTokPlatform && (
                                    <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-purple-400">
                                      Manual Upload via HP
                                    </p>
                                  )}
                                  {queueRow?.error_message && (
                                    <p className="text-[9px] font-bold text-rose-400 mt-1">{queueRow.error_message}</p>
                                  )}
                                  {livePostUrl && (
                                    <a
                                      href={livePostUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex mt-2 text-[9px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300"
                                    >
                                      Lihat Post Live
                                    </a>
                                  )}
                                </div>
                                <div className="self-start sm:self-center flex flex-col sm:items-end gap-2">
                                  <div className="flex flex-wrap sm:justify-end gap-1.5">
                                    <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${getQueueStatusClass(queueStatus)}`}>
                                      {getQueueStatusLabel(queueStatus)}
                                    </span>
                                    <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${getReadinessBadgeClass(readinessLabel)}`}>
                                      {readinessLabel}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleDryRunPublish(queueRow, selectedDetail, platform)}
                                    disabled={!canDryRun || dryRunningQueueId === dryRunLoadingKey}
                                    className={`px-3 py-2 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                                      canDryRun
                                        ? isDarkMode ? 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                        : isDarkMode ? 'border-gray-800 text-gray-600 cursor-not-allowed' : 'border-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                                  >
                                    {dryRunningQueueId === dryRunLoadingKey ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                    Test Publish / Dry Run
                                  </button>
                                  {canFacebookLive && (
                                    <button
                                      type="button"
                                      onClick={() => handleFacebookLivePublish(queueRow)}
                                      disabled={isFacebookLiveLoading}
                                      className={`px-3 py-2 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                                        isDarkMode
                                          ? 'border-blue-500/30 text-blue-300 hover:bg-blue-500/10 disabled:border-gray-800 disabled:text-gray-600'
                                          : 'border-blue-200 text-blue-700 hover:bg-blue-50 disabled:border-gray-200 disabled:text-gray-400'
                                      } disabled:cursor-not-allowed`}
                                    >
                                      {isFacebookLiveLoading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                                      Publish Facebook Live
                                    </button>
                                  )}
                                  {canInstagramLive && (
                                    <button
                                      type="button"
                                      onClick={() => handleInstagramLivePublish(queueRow)}
                                      disabled={isInstagramLiveLoading}
                                      className={`px-3 py-2 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                                        isDarkMode
                                          ? 'border-pink-500/30 text-pink-300 hover:bg-pink-500/10 disabled:border-gray-800 disabled:text-gray-600'
                                          : 'border-pink-200 text-pink-700 hover:bg-pink-50 disabled:border-gray-200 disabled:text-gray-400'
                                      } disabled:cursor-not-allowed`}
                                    >
                                      {isInstagramLiveLoading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                                      Publish Instagram Live
                                    </button>
                                  )}
                                  {isTikTokPlatform && (
                                    <div className="w-full sm:w-64 space-y-2">
                                      <input
                                        type="url"
                                        value={tiktokUrlValue}
                                        onChange={event => setManualTikTokUrls(prev => ({
                                          ...prev,
                                          [manualTikTokKey]: event.target.value,
                                        }))}
                                        placeholder="TikTok Post URL (opsional)"
                                        className={`w-full px-3 py-2 rounded-xl border text-[10px] font-bold outline-none focus:border-purple-500 ${
                                          isDarkMode ? 'bg-[#12151a] border-gray-800 text-white placeholder:text-gray-600' : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400'
                                        }`}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleMarkTikTokManualPublished(selectedDetail, queueRow, platform)}
                                        disabled={isManualTikTokLoading}
                                        className={`w-full px-3 py-2 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                                          isDarkMode
                                            ? 'border-purple-500/30 text-purple-300 hover:bg-purple-500/10 disabled:border-gray-800 disabled:text-gray-600'
                                            : 'border-purple-200 text-purple-700 hover:bg-purple-50 disabled:border-gray-200 disabled:text-gray-400'
                                        } disabled:cursor-not-allowed`}
                                      >
                                        {isManualTikTokLoading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                        Tandai Sudah Upload Manual
                                      </button>
                                      <p className="text-[8px] font-bold leading-relaxed text-gray-500">
                                        Dipublish manual melalui HP. Insight masuk setelah Sync TikTok berikutnya.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {(selectedDetail.platforms || []).length === 0 && (
                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">No Platform</div>
                          )}
                        </div>
                      </div>

                      <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">Caption</p>
                        <p className={`text-xs leading-relaxed whitespace-pre-wrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {selectedDetail.caption || '-'}
                        </p>
                      </div>

                      <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">Hashtags</p>
                        <p className="text-xs font-bold leading-relaxed break-words text-blue-400">{selectedDetail.hashtags || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {(errorMessage || successMessage) && (
                    <div className={`p-4 rounded-2xl border text-[11px] font-bold leading-relaxed ${
                      errorMessage
                        ? isDarkMode ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'
                        : isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}>
                      <p>{errorMessage || successMessage}</p>
                      {showPublishQueueSql && (
                        <pre className={`mt-3 max-h-80 overflow-auto rounded-xl border p-3 text-[10px] font-mono whitespace-pre-wrap ${
                          isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-gray-200' : 'bg-white border-rose-200 text-gray-800'
                        }`}>
                          {PUBLISH_QUEUE_SQL}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={`sticky bottom-0 z-20 shrink-0 border-t border-gray-500/10 p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 ${isDarkMode ? 'bg-[#12151a]' : 'bg-white'}`}>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Approval Status</p>
                <p className={`text-xs font-bold mt-1 ${isAlreadyApproved ? 'text-emerald-400' : mutedText}`}>
                  {isAlreadyApproved ? approveButtonLabel : 'Belum disetujui untuk auto publish queue'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isApproving || isAlreadyApproved}
                className="w-full md:w-auto min-w-[220px] py-4 px-6 rounded-2xl bg-[#008234] hover:bg-[#006b2a] disabled:bg-gray-700 disabled:shadow-none disabled:cursor-not-allowed disabled:opacity-70 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-green-900/20 flex items-center justify-center gap-2"
              >
                {isApproving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                {approveButtonLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {zoomAsset && selectedDetail && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 p-4 animate-fadeIn">
          <button
            type="button"
            onClick={() => setZoomAsset(null)}
            className="absolute right-4 top-4 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
            aria-label="Tutup zoom preview"
          >
            <X size={22} />
          </button>
          <div className="w-full h-full flex items-center justify-center">
            {renderAssetMedia(zoomAsset, selectedDetail.title, 'max-w-full max-h-full object-contain')}
          </div>
        </div>
      )}
    </div>
  );
}
