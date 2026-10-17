import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId') || 'default_creator';

  const appId = process.env.NEXT_PUBLIC_META_APP_ID || '4601066993473037';
  
  // Base App URL: auto-detects from request host or env
  let origin = request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'https://instauto-nine.vercel.app';
  if (origin.startsWith('http://')) {
    origin = 'https://instauto-nine.vercel.app';
  }
  const redirectUri = `${origin}/api/auth/callback/instagram`;
  const statePayload = `${userId}|instagram`;

  const instagramScopes = [
    'instagram_business_basic',
    'instagram_business_manage_messages',
    'instagram_business_manage_comments'
  ].join(',');

  const instagramOAuthUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${appId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${encodeURIComponent(instagramScopes)}&state=${encodeURIComponent(statePayload)}`;

  console.log(`[Instagram Direct OAuth] Redirecting user ${userId} to Instagram authorization:`, instagramOAuthUrl);

  return NextResponse.redirect(instagramOAuthUrl);
}
