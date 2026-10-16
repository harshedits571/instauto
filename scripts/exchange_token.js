const fs = require('fs');
const path = require('path');

const STORE_PATH = path.resolve(__dirname, '../data/store.json');
const ENV_PATH = path.resolve(__dirname, '../.env.local');

async function exchangeToken(shortLivedToken) {
  const appId = '4601066993473037';
  const appSecret = '6ee42c82fce30ab114f04128a4ff0128';
  const pageId = '1346133935253380';

  console.log('🔄 Step 1: Exchanging short-lived token for Long-Lived User Token (60 Days)...');
  const exchangeUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken.trim()}`;
  
  const res1 = await fetch(exchangeUrl);
  const data1 = await res1.json();
  
  if (data1.error) {
    console.error('❌ Token Exchange Error:', data1.error.message);
    return false;
  }
  
  const longLivedUserToken = data1.access_token;
  console.log('✅ Step 1 Success! Obtained 60-day User Token.');

  console.log('\n🔄 Step 2: Fetching Permanent Page Access Token (Never Expires)...');
  const pageUrl = `https://graph.facebook.com/v19.0/${pageId}?fields=access_token,name&access_token=${longLivedUserToken}`;
  const res2 = await fetch(pageUrl);
  const data2 = await res2.json();

  if (data2.error) {
    console.error('❌ Error fetching permanent page token:', data2.error.message);
    return false;
  }

  const permanentPageToken = data2.access_token;
  console.log(`✅ Step 2 Success! Obtained PERMANENT Page Token for: "${data2.name}"`);

  // Update store.json
  const store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
  store.accessToken = permanentPageToken;
  if (store.account) {
    store.account.pageAccessToken = permanentPageToken;
    store.account.accessTokenExpiresAt = 'never';
    store.account.status = 'active';
  }
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
  console.log('✅ Saved Permanent Page Token to data/store.json!');

  return permanentPageToken;
}

if (process.argv[2]) {
  exchangeToken(process.argv[2]);
}

module.exports = { exchangeToken };
