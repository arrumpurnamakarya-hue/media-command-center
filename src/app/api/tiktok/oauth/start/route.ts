import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const TIKTOK_OAUTH_AUTHORIZE_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const TIKTOK_SCOPES = 'user.info.basic,video.list';

function redirectWithError(message: string) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim();
  return NextResponse.redirect(new URL(`/?tab=integrations&tiktok=error&message=${encodeURIComponent(message)}`, appUrl));
}

export async function GET() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY?.trim();
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET?.trim();
  const redirectUri = process.env.TIKTOK_REDIRECT_URI?.trim();

  if (!clientKey || !clientSecret || !redirectUri) {
    return redirectWithError('missing_tiktok_env');
  }

  console.info('TikTok OAuth start', {
    client_key_length: clientKey.length,
    redirect_uri: redirectUri,
  });

  const state = crypto.randomUUID();
  const authUrl = new URL(TIKTOK_OAUTH_AUTHORIZE_URL);
  authUrl.searchParams.set('client_key', clientKey);
  authUrl.searchParams.set('scope', TIKTOK_SCOPES);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('tiktok_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60,
    path: '/',
  });

  return response;
}
