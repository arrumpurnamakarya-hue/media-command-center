import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchTikTokJson } from '../../../../lib/insights/tiktokInsightService';

export const runtime = 'nodejs';

type TikTokTokenResponse = {
  access_token?: string;
  expires_in?: number;
  open_id?: string;
  refresh_expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

type TikTokUserInfoResponse = {
  data?: {
    user?: {
      open_id?: string;
      union_id?: string;
      avatar_url?: string;
      display_name?: string;
    };
  };
};

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

function redirectToIntegrations(status: 'success' | 'error', message: string) {
  return NextResponse.redirect(new URL(`/?tab=integrations&tiktok=${status}&message=${encodeURIComponent(message)}`, getAppUrl()));
}

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

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state');
  const error = requestUrl.searchParams.get('error');
  const savedState = request.cookies.get('tiktok_oauth_state')?.value;

  if (error) {
    return redirectToIntegrations('error', error);
  }

  if (!code) {
    return redirectToIntegrations('error', 'missing_tiktok_code');
  }

  if (!state || !savedState || state !== savedState) {
    return redirectToIntegrations('error', 'invalid_tiktok_state');
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;

  if (!clientKey || !clientSecret || !redirectUri) {
    return redirectToIntegrations('error', 'missing_tiktok_env');
  }

  const tokenBody = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });

  const tokenResult = await fetchTikTokJson<TikTokTokenResponse>(
    'https://open.tiktokapis.com/v2/oauth/token/',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenBody,
    },
    'tiktok_oauth_token',
  );

  if (!tokenResult.ok || !tokenResult.data?.access_token) {
    return redirectToIntegrations('error', tokenResult.error_message || 'tiktok_token_exchange_failed');
  }

  const tokenData = tokenResult.data;
  const userResult = await fetchTikTokJson<TikTokUserInfoResponse>(
    'https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    },
    'tiktok_user_info',
  );
  const userData = userResult.ok ? userResult.data?.data?.user : null;
  const openId = userData?.open_id || tokenData.open_id || null;

  if (!openId) {
    return redirectToIntegrations('error', 'missing_tiktok_open_id');
  }

  try {
    const now = new Date().toISOString();
    const supabase = getSupabaseAdmin();
    const scopeList = parseScope(tokenData.scope);

    const { error: upsertError } = await supabase
      .from('social_accounts')
      .upsert({
        platform: 'TIKTOK',
        open_id: openId,
        account_id: openId,
        account_name: userData?.display_name || 'TikTok Account',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        scope: tokenData.scope || scopeList.join(','),
        permissions: scopeList,
        token_expires_at: getExpiryIso(tokenData.expires_in),
        refresh_token_expires_at: getExpiryIso(tokenData.refresh_expires_in),
        status: 'connected',
        connected_at: now,
        source: 'tiktok_api',
        metadata: {
          open_id: openId,
          union_id: userData?.union_id || null,
          avatar_url: userData?.avatar_url || null,
          token_type: tokenData.token_type || null,
          user_info_available: userResult.ok,
          user_info_error: userResult.ok ? null : userResult.error_message || null,
        },
        updated_at: now,
      }, { onConflict: 'platform' });

    if (upsertError) throw upsertError;

    const response = redirectToIntegrations('success', 'TikTok berhasil terhubung.');
    response.cookies.delete('tiktok_oauth_state');
    return response;
  } catch (saveError) {
    console.error('TIKTOK OAUTH SAVE ERROR:', saveError);
    return redirectToIntegrations('error', 'tiktok_save_account_failed');
  }
}
