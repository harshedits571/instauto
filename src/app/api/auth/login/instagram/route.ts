import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/login/instagram
 * Supports both Instagram Direct Login and Facebook OAuth
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const loginType = searchParams.get('type') || 'instagram'; // 'instagram' or 'facebook'

  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  const appUrl = `${protocol}://${host}`;
  const redirectUri = `${appUrl}/api/auth/callback/instagram`;

  if (!appId) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_META_APP_ID is not configured in .env.local' },
      { status: 500 }
    );
  }

  // 1. Direct Instagram Login (Uses Instagram API scopes)
  if (loginType === 'instagram') {
    const igAppId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || appId;
    const instagramScopes = [
      'instagram_business_basic',
      'instagram_business_manage_messages',
      'instagram_business_manage_comments'
    ].join(',');

    const instagramOAuthUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${igAppId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${encodeURIComponent(instagramScopes)}`;

    return NextResponse.redirect(instagramOAuthUrl);
  }

  // 2. Facebook Graph API Login (Uses Facebook scopes)
  const facebookScopes = [
    'instagram_manage_comments',
    'instagram_manage_messages'
  ].join(',');

  const facebookOAuthUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${encodeURIComponent(facebookScopes)}&response_type=code`;

  return NextResponse.redirect(facebookOAuthUrl);
}
