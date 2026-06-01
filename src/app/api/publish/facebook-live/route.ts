import { NextRequest, NextResponse } from 'next/server';
import { publishFacebookQueueLive, stringifyUnknown } from '../../../lib/publish/facebookLiveService';

export const runtime = 'nodejs';

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

export async function POST(request: NextRequest) {
  let queueId: string | null = null;

  try {
    const body = await readRequestBody(request);
    queueId = stringValue(body.queue_id);

    if (body.confirm !== true) {
      return NextResponse.json({
        ok: false,
        message: 'Konfirmasi publish live wajib bernilai true.',
        queue_id: queueId,
        external_post_id: null,
        external_post_url: null,
        error_message: 'Konfirmasi publish live wajib bernilai true.',
      }, { status: 400 });
    }

    const result = await publishFacebookQueueLive(queueId || '');

    return NextResponse.json({
      ok: result.ok,
      message: result.message,
      queue_id: result.queue_id,
      external_post_id: result.external_post_id,
      external_post_url: result.external_post_url,
      error_message: result.error_message,
    }, { status: result.http_status });
  } catch (error) {
    const errorMessage = stringifyUnknown(error);
    console.error('FACEBOOK LIVE ROUTE ERROR:', error);

    return NextResponse.json({
      ok: false,
      message: 'Publish Facebook gagal.',
      queue_id: queueId,
      external_post_id: null,
      external_post_url: null,
      error_message: errorMessage,
    }, { status: 500 });
  }
}
