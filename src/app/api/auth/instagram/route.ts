import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId') || 'default_creator';

  const igAppId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || '4368936740028300';
  
  // Base App URL: auto-detects from request host or env
  let origin = request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'https://instauto-nine.vercel.app';
  if (origin.startsWith('http://')) {
    origin = 'https://instauto-nine.vercel.app';
  }
  const redirectUri = `${origin}/api/auth/callback/instagram`;

  // Official Instagram Business Login scopes (auto dm-IG)
  const scopes = [
    'instagram_business_basic',
    'instagram_business_manage_messages',
    'instagram_business_manage_comments'
  ].join(',');

  const statePayload = `${userId}|instagram`;

  // 100% Direct Instagram Login (instagram.com login dialog - Zero Facebook branding)
  const authUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${encodeURIComponent(igAppId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(statePayload)}`;

  console.log(`[Instagram Direct OAuth] Redirecting user ${userId} to Instagram authorization:`, authUrl);

  return NextResponse.redirect(authUrl);
}
