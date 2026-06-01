import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchTikTokJson, fetchTikTokVideoList, TikTokVideo } from '../../../lib/insights/tiktokInsightService';

export const runtime = 'nodejs';

type SocialAccountRow = {
  id: string;
  account_id?: string | null;
  account_name?: string | null;
  access_token?: string | null;
  refresh_token?: string | null;
  token_expires_at?: string | null;
  refresh_token_expires_at?: string | null;
};

type TikTokTokenRefreshResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  refresh_token?: string;
  scope?: string;
};

type ManualQueueRow = {
  content_id?: string | null;
  external_post_url?: string | null;
};

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL belum diisi.');
  if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY belum diisi.');

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
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

function numberValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function getExpiryIso(seconds?: number) {
  if (!seconds || !Number.isFinite(seconds)) return null;
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function parseScope(scope?: string | null) {
  return (scope || '')
    .split(/[,\s]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeUrl(url?: string | null) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return url.trim().replace(/\/$/, '');
  }
}

function getVideoCreatedAt(video: TikTokVideo) {
  const createdSeconds = numberValue(video.create_time);
  if (!createdSeconds) return new Date().toISOString();
  return new Date(createdSeconds * 1000).toISOString();
}

async function logSync(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  payload: Record<string, unknown>,
) {
  const logPayload = {
    platform: 'TIKTOK',
    source: 'tiktok_api',
    ...payload,
  };

  const { error } = await supabase
    .from('insight_sync_logs')
    .insert([logPayload]);

  if (!error) return;

  const { error: fallbackError } = await supabase
    .from('insight_sync_logs')
    .insert([{
      platform: 'TIKTOK',
      status: payload.status,
      started_at: payload.started_at,
      finished_at: payload.finished_at,
      error_message: payload.error_message || payload.message || null,
    }]);

  if (fallbackError) {
    console.warn('TIKTOK insight_sync_logs warning:', fallbackError.message);
  }
}

async function refreshTikTokTokenIfNeeded(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  account: SocialAccountRow,
) {
  const tokenExpiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0;
  const shouldRefresh = !tokenExpiresAt || tokenExpiresAt <= Date.now() + 5 * 60 * 1000;

  if (!shouldRefresh) return account;

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  if (!clientKey || !clientSecret) {
    throw new Error('TIKTOK_CLIENT_KEY/TIKTOK_CLIENT_SECRET belum diisi.');
  }

  if (!account.refresh_token) {
    throw new Error('Refresh token TikTok tidak tersedia. Connect TikTok ulang.');
  }

  if (account.refresh_token_expires_at && new Date(account.refresh_token_expires_at).getTime() <= Date.now()) {
    throw new Error('Refresh token TikTok sudah expired. Connect TikTok ulang.');
  }

  const refreshBody = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: account.refresh_token,
  });

  const refreshResult = await fetchTikTokJson<TikTokTokenRefreshResponse>(
    'https://open.tiktokapis.com/v2/oauth/token/',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: refreshBody,
    },
    'tiktok_refresh_before_sync',
  );

  if (!refreshResult.ok || !refreshResult.data?.access_token) {
    throw new Error(refreshResult.error_message || 'Refresh token TikTok gagal.');
  }

  const tokenData = refreshResult.data;
  const scopeList = parseScope(tokenData.scope);
  const updatedAccount = {
    ...account,
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || account.refresh_token,
    token_expires_at: getExpiryIso(tokenData.expires_in),
    refresh_token_expires_at: getExpiryIso(tokenData.refresh_expires_in) || account.refresh_token_expires_at,
  };

  const { error: updateError } = await supabase
    .from('social_accounts')
    .update({
      access_token: updatedAccount.access_token,
      refresh_token: updatedAccount.refresh_token,
      scope: tokenData.scope || scopeList.join(','),
      permissions: scopeList,
      token_expires_at: updatedAccount.token_expires_at,
      refresh_token_expires_at: updatedAccount.refresh_token_expires_at,
      updated_at: new Date().toISOString(),
    })
    .eq('id', account.id);

  if (updateError) throw updateError;
  return updatedAccount;
}

