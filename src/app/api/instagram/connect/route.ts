import { NextRequest, NextResponse } from 'next/server';
import { saveServerAccount } from '@/lib/serverStore';
import { InstagramAccount } from '@/types';

interface MetaAccountNode {
  id: string;
  name: string;
  access_token?: string;
  instagram_business_account?: {
    id: string;
    username: string;
    name: string;
    profile_picture_url?: string;
    followers_count?: number;
  };
}

async function subscribeAccountToWebhooks(igId: string, pageToken: string) {
  try {
    const url = `https://graph.facebook.com/v21.0/${igId}/subscribed_apps?subscribed_fields=comments,messages,mentions&access_token=${encodeURIComponent(pageToken)}`;
    const res = await fetch(url, { method: 'POST' });
    const data = await res.json();
    console.log('[Instagram Connect] Webhook subscription result:', data);
  } catch (err) {
    console.warn('[Instagram Connect] Webhook subscription error:', err);
  }
}

/**
 * POST /api/instagram/connect
 * Verifies a real Meta User or Page Access Token, identifies the connected Instagram Creator/Business account,
 * and fetches their real profile details directly from Meta Graph API.
 */
export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json();

    if (!accessToken || typeof accessToken !== 'string') {
      return NextResponse.json(
        { error: 'Meta Access Token is required.' },
        { status: 400 }
      );
    }

    const cleanToken = accessToken.trim().replace(/\s+/g, '');
    console.log('[Instagram Connect] Token length:', cleanToken.length, 'prefix:', cleanToken.substring(0, 15));

    // 1. Validate token with safe universal /me query
    const meRes = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${encodeURIComponent(cleanToken)}`);
    const meData = await meRes.json();
    console.log('[Instagram Connect] /me:', JSON.stringify(meData));

    if (meData.error) {
      return NextResponse.json({
        error: `Meta Access Token Error: ${meData.error.message} (Code: ${meData.error.code})`,
        details: meData.error
      }, { status: 400 });
    }

    // 2. Check if the token is directly a Page Access Token with instagram_business_account attached
    try {
      const pageDirectUrl = `https://graph.facebook.com/v21.0/me?fields=id,name,instagram_business_account{id,username,name,profile_picture_url,followers_count},connected_instagram_account{id,username,name}&access_token=${encodeURIComponent(cleanToken)}`;
      const pageDirectRes = await fetch(pageDirectUrl);
      const pageDirectData = await pageDirectRes.json();
      console.log('[Instagram Connect] Page direct check:', JSON.stringify(pageDirectData));

      if (pageDirectData.instagram_business_account?.id) {
        const ig = pageDirectData.instagram_business_account;
        const account: InstagramAccount = {
          id: ig.id,
          username: ig.username,
          name: ig.name || ig.username,
          profilePicture: ig.profile_picture_url || '',
          followersCount: ig.followers_count || 0,
          facebookPageId: pageDirectData.id,
          facebookPageName: pageDirectData.name,
          pageAccessToken: cleanToken,
          isConnected: true,
          accessTokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          tokenType: 'official_graph_api',
          status: 'active'
        };
        saveServerAccount(account, cleanToken);
        await subscribeAccountToWebhooks(account.id, cleanToken);
        return NextResponse.json({ success: true, account });
      }

      if (pageDirectData.connected_instagram_account?.id) {
        const ig = pageDirectData.connected_instagram_account;
        const account: InstagramAccount = {
          id: ig.id,
          username: ig.username,
          name: ig.name || ig.username,
          profilePicture: '',
          followersCount: 0,
          facebookPageId: pageDirectData.id,
          facebookPageName: pageDirectData.name,
          pageAccessToken: cleanToken,
          isConnected: true,
          accessTokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          tokenType: 'official_graph_api',
          status: 'active'
        };
        saveServerAccount(account, cleanToken);
        await subscribeAccountToWebhooks(account.id, cleanToken);
        return NextResponse.json({ success: true, account });
      }
    } catch (e) {
      console.error('[Instagram Connect] direct check failed:', e);
    }

    // 3. Query the /me/accounts edge (for User tokens with pages_show_list)
    let accounts: MetaAccountNode[] = [];
    try {
      const accountsUrl = `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count}&access_token=${encodeURIComponent(cleanToken)}`;
      const accountsRes = await fetch(accountsUrl);
      const accountsData = await accountsRes.json();
      accounts = accountsData.data || [];
      console.log('[Instagram Connect] accounts found:', accounts.length);

      let pageWithIg = accounts.find(a => a.instagram_business_account?.id);

      // If accounts were found, but instagram_business_account was omitted from the edge response,
      // query each page individually using its own page access token
      if (!pageWithIg && accounts.length > 0) {
        for (const page of accounts) {
          try {
            const pageToken = page.access_token || cleanToken;
            const pageDetailUrl = `https://graph.facebook.com/v21.0/${page.id}?fields=id,name,instagram_business_account{id,username,name,profile_picture_url,followers_count}&access_token=${encodeURIComponent(pageToken)}`;
            const pageDetailRes = await fetch(pageDetailUrl);
            const pageDetailData = await pageDetailRes.json();

            if (pageDetailData.instagram_business_account?.id) {
              pageWithIg = {
                id: pageDetailData.id,
                name: pageDetailData.name,
                access_token: pageToken,
                instagram_business_account: pageDetailData.instagram_business_account
              };
              break;
            }
          } catch (e) {
            console.error('[Instagram Connect] error fetching page details:', page.id, e);
          }
        }
      }

      if (pageWithIg && pageWithIg.instagram_business_account) {
        const ig = pageWithIg.instagram_business_account;
        const pageToken = pageWithIg.access_token || cleanToken;
        const account: InstagramAccount = {
          id: ig.id,
          username: ig.username,
          name: ig.name || ig.username,
          profilePicture: ig.profile_picture_url || '',
          followersCount: ig.followers_count || 0,
          facebookPageId: pageWithIg.id,
          facebookPageName: pageWithIg.name,
          pageAccessToken: pageToken,
          isConnected: true,
          accessTokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          tokenType: 'official_graph_api',
          status: 'active'
        };
        saveServerAccount(account, pageToken);
        await subscribeAccountToWebhooks(account.id, pageToken);
        return NextResponse.json({ success: true, account });
      }
    } catch (e) {
      console.error('[Instagram Connect] /me/accounts check failed:', e);
    }

    // 4. Try graph.instagram.com endpoint
    try {
      const igApiUrl = `https://graph.instagram.com/v21.0/me?fields=id,user_id,username,name,profile_picture_url&access_token=${encodeURIComponent(cleanToken)}`;
      const igApiRes = await fetch(igApiUrl);
      const igApiData = await igApiRes.json();

      if (igApiData && igApiData.username) {
        const account: InstagramAccount = {
          id: igApiData.id || igApiData.user_id,
          username: igApiData.username,
          name: igApiData.name || igApiData.username,
          profilePicture: igApiData.profile_picture_url || '',
          followersCount: 0,
          isConnected: true,
          accessTokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          tokenType: 'official_graph_api',
          status: 'active'
        };
        saveServerAccount(account, cleanToken);
        await subscribeAccountToWebhooks(account.id, cleanToken);
        return NextResponse.json({ success: true, account });
      }
    } catch {}

    // 5. Diagnostics if no Instagram account found
    let grantedPermissions: string[] = [];
    try {
      const permRes = await fetch(`https://graph.facebook.com/v21.0/me/permissions?access_token=${encodeURIComponent(cleanToken)}`);
      const permData = await permRes.json();
      if (Array.isArray(permData.data)) {
        grantedPermissions = permData.data
          .filter((p: any) => p.status === 'granted')
          .map((p: any) => p.permission);
      }
    } catch {}

    const pageCountNote = accounts.length > 0 
      ? `Facebook Pages found: "${accounts.map(a => a.name).join(', ')}", but no linked Instagram account was returned by Meta.`
      : `Meta returned 0 Facebook Pages for user "${meData.name || 'Harsh'}".`;

    return NextResponse.json({
      error: `${pageCountNote} Please verify that your Instagram account is linked to your Facebook Page in Instagram Settings > Creator Tools > Connect a Page. (Permissions active: ${grantedPermissions.join(', ') || 'none'})`,
      facebookPagesFound: accounts.map(a => a.name),
      user: { id: meData.id, name: meData.name },
      grantedPermissions
    }, { status: 422 });

  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to connect Meta API';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
