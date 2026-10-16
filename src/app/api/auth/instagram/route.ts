import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId') || 'default_creator';

  const appId = process.env.NEXT_PUBLIC_META_APP_ID || '4601066993473037';
  
  // Base App URL: auto-detects from request host or env
  const origin = request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${origin}/api/auth/callback/instagram`;

  const scopes = [
    'pages_show_list',
    'pages_read_engagement',
    'instagram_basic',
    'instagram_manage_comments',
    'instagram_manage_messages',
    'business_management',
    'public_profile'
  ].join(',');

  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code&state=${encodeURIComponent(userId)}`;

  console.log(`[Meta OAuth] Redirecting user ${userId} to Meta authorization:`, authUrl);

  return NextResponse.redirect(authUrl);
}
