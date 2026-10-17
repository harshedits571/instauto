import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/login/instagram
 * Supports both Instagram Direct Login (instagram.com) and Facebook OAuth (facebook.com)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const loginType = searchParams.get('type') || 'instagram'; // 'instagram' or 'facebook'
  const userId = searchParams.get('userId') || 'default_creator';

  const appId = process.env.NEXT_PUBLIC_META_APP_ID || '2313756702789862';
  const igAppId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || '2313756702789862';

  let origin = request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'https://instauto-nine.vercel.app';
  // Instagram's OAuth server strictly enforces HTTPS (rejects http://localhost)
  if (origin.startsWith('http://') && loginType === 'instagram') {
    origin = 'https://instauto-nine.vercel.app';
  }
  const redirectUri = `${origin}/api/auth/callback/instagram`;

  const statePayload = `${userId}|${loginType}`;

  // 1. Direct Instagram Login (instagram.com popup - no Facebook account required)
  if (loginType === 'instagram') {
    const instagramScopes = [
      'instagram_business_basic',
      'instagram_business_manage_messages',
      'instagram_business_manage_comments'
    ].join(',');

    const instagramOAuthUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${appId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${encodeURIComponent(instagramScopes)}&state=${encodeURIComponent(statePayload)}`;

    console.log(`[Instagram Direct Login] Redirecting user ${userId} to instagram.com authorization...`);
    return NextResponse.redirect(instagramOAuthUrl);
  }

  // 2. Facebook / Meta Business Login (1-click via linked Facebook Page)
  const facebookScopes = [
    'pages_show_list',
    'pages_read_engagement',
    'instagram_basic',
    'instagram_manage_comments',
    'instagram_manage_messages',
    'public_profile'
  ].join(',');

  const facebookOAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${encodeURIComponent(facebookScopes)}&response_type=code&state=${encodeURIComponent(statePayload)}`;

  console.log(`[Meta Facebook Login] Redirecting user ${userId} to facebook.com authorization...`);
  return NextResponse.redirect(facebookOAuthUrl);
}
