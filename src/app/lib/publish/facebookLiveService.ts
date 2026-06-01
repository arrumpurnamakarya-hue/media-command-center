import { createClient } from '@supabase/supabase-js';
import { fetchFacebookPostDetails, publishFacebookMultiImagePost, publishFacebookPost } from './metaPublisher';

type PublishQueueRow = {
  id: string;
  content_id?: string | null;
  platform?: string | null;
  status?: string | null;
  scheduled_at?: string | null;
  processing_at?: string | null;
  published_at?: string | null;
  external_post_id?: string | null;
  external_post_url?: string | null;
  published_url?: string | null;
  error_message?: string | null;
  attempts?: number | string | null;
  attempt_count?: number | string | null;
  publish_mode?: string | null;
};

type ContentRow = {
  id: string;
  title?: string | null;
  caption?: string | null;
  hashtags?: string | null;
  format?: string | null;
  asset_url?: string | null;
  asset_type?: string | null;
};

type ContentAssetRow = {
  file_url?: string | null;
  file_type?: string | null;
  slide_order?: number | null;
};

type SocialAccountRow = {
  account_id?: string | null;
  access_token?: string | null;
  account_name?: string | null;
};

type PostInsightSeedPayload = {
  content_id: string;
  external_post_id: string;
  published_url: string | null;
  post_message: string;
  post_created_time: string;
  synced_at: string;
  media_type?: string | null;
};

