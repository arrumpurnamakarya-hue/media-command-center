import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';

const META_SCOPES = ['pages_show_list', 'pages_manage_posts'];

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

function redirectToIntegrations(params: Record<string, string>) {
  const url = new URL('/', getAppUrl());
  url.searchParams.set('tab', 'integrations');

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return NextResponse.redirect(url);
}

export async function GET(_request: NextRequest) {
  const appId = process.env.META_APP_ID;
  const configId = process.env.META_CONFIG_ID;

  if (!appId) {
    return redirectToIntegrations({
      meta: 'error',
      message: 'META_APP_ID belum dikonfigurasi.',
    });
  }

  if (!configId) {
    return redirectToIntegrations({
      meta: 'error',
      message: 'missing_meta_config_id',
    });
  }

  const appUrl = getAppUrl();
  const state = crypto.randomBytes(24).toString('hex');
  const redirectUri = `${appUrl}/api/auth/meta/callback`;
  const oauthUrl = new URL('https://www.facebook.com/v20.0/dialog/oauth');

  oauthUrl.searchParams.set('client_id', appId);
  oauthUrl.searchParams.set('redirect_uri', redirectUri);
  oauthUrl.searchParams.set('scope', META_SCOPES.join(','));
  oauthUrl.searchParams.set('response_type', 'code');
  oauthUrl.searchParams.set('state', state);
  oauthUrl.searchParams.set('config_id', configId);

  const response = NextResponse.redirect(oauthUrl);
  response.cookies.set('meta_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: appUrl.startsWith('https://'),
    path: '/',
    maxAge: 10 * 60,
  });

  return response;
}
