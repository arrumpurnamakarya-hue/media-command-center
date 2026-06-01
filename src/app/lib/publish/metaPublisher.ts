export type FacebookLivePublishParams = {
  pageId: string;
  pageAccessToken: string;
  caption: string;
  mediaUrls?: string[];
  mediaTypes?: string[];
  linkUrl?: string | null;
  queueId: string;
  contentId: string;
};

export type FacebookMultiImagePostParams = {
  pageId: string;
  pageAccessToken: string;
  imageUrls: string[];
  message: string;
};

export type InstagramLivePublishParams = {
  caption: string;
  mediaUrls?: string[];
  queueId: string;
  contentId: string;
};

export type LivePublishResult = {
  ok: boolean;
  publish_type?: 'facebook_text' | 'facebook_single_image' | 'facebook_multi_image';
  external_post_id?: string | null;
  external_post_url?: string | null;
  raw_response?: unknown;
  raw_photo_upload_responses?: unknown[];
  raw_feed_response?: unknown;
  raw_permalink_response?: unknown;
  error_message?: string | null;
  created_time?: string | null;
  message?: string | null;
};

export type FacebookPostDetailResult = {
  ok: boolean;
  id?: string | null;
  permalink_url?: string | null;
  created_time?: string | null;
  message?: string | null;
  raw_response?: unknown;
  error_message?: string | null;
};

const GRAPH_API_VERSION = 'v20.0';
const GRAPH_TIMEOUT_MS = 30000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringValue(value: unknown) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function buildFacebookPostUrl(postId?: string | null) {
  if (!postId) return null;
  return `https://www.facebook.com/${postId}`;
}

