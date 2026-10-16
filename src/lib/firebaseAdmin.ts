import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

const FALLBACK_PROJECT_ID = 'instauto-93b71';
const FALLBACK_CLIENT_EMAIL = 'firebase-adminsdk-fbsvc@instauto-93b71.iam.gserviceaccount.com';
const FALLBACK_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCbCjw6ykVKuLWC\nusqicAXRIRA6f2ubagV6nR359qCl2HHib4CoW+dp0wUYkDqTlL4f/RtBATjYrNUF\n4LurqfnPDV39LAxvxs8tez7DsPSe8QORPdRZH8m1NcgyylCMsFiPtM+kWIoITHRL\npGqDxCM3oZPjhBnsMTWON0f/O9J9KY86eMDjeqEY6iHQg05Ft6FXrGkQ3QSgOSmi\n9WqTFva43osfcoGoOVkvgQaEyZNPylqDpbx8bEEnMS0LWDWcH5pWUIJ8W9BcL30l\ngnCt7sNCznc+lRmo5V9jBNfdyVjZKKfwMloNZjj+rAd6H1+6PYNVT/cQ7UlvVvFB\nkxTAW/N5AgMBAAECggEAEZ7trn7btjzdAFErg5+4wYaA+i0ONVks6z0dMZIquv6p\nHuOuWzQqzne5zgtiZPCUVT1mkhJJ/DJUebkLi1yjtDkgNAyEE1YkqNYnkYU0oDXj\nQmglEMYQnkRRDxi4Y+0M+7RAnzyi34OU+h3jLzulBwcZsFOMwK/tFs9IowURDMF1\nouXynAkg6zeSjrMZgHoaFjQ1Pd22+osy6K+YCZOxTLL3l/7v4crVR4dNALgYeCCf\nl0IwKRonkCtS5kG+3KALbc8QOCYhu1uLf3qFGgneTN1xXbcUyf6UQ54uDPNo2GnR\nwZPztTmlNpbOXD5JWrL44bo0YCACfmWguN3tLyMVEwKBgQDN7Lqjg5jQX+4U93Ol\nP11wrTN7DZGn6C4e64ym6D4HF5+ua17FRTzeI9o2AShkdbvVm7dFX46kxAnKNI/5\n4LzvRYSue6j6Ig+3mEOFqhixbSAEbUmmm75/u4CVjkt3TkTyaootjYSwChgMcX0j\nmS9aYkY3pEOmaYV6vdNIJImS2wKBgQDAvdFyfaNDwxbmf+JwwnO909NkRnQcxBD4\n4fm+YsRaYn7DB+K6uqNKLVSwGmv0o7/+sqHb20LOQ2aFK9L4PCuogpflJU6aTfIZ\njLH72px44hSWEzeIQTEJwAG372EWJqDjpjb39b0N1hvlWFBhhgEHMRsrYmhHiOYQ\nMoMeUdDBOwKBgEnEdPOgb7ytsMcYAfh/Y4S6twdsy/HfTa5L6T3dUmMOBmjgE7oN\nXImjREc2UPbz6g7SUmvqmFnT1EH4ZF86L9RzDd3HdLfuPb0iMYYPcfsVQXP0hn7F\nqg9t5tkseUJK6o4AtnEtEgxSAV1rxk1bUchKDidek9FoWaWnnKlqVVIjAoGBAL23\nGX5UZGvCj7v6jOzoufxTkHPXVVsrMnmIFMdteFBvOs7F6Epcg3X0ALQGjdSTidwu\nAFvkCnH0rejPJi3pLCAFy3Vlr2T67B5x+o8os3PZNOIzsCmR4a7zK73dBfdDtoHd\njaWsYJZJ9dNdhmE4AbMOhuvBRVuESNAQqDcj2RMZAoGACubyrPD0Pi+bIFNaPr2c\nCcPi92cw3B6tZli02BfOO6z0KeNOvohOH3PPDQyCBghtjkGA5TKvRThRRmduSTKf\nr2/W0MD+8R3hzrGaYi/EPrWRM0uqnA40Asxt7mFPkbLO0NZUCe6z2XyQWrLFE1ND\n1jzJ5hlTIWgSWIX8hUPFOy4=\n-----END PRIVATE KEY-----\n";

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  // 1. Check if full service account JSON or base64 is provided
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      let raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
      if (!raw.startsWith('{')) {
        // base64 encoded
        raw = Buffer.from(raw, 'base64').toString('utf8');
      }
      const parsed = JSON.parse(raw);
      return initializeApp({
        credential: cert(parsed)
      });
    } catch (e) {
      console.warn('[Firebase Admin] Could not parse FIREBASE_SERVICE_ACCOUNT_KEY, falling back.');
    }
  }

  // 2. Read individual env vars with automatic newline unescaping
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey) {
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  // Fallback to embedded verified keys if env var is missing or empty
  if (!privateKey || !privateKey.includes('BEGIN PRIVATE KEY')) {
    privateKey = FALLBACK_PRIVATE_KEY;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || FALLBACK_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || FALLBACK_CLIENT_EMAIL;

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey
    })
  });
}

// Lazy singleton initialization to guarantee next build page data collection NEVER crashes
let _cachedDb: Firestore | null = null;
let _cachedAuth: Auth | null = null;

export function getDb(): Firestore {
  if (!_cachedDb) {
    const app = getAdminApp();
    _cachedDb = getFirestore(app);
  }
  return _cachedDb;
}

export function getAuthAdmin(): Auth {
  if (!_cachedAuth) {
    const app = getAdminApp();
    _cachedAuth = getAuth(app);
  }
  return _cachedAuth;
}

// Transparent Proxy exports: automatically resolves on first property access
export const adminDb = new Proxy({} as Firestore, {
  get(_, prop) {
    const target = getDb() as any;
    const value = target[prop];
    if (typeof value === 'function') {
      return value.bind(target);
    }
    return value;
  }
});

export const adminAuth = new Proxy({} as Auth, {
  get(_, prop) {
    const target = getAuthAdmin() as any;
    const value = target[prop];
    if (typeof value === 'function') {
      return value.bind(target);
    }
    return value;
  }
});