export type FacebookQueueLiveResult = {
  ok: boolean;
  message: string;
  queue_id: string | null;
  status?: string;
  external_post_id: string | null;
  external_post_url: string | null;
  error_message: string | null;
  http_status: number;
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

export function stringifyUnknown(value: unknown) {
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

function resultFailure({
  message,
  queueId = null,
  status = 400,
  errorMessage,
}: {
  message: string;
  queueId?: string | null;
  status?: number;
  errorMessage?: string | null;
}): FacebookQueueLiveResult {
  return {
    ok: false,
    message,
    queue_id: queueId,
    status: 'failed',
    external_post_id: null,
    external_post_url: null,
    error_message: errorMessage || message,
    http_status: status,
  };
}

function getCombinedCaption(content: ContentRow) {
  return [
    content.caption?.trim(),
    content.hashtags?.trim(),
  ].filter(Boolean).join('\n\n') || content.title?.trim() || '';
}

function getOrderedAssets(content: ContentRow, assets: ContentAssetRow[]) {
  const sortedAssets = [...assets]
    .filter(asset => asset.file_url)
    .sort((a, b) => Number(a.slide_order || 0) - Number(b.slide_order || 0));

  if (sortedAssets.length > 0) return sortedAssets;
  if (!content.asset_url) return [];

  return [{
    file_url: content.asset_url,
    file_type: content.asset_type || null,
    slide_order: 1,
  }];
}

function isVideoAsset(asset: ContentAssetRow) {
  if ((asset.file_type || '').toLowerCase().startsWith('video/')) return true;
  const url = (asset.file_url || '').split('?')[0].toLowerCase();
  return ['.mp4', '.mov', '.m4v', '.webm', '.avi'].some(extension => url.endsWith(extension));
}

function isImageAsset(asset: ContentAssetRow) {
  if ((asset.file_type || '').toLowerCase().startsWith('image/')) return true;
  const url = (asset.file_url || '').split('?')[0].toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].some(extension => url.endsWith(extension));
}

async function updateQueue(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  queueId: string,
  payload: Record<string, unknown>,
) {
  const { error } = await supabase
    .from('publish_queue')
    .update(payload)
    .eq('id', queueId);

  if (error) throw error;
}

async function seedPostInsight(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  payload: PostInsightSeedPayload,
) {
  const { data: existingRow, error: selectError } = await supabase
    .from('post_insights')
    .select('id')
    .eq('platform', 'FB')
    .eq('external_post_id', payload.external_post_id)
    .maybeSingle();

  if (selectError) throw selectError;

  const seedPayload = {
    content_id: payload.content_id,
    platform: 'FB',
    source: 'meta_api',
    external_post_id: payload.external_post_id,
    published_url: payload.published_url,
    post_message: payload.post_message,
    post_created_time: payload.post_created_time,
    likes: 0,
    comments: 0,
    shares: 0,
    engagement: 0,
    reach: 0,
    impressions: 0,
    media_type: payload.media_type || null,
    synced_at: payload.synced_at,
    updated_at: payload.synced_at,
  };

  if (existingRow?.id) {
    const { error: updateError } = await supabase
      .from('post_insights')
      .update(seedPayload)
      .eq('id', existingRow.id);

    if (updateError) throw updateError;
    return;
  }

  const { error: insertError } = await supabase
    .from('post_insights')
    .insert([{
      ...seedPayload,
      created_at: payload.synced_at,
    }]);

  if (insertError) throw insertError;
}

export async function publishFacebookQueueLive(queueId: string): Promise<FacebookQueueLiveResult> {
  try {
    if (process.env.FACEBOOK_LIVE_PUBLISH_ENABLED !== 'true') {
      return resultFailure({
        message: 'Live Publish Facebook masih dimatikan. Aktifkan FACEBOOK_LIVE_PUBLISH_ENABLED=true untuk publish live.',
        queueId,
        status: 403,
      });
    }

    if (!queueId) {
      return resultFailure({
        message: 'queue_id wajib diisi.',
        queueId,
        status: 400,
      });
    }

    const supabase = getSupabaseAdmin();
    const { data: queueData, error: queueError } = await supabase
      .from('publish_queue')
      .select('*')
      .eq('id', queueId)
      .maybeSingle();

    if (queueError) {
      const errorMessage = formatSupabaseError(queueError);
      console.error('FACEBOOK LIVE get_queue:', errorMessage);
      return resultFailure({
        message: 'Gagal mengambil publish_queue.',
        queueId,
        status: 500,
        errorMessage,
      });
    }

    const queue = queueData as PublishQueueRow | null;

    if (!queue) {
      return resultFailure({
        message: 'Publish queue tidak ditemukan.',
        queueId,
        status: 404,
      });
    }

    const normalizedPlatform = (queue.platform || '').toUpperCase();
    const normalizedStatus = (queue.status || '').toLowerCase();
    const normalizedPublishMode = (queue.publish_mode || '').toLowerCase();

    if (normalizedPlatform !== 'FB') {
      return resultFailure({
        message: 'Live publish hanya diaktifkan untuk platform FB.',
        queueId,
        status: 400,
      });
    }

    if (normalizedStatus === 'published' || queue.published_at || queue.external_post_id) {
      return resultFailure({
        message: 'Konten ini sudah pernah dipublish ke Facebook.',
        queueId,
        status: 409,
      });
    }

    if (!['dry_run_success', 'ready_to_publish'].includes(normalizedStatus)) {
      return resultFailure({
        message: 'Live publish hanya boleh setelah dry_run_success atau ready_to_publish.',
        queueId,
        status: 400,
      });
    }

    if (!['dry_run', 'facebook_live_ready'].includes(normalizedPublishMode)) {
      return resultFailure({
        message: 'publish_mode belum siap untuk Facebook live publish.',
        queueId,
        status: 400,
      });
    }

    if (!queue.content_id) {
      return resultFailure({
        message: 'content_id tidak tersedia di publish_queue.',
        queueId,
        status: 400,
      });
    }

    const { data: contentData, error: contentError } = await supabase
      .from('contents')
      .select('id, title, caption, hashtags, format, asset_url, asset_type')
      .eq('id', queue.content_id)
      .maybeSingle();

    if (contentError) {
      const errorMessage = formatSupabaseError(contentError);
      console.error('FACEBOOK LIVE get_content:', errorMessage);
      return resultFailure({
        message: 'Gagal mengambil konten.',
        queueId,
        status: 500,
        errorMessage,
      });
    }

    const content = contentData as ContentRow | null;

    if (!content) {
      return resultFailure({
        message: 'Konten tidak ditemukan.',
        queueId,
        status: 404,
      });
    }

    const caption = getCombinedCaption(content);

    if (!caption) {
      return resultFailure({
        message: 'Caption/text wajib tersedia sebelum publish live.',
        queueId,
        status: 400,
      });
    }

    const { data: assetRows, error: assetsError } = await supabase
      .from('content_assets')
      .select('file_url, file_type, slide_order')
      .eq('content_id', content.id)
      .order('slide_order', { ascending: true });

    if (assetsError) {
      const errorMessage = formatSupabaseError(assetsError);
      console.error('FACEBOOK LIVE get_assets:', errorMessage);
      return resultFailure({
        message: 'Gagal mengambil asset konten.',
        queueId,
        status: 500,
        errorMessage,
      });
    }

    const orderedAssets = getOrderedAssets(content, (assetRows || []) as ContentAssetRow[]);
    const mediaUrls = orderedAssets.map(asset => asset.file_url).filter(Boolean) as string[];
    const mediaTypes = orderedAssets.map(asset => asset.file_type || '');

    if (orderedAssets.length > 10) {
      return resultFailure({
        message: 'Facebook multi-image maksimal 10 gambar.',
        queueId,
        status: 400,
      });
    }

    if (orderedAssets.some(isVideoAsset)) {
      return resultFailure({
        message: 'Facebook live tahap ini belum mendukung video.',
        queueId,
        status: 400,
      });
    }

    if (orderedAssets.length > 0 && orderedAssets.some(asset => !isImageAsset(asset))) {
      return resultFailure({
        message: 'Facebook live tahap ini hanya mendukung gambar untuk asset media.',
        queueId,
        status: 400,
      });
    }

    if (orderedAssets.length > 0 && mediaUrls.some(mediaUrl => !mediaUrl.startsWith('https://'))) {
      return resultFailure({
        message: 'Semua gambar wajib memiliki public URL HTTPS yang bisa dibaca Facebook.',
        queueId,
        status: 400,
      });
    }

    const { data: fbAccountData, error: fbAccountError } = await supabase
      .from('social_accounts')
      .select('account_id, access_token, account_name')
      .eq('platform', 'FB')
      .eq('status', 'connected')
      .order('connected_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fbAccountError) {
      const errorMessage = formatSupabaseError(fbAccountError);
      console.error('FACEBOOK LIVE get_fb_account:', errorMessage);
      return resultFailure({
        message: 'Gagal mengambil akun Facebook.',
        queueId,
        status: 500,
        errorMessage,
      });
    }

    const fbAccount = fbAccountData as SocialAccountRow | null;

    if (!fbAccount?.account_id || !fbAccount?.access_token) {
      return resultFailure({
        message: 'Facebook Page belum connected atau token tidak tersedia.',
        queueId,
        status: 400,
      });
    }

    const now = new Date().toISOString();
    const currentAttempts = Number(queue.attempts ?? queue.attempt_count ?? 0) || 0;
    const nextAttempts = currentAttempts + 1;

    try {
      await updateQueue(supabase, queue.id, {
        status: 'processing',
        processing_at: now,
        attempts: nextAttempts,
        attempt_count: nextAttempts,
        last_attempt_at: now,
        error_message: null,
        updated_at: now,
      });
    } catch (error) {
      const errorMessage = formatSupabaseError(error);
      console.error('FACEBOOK LIVE mark_processing:', errorMessage);
      return resultFailure({
        message: 'Gagal menandai queue sebagai processing.',
        queueId,
        status: 500,
        errorMessage,
      });
    }

    const publishType = orderedAssets.length === 0
      ? 'facebook_text'
      : orderedAssets.length === 1 ? 'facebook_single_image' : 'facebook_multi_image';

    const publishResult = orderedAssets.length > 1
      ? await publishFacebookMultiImagePost({
          pageId: fbAccount.account_id,
          pageAccessToken: fbAccount.access_token,
          imageUrls: mediaUrls,
          message: caption,
        })
      : await publishFacebookPost({
          pageId: fbAccount.account_id,
          pageAccessToken: fbAccount.access_token,
          caption,
          mediaUrls,
          mediaTypes,
          queueId: queue.id,
          contentId: content.id,
        });

    const finishedAt = new Date().toISOString();

    if (!publishResult.ok) {
      const errorMessage = publishResult.error_message || 'Publish Facebook gagal.';

      try {
        await updateQueue(supabase, queue.id, {
          status: 'failed',
          error_message: errorMessage,
          platform_response: {
            publish_type: publishResult.publish_type || publishType,
            raw_photo_upload_responses: publishResult.raw_photo_upload_responses || null,
            raw_feed_response: publishResult.raw_feed_response || null,
            raw_permalink_response: publishResult.raw_permalink_response || null,
            raw_response: publishResult.raw_response || null,
            error_message: errorMessage,
          },
          updated_at: finishedAt,
        });
      } catch (error) {
        console.error('FACEBOOK LIVE mark_failed:', formatSupabaseError(error));
      }

      return resultFailure({
        message: 'Publish Facebook gagal.',
        queueId,
        status: 400,
        errorMessage,
      });
    }

    const externalPostId = publishResult.external_post_id || null;
    let postDetails = null as Awaited<ReturnType<typeof fetchFacebookPostDetails>> | null;
    let permalinkWarning: string | null = null;

    if (externalPostId && publishResult.raw_permalink_response && publishResult.external_post_url) {
      postDetails = {
        ok: true,
        id: externalPostId,
        permalink_url: publishResult.external_post_url,
        created_time: publishResult.created_time || null,
        message: publishResult.message || null,
        raw_response: publishResult.raw_permalink_response,
        error_message: null,
      };
    } else if (externalPostId) {
      postDetails = await fetchFacebookPostDetails(externalPostId, fbAccount.access_token);

      if (!postDetails.ok) {
        permalinkWarning = postDetails.error_message || 'Permalink Facebook belum berhasil dibaca.';
        console.warn('FACEBOOK LIVE permalink warning:', permalinkWarning);
      }
    }

    const externalPostUrl = postDetails?.ok && postDetails.permalink_url
      ? postDetails.permalink_url
      : publishResult.external_post_url || (externalPostId ? `https://www.facebook.com/${externalPostId}` : null);
    const publishedAt = postDetails?.ok && postDetails.created_time ? postDetails.created_time : finishedAt;
    let postInsightWarning: string | null = null;

    if (externalPostId) {
      try {
        await seedPostInsight(supabase, {
          content_id: content.id,
          external_post_id: externalPostId,
          published_url: externalPostUrl,
          post_message: postDetails?.ok && postDetails.message ? postDetails.message : caption,
          post_created_time: publishedAt,
          synced_at: finishedAt,
          media_type: publishResult.publish_type === 'facebook_multi_image'
            ? 'multi_image'
            : publishResult.publish_type === 'facebook_single_image' ? 'single_image' : 'text',
        });
      } catch (error) {
        postInsightWarning = formatSupabaseError(error);
        console.error('FACEBOOK LIVE seed_post_insights warning:', postInsightWarning);
      }
    }

    const platformResponse = {
      publish_type: publishResult.publish_type || publishType,
      raw_photo_upload_responses: publishResult.raw_photo_upload_responses || null,
      raw_feed_response: publishResult.raw_feed_response || null,
      raw_permalink_response: postDetails?.raw_response || publishResult.raw_permalink_response || null,
      publish: publishResult.raw_response || null,
      permalink: postDetails?.raw_response || publishResult.raw_permalink_response || null,
      warnings: [permalinkWarning, postInsightWarning].filter(Boolean),
    };

    try {
      await updateQueue(supabase, queue.id, {
        status: 'published',
        publish_mode: 'live',
        published_at: publishedAt,
        external_post_id: externalPostId,
        external_post_url: externalPostUrl,
        published_url: externalPostUrl,
        platform_response: platformResponse,
        error_message: null,
        updated_at: finishedAt,
      });
    } catch (error) {
      const errorMessage = formatSupabaseError(error);
      console.error('FACEBOOK LIVE mark_published:', errorMessage);
      return resultFailure({
        message: 'Facebook berhasil publish, tetapi queue gagal diperbarui.',
        queueId,
        status: 500,
        errorMessage,
      });
    }

    return {
      ok: true,
      message: 'Konten berhasil dipublish ke Facebook dan masuk monitoring.',
      queue_id: queue.id,
      status: 'published',
      external_post_id: externalPostId,
      external_post_url: externalPostUrl,
      error_message: null,
      http_status: 200,
    };
  } catch (error) {
    const errorMessage = stringifyUnknown(error);
    console.error('FACEBOOK LIVE UNHANDLED:', error);

    return resultFailure({
      message: 'Publish Facebook gagal.',
      queueId,
      status: 500,
      errorMessage,
    });
  }
}
