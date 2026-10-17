import { NextRequest, NextResponse } from 'next/server';
import { saveConnectedAccount } from '@/lib/dbService';
import { InstagramAccount } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const stateRaw = searchParams.get('state') || 'default_creator';
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const [userId, loginType] = stateRaw.includes('|') ? stateRaw.split('|') : [stateRaw, 'facebook'];

  const origin = request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'https://instauto-nine.vercel.app';
  const redirectUri = `${origin}/api/auth/callback/instagram`;

  if (error || !code) {
    console.error('[Meta OAuth Callback] User denied or error:', { error, errorDescription });
    return NextResponse.redirect(`${origin}/connect?error=${encodeURIComponent(errorDescription || 'Access denied by user')}`);
  }

  const appId = process.env.NEXT_PUBLIC_META_APP_ID || '2313756702789862';
  const igAppId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || '2313756702789862';
  const appSecret = process.env.META_APP_SECRET || '13be75eea4151ceb33baca16aa8bd4e3';

  try {
    console.log(`[Meta OAuth Callback] Processing ${loginType} login for user ${userId}...`);

    // -------------------------------------------------------------
    // FLOW 1: DIRECT INSTAGRAM LOGIN (NO FACEBOOK PAGE REQUIRED)
    // -------------------------------------------------------------
    if (loginType === 'instagram') {
      const formData = new URLSearchParams();
      formData.append('client_id', appId);
      formData.append('client_secret', appSecret);
      formData.append('grant_type', 'authorization_code');
      formData.append('redirect_uri', redirectUri);
      formData.append('code', code);

      const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        body: formData
      });
      const tokenData = await tokenRes.json();

      if (tokenData.error_message || tokenData.error) {
        console.error('[Instagram Direct OAuth] Token exchange error:', tokenData);
        // Fallback to Facebook exchange if the code was actually from Facebook
      } else if (tokenData.access_token) {
        let userAccessToken = tokenData.access_token;

        // Exchange for long-lived Instagram token (60 days)
        try {
          const longLivedRes = await fetch(
            `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(appSecret)}&access_token=${encodeURIComponent(userAccessToken)}`
          );
          const longLivedData = await longLivedRes.json();
          if (longLivedData.access_token) {
            userAccessToken = longLivedData.access_token;
          }
        } catch (e) {
          console.warn('[Instagram Direct OAuth] Long-lived token warning:', e);
        }

        // Fetch user profile from Instagram Graph API
        const meRes = await fetch(
          `https://graph.instagram.com/v21.0/me?fields=user_id,username,name,profile_picture_url,account_type,followers_count&access_token=${encodeURIComponent(userAccessToken)}`
        );
        const meData = await meRes.json();

        const accountId = meData.user_id || meData.id || String(tokenData.user_id);
        const username = meData.username || 'creator';

        const newAccount: InstagramAccount = {
          id: accountId,
          username: username,
          name: meData.name || username,
          profilePicture: meData.profile_picture_url || '',
          followersCount: meData.followers_count || 0,
          facebookPageId: 'direct_instagram',
          facebookPageName: 'Direct Instagram Login',
          pageAccessToken: userAccessToken,
          isConnected: true,
          accessTokenExpiresAt: '60_days',
          tokenType: 'official_graph_api',
          status: 'active'
        };

        await saveConnectedAccount(userId, newAccount, userAccessToken);
        console.log(`[Instagram Direct OAuth] Successfully connected @${username} (${accountId}) for user ${userId}!`);

        return NextResponse.redirect(
          `${origin}/connect?oauth_success=true&account=${encodeURIComponent(JSON.stringify(newAccount))}&token=${encodeURIComponent(userAccessToken)}`
        );
      }
    }

    // -------------------------------------------------------------
    // FLOW 2: FACEBOOK / META BUSINESS LOGIN (1-CLICK VIA FB PAGE)
    // -------------------------------------------------------------
    // 1. Exchange authorization code for user token
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${encodeURIComponent(code)}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error('[Meta OAuth Callback] Facebook token exchange failed:', tokenData.error);
      return NextResponse.redirect(`${origin}/connect?error=${encodeURIComponent(tokenData.error.message)}`);
    }

    const shortLivedToken = tokenData.access_token;

    // 2. Exchange for Long-Lived User Access Token
    const longLivedUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&fb_exchange_token=${encodeURIComponent(shortLivedToken)}`;
    const longLivedRes = await fetch(longLivedUrl);
    const longLivedData = await longLivedRes.json();

    const userAccessToken = longLivedData.access_token || shortLivedToken;

    // 3. Fetch managed Facebook Pages and linked Instagram Business Account
    const accountsUrl = `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count}&access_token=${encodeURIComponent(userAccessToken)}`;
    const accountsRes = await fetch(accountsUrl);
    const accountsData = await accountsRes.json();

    if (accountsData.error) {
      console.error('[Meta OAuth Callback] Failed to fetch accounts:', accountsData.error);
      return NextResponse.redirect(`${origin}/connect?error=${encodeURIComponent(accountsData.error.message)}`);
    }

    const pages = accountsData.data || [];
    console.log(`[Meta OAuth Callback] Found ${pages.length} managed Facebook page(s).`);

    const matchedPage = pages.find((p: any) => p.instagram_business_account?.id);

    if (!matchedPage || !matchedPage.instagram_business_account) {
      console.warn('[Meta OAuth Callback] No linked Instagram Professional account found on any Facebook page.');
      return NextResponse.redirect(
        `${origin}/connect?error=${encodeURIComponent('No Instagram Professional/Creator account is linked to your Facebook Page. Please ensure your Instagram is connected to a Facebook Page or choose "Connect with Instagram Directly".')}`
      );
    }

    const ig = matchedPage.instagram_business_account;
    const pageToken = matchedPage.access_token;

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

    await saveConnectedAccount(userId, newAccount, pageToken);
    console.log(`[Meta OAuth Callback] Successfully connected @${newAccount.username} (${newAccount.id}) for user ${userId}!`);

    return NextResponse.redirect(
      `${origin}/connect?oauth_success=true&account=${encodeURIComponent(JSON.stringify(newAccount))}&token=${encodeURIComponent(pageToken)}`
    );
  } catch (err: any) {
    console.error('[Meta OAuth Callback] Exception:', err);
    return NextResponse.redirect(`${origin}/connect?error=${encodeURIComponent(err.message || 'OAuth processing failed')}`);
  }
}
