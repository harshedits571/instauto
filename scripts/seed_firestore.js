const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

// Read env
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

let privateKey = env.FIREBASE_PRIVATE_KEY || '';
privateKey = privateKey.replace(/\\n/g, '\n');

const app = initializeApp({
  credential: cert({
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey
  })
});

const db = getFirestore(app);

async function seed() {
  const store = JSON.parse(fs.readFileSync('./data/store.json', 'utf8'));
  const defaultUserId = 'default_creator';

  console.log('Seeding store.json data to Firestore...');

  // 1. Seed user profile
  await db.collection('users').doc(defaultUserId).set({
    id: defaultUserId,
    name: 'Harsh Edits',
    email: 'creator@theeditorharsh.com',
    role: 'creator',
    plan: 'pro',
    createdAt: new Date().toISOString()
  }, { merge: true });
  console.log('✅ User profile seeded');

  // 2. Seed Instagram account
  if (store.account) {
    const acc = {
      ...store.account,
      pageAccessToken: store.accessToken || store.account.pageAccessToken,
      userId: defaultUserId,
      updatedAt: new Date().toISOString()
    };
    await db.collection('users').doc(defaultUserId).collection('accounts').doc(acc.id).set(acc, { merge: true });

    // Reverse lookup index
    await db.collection('instagram_accounts').doc(acc.id).set({
      userId: defaultUserId,
      igAccountId: acc.id,
      username: acc.username,
      facebookPageId: acc.facebookPageId,
      facebookPageName: acc.facebookPageName,
      pageAccessToken: acc.pageAccessToken,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log(`✅ Instagram Account ${acc.username} (${acc.id}) indexed in Firestore!`);
  }

  // 3. Seed Automations
  if (store.automations && store.automations.length > 0) {
    for (const rule of store.automations) {
      await db.collection('users').doc(defaultUserId).collection('automations').doc(rule.id).set({
        ...rule,
        userId: defaultUserId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log(`✅ Automation "${rule.name}" seeded`);
    }
  }

  // 4. Seed Pending Unlocks
  if (store.pendingUnlocks && store.pendingUnlocks.length > 0) {
    for (const unlock of store.pendingUnlocks) {
      await db.collection('pending_unlocks').doc(unlock.senderId).set(unlock);
    }
    console.log(`✅ Seeded ${store.pendingUnlocks.length} pending unlocks`);
  }

  console.log('\n🎉 ALL INITIAL DATA SUCCESSFULLY MIGRATED TO FIRESTORE!');
}

seed().catch(console.error);