export async function POST() {
  const startedAt = new Date().toISOString();
  let supabase: ReturnType<typeof getSupabaseAdmin> | null = null;

  try {
    supabase = getSupabaseAdmin();
    const { data: accountData, error: accountError } = await supabase
      .from('social_accounts')
      .select('id, account_id, account_name, access_token, refresh_token, token_expires_at, refresh_token_expires_at')
      .eq('platform', 'TIKTOK')
      .eq('status', 'connected')
      .maybeSingle();

    if (accountError) throw accountError;
    let account = accountData as SocialAccountRow | null;

    if (!account?.access_token) {
      return NextResponse.json({
        ok: false,
        message: 'TikTok belum connected.',
        error_message: 'TikTok belum connected.',
      }, { status: 400 });
    }

    account = await refreshTikTokTokenIfNeeded(supabase, account);

    const videoResult = await fetchTikTokVideoList({
      accessToken: account.access_token || '',
      maxPages: 10,
      maxCount: 20,
    });

    if (!videoResult.ok) {
      await logSync(supabase, {
        status: 'failed',
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        total_items: videoResult.videos.length,
        error_message: videoResult.error_message || 'Sync TikTok gagal.',
      });

      return NextResponse.json({
        ok: false,
        message: 'Sync TikTok insights gagal.',
        error_message: videoResult.error_message || 'Sync TikTok insights gagal.',
      }, { status: 400 });
    }

    const { data: manualQueues } = await supabase
      .from('publish_queue')
      .select('content_id, external_post_url')
      .eq('platform', 'TIKTOK')
      .not('external_post_url', 'is', null);
    const urlToContentId = ((manualQueues || []) as ManualQueueRow[]).reduce((acc, row) => {
      const normalized = normalizeUrl(row.external_post_url);
      if (normalized && row.content_id) acc[normalized] = row.content_id;
      return acc;
    }, {} as Record<string, string>);

    const now = new Date().toISOString();
    const postRows = videoResult.videos
      .filter(video => video.id)
      .map(video => {
        const likes = numberValue(video.like_count);
        const comments = numberValue(video.comment_count);
        const shares = numberValue(video.share_count);
        const views = numberValue(video.view_count);
        const publishedUrl = video.share_url || null;
        const contentId = urlToContentId[normalizeUrl(publishedUrl)] || null;

        return {
          content_id: contentId,
          platform: 'TIKTOK',
          source: 'tiktok_api',
          external_post_id: video.id,
          published_url: publishedUrl,
          post_message: video.video_description || video.title || '',
          post_created_time: getVideoCreatedAt(video),
          views,
          impressions: views,
          reach: 0,
          likes,
          comments,
          shares,
          engagement: likes + comments + shares,
          media_type: 'video',
          cover_image_url: video.cover_image_url || null,
          duration_seconds: numberValue(video.duration),
          width: numberValue(video.width),
          height: numberValue(video.height),
          raw_data: video,
          synced_at: now,
          updated_at: now,
        };
      });

    if (postRows.length > 0) {
      const { error: upsertPostsError } = await supabase
        .from('post_insights')
        .upsert(postRows, { onConflict: 'platform,external_post_id' });

      if (upsertPostsError) throw upsertPostsError;
    }

    const metricsByDate = postRows.reduce((acc, row) => {
      const metricDate = row.post_created_time.slice(0, 10);
      if (!acc[metricDate]) {
        acc[metricDate] = {
          platform: 'TIKTOK',
          source: 'tiktok_api',
          metric_date: metricDate,
          reach: 0,
          impressions: 0,
          engagement: 0,
          posts_count: 0,
          total_posts: 0,
          total_views: 0,
          total_reach: 0,
          total_engagement: 0,
          total_likes: 0,
          total_comments: 0,
          total_shares: 0,
          synced_at: now,
          updated_at: now,
        };
      }

      acc[metricDate].impressions += Number(row.impressions || 0);
      acc[metricDate].engagement += Number(row.engagement || 0);
      acc[metricDate].posts_count += 1;
      acc[metricDate].total_posts += 1;
      acc[metricDate].total_views += Number(row.views || 0);
      acc[metricDate].total_engagement += Number(row.engagement || 0);
      acc[metricDate].total_likes += Number(row.likes || 0);
      acc[metricDate].total_comments += Number(row.comments || 0);
      acc[metricDate].total_shares += Number(row.shares || 0);
      return acc;
    }, {} as Record<string, {
      platform: string;
      source: string;
      metric_date: string;
      reach: number;
      impressions: number;
      engagement: number;
      posts_count: number;
      total_posts: number;
      total_views: number;
      total_reach: number;
      total_engagement: number;
      total_likes: number;
      total_comments: number;
      total_shares: number;
      synced_at: string;
      updated_at: string;
    }>);

    const metricRows = Object.values(metricsByDate);
    if (metricRows.length > 0) {
      const { error: upsertMetricsError } = await supabase
        .from('platform_metrics')
        .upsert(metricRows, { onConflict: 'platform,metric_date' });

      if (upsertMetricsError) throw upsertMetricsError;
    }

    await logSync(supabase, {
      status: 'success',
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      total_items: postRows.length,
      message: 'Data TikTok berhasil disinkronkan.',
      error_message: null,
    });

    return NextResponse.json({
      ok: true,
      message: 'Data TikTok berhasil disinkronkan.',
      videos_synced: postRows.length,
      source: 'tiktok_api',
    });
  } catch (error) {
    const errorMessage = stringifyUnknown(error);
    console.error('TIKTOK SYNC ERROR:', error);

    if (supabase) {
      try {
        await logSync(supabase, {
          status: 'failed',
          started_at: startedAt,
          finished_at: new Date().toISOString(),
          total_items: 0,
          error_message: errorMessage,
        });
      } catch (logError) {
        console.error('TIKTOK SYNC LOG ERROR:', logError);
      }
    }

    return NextResponse.json({
      ok: false,
      message: 'Sync TikTok insights gagal.',
      error_message: errorMessage,
    }, { status: 500 });
  }
}
