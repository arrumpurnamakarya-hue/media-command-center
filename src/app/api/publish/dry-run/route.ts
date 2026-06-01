import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeContentAssets, AssetAnalysisResult } from '../../../lib/publish/assetAnalyzer';
import { checkPlatformReadiness, PlatformReadinessResult } from '../../../lib/publish/platformReadiness';

export const runtime = 'nodejs';

type PublishQueueRow = {
  id: string;
  content_id?: string | null;
  platform?: string | null;
  status?: string | null;
  scheduled_at?: string | null;
  attempts?: number | string | null;
  attempt_count?: number | string | null;
};

type ContentRow = {
  id: string;
  title?: string | null;
  caption?: string | null;
  hashtags?: string | null;
  format?: string | null;
  platforms?: string[] | null;
  publish_date?: string | null;
  publish_time?: string | null;
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

type ValidationResult = {
  valid: boolean;
  errors: string[];
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

function stringifyUnknown(value: unknown) {
  if (value instanceof Error) return value.message;
  if (typeof value === 'string') return value;

  try {
    return JSON.stringify(value);
  } catch {
    return 'Error tidak dapat dibaca.';
  }
}

function stringValue(value: unknown) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
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

function jsonError({
  message,
  failedStep,
  error,
  status = 500,
  queueId,
  platform,
}: {
  message: string;
  failedStep: string;
  error: unknown;
  status?: number;
  queueId?: string | null;
  platform?: string | null;
}) {
  const detail = formatSupabaseError(error);
  const fallbackMessage = stringifyUnknown(error);

  return NextResponse.json({
    ok: false,
    message,
    queue_id: queueId || null,
    platform: platform || null,
    failed_step: failedStep,
    error_message: detail.message !== '{}' ? detail.text : fallbackMessage,
    supabase: {
      message: detail.message,
      code: detail.code,
      details: detail.details,
      hint: detail.hint,
    },
  }, { status });
}

async function readRequestBody(request: NextRequest) {
  try {
    const body = await request.json();
    return isRecord(body) ? body : {};
  } catch {
    return {};
  }
}

function normalizeQueueId(body: Record<string, unknown>) {
  return stringValue(body.queue_id) || stringValue(body.id);
}

function normalizePlatform(body: Record<string, unknown>) {
  return stringValue(body.platform).trim().toUpperCase();
}

function buildScheduledAt(content?: ContentRow | null) {
  if (content?.publish_date) {
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
  ].filter(Boolean).join('\n\n');
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

function contentNeedsMedia(content: ContentRow, platform: string) {
  const normalizedFormat = String(content.format || '').toLowerCase();
  const normalizedPlatform = platform.toUpperCase();

  if (normalizedFormat === 'artikel') return false;
  if (normalizedPlatform === 'IG' || normalizedPlatform === 'TIKTOK' || normalizedPlatform === 'YT') return true;
  return ['feed', 'carousel', 'reels', 'story'].includes(normalizedFormat);
}

function validateDryRun(queue: PublishQueueRow, content: ContentRow | null, assets: ContentAssetRow[]): ValidationResult {
  const errors: string[] = [];
  const platform = queue.platform || '';

  if (!queue.content_id) errors.push('content_id tidak tersedia di publish_queue.');
  if (!platform) errors.push('platform tidak tersedia di publish_queue.');
  if (!content) errors.push('Konten tidak ditemukan.');

  if (content) {
    const combinedCaption = getCombinedCaption(content);
    if (!combinedCaption && !content.title?.trim()) {
      errors.push('Caption/text belum tersedia.');
    }

    if (platform && contentNeedsMedia(content, platform) && getOrderedAssets(content, assets).length === 0) {
      errors.push('Asset/media wajib tersedia untuk format/platform ini.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function buildSimulatedPayload(
  queue: PublishQueueRow,
  content: ContentRow,
  assets: ContentAssetRow[],
  readiness: PlatformReadinessResult | null,
  assetAnalysis: AssetAnalysisResult | null,
) {
  const orderedAssets = getOrderedAssets(content, assets);
  const caption = getCombinedCaption(content) || content.title || '';

  return {
    mode: 'dry_run',
    live_publish: false,
    queue_id: queue.id,
    content_id: content.id,
    platform: queue.platform,
    scheduled_at: queue.scheduled_at,
    post: {
      title: content.title || '',
      caption,
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
    validation: {
      media_required: contentNeedsMedia(content, queue.platform || ''),
      media_count: orderedAssets.length,
    },
    asset_analysis: assetAnalysis,
    readiness,
    suggested_platform_action: readiness && assetAnalysis
      ? getSuggestedPlatformAction(queue.platform || '', readiness, assetAnalysis)
      : null,
    variant_preparation: readiness ? {
      variant_needed: readiness.variant_needed,
      suggested_asset_type: readiness.suggested_asset_type,
      suggested_caption_note: readiness.suggested_caption_note || null,
    } : null,
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

async function updateQueueAttempt(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  queue: PublishQueueRow,
  payload: Record<string, unknown>,
) {
  const now = new Date().toISOString();
  const currentAttempts = Number(queue.attempts ?? queue.attempt_count ?? 0) || 0;
  const nextAttempts = currentAttempts + 1;
  const updatePayload = {
    attempts: nextAttempts,
    attempt_count: nextAttempts,
    last_attempt_at: now,
    publish_mode: 'dry_run',
    updated_at: now,
    ...payload,
  };

  const { error } = await supabase
    .from('publish_queue')
    .update(updatePayload)
    .eq('id', queue.id);

  if (error) throw error;
}

async function getContentById(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  contentId: string,
) {
  const { data, error } = await supabase
    .from('contents')
    .select('id, title, caption, hashtags, format, platforms, publish_date, publish_time, asset_url, asset_path, asset_type')
    .eq('id', contentId)
    .maybeSingle();

  if (error) throw error;
  return data as ContentRow | null;
}

async function getOrCreateQueueByContentPlatform(
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

  const scheduledAt = buildScheduledAt(content);
  const existingQueue = existingQueues?.[0];

  if (existingQueue) {
    const queue = existingQueue as PublishQueueRow;

    if (queue.scheduled_at) {
      return queue;
    }

    const { data: updatedQueue, error: updateError } = await supabase
      .from('publish_queue')
      .update({
        scheduled_at: scheduledAt,
        publish_mode: 'dry_run',
        updated_at: new Date().toISOString(),
      })
      .eq('id', queue.id)
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

async function ensureQueueScheduledAt(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  queue: PublishQueueRow,
  content: ContentRow | null,
) {
  if (queue.scheduled_at) return queue;

  const scheduledAt = buildScheduledAt(content);
  const { data, error } = await supabase
    .from('publish_queue')
    .update({
      scheduled_at: scheduledAt,
      publish_mode: 'dry_run',
      updated_at: new Date().toISOString(),
    })
    .eq('id', queue.id)
    .select('*')
    .single();

  if (error) throw error;
  return data as PublishQueueRow;
}

export async function POST(request: NextRequest) {
  let queueId: string | null = null;
  let platform: string | null = null;

  try {
    const body = await readRequestBody(request);
    queueId = normalizeQueueId(body);
    platform = normalizePlatform(body) || null;
    const contentId = stringValue(body.content_id);
    const supabase = getSupabaseAdmin();
    let queue: PublishQueueRow | null = null;
    let content: ContentRow | null = null;

    if (queueId) {
      const { data: queueData, error: queueError } = await supabase
        .from('publish_queue')
        .select('*')
        .eq('id', queueId)
        .maybeSingle();

      if (queueError) {
        return jsonError({
          message: 'Gagal mengambil publish_queue.',
          failedStep: 'get_publish_queue',
          error: queueError,
          queueId,
        });
      }

      queue = queueData as PublishQueueRow | null;
      if (!queue) {
        return NextResponse.json({
          ok: false,
          message: 'Publish queue tidak ditemukan.',
          queue_id: queueId,
          platform,
          error_message: 'Publish queue tidak ditemukan.',
        }, { status: 404 });
      }
    } else {
      if (!contentId || !platform) {
        return NextResponse.json({
          ok: false,
          message: 'queue_id atau content_id + platform wajib diisi.',
          queue_id: null,
          platform,
          error_message: 'queue_id atau content_id + platform wajib diisi.',
        }, { status: 400 });
      }

      try {
        content = await getContentById(supabase, contentId);
      } catch (error) {
        return jsonError({
          message: 'Gagal mengambil konten.',
          failedStep: 'get_content_for_queue',
          error,
          queueId,
        });
      }

      if (!content) {
        return NextResponse.json({
          ok: false,
          message: 'Konten tidak ditemukan.',
          queue_id: null,
          platform,
          error_message: 'Konten tidak ditemukan.',
        }, { status: 404 });
      }

      try {
        queue = await getOrCreateQueueByContentPlatform(supabase, content, platform);
        queueId = queue.id;
      } catch (error) {
        return jsonError({
          message: 'Gagal menyiapkan publish_queue dry-run.',
          failedStep: 'prepare_publish_queue',
          error,
          queueId,
        });
      }
    }

    let assets: ContentAssetRow[] = [];

    if (queue.content_id) {
      if (!content) {
        try {
          content = await getContentById(supabase, queue.content_id);
        } catch (error) {
          return jsonError({
            message: 'Gagal mengambil konten.',
            failedStep: 'get_content',
            error,
            queueId,
          });
        }
      }

      try {
        queue = await ensureQueueScheduledAt(supabase, queue, content);
      } catch (error) {
        return jsonError({
          message: 'Gagal menyiapkan scheduled_at dry-run.',
          failedStep: 'prepare_scheduled_at',
          error,
          queueId,
        });
      }

      const { data: assetRows, error: assetsError } = await supabase
        .from('content_assets')
        .select('*')
        .eq('content_id', queue.content_id)
        .order('slide_order', { ascending: true });

      if (assetsError) {
        return jsonError({
          message: 'Gagal mengambil asset konten.',
          failedStep: 'get_content_assets',
          error: assetsError,
          queueId,
        });
      }

      assets = (assetRows || []) as ContentAssetRow[];
    }

    const validation = validateDryRun(queue, content, assets);
    const assetAnalysis = content ? analyzeContentAssets(getOrderedAssets(content, assets)) : null;
    const readiness = content && queue.platform
      ? checkPlatformReadiness(content, assets, queue.platform, {
          facebookLiveEnabled: process.env.FACEBOOK_LIVE_PUBLISH_ENABLED === 'true',
          instagramLiveEnabled: process.env.INSTAGRAM_LIVE_PUBLISH_ENABLED === 'true',
        })
      : null;
    const simulatedPayload = content ? buildSimulatedPayload(queue, content, assets, readiness, assetAnalysis) : null;

    if (!validation.valid) {
      const errorMessage = validation.errors.join(' ');

      try {
        await updateQueueAttempt(supabase, queue, {
          status: 'failed',
          error_message: errorMessage,
          platform_response: {
            mode: 'dry_run',
            ok: false,
            validation_errors: validation.errors,
            simulated_payload: simulatedPayload,
            readiness,
          },
        });
      } catch (error) {
        return jsonError({
          message: 'Dry-run gagal dan status queue tidak berhasil diperbarui.',
          failedStep: 'update_failed_queue',
          error,
          queueId,
        });
      }

      return NextResponse.json({
        ok: false,
        message: errorMessage,
        queue_id: queue.id,
        platform: queue.platform || platform,
        simulated_payload: simulatedPayload,
        readiness,
        error_message: errorMessage,
      }, { status: 400 });
    }

    await updateQueueAttempt(supabase, queue, {
      status: 'dry_run_success',
      error_message: null,
      platform_response: {
        mode: 'dry_run',
        ok: true,
        simulated_payload: simulatedPayload,
        readiness,
      },
    });

    return NextResponse.json({
      ok: true,
      message: 'Dry-run publish berhasil. Tidak ada konten live yang dikirim.',
      queue_id: queue.id,
      platform: queue.platform || platform,
      simulated_payload: simulatedPayload,
      readiness,
      error_message: null,
    });
  } catch (error) {
    console.error('PUBLISH DRY RUN ERROR:', error);

    return jsonError({
      message: 'Dry-run publish gagal.',
      failedStep: 'dry_run_publish',
      error,
      queueId,
    });
  }
}
