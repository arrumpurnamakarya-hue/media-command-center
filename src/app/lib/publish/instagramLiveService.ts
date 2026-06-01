import { createClient } from '@supabase/supabase-js';

type PublishQueueRow = {
  id: string;
  content_id?: string | null;
  platform?: string | null;
  status?: string | null;
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

type InstagramSingleImageParams = {
  igUserId: string;
  accessToken: string;
  imageUrl: string;
  caption: string;
};

type InstagramCarouselImagesParams = {
  igUserId: string;
  accessToken: string;
  imageUrls: string[];
  caption: string;
};

type InstagramGraphResult = {
  ok: boolean;
  data?: Record<string, unknown> | null;
  error_message?: string | null;
};

export type InstagramPublishResult = {
  ok: boolean;
  publish_type?: 'instagram_single_image' | 'instagram_carousel_image';
  external_post_id?: string | null;
  external_post_url?: string | null;
  raw_child_create_responses?: unknown[];
  raw_create_response?: unknown;
  raw_parent_create_response?: unknown;
  raw_publish_response?: unknown;
  raw_permalink_response?: unknown;
  error_message?: string | null;
  created_time?: string | null;
  caption?: string | null;
  media_type?: string | null;
};

export type InstagramQueueLiveResult = {
  ok: boolean;
  message: string;
  queue_id: string | null;
  status?: string;
  external_post_id: string | null;
  external_post_url: string | null;
  error_message: string | null;
  http_status: number;
};

const GRAPH_API_VERSION = 'v20.0';
const GRAPH_TIMEOUT_MS = 30000;

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

function getMetaErrorMessage(rawResponse: unknown, fallback: string) {
  if (!isRecord(rawResponse)) return fallback;

  const error = isRecord(rawResponse.error) ? rawResponse.error : null;
  if (!error) return fallback;

  const message = stringValue(error.message) || fallback;
  const code = stringValue(error.code) || 'unknown';
  const type = stringValue(error.type) || 'unknown';
  const subcode = stringValue(error.error_subcode) || 'unknown';

  return `Meta Error code=${code} type=${type} subcode=${subcode} message=${message}`;
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
}): InstagramQueueLiveResult {
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

async function fetchInstagramGraphJson(
  url: string,
  init: RequestInit,
  label: string,
): Promise<InstagramGraphResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GRAPH_TIMEOUT_MS);
  let rawText = '';
  let parsed: unknown = null;

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });

    rawText = await response.text();

    try {
      parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
      parsed = { raw: rawText };
    }

    if (!response.ok || (isRecord(parsed) && parsed.error)) {
      return {
        ok: false,
        data: isRecord(parsed) ? parsed : { raw: rawText },
        error_message: `[${label}] ${getMetaErrorMessage(parsed, rawText || 'Instagram API request gagal.')}`,
      };
    }

    return {
      ok: true,
      data: isRecord(parsed) ? parsed : null,
      error_message: null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error && error.name === 'AbortError'
      ? `[${label}] Instagram API timeout.`
      : `[${label}] ${stringifyUnknown(error)}`;

    return {
      ok: false,
      data: { error: errorMessage, raw: rawText },
      error_message: errorMessage,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function publishInstagramSingleImage({
  igUserId,
  accessToken,
  imageUrl,
  caption,
}: InstagramSingleImageParams): Promise<InstagramPublishResult> {
  if (!imageUrl) {
    return {
      ok: false,
      error_message: 'imageUrl wajib tersedia.',
    };
  }

  if (!imageUrl.startsWith('https://')) {
    return {
      ok: false,
      error_message: 'imageUrl harus berupa public HTTPS URL.',
    };
  }

  const createBody = new URLSearchParams({
    image_url: imageUrl,
    caption,
    access_token: accessToken,
  });
  const createResult = await fetchInstagramGraphJson(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${igUserId}/media`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: createBody,
    },
    'create_ig_media_container',
  );

  if (!createResult.ok) {
    return {
      ok: false,
      raw_create_response: createResult.data,
      error_message: createResult.error_message || 'Gagal membuat Instagram media container.',
    };
  }

  const creationId = stringValue(createResult.data?.id);

  if (!creationId) {
    return {
      ok: false,
      raw_create_response: createResult.data,
      error_message: 'Instagram tidak mengembalikan creation_id.',
    };
  }

  const publishBody = new URLSearchParams({
    creation_id: creationId,
    access_token: accessToken,
  });
  const publishResult = await fetchInstagramGraphJson(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${igUserId}/media_publish`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: publishBody,
    },
    'publish_ig_media_container',
  );

  if (!publishResult.ok) {
    return {
      ok: false,
      raw_create_response: createResult.data,
      raw_publish_response: publishResult.data,
      error_message: publishResult.error_message || 'Gagal publish Instagram media.',
    };
  }

  const igMediaId = stringValue(publishResult.data?.id);

  if (!igMediaId) {
    return {
      ok: false,
      raw_create_response: createResult.data,
      raw_publish_response: publishResult.data,
      error_message: 'Instagram tidak mengembalikan media id.',
    };
  }

  const permalinkParams = new URLSearchParams({
    fields: 'id,permalink,timestamp,caption,media_type',
    access_token: accessToken,
  });
  const permalinkResult = await fetchInstagramGraphJson(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${igMediaId}?${permalinkParams.toString()}`,
    { method: 'GET' },
    'get_ig_permalink',
  );
  const permalinkData = permalinkResult.ok ? permalinkResult.data : null;

  if (!permalinkResult.ok) {
    console.warn('INSTAGRAM LIVE permalink warning:', permalinkResult.error_message);
  }

  return {
    ok: true,
    publish_type: 'instagram_single_image',
    external_post_id: igMediaId,
    external_post_url: stringValue(permalinkData?.permalink) || null,
    created_time: stringValue(permalinkData?.timestamp) || null,
    caption: stringValue(permalinkData?.caption) || caption,
    media_type: stringValue(permalinkData?.media_type) || 'IMAGE',
    raw_create_response: createResult.data,
    raw_publish_response: publishResult.data,
    raw_permalink_response: permalinkResult.data,
    error_message: null,
  };
}

export async function publishInstagramCarouselImages({
  igUserId,
  accessToken,
  imageUrls,
  caption,
}: InstagramCarouselImagesParams): Promise<InstagramPublishResult> {
  if (imageUrls.length < 2) {
    return {
      ok: false,
      error_message: 'Instagram carousel minimal 2 slide.',
    };
  }

  if (imageUrls.length > 10) {
    return {
      ok: false,
      error_message: 'Instagram carousel maksimal 10 slide.',
    };
  }

  const invalidUrl = imageUrls.find(imageUrl => !imageUrl.startsWith('https://'));
  if (invalidUrl) {
    return {
      ok: false,
      error_message: 'Semua slide carousel wajib memiliki public URL HTTPS yang bisa dibaca Instagram.',
    };
  }

  const childIds: string[] = [];
  const rawChildCreateResponses: unknown[] = [];

  for (const [index, imageUrl] of imageUrls.entries()) {
    const childBody = new URLSearchParams({
      image_url: imageUrl,
      is_carousel_item: 'true',
      access_token: accessToken,
    });
    const childResult = await fetchInstagramGraphJson(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${igUserId}/media`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: childBody,
      },
      `create_ig_carousel_child:${index + 1}`,
    );

    rawChildCreateResponses.push(childResult.data || null);

    if (!childResult.ok) {
      return {
        ok: false,
        raw_child_create_responses: rawChildCreateResponses,
        error_message: childResult.error_message || `Gagal membuat child carousel slide ${index + 1}.`,
      };
    }

    const childId = stringValue(childResult.data?.id);
    if (!childId) {
      return {
        ok: false,
        raw_child_create_responses: rawChildCreateResponses,
        error_message: `Instagram tidak mengembalikan child container id untuk slide ${index + 1}.`,
      };
    }

    childIds.push(childId);
  }

  const parentBody = new URLSearchParams({
    media_type: 'CAROUSEL',
    children: childIds.join(','),
    caption,
    access_token: accessToken,
  });
  const parentResult = await fetchInstagramGraphJson(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${igUserId}/media`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: parentBody,
    },
    'create_ig_carousel_parent',
  );

  if (!parentResult.ok) {
    return {
      ok: false,
      raw_child_create_responses: rawChildCreateResponses,
      raw_parent_create_response: parentResult.data,
      error_message: parentResult.error_message || 'Gagal membuat parent carousel Instagram.',
    };
  }

  const creationId = stringValue(parentResult.data?.id);

  if (!creationId) {
    return {
      ok: false,
      raw_child_create_responses: rawChildCreateResponses,
      raw_parent_create_response: parentResult.data,
      error_message: 'Instagram tidak mengembalikan creation_id parent carousel.',
    };
  }

  const publishBody = new URLSearchParams({
    creation_id: creationId,
    access_token: accessToken,
  });
  const publishResult = await fetchInstagramGraphJson(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${igUserId}/media_publish`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: publishBody,
    },
    'publish_ig_carousel',
  );

  if (!publishResult.ok) {
    return {
      ok: false,
      raw_child_create_responses: rawChildCreateResponses,
      raw_parent_create_response: parentResult.data,
      raw_publish_response: publishResult.data,
      error_message: publishResult.error_message || 'Gagal publish Instagram carousel.',
    };
  }

  const igMediaId = stringValue(publishResult.data?.id);

  if (!igMediaId) {
    return {
      ok: false,
      raw_child_create_responses: rawChildCreateResponses,
      raw_parent_create_response: parentResult.data,
      raw_publish_response: publishResult.data,
      error_message: 'Instagram tidak mengembalikan media id carousel.',
    };
  }

  const permalinkParams = new URLSearchParams({
    fields: 'id,permalink,timestamp,caption,media_type',
    access_token: accessToken,
  });
  const permalinkResult = await fetchInstagramGraphJson(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${igMediaId}?${permalinkParams.toString()}`,
    { method: 'GET' },
    'get_ig_carousel_permalink',
  );
  const permalinkData = permalinkResult.ok ? permalinkResult.data : null;

  if (!permalinkResult.ok) {
    console.warn('INSTAGRAM CAROUSEL LIVE permalink warning:', permalinkResult.error_message);
  }

  return {
    ok: true,
    publish_type: 'instagram_carousel_image',
    external_post_id: igMediaId,
    external_post_url: stringValue(permalinkData?.permalink) || null,
    created_time: stringValue(permalinkData?.timestamp) || null,
    caption: stringValue(permalinkData?.caption) || caption,
    media_type: stringValue(permalinkData?.media_type) || 'CAROUSEL_ALBUM',
    raw_child_create_responses: rawChildCreateResponses,
    raw_parent_create_response: parentResult.data,
    raw_publish_response: publishResult.data,
    raw_permalink_response: permalinkResult.data,
    error_message: null,
  };
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
  payload: {
    content_id: string;
    external_post_id: string;
    published_url: string | null;
    post_message: string;
    post_created_time: string;
    synced_at: string;
    media_type?: string | null;
  },
) {
  const { data: existingRow, error: selectError } = await supabase
    .from('post_insights')
    .select('id')
    .eq('platform', 'IG')
    .eq('external_post_id', payload.external_post_id)
    .maybeSingle();

  if (selectError) throw selectError;

  const seedPayload = {
    content_id: payload.content_id,
    platform: 'IG',
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

export async function publishInstagramQueueLive(queueId: string): Promise<InstagramQueueLiveResult> {
  try {
    if (process.env.INSTAGRAM_LIVE_PUBLISH_ENABLED !== 'true') {
      return resultFailure({
        message: 'Instagram live publish belum diaktifkan.',
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
      return resultFailure({
        message: 'Gagal mengambil publish_queue.',
        queueId,
        status: 500,
        errorMessage: formatSupabaseError(queueError),
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

    if (normalizedPlatform !== 'IG') {
      return resultFailure({
        message: 'Live publish ini hanya untuk platform IG.',
        queueId,
        status: 400,
      });
    }

    if (normalizedStatus === 'published' || queue.published_at || queue.external_post_id) {
      return resultFailure({
        message: 'Konten ini sudah pernah dipublish ke Instagram.',
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
      return resultFailure({
        message: 'Gagal mengambil konten.',
        queueId,
        status: 500,
        errorMessage: formatSupabaseError(contentError),
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

    const { data: assetRows, error: assetsError } = await supabase
      .from('content_assets')
      .select('file_url, file_type, slide_order')
      .eq('content_id', content.id)
      .order('slide_order', { ascending: true });

    if (assetsError) {
      return resultFailure({
        message: 'Gagal mengambil asset konten.',
        queueId,
        status: 500,
        errorMessage: formatSupabaseError(assetsError),
      });
    }

    const orderedAssets = getOrderedAssets(content, (assetRows || []) as ContentAssetRow[]);

    if (orderedAssets.length === 0) {
      return resultFailure({
        message: 'Asset belum memiliki public URL HTTPS yang bisa dibaca Instagram.',
        queueId,
        status: 400,
      });
    }

    if (orderedAssets.length > 10) {
      return resultFailure({
        message: 'Instagram carousel maksimal 10 slide.',
        queueId,
        status: 400,
      });
    }

    if (orderedAssets.some(asset => isVideoAsset(asset) || !isImageAsset(asset))) {
      return resultFailure({
        message: 'Instagram live tahap ini belum mendukung video/reels.',
        queueId,
        status: 400,
      });
    }

    const imageUrls = orderedAssets.map(asset => asset.file_url || '');

    if (imageUrls.some(imageUrl => !imageUrl.startsWith('https://'))) {
      return resultFailure({
        message: orderedAssets.length > 1
          ? 'Semua slide carousel wajib memiliki public URL HTTPS yang bisa dibaca Instagram.'
          : 'Asset belum memiliki public URL HTTPS yang bisa dibaca Instagram.',
        queueId,
        status: 400,
      });
    }

    const { data: igAccountData, error: igAccountError } = await supabase
      .from('social_accounts')
      .select('account_id, access_token, account_name')
      .eq('platform', 'IG')
      .eq('status', 'connected')
      .order('connected_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (igAccountError) {
      return resultFailure({
        message: 'Gagal mengambil akun Instagram.',
        queueId,
        status: 500,
        errorMessage: formatSupabaseError(igAccountError),
      });
    }

    const igAccount = igAccountData as SocialAccountRow | null;

    if (!igAccount?.account_id || !igAccount?.access_token) {
      return resultFailure({
        message: 'Instagram Business belum connected atau token tidak tersedia.',
        queueId,
        status: 400,
      });
    }

    const caption = getCombinedCaption(content);
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
      return resultFailure({
        message: 'Gagal menandai queue sebagai processing.',
        queueId,
        status: 500,
        errorMessage: formatSupabaseError(error),
      });
    }

    const publishResult = orderedAssets.length === 1
      ? await publishInstagramSingleImage({
          igUserId: igAccount.account_id,
          accessToken: igAccount.access_token,
          imageUrl: imageUrls[0],
          caption,
        })
      : await publishInstagramCarouselImages({
          igUserId: igAccount.account_id,
          accessToken: igAccount.access_token,
          imageUrls,
          caption,
        });
    const finishedAt = new Date().toISOString();

    if (!publishResult.ok) {
      const errorMessage = publishResult.error_message || 'Publish Instagram gagal.';

      try {
        await updateQueue(supabase, queue.id, {
          status: 'failed',
          error_message: errorMessage,
          platform_response: {
            publish_type: publishResult.publish_type || (orderedAssets.length > 1 ? 'instagram_carousel_image' : 'instagram_single_image'),
            raw_child_create_responses: publishResult.raw_child_create_responses || null,
            raw_create_response: publishResult.raw_create_response || null,
            raw_parent_create_response: publishResult.raw_parent_create_response || null,
            raw_publish_response: publishResult.raw_publish_response || null,
            raw_permalink_response: publishResult.raw_permalink_response || null,
            error_message: errorMessage,
          },
          updated_at: finishedAt,
        });
      } catch (error) {
        console.error('INSTAGRAM LIVE mark_failed:', formatSupabaseError(error));
      }

      return resultFailure({
        message: 'Publish Instagram gagal.',
        queueId,
        status: 400,
        errorMessage,
      });
    }

    const externalPostId = publishResult.external_post_id || null;
    const externalPostUrl = publishResult.external_post_url || null;
    const publishedAt = publishResult.created_time || finishedAt;
    let postInsightWarning: string | null = null;

    if (externalPostId) {
      try {
        await seedPostInsight(supabase, {
          content_id: content.id,
          external_post_id: externalPostId,
          published_url: externalPostUrl,
          post_message: publishResult.caption || caption,
          post_created_time: publishedAt,
          synced_at: finishedAt,
          media_type: publishResult.media_type || (publishResult.publish_type === 'instagram_carousel_image' ? 'CAROUSEL_ALBUM' : 'IMAGE'),
        });
      } catch (error) {
        postInsightWarning = formatSupabaseError(error);
        console.error('INSTAGRAM LIVE seed_post_insights warning:', postInsightWarning);
      }
    }

    try {
      await updateQueue(supabase, queue.id, {
        status: 'published',
        publish_mode: 'live',
        published_at: publishedAt,
        external_post_id: externalPostId,
        external_post_url: externalPostUrl,
        published_url: externalPostUrl,
        platform_response: {
          publish_type: publishResult.publish_type || (orderedAssets.length > 1 ? 'instagram_carousel_image' : 'instagram_single_image'),
          raw_child_create_responses: publishResult.raw_child_create_responses || null,
          raw_create_response: publishResult.raw_create_response || null,
          raw_parent_create_response: publishResult.raw_parent_create_response || null,
          raw_publish_response: publishResult.raw_publish_response || null,
          raw_permalink_response: publishResult.raw_permalink_response || null,
          warnings: [postInsightWarning].filter(Boolean),
        },
        error_message: null,
        updated_at: finishedAt,
      });
    } catch (error) {
      return resultFailure({
        message: 'Instagram berhasil publish, tetapi queue gagal diperbarui.',
        queueId,
        status: 500,
        errorMessage: formatSupabaseError(error),
      });
    }

    return {
      ok: true,
      message: 'Konten berhasil dipublish ke Instagram dan masuk monitoring.',
      queue_id: queue.id,
      status: 'published',
      external_post_id: externalPostId,
      external_post_url: externalPostUrl,
      error_message: null,
      http_status: 200,
    };
  } catch (error) {
    const errorMessage = stringifyUnknown(error);
    console.error('INSTAGRAM LIVE UNHANDLED:', error);

    return resultFailure({
      message: 'Publish Instagram gagal.',
      queueId,
      status: 500,
      errorMessage,
    });
  }
}
