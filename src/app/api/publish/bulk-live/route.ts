import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { publishFacebookQueueLive, stringifyUnknown } from '../../../lib/publish/facebookLiveService';
import { publishInstagramQueueLive } from '../../../lib/publish/instagramLiveService';
import { checkPlatformReadiness, PlatformReadinessResult } from '../../../lib/publish/platformReadiness';

export const runtime = 'nodejs';

type ContentRow = {
  id: string;
  title?: string | null;
  caption?: string | null;
  hashtags?: string | null;
  format?: string | null;
  platforms?: string[] | string | null;
  asset_url?: string | null;
  asset_path?: string | null;
  asset_type?: string | null;
};

type ContentAssetRow = {
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
};

type PublishQueueRow = {
  id: string;
  platform?: string | null;
  status?: string | null;
  external_post_id?: string | null;
  external_post_url?: string | null;
  published_url?: string | null;
  published_at?: string | null;
  platform_response?: unknown;
};

type BulkLiveResult = {
  platform: string;
  action: 'published' | 'skipped' | 'failed';
  status: string;
  reason: string;
  external_post_url: string | null;
};

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL belum diisi.');
  }

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY belum diisi.');
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

async function readRequestBody(request: NextRequest) {
  try {
    const body = await request.json();
    return isRecord(body) ? body : {};
  } catch {
    return {};
  }
}

function normalizePlatforms(platforms: ContentRow['platforms']) {
  if (Array.isArray(platforms)) {
    return platforms.map(platform => String(platform).trim().toUpperCase()).filter(Boolean);
  }

  if (typeof platforms === 'string') {
    return platforms
      .split(',')
      .map(platform => platform.trim().toUpperCase())
      .filter(Boolean);
  }

  return [];
}

function getStoredReadiness(queueRow?: PublishQueueRow | null): PlatformReadinessResult | null {
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
}

function getSkipReasonForReadiness(readiness: PlatformReadinessResult) {
  const requirement = readiness.requirements.find(item => item.toLowerCase().includes('need'));
  return requirement || readiness.reason || 'Platform belum siap live publish.';
}

