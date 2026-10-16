import { NextRequest, NextResponse } from 'next/server';
import { saveConnectedAccount } from '@/lib/dbService';
import { InstagramAccount } from '@/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const userId = searchParams.get('state') || 'default_creator';
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const origin = request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${origin}/api/auth/callback/instagram`;

  if (error || !code) {
    console.error('[Meta OAuth Callback] User denied or error:', { error, errorDescription });
    return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(errorDescription || 'Access denied by user')}`);
  }

  const appId = process.env.NEXT_PUBLIC_META_APP_ID || '4601066993473037';
  const appSecret = process.env.META_APP_SECRET || '';

  try {
    console.log(`[Meta OAuth Callback] Exchanging code for user token for user ${userId}...`);

    // 1. Exchange authorization code for short-lived user token
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${encodeURIComponent(code)}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error('[Meta OAuth Callback] Token exchange failed:', tokenData.error);
      return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(tokenData.error.message)}`);
    }

    const shortLivedToken = tokenData.access_token;

    // 2. Exchange short-lived token for Long-Lived User Access Token (60 days)
    const longLivedUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&fb_exchange_token=${encodeURIComponent(shortLivedToken)}`;
    const longLivedRes = await fetch(longLivedUrl);
    const longLivedData = await longLivedRes.json();

    const userAccessToken = longLivedData.access_token || shortLivedToken;

    // 3. Fetch user's managed Facebook Pages and linked Instagram Business Account
    const accountsUrl = `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count}&access_token=${encodeURIComponent(userAccessToken)}`;
    const accountsRes = await fetch(accountsUrl);
    const accountsData = await accountsRes.json();

    if (accountsData.error) {
      console.error('[Meta OAuth Callback] Failed to fetch accounts:', accountsData.error);
      return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(accountsData.error.message)}`);
    }

    const pages = accountsData.data || [];
    console.log(`[Meta OAuth Callback] Found ${pages.length} managed Facebook page(s).`);

    // Find the first Page linked to an Instagram Business account
    const matchedPage = pages.find((p: any) => p.instagram_business_account?.id);

    if (!matchedPage || !matchedPage.instagram_business_account) {
      console.warn('[Meta OAuth Callback] No linked Instagram Professional account found on any Facebook page.');
      return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent('No Instagram Professional/Creator account is linked to your Facebook Page. Please ensure your Instagram is connected to a Facebook Page.')}`);
    }

    const ig = matchedPage.instagram_business_account;
    const pageToken = matchedPage.access_token; // Permanent Page Token

    const newAccount: InstagramAccount = {
      id: ig.id,
      username: ig.username,
      name: ig.name || ig.username,
      profilePicture: ig.profile_picture_url || '',
      followersCount: ig.followers_count || 0,
      facebookPageId: matchedPage.id,
      facebookPageName: matchedPage.name,
      pageAccessToken: pageToken,
      isConnected: true,
      accessTokenExpiresAt: 'never',
      tokenType: 'official_graph_api',
      status: 'active'
    };

    // 4. Save to Firestore under this specific user & update global index
    await saveConnectedAccount(userId, newAccount, pageToken);

    console.log(`[Meta OAuth Callback] Successfully connected @${newAccount.username} (${newAccount.id}) for user ${userId}!`);

    return NextResponse.redirect(`${origin}/?connected=success&account=${encodeURIComponent(newAccount.username)}`);
  } catch (err: any) {
    console.error('[Meta OAuth Callback] Exception:', err);
    return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(err.message || 'OAuth processing failed')}`);
  }
}