function isVideoMedia(url: string, mediaType?: string | null) {
  if ((mediaType || '').toLowerCase().startsWith('video/')) return true;

  const cleanUrl = url.split('?')[0].toLowerCase();
  return ['.mp4', '.mov', '.m4v', '.webm', '.avi'].some(extension => cleanUrl.endsWith(extension));
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

async function fetchFacebookGraphJson(
  url: string,
  init: RequestInit,
  label: string,
): Promise<{ ok: boolean; data?: Record<string, unknown> | null; error_message?: string | null }> {
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
        error_message: `[${label}] ${getMetaErrorMessage(parsed, rawText || 'Facebook API request gagal.')}`,
      };
    }

    return {
      ok: true,
      data: isRecord(parsed) ? parsed : null,
      error_message: null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error && error.name === 'AbortError'
      ? `[${label}] Facebook API timeout.`
      : `[${label}] ${error instanceof Error ? error.message : 'Facebook API request gagal.'}`;

    return {
      ok: false,
      data: { error: errorMessage, raw: rawText },
      error_message: errorMessage,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function postToFacebook(endpoint: string, body: URLSearchParams): Promise<LivePublishResult> {
  let rawText = '';
  let parsed: unknown = null;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    rawText = await response.text();

    try {
      parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
      parsed = { raw: rawText };
    }

    if (!response.ok) {
      return {
        ok: false,
        raw_response: parsed || rawText,
        error_message: getMetaErrorMessage(parsed, rawText || 'Facebook API request gagal.'),
      };
    }

    if (isRecord(parsed) && parsed.error) {
      return {
        ok: false,
        raw_response: parsed,
        error_message: getMetaErrorMessage(parsed, 'Facebook API request gagal.'),
      };
    }

    const responseRecord = isRecord(parsed) ? parsed : {};
    const externalPostId = stringValue(responseRecord.post_id) || stringValue(responseRecord.id) || null;

    return {
      ok: true,
      external_post_id: externalPostId,
      external_post_url: buildFacebookPostUrl(externalPostId),
      raw_response: parsed,
      error_message: null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Facebook API request gagal.';

    return {
      ok: false,
      raw_response: { error: errorMessage, raw: rawText },
      error_message: errorMessage,
    };
  }
}

export async function fetchFacebookPostDetails(
  externalPostId: string,
  pageAccessToken: string,
): Promise<FacebookPostDetailResult> {
  let rawText = '';
  let parsed: unknown = null;
  const searchParams = new URLSearchParams({
    fields: 'id,permalink_url,created_time,message',
    access_token: pageAccessToken,
  });

  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${externalPostId}?${searchParams.toString()}`,
    );

    rawText = await response.text();

    try {
      parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
      parsed = { raw: rawText };
    }

    if (!response.ok || (isRecord(parsed) && parsed.error)) {
      return {
        ok: false,
        raw_response: parsed || rawText,
        error_message: getMetaErrorMessage(parsed, rawText || 'Gagal mengambil permalink Facebook.'),
      };
    }

    const responseRecord = isRecord(parsed) ? parsed : {};

    return {
      ok: true,
      id: stringValue(responseRecord.id) || externalPostId,
      permalink_url: stringValue(responseRecord.permalink_url) || null,
      created_time: stringValue(responseRecord.created_time) || null,
      message: stringValue(responseRecord.message) || null,
      raw_response: parsed,
      error_message: null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Gagal mengambil permalink Facebook.';

    return {
      ok: false,
      raw_response: { error: errorMessage, raw: rawText },
      error_message: errorMessage,
    };
  }
}

/**
 * Live publish disabled by default. Use dry-run first, then call this only
 * through the guarded Facebook live route.
 */
export async function publishFacebookPost(params: FacebookLivePublishParams): Promise<LivePublishResult> {
  const mediaUrls = (params.mediaUrls || []).filter(Boolean);

  if (mediaUrls.length > 1) {
    return publishFacebookMultiImagePost({
      pageId: params.pageId,
      pageAccessToken: params.pageAccessToken,
      imageUrls: mediaUrls,
      message: params.caption,
    });
  }

  const firstMediaUrl = mediaUrls[0];
  const firstMediaType = params.mediaTypes?.[0] || null;

  if (firstMediaUrl && isVideoMedia(firstMediaUrl, firstMediaType)) {
    return {
      ok: false,
      external_post_id: null,
      external_post_url: null,
      raw_response: null,
      error_message: 'Video Facebook live publish belum diaktifkan pada tahap ini.',
    };
  }

  if (!firstMediaUrl) {
    const body = new URLSearchParams({
      message: params.caption,
      access_token: params.pageAccessToken,
    });

    if (params.linkUrl) body.set('link', params.linkUrl);

    const result = await postToFacebook(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${params.pageId}/feed`,
      body,
    );

    return {
      ...result,
      publish_type: 'facebook_text',
      raw_feed_response: result.raw_response,
    };
  }

  const body = new URLSearchParams({
    url: firstMediaUrl,
    caption: params.caption,
    access_token: params.pageAccessToken,
  });

  const result = await postToFacebook(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${params.pageId}/photos`,
    body,
  );

  return {
    ...result,
    publish_type: 'facebook_single_image',
  };
}

export async function publishFacebookMultiImagePost({
  pageId,
  pageAccessToken,
  imageUrls,
  message,
}: FacebookMultiImagePostParams): Promise<LivePublishResult> {
  const cleanImageUrls = imageUrls.map(url => url.trim()).filter(Boolean);

  if (cleanImageUrls.length < 2) {
    return {
      ok: false,
      publish_type: 'facebook_multi_image',
      external_post_id: null,
      external_post_url: null,
      raw_response: null,
      error_message: 'Facebook multi-image minimal 2 gambar.',
    };
  }

  if (cleanImageUrls.length > 10) {
    return {
      ok: false,
      publish_type: 'facebook_multi_image',
      external_post_id: null,
      external_post_url: null,
      raw_response: null,
      error_message: 'Facebook multi-image maksimal 10 gambar.',
    };
  }

  if (cleanImageUrls.some(imageUrl => !imageUrl.startsWith('https://'))) {
    return {
      ok: false,
      publish_type: 'facebook_multi_image',
      external_post_id: null,
      external_post_url: null,
      raw_response: null,
      error_message: 'Semua gambar wajib memiliki public URL HTTPS yang bisa dibaca Facebook.',
    };
  }

  const photoIds: string[] = [];
  const rawPhotoUploadResponses: unknown[] = [];

  for (const [index, imageUrl] of cleanImageUrls.entries()) {
    const photoBody = new URLSearchParams({
      url: imageUrl,
      published: 'false',
      access_token: pageAccessToken,
    });

    const photoResult = await fetchFacebookGraphJson(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/photos`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: photoBody,
      },
      `upload_fb_unpublished_photo:${index + 1}`,
    );

    rawPhotoUploadResponses.push(photoResult.data || null);

    if (!photoResult.ok) {
      return {
        ok: false,
        publish_type: 'facebook_multi_image',
        external_post_id: null,
        external_post_url: null,
        raw_photo_upload_responses: rawPhotoUploadResponses,
        raw_response: {
          raw_photo_upload_responses: rawPhotoUploadResponses,
          failed_step: `upload_photo_${index + 1}`,
        },
        error_message: photoResult.error_message || `Gagal upload foto Facebook slide ${index + 1}.`,
      };
    }

    const photoId = stringValue(photoResult.data?.id);
    if (!photoId) {
      return {
        ok: false,
        publish_type: 'facebook_multi_image',
        external_post_id: null,
        external_post_url: null,
        raw_photo_upload_responses: rawPhotoUploadResponses,
        raw_response: {
          raw_photo_upload_responses: rawPhotoUploadResponses,
          failed_step: `upload_photo_${index + 1}`,
        },
        error_message: `Facebook tidak mengembalikan photo id untuk gambar ${index + 1}.`,
      };
    }

    photoIds.push(photoId);
  }

  const attachedMedia = photoIds.map(photoId => ({ media_fbid: photoId }));
  const feedBody = new URLSearchParams({
    message,
    attached_media: JSON.stringify(attachedMedia),
    access_token: pageAccessToken,
  });

  const feedResult = await fetchFacebookGraphJson(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/feed`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: feedBody,
    },
    'create_fb_multi_image_feed',
  );

  if (!feedResult.ok) {
    return {
      ok: false,
      publish_type: 'facebook_multi_image',
      external_post_id: null,
      external_post_url: null,
      raw_photo_upload_responses: rawPhotoUploadResponses,
      raw_feed_response: feedResult.data,
      raw_response: {
        raw_photo_upload_responses: rawPhotoUploadResponses,
        raw_feed_response: feedResult.data,
      },
      error_message: feedResult.error_message || 'Gagal membuat Facebook multi-image post.',
    };
  }

  const responseRecord = feedResult.data || {};
  const postId = stringValue(responseRecord.id) || stringValue(responseRecord.post_id) || null;

  if (!postId) {
    return {
      ok: false,
      publish_type: 'facebook_multi_image',
      external_post_id: null,
      external_post_url: null,
      raw_photo_upload_responses: rawPhotoUploadResponses,
      raw_feed_response: feedResult.data,
      raw_response: {
        raw_photo_upload_responses: rawPhotoUploadResponses,
        raw_feed_response: feedResult.data,
      },
      error_message: 'Facebook tidak mengembalikan post id untuk multi-image post.',
    };
  }

  const permalinkResult = await fetchFacebookPostDetails(postId, pageAccessToken);

  if (!permalinkResult.ok) {
    console.warn('FACEBOOK MULTI IMAGE permalink warning:', permalinkResult.error_message);
  }

  return {
    ok: true,
    publish_type: 'facebook_multi_image',
    external_post_id: postId,
    external_post_url: permalinkResult.ok && permalinkResult.permalink_url
      ? permalinkResult.permalink_url
      : buildFacebookPostUrl(postId),
    raw_photo_upload_responses: rawPhotoUploadResponses,
    raw_feed_response: feedResult.data,
    raw_permalink_response: permalinkResult.raw_response,
    raw_response: {
      raw_photo_upload_responses: rawPhotoUploadResponses,
      raw_feed_response: feedResult.data,
      raw_permalink_response: permalinkResult.raw_response,
    },
    created_time: permalinkResult.ok ? permalinkResult.created_time || null : null,
    message: permalinkResult.ok ? permalinkResult.message || message : message,
    error_message: null,
  };
}

/**
 * Live publish disabled. Use dry-run first.
 */
export async function publishInstagramPost(_params: InstagramLivePublishParams): Promise<LivePublishResult> {
  return {
    ok: false,
    external_post_id: null,
    external_post_url: null,
    raw_response: null,
    error_message: 'Live publish Instagram belum diaktifkan.',
  };
}