export async function POST(request: NextRequest) {
  let contentId: string | null = null;

  try {
    const body = await readRequestBody(request);
    contentId = stringValue(body.content_id);

    if (body.confirm !== true) {
      return NextResponse.json({
        ok: false,
        message: 'Konfirmasi bulk live wajib bernilai true.',
        content_id: contentId,
        results: [],
        error_message: 'Konfirmasi bulk live wajib bernilai true.',
      }, { status: 400 });
    }

    if (!contentId) {
      return NextResponse.json({
        ok: false,
        message: 'content_id wajib diisi.',
        content_id: null,
        results: [],
        error_message: 'content_id wajib diisi.',
      }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: contentData, error: contentError } = await supabase
      .from('contents')
      .select('id, title, caption, hashtags, format, platforms, asset_url, asset_path, asset_type')
      .eq('id', contentId)
      .maybeSingle();

    if (contentError) throw contentError;

    const content = contentData as ContentRow | null;

    if (!content) {
      return NextResponse.json({
        ok: false,
        message: 'Konten tidak ditemukan.',
        content_id: contentId,
        results: [],
        error_message: 'Konten tidak ditemukan.',
      }, { status: 404 });
    }

    const platforms = normalizePlatforms(content.platforms);

    if (platforms.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'Bulk live publish selesai.',
        content_id: contentId,
        results: [],
      });
    }

    const { data: queueRows, error: queueError } = await supabase
      .from('publish_queue')
      .select('*')
      .eq('content_id', content.id)
      .order('created_at', { ascending: true });

    if (queueError) throw queueError;

    const { data: assetRows, error: assetsError } = await supabase
      .from('content_assets')
      .select('*')
      .eq('content_id', content.id)
      .order('slide_order', { ascending: true });

    if (assetsError) throw assetsError;

    const queues = (queueRows || []) as PublishQueueRow[];
    const assets = (assetRows || []) as ContentAssetRow[];
    const results: BulkLiveResult[] = [];

    for (const platform of platforms) {
      const queue = queues.find(row => (row.platform || '').toUpperCase() === platform);
      const computedReadiness = checkPlatformReadiness(content, assets, platform, {
        facebookLiveEnabled: process.env.FACEBOOK_LIVE_PUBLISH_ENABLED === 'true',
        instagramLiveEnabled: process.env.INSTAGRAM_LIVE_PUBLISH_ENABLED === 'true',
      });
      const readiness = ['FB', 'IG'].includes(platform) ? computedReadiness : getStoredReadiness(queue) || computedReadiness;
      const queueStatus = (queue?.status || 'not queued').toLowerCase();

      if (!queue) {
        results.push({
          platform,
          action: 'skipped',
          status: 'not queued',
          reason: 'Platform belum masuk publish_queue. Jalankan bulk dry-run terlebih dahulu.',
          external_post_url: null,
        });
        continue;
      }

      if (queueStatus === 'published' || queue.published_at) {
        results.push({
          platform,
          action: 'skipped',
          status: 'published',
          reason: 'Platform ini sudah published.',
          external_post_url: queue.external_post_url || queue.published_url || null,
        });
        continue;
      }

      if (queue.external_post_id) {
        results.push({
          platform,
          action: 'skipped',
          status: queueStatus,
          reason: 'Platform ini sudah pernah dipublish.',
          external_post_url: queue.external_post_url || queue.published_url || null,
        });
        continue;
      }

      if (!['dry_run_success', 'ready_to_publish'].includes(queueStatus)) {
        results.push({
          platform,
          action: 'skipped',
          status: queueStatus,
          reason: 'Platform belum dry_run_success atau ready_to_publish.',
          external_post_url: null,
        });
        continue;
      }

      if (platform === 'IG' && process.env.INSTAGRAM_LIVE_PUBLISH_ENABLED !== 'true') {
        results.push({
          platform,
          action: 'skipped',
          status: queueStatus,
          reason: 'Instagram live publish belum diaktifkan.',
          external_post_url: null,
        });
        continue;
      }

      if (!readiness.ready_for_live) {
        results.push({
          platform,
          action: 'skipped',
          status: queueStatus,
          reason: getSkipReasonForReadiness(readiness),
          external_post_url: null,
        });
        continue;
      }

      if (platform === 'FB') {
        const publishResult = await publishFacebookQueueLive(queue.id);

        results.push({
          platform,
          action: publishResult.ok ? 'published' : 'failed',
          status: publishResult.ok ? 'published' : 'failed',
          reason: publishResult.ok ? publishResult.message : publishResult.error_message || publishResult.message,
          external_post_url: publishResult.external_post_url,
        });
        continue;
      }

      if (platform === 'IG') {
        const publishResult = await publishInstagramQueueLive(queue.id);

        results.push({
          platform,
          action: publishResult.ok ? 'published' : 'failed',
          status: publishResult.ok ? 'published' : 'failed',
          reason: publishResult.ok ? publishResult.message : publishResult.error_message || publishResult.message,
          external_post_url: publishResult.external_post_url,
        });
        continue;
      }

      if (!['FB', 'IG'].includes(platform)) {
        results.push({
          platform,
          action: 'skipped',
          status: queueStatus,
          reason: 'Live publish platform ini belum diaktifkan.',
          external_post_url: null,
        });
        continue;
      }
    }

    return NextResponse.json({
      ok: true,
      message: 'Bulk live publish selesai.',
      content_id: content.id,
      results,
    });
  } catch (error) {
    console.error('BULK LIVE PUBLISH ERROR:', error);

    return NextResponse.json({
      ok: false,
      message: 'Bulk live publish gagal.',
      content_id: contentId,
      results: [],
      error_message: stringifyUnknown(error),
    }, { status: 500 });
  }
}
