import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const META_DATA_START_DATE = '2026-04-06';
const META_MEDIA_BATCH_LIMIT = '50';
const META_MEDIA_MAX_PAGES = 10;
const META_MEDIA_MAX_INSIGHT_ITEMS = 20;
const META_FETCH_TIMEOUT_MS = 20000;
const META_TIMEZONE = 'Asia/Jakarta';
const IG_BUSINESS_NOT_FOUND_MESSAGE = 'Facebook Page terhubung, tetapi Instagram Business Account belum terbaca. Pastikan akun Instagram terhubung ke Facebook Page di Meta Business Suite.';
const SYNC_FAILED_MESSAGE = 'Sync Instagram gagal.';
const IG_MEDIA_INSIGHT_METRIC_TESTS = [
  { metric: 'reach', target: 'reach', note: 'Instagram media reach candidate.' },
  { metric: 'views', target: 'impressions', note: 'Instagram media views candidate. Graph API v22 no longer supports impressions for IG media.' },
] as const;

type SocialAccountRow = {
  id: string;
  platform?: string | null;
  account_name?: string | null;
  account_id?: string | null;
  access_token?: string | null;
  status?: string | null;
};

type MetaApiError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
};

type InstagramBusinessAccount = {
  id: string;
  username?: string;
  name?: string;
};

type MetaPageInstagramResponse = {
  id?: string;
  instagram_business_account?: InstagramBusinessAccount;
  error?: MetaApiError;
};

type InstagramMedia = {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
};

type InstagramMediaResponse = {
  data?: InstagramMedia[];
  paging?: {
    next?: string;
  };
  error?: MetaApiError;
};

type InstagramInsightValue = {
  value?: number | string | Record<string, unknown> | null;
};

type InstagramInsightMetric = {
  name?: string;
  values?: InstagramInsightValue[];
};

type InstagramInsightsResponse = {
  data?: InstagramInsightMetric[];
  error?: MetaApiError;
};

type PostInsightRow = {
  platform: 'IG';
  source: 'meta_api';
  external_post_id: string;
  published_url: string | null;
  post_message: string | null;
  post_created_time: string | null;
  reach: number;
  impressions: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
  synced_at: string;
  updated_at: string;
};

type PostInsightMetricSourceRow = {
  post_created_time?: string | null;
  engagement?: number | string | null;
  likes?: number | string | null;
  comments?: number | string | null;
  reach?: number | string | null;
  impressions?: number | string | null;
};

type InsightTarget = typeof IG_MEDIA_INSIGHT_METRIC_TESTS[number]['target'];

type InsightMetricResult = {
  metric: string;
  target: InsightTarget;
  ok: boolean;
  applied: boolean;
  media_checked: number;
  media_updated: number;
  note: string;
  error_message?: string;
  meta_error_message?: string;
};

type SyncFailurePayload = {
  failed_step: string;
  error_message: string;
  meta_error_message: string;
  debug: string;
  code?: string;
  type?: string;
  subcode?: string;
  supabase_code?: string;
  supabase_details?: string;
  supabase_hint?: string;
};

class SyncRouteError extends Error {
  failedStep: string;
  errorMessage: string;
  metaErrorMessage: string;
  debug: string;
  code?: string;
  type?: string;
  subcode?: string;
  supabaseCode?: string;
  supabaseDetails?: string;
  supabaseHint?: string;

  constructor({
    failedStep,
    errorMessage,
    metaErrorMessage = '',
    debug = '',
    code,
    type,
    subcode,
    supabaseCode,
    supabaseDetails,
    supabaseHint,
  }: {
    failedStep: string;
    errorMessage: string;
    metaErrorMessage?: string;
    debug?: string;
    code?: string;
    type?: string;
    subcode?: string;
    supabaseCode?: string;
    supabaseDetails?: string;
    supabaseHint?: string;
  }) {
    super(errorMessage);
    this.name = 'SyncRouteError';
    this.failedStep = failedStep;
    this.errorMessage = errorMessage;
    this.metaErrorMessage = metaErrorMessage;
    this.debug = debug;
    this.code = code;
    this.type = type;
    this.subcode = subcode;
    this.supabaseCode = supabaseCode;
    this.supabaseDetails = supabaseDetails;
    this.supabaseHint = supabaseHint;
  }
}

function getGraphBaseUrl() {
  const version = process.env.META_GRAPH_VERSION || 'v20.0';
  return `https://graph.facebook.com/${version}`;
}

