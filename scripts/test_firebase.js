const admin = require('firebase-admin');
const fs = require('fs');

// Read .env.local manually
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

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const app = initializeApp({
  credential: cert({
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey
  })
});

const db = getFirestore(app);

async function run() {
  console.log('Testing Firestore connection to project:', env.FIREBASE_PROJECT_ID);
  await db.collection('system_health').doc('ping').set({
    status: 'online',
    timestamp: new Date().toISOString()
  });
  console.log('✅ FIRESTORE WRITE SUCCESSFUL!');

  const doc = await db.collection('system_health').doc('ping').get();
  console.log('✅ FIRESTORE READ SUCCESSFUL:', doc.data());
}

run().catch(err => {
  console.error('❌ Firestore Error:', err);
  process.exit(1);
});
