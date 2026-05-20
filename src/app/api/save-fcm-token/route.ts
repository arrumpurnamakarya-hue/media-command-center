import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

type SaveFcmTokenBody = {
  token?: unknown;
  device_name?: unknown;
  user_id?: unknown;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE URL atau SERVICE ROLE KEY belum diisi');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: corsHeaders,
  });
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SaveFcmTokenBody;
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const deviceName =
      typeof body.device_name === 'string' && body.device_name.trim()
        ? body.device_name.trim()
        : 'Android Device';
    const userId =
      typeof body.user_id === 'string' && body.user_id.trim()
        ? body.user_id.trim()
        : null;

    console.log('SAVE FCM TOKEN REQUEST:', {
      hasToken: Boolean(token),
      deviceName,
      hasUserId: Boolean(userId),
    });

    if (!token) {
      return jsonResponse(
        {
          success: false,
          error: 'Token FCM wajib diisi',
        },
        400
      );
    }

    const { error } = await supabase.from('fcm_tokens').upsert(
      {
        token,
        device_name: deviceName,
        platform: 'android',
        user_id: userId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'token',
      }
    );

    if (error) {
      console.error('SAVE FCM TOKEN SUPABASE ERROR:', error);

      return jsonResponse(
        {
          success: false,
          error: error.message,
        },
        500
      );
    }

    console.log('SAVE FCM TOKEN SUCCESS');

    return jsonResponse({
      success: true,
      message: 'Token FCM berhasil disimpan',
    });
  } catch (error) {
    console.error('SAVE FCM TOKEN ERROR:', error);

    return jsonResponse(
      {
        success: false,
        error: 'Gagal menyimpan token FCM',
      },
      500
    );
  }
}