function getDateInTimezone(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: META_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find(part => part.type === 'year')?.value || '2026';
  const month = parts.find(part => part.type === 'month')?.value || '01';
  const day = parts.find(part => part.type === 'day')?.value || '01';

  return `${year}-${month}-${day}`;
}

function getMetaDataRange() {
  const todayDate = getDateInTimezone();
  const start = new Date(`${META_DATA_START_DATE}T00:00:00+07:00`);
  const end = new Date(`${todayDate}T23:59:59.999+07:00`);

  return {
    todayDate,
    start,
    end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new SyncRouteError({
      failedStep: 'init_supabase',
      errorMessage: 'NEXT_PUBLIC_SUPABASE_URL belum diisi.',
      debug: 'Missing NEXT_PUBLIC_SUPABASE_URL.',
    });
  }

  if (!supabaseServiceKey) {
    throw new SyncRouteError({
      failedStep: 'init_supabase',
      errorMessage: 'SUPABASE_SERVICE_ROLE_KEY belum diisi.',
      debug: 'Missing SUPABASE_SERVICE_ROLE_KEY.',
    });
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringValue(value: unknown) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function stringifyUnknown(value: unknown) {
  if (value instanceof Error) return value.message;
  if (typeof value === 'string') return value;

  try {
    return JSON.stringify(value);
  } catch {
    return 'Error tidak dapat dibaca.';
  }
}

function formatSupabaseError(error: unknown) {
  const record = isRecord(error) ? error : {};
  const message = stringValue(record.message) || stringifyUnknown(error);
  const code = stringValue(record.code) || 'unknown';
  const details = stringValue(record.details) || 'unknown';
  const hint = stringValue(record.hint) || 'unknown';

  return {
    message,
    code,
    details,
    hint,
    text: `Supabase Error message=${message} code=${code} details=${details} hint=${hint}`,
  };
}

function throwSupabaseError(failedStep: string, error: unknown): never {
  const detail = formatSupabaseError(error);

  throw new SyncRouteError({
    failedStep,
    errorMessage: detail.text,
    debug: detail.text,
    supabaseCode: detail.code,
    supabaseDetails: detail.details,
    supabaseHint: detail.hint,
  });
}

function isMissingColumnError(error: unknown, columnName: string) {
  const detail = formatSupabaseError(error);
  const combined = `${detail.message} ${detail.details} ${detail.hint} ${detail.code}`.toLowerCase();

  return combined.includes(columnName.toLowerCase()) && (
    combined.includes('column') ||
    combined.includes('schema cache') ||
    combined.includes('pgrst204')
  );
}

function sanitizeMetaUrl(url: URL) {
  const safeUrl = new URL(url.toString());

  if (safeUrl.searchParams.has('access_token')) {
    safeUrl.searchParams.set('access_token', '[redacted]');
  }

  return safeUrl.toString();
}

function normalizeSyncError(error: unknown, fallbackStep: string): SyncFailurePayload {
  if (error instanceof SyncRouteError) {
    return {
      failed_step: error.failedStep,
      error_message: error.errorMessage,
      meta_error_message: error.metaErrorMessage,
      debug: error.debug,
      code: error.code,
      type: error.type,
      subcode: error.subcode,
      supabase_code: error.supabaseCode,
      supabase_details: error.supabaseDetails,
      supabase_hint: error.supabaseHint,
    };
  }

  const errorMessage = stringifyUnknown(error) || 'Error tidak diketahui.';

  return {
    failed_step: fallbackStep,
    error_message: errorMessage,
    meta_error_message: '',
    debug: errorMessage,
  };
}

async function fetchMetaJson<T>(url: URL, label: string, timeoutMs = META_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  let rawText = '';

  try {
    response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
    });
    rawText = await response.text();
  } catch (error) {
    const isAbortError = error instanceof Error && error.name === 'AbortError';
    const message = isAbortError
      ? `[${label}] Meta request timeout after ${timeoutMs}ms`
      : stringifyUnknown(error) || 'Fetch Meta API gagal.';

    throw new SyncRouteError({
      failedStep: label,
      errorMessage: message,
      debug: `[${label}] url=${sanitizeMetaUrl(url)} fetch_error=${message}`,
    });
  } finally {
    clearTimeout(timeout);
  }

  let payload: (T & { error?: MetaApiError }) | null = null;

  try {
    payload = rawText ? JSON.parse(rawText) as T & { error?: MetaApiError } : null;
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.error) {
    const metaError = payload?.error;
    const code = metaError?.code ? String(metaError.code) : 'unknown';
    const type = metaError?.type || 'unknown';
    const subcode = metaError?.error_subcode ? String(metaError.error_subcode) : 'unknown';
    const message = metaError?.message || rawText || 'Meta API request gagal.';
    const raw = rawText || '(empty response)';
    const metaErrorMessage = `Meta Error code=${code} type=${type} subcode=${subcode} message=${message}`;

    throw new SyncRouteError({
      failedStep: label,
      errorMessage: metaErrorMessage,
      metaErrorMessage,
      debug: `[${label}] status=${response.status} url=${sanitizeMetaUrl(url)} raw=${raw}`,
      code,
      type,
      subcode,
    });
  }

  if (!payload) {
    const message = 'Response Meta tidak berupa JSON valid.';

    throw new SyncRouteError({
      failedStep: label,
      errorMessage: message,
      debug: `[${label}] status=${response.status} url=${sanitizeMetaUrl(url)} raw=${rawText || '(empty response)'}`,
    });
  }

  return payload;
}

