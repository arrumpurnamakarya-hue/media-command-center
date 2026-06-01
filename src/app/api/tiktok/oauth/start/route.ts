import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const TIKTOK_OAUTH_AUTHORIZE_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const TIKTOK_SCOPES = 'user.info.basic,video.list';

function redirectWithError(message: string) {
  return NextResponse.redirect(new URL(`/?tab=integrations&tiktok=error&message=${encodeURIComponent(message)}`, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
}

export async function GET() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;

  if (!clientKey || !redirectUri) {
    return redirectWithError('missing_tiktok_env');
  }

  const state = crypto.randomUUID();
  const authorizeUrl = new URL(TIKTOK_OAUTH_AUTHORIZE_URL);
  authorizeUrl.searchParams.set('client_key', clientKey);
  authorizeUrl.searchParams.set('scope', TIKTOK_SCOPES);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set('tiktok_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60,
    path: '/',
  });

  return response;
}
