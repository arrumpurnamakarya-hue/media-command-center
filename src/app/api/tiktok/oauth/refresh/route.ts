import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchTikTokJson } from '../../../../lib/insights/tiktokInsightService';

export const runtime = 'nodejs';

type TikTokTokenRefreshResponse = {
  access_token?: string;
  expires_in?: number;
  open_id?: string;
  refresh_expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

type SocialAccountRow = {
  id: string;
  refresh_token?: string | null;
  refresh_token_expires_at?: string | null;
};

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL belum diisi.');
  if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY belum diisi.');

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getExpiryIso(seconds?: number) {
  if (!seconds || !Number.isFinite(seconds)) return null;
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function parseScope(scope?: string | null) {
  return (scope || '')
    .split(/[,\s]+/)
    .map(item => item.trim())
    .filter(Boolean);
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

export async function POST() {
  try {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

    if (!clientKey || !clientSecret) {
      return NextResponse.json({
        ok: false,
        message: 'Env TikTok belum lengkap.',
        error_message: 'TIKTOK_CLIENT_KEY/TIKTOK_CLIENT_SECRET belum diisi.',
      }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: accountData, error: accountError } = await supabase
      .from('social_accounts')
      .select('id, refresh_token, refresh_token_expires_at')
      .eq('platform', 'TIKTOK')
      .eq('status', 'connected')
      .maybeSingle();

    if (accountError) throw accountError;
    const account = accountData as SocialAccountRow | null;

    if (!account?.refresh_token) {
      return NextResponse.json({
        ok: false,
        message: 'Refresh token TikTok tidak tersedia.',
        error_message: 'Refresh token TikTok tidak tersedia.',
      }, { status: 400 });
    }

    if (account.refresh_token_expires_at && new Date(account.refresh_token_expires_at).getTime() <= Date.now()) {
      return NextResponse.json({
        ok: false,
        message: 'Refresh token TikTok sudah expired. Connect TikTok ulang.',
        error_message: 'Refresh token TikTok sudah expired. Connect TikTok ulang.',
      }, { status: 400 });
    }

    const refreshBody = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: account.refresh_token,
    });

    const refreshResult = await fetchTikTokJson<TikTokTokenRefreshResponse>(
      'https://open.tiktokapis.com/v2/oauth/token/',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: refreshBody,
      },
      'tiktok_refresh_token',
    );

    if (!refreshResult.ok || !refreshResult.data?.access_token) {
      return NextResponse.json({
        ok: false,
        message: 'Refresh token TikTok gagal.',
        error_message: refreshResult.error_message || 'Refresh token TikTok gagal.',
      }, { status: 400 });
    }

    const tokenData = refreshResult.data;
    const scopeList = parseScope(tokenData.scope);
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('social_accounts')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || account.refresh_token,
        scope: tokenData.scope || scopeList.join(','),
        permissions: scopeList,
        token_expires_at: getExpiryIso(tokenData.expires_in),
        refresh_token_expires_at: getExpiryIso(tokenData.refresh_expires_in),
        updated_at: now,
      })
      .eq('id', account.id);

    if (updateError) throw updateError;

    return NextResponse.json({
      ok: true,
      message: 'Token TikTok berhasil direfresh.',
    });
  } catch (error) {
    console.error('TIKTOK REFRESH ERROR:', error);

    return NextResponse.json({
      ok: false,
      message: 'Refresh token TikTok gagal.',
      error_message: stringifyUnknown(error),
    }, { status: 500 });
  }
}