function isMediaWithinRange(media: InstagramMedia, start: Date, end: Date) {
  if (!media.timestamp) return false;
  const createdAt = new Date(media.timestamp);

  if (Number.isNaN(createdAt.getTime())) return false;
  return createdAt >= start && createdAt <= end;
}

function getMediaLikeCount(media: InstagramMedia) {
  return Number(media.like_count || 0);
}

function getMediaCommentCount(media: InstagramMedia) {
  return Number(media.comments_count || 0);
}

function parseInsightNumericValue(value: InstagramInsightValue['value']) {
  if (typeof value === 'number') return value;

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

async function createSyncLog(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const { data, error } = await supabase
    .from('insight_sync_logs')
    .insert([{
      platform: 'IG',
      status: 'running',
    }])
    .select('id')
    .single();

  if (error) throwSupabaseError('create_sync_log', error);
  return data?.id as string | undefined;
}

async function finishSyncLog(
  supabase: ReturnType<typeof getSupabaseAdmin> | null,
  logId: string | undefined,
  status: string,
  errorMessage?: string | null,
) {
  if (!supabase || !logId) return;

  const { error } = await supabase
    .from('insight_sync_logs')
    .update({
      status,
      finished_at: new Date().toISOString(),
      error_message: errorMessage || null,
    })
    .eq('id', logId);

  if (error) {
    console.error('INSTAGRAM INSIGHT LOG UPDATE ERROR:', formatSupabaseError(error).text);
  }
}

async function getFacebookAccount(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const { data, error } = await supabase
    .from('social_accounts')
    .select('id, platform, account_name, account_id, access_token, status')
    .eq('platform', 'FB')
    .eq('status', 'connected')
    .maybeSingle();

  if (error) throwSupabaseError('get_fb_account', error);
  return data as SocialAccountRow | null;
}

async function fetchInstagramBusinessAccount(graphBaseUrl: string, pageId: string, accessToken: string) {
  const pageUrl = new URL(`${graphBaseUrl}/${pageId}`);
  pageUrl.searchParams.set('fields', 'instagram_business_account{id,username,name}');
  pageUrl.searchParams.set('access_token', accessToken);

  const payload = await fetchMetaJson<MetaPageInstagramResponse>(pageUrl, 'get_instagram_business_account');
  return payload.instagram_business_account || null;
}

async function upsertInstagramSocialAccount(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  instagramAccount: InstagramBusinessAccount,
  accessToken: string,
) {
  const now = new Date().toISOString();
  const basePayload = {
    platform: 'IG',
    account_name: instagramAccount.username || instagramAccount.name || instagramAccount.id,
    account_id: instagramAccount.id,
    access_token: accessToken,
    status: 'connected',
    connected_at: now,
    updated_at: now,
  };

  const { error: sourceError } = await supabase
    .from('social_accounts')
    .upsert([{ ...basePayload, source: 'meta_api' }] as any[], { onConflict: 'platform' });

  if (!sourceError) return;

  if (!isMissingColumnError(sourceError, 'source')) {
    throwSupabaseError('upsert_ig_account', sourceError);
  }

  const { error } = await supabase
    .from('social_accounts')
    .upsert([basePayload] as any[], { onConflict: 'platform' });

  if (error) throwSupabaseError('upsert_ig_account_without_source', error);
}

async function fetchInstagramMediaSinceStart(graphBaseUrl: string, igAccountId: string, accessToken: string) {
  const range = getMetaDataRange();
  const mediaItems: InstagramMedia[] = [];
  const seenMediaIds = new Set<string>();
  let pageIndex = 1;
  let nextUrl: URL | null = new URL(`${graphBaseUrl}/${igAccountId}/media`);

  nextUrl.searchParams.set('fields', 'id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count');
  nextUrl.searchParams.set('limit', META_MEDIA_BATCH_LIMIT);
  nextUrl.searchParams.set('access_token', accessToken);

  while (nextUrl && pageIndex <= META_MEDIA_MAX_PAGES) {
    const mediaPayload: InstagramMediaResponse = await fetchMetaJson<InstagramMediaResponse>(
      nextUrl,
      `get_ig_media:${pageIndex}`,
    );
    const batchMedia: InstagramMedia[] = mediaPayload.data || [];
    let reachedOlderThanStart = false;

    for (const media of batchMedia) {
      if (!media.timestamp) continue;

      const createdAt = new Date(media.timestamp);
      if (Number.isNaN(createdAt.getTime())) continue;

      if (createdAt < range.start) {
        reachedOlderThanStart = true;
        continue;
      }

      if (createdAt > range.end || seenMediaIds.has(media.id)) continue;

      seenMediaIds.add(media.id);
      mediaItems.push(media);
    }

    if (reachedOlderThanStart || !mediaPayload.paging?.next) {
      break;
    }

    nextUrl = new URL(mediaPayload.paging.next);
    pageIndex += 1;
  }

  return mediaItems;
}

function buildBasePostRows(mediaItems: InstagramMedia[], syncedAt: string): PostInsightRow[] {
  return mediaItems.map(media => {
    const likes = getMediaLikeCount(media);
    const comments = getMediaCommentCount(media);

    return {
      platform: 'IG',
      source: 'meta_api',
      external_post_id: media.id,
      published_url: media.permalink || null,
      post_message: media.caption || null,
      post_created_time: media.timestamp || null,
      reach: 0,
      impressions: 0,
      engagement: likes + comments,
      likes,
      comments,
      shares: 0,
      saves: 0,
      views: 0,
      synced_at: syncedAt,
      updated_at: syncedAt,
    };
  });
}

async function upsertPostInsights(supabase: ReturnType<typeof getSupabaseAdmin>, rows: PostInsightRow[]) {
  if (rows.length === 0) return;

  const { error } = await supabase
    .from('post_insights')
    .upsert(rows, { onConflict: 'platform,external_post_id' });

  if (error) throwSupabaseError('save_ig_post_insights', error);
}

async function fetchMediaInsightMetric(graphBaseUrl: string, mediaId: string, accessToken: string, metric: string) {
  const insightUrl = new URL(`${graphBaseUrl}/${mediaId}/insights`);
  insightUrl.searchParams.set('metric', metric);
  insightUrl.searchParams.set('access_token', accessToken);

  const payload = await fetchMetaJson<InstagramInsightsResponse>(insightUrl, `get_ig_media_insight:${metric}:${mediaId}`);
  const metricData = (payload.data || []).find(item => item.name === metric) || payload.data?.[0];
  const value = metricData?.values?.[0]?.value;

  return parseInsightNumericValue(value);
}

async function updatePostInsightMetric(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  mediaId: string,
  target: InsightTarget,
  value: number,
  syncedAt: string,
) {
  const payload: Record<string, string | number> = {
    [target]: value,
    synced_at: syncedAt,
    updated_at: syncedAt,
  };

  if (target === 'impressions') {
    payload.views = value;
  }

  const { error } = await supabase
    .from('post_insights')
    .update(payload)
    .eq('platform', 'IG')
    .eq('external_post_id', mediaId);

  if (error) throwSupabaseError(`update_ig_media_insight:${target}`, error);
}

async function syncInstagramMediaInsightsExperiment(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  graphBaseUrl: string,
  mediaItems: InstagramMedia[],
  accessToken: string,
  syncedAt: string,
) {
  const resultsByMetric = new Map<string, InsightMetricResult>();

  for (const metric of IG_MEDIA_INSIGHT_METRIC_TESTS) {
    resultsByMetric.set(metric.metric, {
      metric: metric.metric,
      target: metric.target,
      ok: true,
      applied: false,
      media_checked: 0,
      media_updated: 0,
      note: metric.note,
    });
  }

  const mediaToCheck = mediaItems.slice(0, META_MEDIA_MAX_INSIGHT_ITEMS);

  for (const media of mediaToCheck) {
    const appliedTargets = new Set<InsightTarget>();

    for (const metric of IG_MEDIA_INSIGHT_METRIC_TESTS) {
      const result = resultsByMetric.get(metric.metric);
      if (!result) continue;

      if (appliedTargets.has(metric.target)) continue;
      result.media_checked += 1;

      try {
        const value = await fetchMediaInsightMetric(graphBaseUrl, media.id, accessToken, metric.metric);
        await updatePostInsightMetric(supabase, media.id, metric.target, value, syncedAt);
        appliedTargets.add(metric.target);
        result.applied = true;
        result.media_updated += 1;
      } catch (error) {
        const failure = normalizeSyncError(error, `get_ig_media_insight:${metric.metric}:${media.id}`);

        result.ok = false;
        result.error_message = failure.error_message;
        result.meta_error_message = failure.meta_error_message;

        console.warn('INSTAGRAM MEDIA INSIGHT METRIC WARNING:', {
          media_id: media.id,
          metric: metric.metric,
          ...failure,
        });
      }
    }
  }

  return Array.from(resultsByMetric.values());
}

async function getInstagramPostInsightsForAggregation(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  startIso: string,
  endIso: string,
) {
  const { data, error } = await supabase
    .from('post_insights')
    .select('post_created_time, engagement, likes, comments, reach, impressions')
    .eq('platform', 'IG')
    .eq('source', 'meta_api')
    .gte('post_created_time', startIso)
    .lte('post_created_time', endIso);

  if (error) throwSupabaseError('load_ig_post_insights_for_metrics', error);
  return (data || []) as PostInsightMetricSourceRow[];
}

async function upsertPlatformMetrics(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  rows: PostInsightMetricSourceRow[],
  syncedAt: string,
) {
  const metricsByDate = rows.reduce((acc, row) => {
    const metricDate = row.post_created_time
      ? new Date(row.post_created_time).toISOString().split('T')[0]
      : syncedAt.split('T')[0];
    const rowEngagement = Number(row.engagement || 0) || (
      Number(row.likes || 0) + Number(row.comments || 0)
    );

    if (!acc[metricDate]) {
      acc[metricDate] = {
        platform: 'IG',
        source: 'meta_api',
        metric_date: metricDate,
        reach: 0,
        impressions: 0,
        engagement: 0,
        followers: 0,
        posts_count: 0,
        updated_at: syncedAt,
      };
    }

    acc[metricDate].reach += Number(row.reach || 0);
    acc[metricDate].impressions += Number(row.impressions || 0);
    acc[metricDate].engagement += rowEngagement;
    acc[metricDate].posts_count += 1;

    return acc;
  }, {} as Record<string, {
    platform: 'IG';
    source: 'meta_api';
    metric_date: string;
    reach: number;
    impressions: number;
    engagement: number;
    followers: number;
    posts_count: number;
    updated_at: string;
  }>);

  const metricRows = Object.values(metricsByDate);
  if (metricRows.length === 0) return;

  const { error } = await supabase
    .from('platform_metrics')
    .upsert(metricRows, { onConflict: 'platform,metric_date' });

  if (error) throwSupabaseError('save_ig_platform_metrics', error);
}

function formatInsightSummary(results: InsightMetricResult[]) {
  const succeeded = results
    .filter(result => result.applied)
    .map(result => `${result.metric} target=${result.target} updated=${result.media_updated}`);
  const failed = results
    .filter(result => !result.ok)
    .map(result => `${result.metric}: ${result.meta_error_message || result.error_message || 'unknown error'}`);

  return [
    succeeded.length > 0 ? `Instagram media insights success: ${succeeded.join(' | ')}` : '',
    failed.length > 0 ? `Instagram media insights rejected/failed: ${failed.join(' | ')}` : '',
  ].filter(Boolean).join('\n');
}

export async function POST() {
  let supabase: ReturnType<typeof getSupabaseAdmin> | null = null;
  let syncLogId: string | undefined;
  let currentStep = 'start';

  try {
    currentStep = 'init_supabase';
    supabase = getSupabaseAdmin();

    currentStep = 'create_sync_log';
    syncLogId = await createSyncLog(supabase);

    currentStep = 'get_fb_account';
    const facebookAccount = await getFacebookAccount(supabase);

    if (!facebookAccount?.account_id || !facebookAccount?.access_token) {
      throw new SyncRouteError({
        failedStep: 'get_fb_account',
        errorMessage: 'Facebook Page belum connected atau access token tidak tersedia.',
        debug: 'social_accounts row platform=FB status=connected tidak memiliki account_id/access_token.',
      });
    }

    const graphBaseUrl = getGraphBaseUrl();

    currentStep = 'get_instagram_business_account';
    const instagramAccount = await fetchInstagramBusinessAccount(
      graphBaseUrl,
      facebookAccount.account_id,
      facebookAccount.access_token,
    );

    if (!instagramAccount?.id) {
      await finishSyncLog(supabase, syncLogId, 'failed', IG_BUSINESS_NOT_FOUND_MESSAGE);

      return NextResponse.json({
        ok: false,
        message: IG_BUSINESS_NOT_FOUND_MESSAGE,
        failed_step: currentStep,
        error_message: IG_BUSINESS_NOT_FOUND_MESSAGE,
        meta_error_message: '',
        debug: 'instagram_business_account field kosong dari Facebook Page.',
      }, { status: 400 });
    }

    currentStep = 'upsert_ig_account';
    await upsertInstagramSocialAccount(supabase, instagramAccount, facebookAccount.access_token);

    currentStep = 'get_ig_media';
    const range = getMetaDataRange();
    const mediaItems = (await fetchInstagramMediaSinceStart(
      graphBaseUrl,
      instagramAccount.id,
      facebookAccount.access_token,
    )).filter(media => isMediaWithinRange(media, range.start, range.end));
    const syncedAt = new Date().toISOString();

    if (mediaItems.length > 0) {
      currentStep = 'save_ig_post_insights';
      await upsertPostInsights(supabase, buildBasePostRows(mediaItems, syncedAt));

      currentStep = 'debug_ig_media_insights';
      const insightResults = await syncInstagramMediaInsightsExperiment(
        supabase,
        graphBaseUrl,
        mediaItems,
        facebookAccount.access_token,
        syncedAt,
      );

      currentStep = 'save_ig_platform_metrics';
      const metricSourceRows = await getInstagramPostInsightsForAggregation(supabase, range.startIso, range.endIso);
      await upsertPlatformMetrics(supabase, metricSourceRows, syncedAt);

      const insightSummary = formatInsightSummary(insightResults);
      await finishSyncLog(supabase, syncLogId, 'success', insightSummary || null);

      return NextResponse.json({
        ok: true,
        message: 'Data Instagram berhasil disinkronkan.',
        posts_synced: mediaItems.length,
        source: 'Meta API',
        instagram_account: {
          id: instagramAccount.id,
          username: instagramAccount.username || instagramAccount.name || null,
        },
        media_insights: {
          metrics_succeeded: insightResults.filter(result => result.applied).map(result => result.metric),
          metrics_failed: insightResults
            .filter(result => !result.ok)
            .map(result => ({
              metric: result.metric,
              error_message: result.error_message,
              meta_error_message: result.meta_error_message,
            })),
          results: insightResults,
        },
      });
    }

    currentStep = 'save_ig_platform_metrics';
    const metricSourceRows = await getInstagramPostInsightsForAggregation(supabase, range.startIso, range.endIso);
    await upsertPlatformMetrics(supabase, metricSourceRows, syncedAt);
    await finishSyncLog(supabase, syncLogId, 'success', null);

    return NextResponse.json({
      ok: true,
      message: 'Instagram Business terhubung, tetapi belum ada media yang terbaca.',
      posts_synced: 0,
      source: 'Meta API',
      instagram_account: {
        id: instagramAccount.id,
        username: instagramAccount.username || instagramAccount.name || null,
      },
    });
  } catch (error) {
    const failure = normalizeSyncError(error, currentStep);
    const logMessage = [
      failure.error_message,
      failure.meta_error_message,
      failure.debug,
    ].filter(Boolean).join('\n');

    console.error('INSTAGRAM INSIGHT SYNC ERROR:', {
      ...failure,
      raw_error: error,
    });

    await finishSyncLog(supabase, syncLogId, 'failed', logMessage);

    return NextResponse.json({
      ok: false,
      message: SYNC_FAILED_MESSAGE,
      ...failure,
    }, { status: 500 });
  }
}
