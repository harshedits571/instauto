import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId') || 'default_creator';

  const appId = process.env.NEXT_PUBLIC_META_APP_ID || '2313756702789862';
  
  // Base App URL: auto-detects from request host or env
  let origin = request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'https://instauto-nine.vercel.app';
  if (origin.startsWith('http://')) {
    origin = 'https://instauto-nine.vercel.app';
  }
  const redirectUri = `${origin}/api/auth/callback/instagram`;
  // Meta Login for Business (App ID 2313756702789862)
  const scopes = [
    'pages_show_list',
    'pages_read_engagement',
    'instagram_basic',
    'instagram_manage_comments',
    'instagram_manage_messages',
    'business_management',
    'public_profile'
  ].join(',');

  const statePayload = `${userId}|facebook`;
  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code&state=${encodeURIComponent(statePayload)}`;

  console.log(`[Meta OAuth] Redirecting user ${userId} to Meta authorization for Instagram profile:`, authUrl);

  return NextResponse.redirect(authUrl);
}
