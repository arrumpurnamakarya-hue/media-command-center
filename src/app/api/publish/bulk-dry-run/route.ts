import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeContentAssets, AssetAnalysisResult } from '../../../lib/publish/assetAnalyzer';
import { checkPlatformReadiness, PlatformReadinessResult } from '../../../lib/publish/platformReadiness';

export const runtime = 'nodejs';

type ContentRow = {
  id: string;
  title?: string | null;
  caption?: string | null;
  hashtags?: string | null;
  format?: string | null;
  platforms?: string[] | string | null;
  publish_date?: string | null;
  publish_time?: string | null;
  scheduled_at?: string | null;
  asset_url?: string | null;
  asset_path?: string | null;
  asset_type?: string | null;
};

type ContentAssetRow = {
  id?: string | null;
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
  content_id?: string | null;
  platform?: string | null;
  status?: string | null;
  scheduled_at?: string | null;
  external_post_id?: string | null;
  published_at?: string | null;
  attempts?: number | string | null;
  attempt_count?: number | string | null;
  publish_mode?: string | null;
};

type BulkDryRunResult = {
  platform: string;
  ok: boolean;
  status: string;
  readiness: PlatformReadinessResult;
  queue_id: string | null;
  error_message: string | null;
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

function buildScheduledAt(content: ContentRow) {
  if (content.scheduled_at) return content.scheduled_at;

  if (content.publish_date) {
    const normalizedTime = content.publish_time
      ? (content.publish_time.length === 5 ? `${content.publish_time}:00` : content.publish_time)
      : '09:00:00';

    return new Date(`${content.publish_date}T${normalizedTime}+07:00`).toISOString();
  }

  return new Date().toISOString();
}

function getCombinedCaption(content: ContentRow) {
  return [
    content.caption?.trim(),
    content.hashtags?.trim(),
  ].filter(Boolean).join('\n\n') || content.title || '';
}

function getOrderedAssets(content: ContentRow, assets: ContentAssetRow[]) {
  const sortedAssets = [...assets]
    .filter(asset => asset.file_url || asset.file_path)
    .sort((a, b) => Number(a.slide_order || 0) - Number(b.slide_order || 0));

  if (sortedAssets.length > 0) return sortedAssets;
  if (!content.asset_url && !content.asset_path) return [];

  return [{
    file_url: content.asset_url || null,
    file_path: content.asset_path || null,
    file_type: content.asset_type || null,
    file_name: content.title || 'cover',
    slide_order: 1,
    is_cover: true,
  }];
}

function buildSimulatedPayload(
  queue: PublishQueueRow,
  content: ContentRow,
  assets: ContentAssetRow[],
  readiness: PlatformReadinessResult,
  assetAnalysis: AssetAnalysisResult,
) {
  const orderedAssets = getOrderedAssets(content, assets);

  return {
    mode: 'bulk_dry_run',
    live_publish: false,
    queue_id: queue.id,
    content_id: content.id,
    platform: queue.platform,
    scheduled_at: queue.scheduled_at,
    post: {
      title: content.title || '',
      caption: getCombinedCaption(content),
      format: content.format || '',
    },
    media: orderedAssets.map((asset, index) => ({
      order: index + 1,
      url: asset.file_url || null,
      path: asset.file_path || null,
      type: asset.file_type || null,
      name: asset.file_name || null,
      asset_type: asset.asset_type || null,
      mime_type: asset.mime_type || asset.file_type || null,
      width: asset.width || null,
      height: asset.height || null,
      duration_seconds: asset.duration_seconds || null,
      aspect_ratio: asset.aspect_ratio || null,
      is_vertical_video: asset.is_vertical_video ?? null,
      is_short_video: asset.is_short_video ?? null,
      public_url: asset.public_url || asset.file_url || null,
      is_cover: Boolean(asset.is_cover || index === 0),
    })),
    asset_analysis: assetAnalysis,
    readiness,
    suggested_platform_action: getSuggestedPlatformAction(queue.platform || '', readiness, assetAnalysis),
    variant_preparation: {
      variant_needed: readiness.variant_needed,
      suggested_asset_type: readiness.suggested_asset_type,
      suggested_caption_note: readiness.suggested_caption_note || null,
    },
  };
}

function getSuggestedPlatformAction(
  platform: string,
  readiness: PlatformReadinessResult,
  assetAnalysis: AssetAnalysisResult,
) {
  const normalizedPlatform = platform.toUpperCase();

  if (normalizedPlatform === 'TIKTOK') {
    if (assetAnalysis.vertical_video_ready && assetAnalysis.short_video_ready) {
      return 'Video cocok untuk TikTok, tapi live publish belum aktif.';
    }
    return 'Siapkan video vertical 9:16.';
  }

  if (normalizedPlatform === 'YT') {
    if (assetAnalysis.vertical_video_ready && assetAnalysis.short_video_ready) {
      return 'Video cocok untuk Shorts, tapi live publish belum aktif.';
    }
    return 'Siapkan video vertical 9:16 untuk YouTube Shorts.';
  }

  if (normalizedPlatform === 'IG' && assetAnalysis.is_single_video) {
    return 'Video cocok untuk Reels, tapi live publish Reels belum aktif.';
  }

  if (normalizedPlatform === 'FB' && assetAnalysis.is_single_video) {
    return 'Video cocok untuk Facebook Reels, tapi live publish video belum aktif.';
  }

  if (normalizedPlatform === 'X' && assetAnalysis.has_video) {
    return 'Video X belum aktif untuk live publish.';
  }

  return readiness.reason;
}

async function getOrCreateQueue(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  content: ContentRow,
  platform: string,
) {
  const { data: existingQueues, error: selectError } = await supabase
    .from('publish_queue')
    .select('*')
    .eq('content_id', content.id)
    .eq('platform', platform)
    .order('created_at', { ascending: true })
    .limit(1);

  if (selectError) throw selectError;

  const existingQueue = existingQueues?.[0] as PublishQueueRow | undefined;
  const scheduledAt = buildScheduledAt(content);

  if (existingQueue) {
    const isPublished = (existingQueue.status || '').toLowerCase() === 'published' || Boolean(existingQueue.external_post_id);
    if (existingQueue.scheduled_at || isPublished) return existingQueue;

    const { data: updatedQueue, error: updateError } = await supabase
      .from('publish_queue')
      .update({
        scheduled_at: scheduledAt,
        publish_mode: 'dry_run',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingQueue.id)
      .select('*')
      .single();

    if (updateError) throw updateError;
    return updatedQueue as PublishQueueRow;
  }

  const now = new Date().toISOString();
  const { data: createdQueue, error: insertError } = await supabase
    .from('publish_queue')
    .insert([{
      content_id: content.id,
      platform,
      status: 'pending',
      scheduled_at: scheduledAt,
      attempts: 0,
      attempt_count: 0,
      publish_mode: 'dry_run',
      updated_at: now,
    }])
    .select('*')
    .single();

  if (insertError) throw insertError;
  return createdQueue as PublishQueueRow;
}

async function updateQueueAttempt(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  queue: PublishQueueRow,
  payload: Record<string, unknown>,
) {
  const now = new Date().toISOString();
  const currentAttempts = Number(queue.attempts ?? queue.attempt_count ?? 0) || 0;
  const nextAttempts = currentAttempts + 1;

  const { error } = await supabase
    .from('publish_queue')
    .update({
      attempts: nextAttempts,
      attempt_count: nextAttempts,
      last_attempt_at: now,
      publish_mode: 'dry_run',
      updated_at: now,
      ...payload,
    })
    .eq('id', queue.id);

  if (error) throw error;
}

export async function POST(request: NextRequest) {
  let contentId: string | null = null;

  try {
    const body = await readRequestBody(request);
    contentId = stringValue(body.content_id);

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
      .select('id, title, caption, hashtags, format, platforms, publish_date, publish_time, scheduled_at, asset_url, asset_path, asset_type')
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
        ok: false,
        message: 'Belum ada platform yang dipilih.',
        content_id: contentId,
        results: [],
        error_message: 'Belum ada platform yang dipilih.',
      }, { status: 400 });
    }

    const { data: assetRows, error: assetsError } = await supabase
      .from('content_assets')
      .select('*')
      .eq('content_id', content.id)
      .order('slide_order', { ascending: true });

    if (assetsError) throw assetsError;

    const assets = (assetRows || []) as ContentAssetRow[];
    const assetAnalysis = analyzeContentAssets(getOrderedAssets(content, assets));
    const results: BulkDryRunResult[] = [];

    for (const platform of platforms) {
      let queue: PublishQueueRow | null = null;
      const readiness = checkPlatformReadiness(content, assets, platform, {
        facebookLiveEnabled: process.env.FACEBOOK_LIVE_PUBLISH_ENABLED === 'true',
        instagramLiveEnabled: process.env.INSTAGRAM_LIVE_PUBLISH_ENABLED === 'true',
      });

      try {
        queue = await getOrCreateQueue(supabase, content, platform);
        const queueStatus = (queue.status || '').toLowerCase();
        const isPublished = queueStatus === 'published' || Boolean(queue.external_post_id);

        if (isPublished) {
          results.push({
            platform,
            ok: true,
            status: 'published',
            readiness,
            queue_id: queue.id,
            error_message: null,
          });
          continue;
        }

        const simulatedPayload = buildSimulatedPayload(queue, content, assets, readiness, assetAnalysis);

        if (readiness.ready_for_dry_run) {
          await updateQueueAttempt(supabase, queue, {
            status: 'dry_run_success',
            error_message: null,
            platform_response: {
              mode: 'bulk_dry_run',
              ok: true,
              simulated_payload: simulatedPayload,
              readiness,
            },
          });

          results.push({
            platform,
            ok: true,
            status: 'dry_run_success',
            readiness,
            queue_id: queue.id,
            error_message: null,
          });
        } else {
          await updateQueueAttempt(supabase, queue, {
            status: 'failed',
            error_message: readiness.reason,
            platform_response: {
              mode: 'bulk_dry_run',
              ok: false,
              readiness,
            },
          });

          results.push({
            platform,
            ok: false,
            status: 'failed',
            readiness,
            queue_id: queue.id,
            error_message: readiness.reason,
          });
        }
      } catch (error) {
        results.push({
          platform,
          ok: false,
          status: 'failed',
          readiness,
          queue_id: queue?.id || null,
          error_message: formatSupabaseError(error),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      message: 'Bulk dry-run selesai.',
      content_id: content.id,
      results,
    });
  } catch (error) {
    console.error('BULK DRY RUN ERROR:', error);

    return NextResponse.json({
      ok: false,
      message: 'Bulk dry-run gagal.',
      content_id: contentId,
      results: [],
      error_message: stringifyUnknown(error),
    }, { status: 500 });
  }
}
