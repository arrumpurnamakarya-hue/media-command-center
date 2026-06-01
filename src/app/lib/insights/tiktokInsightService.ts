export type TikTokVideo = {
  id?: string;
  create_time?: number;
  cover_image_url?: string;
  share_url?: string;
  video_description?: string;
  duration?: number;
  height?: number;
  width?: number;
  title?: string;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  view_count?: number;
};

export type TikTokVideoListResult = {
  ok: boolean;
  videos: TikTokVideo[];
  error_message?: string | null;
  raw_response?: unknown;
};

type FetchTikTokVideoListParams = {
  accessToken: string;
  maxPages?: number;
  maxCount?: number;
};

const TIKTOK_API_BASE = 'https://open.tiktokapis.com';
const TIKTOK_TIMEOUT_MS = 30000;
const TIKTOK_VIDEO_FIELDS = [
  'id',
  'create_time',
  'cover_image_url',
  'share_url',
  'video_description',
  'duration',
  'height',
  'width',
  'title',
  'like_count',
  'comment_count',
  'share_count',
  'view_count',
].join(',');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringValue(value: unknown) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function getTikTokErrorMessage(payload: unknown, fallback: string) {
  if (!isRecord(payload)) return fallback;

  const error = isRecord(payload.error) ? payload.error : null;
  if (!error) return fallback;

  const code = stringValue(error.code) || 'unknown';
  const message = stringValue(error.message) || fallback;
  const logId = stringValue(error.log_id) || 'unknown';

  return `TikTok API Error code=${code} log_id=${logId} message=${message}`;
}

export async function fetchTikTokJson<T>(
  url: string,
  init: RequestInit,
  label: string,
): Promise<{ ok: boolean; data?: T | null; error_message?: string | null; raw_response?: unknown }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIKTOK_TIMEOUT_MS);
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

    if (!response.ok || (isRecord(parsed) && parsed.error && isRecord(parsed.error) && stringValue(parsed.error.code) !== 'ok')) {
      return {
        ok: false,
        data: null,
        raw_response: parsed || rawText,
        error_message: `[${label}] ${getTikTokErrorMessage(parsed, rawText || 'TikTok API request gagal.')}`,
      };
    }

    return {
      ok: true,
      data: parsed as T,
      raw_response: parsed,
      error_message: null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error && error.name === 'AbortError'
      ? `[${label}] TikTok API timeout.`
      : `[${label}] ${error instanceof Error ? error.message : 'TikTok API request gagal.'}`;

    return {
      ok: false,
      data: null,
      raw_response: { error: errorMessage, raw: rawText },
      error_message: errorMessage,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchTikTokVideoList({
  accessToken,
  maxPages = 10,
  maxCount = 20,
}: FetchTikTokVideoListParams): Promise<TikTokVideoListResult> {
  const videos: TikTokVideo[] = [];
  let cursor: number | undefined;
  let pageIndex = 1;
  let lastRawResponse: unknown = null;

  while (pageIndex <= maxPages) {
    const body: Record<string, number> = {
      max_count: Math.min(Math.max(maxCount, 1), 20),
    };

    if (typeof cursor === 'number') {
      body.cursor = cursor;
    }

    const response = await fetchTikTokJson<{
      data?: {
        videos?: TikTokVideo[];
        cursor?: number;
        has_more?: boolean;
      };
    }>(
      `${TIKTOK_API_BASE}/v2/video/list/?fields=${TIKTOK_VIDEO_FIELDS}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
      `tiktok_video_list:${pageIndex}`,
    );

    lastRawResponse = response.raw_response;

    if (!response.ok) {
      return {
        ok: false,
        videos,
        raw_response: lastRawResponse,
        error_message: response.error_message || 'Gagal mengambil daftar video TikTok.',
      };
    }

    const batchVideos = response.data?.data?.videos || [];
    videos.push(...batchVideos);

    if (!response.data?.data?.has_more) break;
    cursor = response.data.data.cursor;
    if (typeof cursor !== 'number') break;
    pageIndex += 1;
  }

  return {
    ok: true,
    videos,
    raw_response: lastRawResponse,
    error_message: null,
  };
}
