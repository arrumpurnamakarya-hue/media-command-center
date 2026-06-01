import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const INSIGHT_DISABLED_NOTE = 'Post-level insight Facebook tidak dipanggil agar sync tidak hanging; views/reach diambil dari Page Insights.';
const SYNC_FAILED_MESSAGE = 'Sync Facebook gagal.';
const META_DATA_START_DATE = '2026-04-06';
const META_POST_BATCH_LIMIT = '100';
const META_POST_MAX_PAGES = 20;
const META_FETCH_TIMEOUT_MS = 20000;
const META_TIMEZONE = 'Asia/Jakarta';
const PAGE_INSIGHT_METRIC_TESTS = [
  {
    metric: 'page_media_view',
    target: 'impressions',
    note: 'Views/tayangan candidate for Facebook Page.',
  },
  {
    metric: 'page_impressions_unique',
    target: 'reach',
    note: 'Reach/jangkauan unik candidate for Facebook Page.',
  },
  {
    metric: 'page_impressions',
    target: 'impressions',
    note: 'Legacy impressions fallback candidate. Dipakai hanya jika page_media_view gagal.',
  },
] as const;

type SocialAccountRow = {
  id: string;
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

type MetaSummary = {
  total_count?: number;
};

type MetaPost = {
  id: string;
  message?: string;
  created_time?: string;
  permalink_url?: string;
  shares?: {
    count?: number;
  };
  comments?: {
    summary?: MetaSummary;
  };
  reactions?: {
    summary?: MetaSummary;
  };
};

type MetaPageBasicResponse = {
  id: string;
  name?: string;
  error?: MetaApiError;
};

type MetaPostsResponse = {
  data?: MetaPost[];
  paging?: {
    next?: string;
  };
  error?: MetaApiError;
};

type MetaInsightValue = {
  value?: number | string | Record<string, unknown> | null;
  end_time?: string;
};

type MetaInsightMetric = {
  name?: string;
  period?: string;
  values?: MetaInsightValue[];
};

type MetaInsightsResponse = {
  data?: MetaInsightMetric[];
  error?: MetaApiError;
};

type PostInsightRow = {
  platform: 'FB';
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
  shares?: number | string | null;
};

type PageInsightTarget = typeof PAGE_INSIGHT_METRIC_TESTS[number]['target'];

type PageInsightDebugResult = {
  metric: string;
  target: PageInsightTarget;
  ok: boolean;
  applied: boolean;
  values_count: number;
  rows_updated: number;
  total_value: number;
  note: string;
  error_message?: string;
  meta_error_message?: string;
  debug?: string;
};

type SyncFailurePayload = {
  failed_step: string;
  error_message: string;
  meta_error_message: string;
  debug: string;
};

class SyncRouteError extends Error {
  failedStep: string;
  errorMessage: string;
  metaErrorMessage: string;
  debug: string;

  constructor({
    failedStep,
    errorMessage,
    metaErrorMessage = '',
    debug = '',
  }: {
    failedStep: string;
    errorMessage: string;
    metaErrorMessage?: string;
    debug?: string;
  }) {
    super(errorMessage);
    this.name = 'SyncRouteError';
    this.failedStep = failedStep;
    this.errorMessage = errorMessage;
    this.metaErrorMessage = metaErrorMessage;
    this.debug = debug;
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

function getMetricDateFromInsightEndTime(endTime?: string) {
  if (!endTime) return null;
  const endDate = new Date(endTime);

  if (Number.isNaN(endDate.getTime())) return null;

  return getDateInTimezone(endDate);
}

function parseInsightNumericValue(value: MetaInsightValue['value']) {
  if (typeof value === 'number') return value;

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
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
    startUnix: Math.floor(start.getTime() / 1000).toString(),
    endUnix: Math.floor(end.getTime() / 1000).toString(),
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

  return `Supabase Error message=${message} code=${code} details=${details} hint=${hint}`;
}

function throwSupabaseError(failedStep: string, error: unknown): never {
  const detail = formatSupabaseError(error);

  throw new SyncRouteError({
    failedStep,
    errorMessage: detail,
    debug: detail,
  });
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
      metaErrorMessage: '',
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
    const code = metaError?.code ?? 'unknown';
    const type = metaError?.type ?? 'unknown';
    const subcode = metaError?.error_subcode ?? 'unknown';
    const message = metaError?.message || rawText || 'Meta API request gagal.';
    const raw = rawText || '(empty response)';
    const metaErrorMessage = `Meta Error code=${code} type=${type} subcode=${subcode} message=${message}`;

    throw new SyncRouteError({
      failedStep: label,
      errorMessage: metaErrorMessage,
      metaErrorMessage,
      debug: `[${label}] status=${response.status} url=${sanitizeMetaUrl(url)} raw=${raw}`,
    });
  }

  if (!payload) {
    const message = 'Response Meta tidak berupa JSON valid.';

    throw new SyncRouteError({
      failedStep: label,
      errorMessage: message,
      metaErrorMessage: '',
      debug: `[${label}] status=${response.status} url=${sanitizeMetaUrl(url)} raw=${rawText || '(empty response)'}`,
    });
  }

  return payload;
}

function getPostCount(post: MetaPost, key: 'comments' | 'reactions') {
  return Number(post[key]?.summary?.total_count || 0);
}

function getPostShares(post: MetaPost) {
  return Number(post.shares?.count || 0);
}

function isPostWithinRange(post: MetaPost, start: Date, end: Date) {
  if (!post.created_time) return false;
  const createdAt = new Date(post.created_time);

  if (Number.isNaN(createdAt.getTime())) return false;
  return createdAt >= start && createdAt <= end;
}

async function createSyncLog(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const { data, error } = await supabase
    .from('insight_sync_logs')
    .insert([{
      platform: 'FB',
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
    console.error('META INSIGHT LOG UPDATE ERROR:', formatSupabaseError(error));
  }
}

function buildBasePostRows(posts: MetaPost[], syncedAt: string): PostInsightRow[] {
  return posts.map(post => {
    const likes = getPostCount(post, 'reactions');
    const comments = getPostCount(post, 'comments');
    const shares = getPostShares(post);

    return {
      platform: 'FB',
      source: 'meta_api',
      external_post_id: post.id,
      published_url: post.permalink_url || null,
      post_message: post.message || null,
      post_created_time: post.created_time || null,
      reach: 0,
      impressions: 0,
      engagement: likes + comments + shares,
      likes,
      comments,
      shares,
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

  if (error) throwSupabaseError('save_post_insights', error);
}

async function fetchFacebookPostsSinceStart(graphBaseUrl: string, pageId: string, accessToken: string) {
  const range = getMetaDataRange();
  const posts: MetaPost[] = [];
  const seenPostIds = new Set<string>();
  let pageIndex = 1;
  let nextUrl: URL | null = new URL(`${graphBaseUrl}/${pageId}/posts`);

  nextUrl.searchParams.set('fields', 'id,message,created_time,permalink_url,shares,comments.summary(true),reactions.summary(true)');
  nextUrl.searchParams.set('limit', META_POST_BATCH_LIMIT);
  nextUrl.searchParams.set('since', range.startUnix);
  nextUrl.searchParams.set('until', range.endUnix);
  nextUrl.searchParams.set('access_token', accessToken);

  while (nextUrl && pageIndex <= META_POST_MAX_PAGES) {
    const payload: MetaPostsResponse = await fetchMetaJson<MetaPostsResponse>(nextUrl, `get_page_posts:${pageIndex}`);
    const batchPosts = payload.data || [];
    let reachedOlderThanStart = false;

    for (const post of batchPosts) {
      if (!post.created_time) continue;

      const createdAt = new Date(post.created_time);
      if (Number.isNaN(createdAt.getTime())) continue;

      if (createdAt < range.start) {
        reachedOlderThanStart = true;
        continue;
      }

      if (createdAt > range.end || seenPostIds.has(post.id)) continue;

      seenPostIds.add(post.id);
      posts.push(post);
    }

    if (reachedOlderThanStart || !payload.paging?.next) {
      break;
    }

    nextUrl = new URL(payload.paging.next);
    pageIndex += 1;
  }

  return posts;
}

async function getFacebookPostInsightsForAggregation(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  startIso: string,
  endIso: string,
) {
  const { data, error } = await supabase
    .from('post_insights')
    .select('post_created_time, engagement, likes, comments, shares')
    .eq('platform', 'FB')
    .eq('source', 'meta_api')
    .gte('post_created_time', startIso)
    .lte('post_created_time', endIso);

  if (error) throwSupabaseError('load_post_insights_for_metrics', error);
  return (data || []) as PostInsightMetricSourceRow[];
}

async function upsertPlatformMetrics(supabase: ReturnType<typeof getSupabaseAdmin>, rows: PostInsightMetricSourceRow[], syncedAt: string) {
  const metricsByDate = rows.reduce((acc, row) => {
    const metricDate = row.post_created_time
      ? new Date(row.post_created_time).toISOString().split('T')[0]
      : syncedAt.split('T')[0];
    const rowEngagement = Number(row.engagement || 0) || (
      Number(row.likes || 0) + Number(row.comments || 0) + Number(row.shares || 0)
    );

    if (!acc[metricDate]) {
      acc[metricDate] = {
        platform: 'FB',
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

    acc[metricDate].engagement += rowEngagement;
    acc[metricDate].posts_count += 1;

    return acc;
  }, {} as Record<string, {
    platform: 'FB';
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

  if (error) throwSupabaseError('save_platform_metrics', error);
}

async function updatePlatformMetricInsightValue(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  metricDate: string,
  target: PageInsightTarget,
  value: number,
  syncedAt: string,
) {
  const updatePayload = {
    source: 'meta_api',
    [target]: value,
    updated_at: syncedAt,
  };

  const { data: updatedRows, error: updateError } = await supabase
    .from('platform_metrics')
    .update(updatePayload)
    .eq('platform', 'FB')
    .eq('metric_date', metricDate)
    .select('id');

  if (updateError) throwSupabaseError(`update_page_insight:${target}`, updateError);

  if ((updatedRows || []).length > 0) {
    return;
  }

  const { error: insertError } = await supabase
    .from('platform_metrics')
    .insert([{
      platform: 'FB',
      source: 'meta_api',
      metric_date: metricDate,
      reach: target === 'reach' ? value : 0,
      impressions: target === 'impressions' ? value : 0,
      engagement: 0,
      followers: 0,
      posts_count: 0,
      updated_at: syncedAt,
    }]);

  if (insertError) throwSupabaseError(`insert_page_insight:${target}`, insertError);
}

async function testPageInsightMetric(
  graphBaseUrl: string,
  pageId: string,
  accessToken: string,
  metric: typeof PAGE_INSIGHT_METRIC_TESTS[number],
  range: ReturnType<typeof getMetaDataRange>,
) {
  const insightUrl = new URL(`${graphBaseUrl}/${pageId}/insights`);
  insightUrl.searchParams.set('metric', metric.metric);
  insightUrl.searchParams.set('period', 'day');
  insightUrl.searchParams.set('since', range.startUnix);
  insightUrl.searchParams.set('until', range.endUnix);
  insightUrl.searchParams.set('access_token', accessToken);

  const payload = await fetchMetaJson<MetaInsightsResponse>(insightUrl, `debug_page_insight:${metric.metric}`);
  const metricData = (payload.data || []).find(item => item.name === metric.metric) || payload.data?.[0];
  const valuesByDate = new Map<string, number>();

  for (const item of metricData?.values || []) {
    const metricDate = getMetricDateFromInsightEndTime(item.end_time);
    const value = parseInsightNumericValue(item.value);

    if (!metricDate || metricDate < META_DATA_START_DATE || metricDate > range.todayDate) continue;

    valuesByDate.set(metricDate, value);
  }

  return valuesByDate;
}

async function syncFacebookPageInsightsExperiment(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  graphBaseUrl: string,
  pageId: string,
  accessToken: string,
  range: ReturnType<typeof getMetaDataRange>,
  syncedAt: string,
) {
  const results: PageInsightDebugResult[] = [];
  const appliedTargets = new Set<PageInsightTarget>();

  for (const metric of PAGE_INSIGHT_METRIC_TESTS) {
    try {
      const valuesByDate = await testPageInsightMetric(graphBaseUrl, pageId, accessToken, metric, range);
      const shouldApply = !appliedTargets.has(metric.target);
      let rowsUpdated = 0;
      let totalValue = 0;

      for (const [metricDate, value] of valuesByDate) {
        totalValue += value;

        if (!shouldApply) continue;

        await updatePlatformMetricInsightValue(supabase, metricDate, metric.target, value, syncedAt);
        rowsUpdated += 1;
      }

      if (shouldApply && valuesByDate.size > 0) {
        appliedTargets.add(metric.target);
      }

      results.push({
        metric: metric.metric,
        target: metric.target,
        ok: true,
        applied: shouldApply && valuesByDate.size > 0,
        values_count: valuesByDate.size,
        rows_updated: rowsUpdated,
        total_value: totalValue,
        note: metric.note,
      });
    } catch (error) {
      const failure = normalizeSyncError(error, `debug_page_insight:${metric.metric}`);

      console.warn('META FACEBOOK PAGE INSIGHT METRIC WARNING:', {
        metric: metric.metric,
        ...failure,
      });

      results.push({
        metric: metric.metric,
        target: metric.target,
        ok: false,
        applied: false,
        values_count: 0,
        rows_updated: 0,
        total_value: 0,
        note: metric.note,
        error_message: failure.error_message,
        meta_error_message: failure.meta_error_message,
        debug: failure.debug,
      });
    }
  }

  return results;
}

function formatPageInsightSummary(results: PageInsightDebugResult[]) {
  const succeeded = results
    .filter(result => result.ok)
    .map(result => `${result.metric} target=${result.target} applied=${result.applied} rows=${result.rows_updated} total=${result.total_value}`);
  const failed = results
    .filter(result => !result.ok)
    .map(result => `${result.metric}: ${result.meta_error_message || result.error_message || 'unknown error'}`);

  return [
    succeeded.length > 0 ? `Page Insights success: ${succeeded.join(' | ')}` : '',
    failed.length > 0 ? `Page Insights rejected/failed: ${failed.join(' | ')}` : '',
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
    const { data: account, error: accountError } = await supabase
      .from('social_accounts')
      .select('id, account_name, account_id, access_token, status')
      .eq('platform', 'FB')
      .eq('status', 'connected')
      .maybeSingle();

    if (accountError) throwSupabaseError('get_fb_account', accountError);

    const facebookAccount = account as SocialAccountRow | null;

    if (!facebookAccount?.account_id || !facebookAccount?.access_token) {
      throw new SyncRouteError({
        failedStep: 'get_fb_account',
        errorMessage: 'Facebook Page belum connected atau access token tidak tersedia.',
        debug: 'social_accounts row platform=FB status=connected tidak memiliki account_id/access_token.',
      });
    }

    const graphBaseUrl = getGraphBaseUrl();
    const pageBasicUrl = new URL(`${graphBaseUrl}/${facebookAccount.account_id}`);
    pageBasicUrl.searchParams.set('fields', 'id,name');
    pageBasicUrl.searchParams.set('access_token', facebookAccount.access_token);

    currentStep = 'get_page_basic';
    await fetchMetaJson<MetaPageBasicResponse>(pageBasicUrl, 'get_page_basic');

    currentStep = 'get_page_posts';
    const range = getMetaDataRange();
    const posts = (await fetchFacebookPostsSinceStart(
      graphBaseUrl,
      facebookAccount.account_id,
      facebookAccount.access_token,
    )).filter(post => isPostWithinRange(post, range.start, range.end));

    const syncedAt = new Date().toISOString();

    if (posts.length > 0) {
      const baseRows = buildBasePostRows(posts, syncedAt);

      currentStep = 'save_post_insights';
      await upsertPostInsights(supabase, baseRows);

      currentStep = 'save_platform_metrics';
      const metricSourceRows = await getFacebookPostInsightsForAggregation(supabase, range.startIso, range.endIso);
      await upsertPlatformMetrics(supabase, metricSourceRows, syncedAt);
    }

    currentStep = 'debug_page_insights';
    const pageInsightResults = await syncFacebookPageInsightsExperiment(
      supabase,
      graphBaseUrl,
      facebookAccount.account_id,
      facebookAccount.access_token,
      range,
      syncedAt,
    );
    const pageInsightSummary = formatPageInsightSummary(pageInsightResults);
    const syncNote = [INSIGHT_DISABLED_NOTE, pageInsightSummary].filter(Boolean).join('\n');

    console.info(`META FACEBOOK INSIGHT SYNC NOTE: ${syncNote}`);
    await finishSyncLog(supabase, syncLogId, 'success', syncNote);

    return NextResponse.json({
      ok: true,
      message: posts.length > 0
        ? 'Data Facebook berhasil disinkronkan.'
        : 'Facebook terhubung, tetapi belum ada post yang terbaca.',
      posts_synced: posts.length,
      source: 'Meta API',
      page_insights: {
        attempted_metrics: pageInsightResults.map(result => result.metric),
        metrics_succeeded: pageInsightResults.filter(result => result.ok).map(result => result.metric),
        metrics_applied: pageInsightResults.filter(result => result.applied).map(result => result.metric),
        metrics_failed: pageInsightResults
          .filter(result => !result.ok)
          .map(result => ({
            metric: result.metric,
            error_message: result.error_message,
            meta_error_message: result.meta_error_message,
          })),
        results: pageInsightResults,
      },
    });
  } catch (error) {
    const failure = normalizeSyncError(error, currentStep);
    const logMessage = [
      failure.error_message,
      failure.meta_error_message,
      failure.debug,
    ].filter(Boolean).join('\n');

    console.error('META FACEBOOK INSIGHT SYNC ERROR:', {
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
