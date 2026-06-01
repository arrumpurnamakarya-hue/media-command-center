import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const META_SCOPES = ['pages_show_list', 'pages_manage_posts'];

type MetaTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: MetaApiError;
};

type MetaApiError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
};

type MetaPage = {
  id: string;
  name?: string;
  access_token?: string;
};

type MetaPagesResponse = {
  data?: MetaPage[];
  error?: MetaApiError;
};

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

function redirectToIntegrations(params: Record<string, string>) {
  const url = new URL('/', getAppUrl());
  url.searchParams.set('tab', 'integrations');

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = NextResponse.redirect(url);
  response.cookies.delete('meta_oauth_state');
  return response;
}

function getGraphBaseUrl() {
  const version = process.env.META_GRAPH_VERSION || 'v20.0';
  return `https://graph.facebook.com/${version}`;
}

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

function getTokenExpiresAt(expiresIn?: number) {
  if (!expiresIn || Number.isNaN(expiresIn)) return null;
  return new Date(Date.now() + expiresIn * 1000).toISOString();
}

function getFriendlyMetaAuthError(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('pages_manage_posts') || normalizedMessage.includes('invalid scopes')) {
    return 'Permission pages_manage_posts belum aktif di Meta Developer.';
  }

  return message;
}

async function fetchMetaJson<T>(url: URL) {
  const response = await fetch(url, { cache: 'no-store' });
  const payload = (await response.json()) as T & { error?: MetaApiError };

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message || 'Meta API request gagal.');
  }

  return payload;
}

async function upsertSocialAccount(platform: 'FB', payload: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: selectError } = await supabase
    .from('social_accounts')
    .select('id')
    .eq('platform', platform)
    .maybeSingle();

  if (selectError) throw selectError;

  if (existing?.id) {
    const { error } = await supabase
      .from('social_accounts')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('social_accounts')
    .insert([{
      platform,
      ...payload,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }]);

  if (error) throw error;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const oauthError = requestUrl.searchParams.get('error_description') || requestUrl.searchParams.get('error');
  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state');
  const storedState = request.cookies.get('meta_oauth_state')?.value;

  if (oauthError) {
    return redirectToIntegrations({
      meta: 'error',
      message: getFriendlyMetaAuthError(oauthError),
    });
  }

  if (!code) {
    return redirectToIntegrations({
      meta: 'error',
      message: 'OAuth code tidak ditemukan.',
    });
  }

  if (!state || !storedState || state !== storedState) {
    return redirectToIntegrations({
      meta: 'error',
      message: 'State OAuth tidak valid.',
    });
  }

  try {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error('META_APP_ID atau META_APP_SECRET belum dikonfigurasi.');
    }

    const appUrl = getAppUrl();
    const graphBaseUrl = getGraphBaseUrl();
    const redirectUri = `${appUrl}/api/auth/meta/callback`;
    const tokenUrl = new URL(`${graphBaseUrl}/oauth/access_token`);

    tokenUrl.searchParams.set('client_id', appId);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('client_secret', appSecret);
    tokenUrl.searchParams.set('code', code);

    const tokenPayload = await fetchMetaJson<MetaTokenResponse>(tokenUrl);
    const userAccessToken = tokenPayload.access_token;

    if (!userAccessToken) {
      throw new Error('Access token Meta tidak ditemukan.');
    }

    const pagesUrl = new URL(`${graphBaseUrl}/me/accounts`);
    pagesUrl.searchParams.set('fields', 'id,name,access_token');
    pagesUrl.searchParams.set('access_token', userAccessToken);

    const pagesPayload = await fetchMetaJson<MetaPagesResponse>(pagesUrl);
    const pages = pagesPayload.data || [];

    if (pages.length === 0) {
      throw new Error('Tidak ada Facebook Page yang ditemukan untuk akun ini.');
    }

    const selectedPage = pages[0];
    const pageAccessToken = selectedPage.access_token;
    const tokenExpiresAt = getTokenExpiresAt(tokenPayload.expires_in);
    const connectedAt = new Date().toISOString();

    if (!pageAccessToken) {
      throw new Error('Page access token tidak ditemukan.');
    }

    await upsertSocialAccount('FB', {
      account_name: selectedPage.name || 'Facebook Page',
      account_id: selectedPage.id,
      access_token: pageAccessToken,
      refresh_token: null,
      token_expires_at: tokenExpiresAt,
      permissions: META_SCOPES,
      status: 'connected',
      connected_at: connectedAt,
    });

    return redirectToIntegrations({ meta: 'success_fb_publish' });
  } catch (error) {
    console.error('META OAUTH CALLBACK ERROR:', error);

    const errorMessage = error instanceof Error ? error.message : 'Meta OAuth gagal.';

    return redirectToIntegrations({
      meta: 'error',
      message: getFriendlyMetaAuthError(errorMessage),
    });
  }
}
