import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE URL atau SERVICE ROLE KEY belum diisi');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { token, device_name, user_id } = body;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'Token FCM wajib diisi',
        },
        { status: 400 }
      );
    }

    const { error } = await supabase.from('fcm_tokens').upsert(
      {
        token,
        device_name: device_name || 'Android Device',
        platform: 'android',
        user_id: user_id || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'token',
      }
    );

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Token FCM berhasil disimpan',
    });
  } catch (error) {
    console.error('SAVE FCM TOKEN ERROR:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Gagal menyimpan token FCM',
      },
      { status: 500 }
    );
  }
}