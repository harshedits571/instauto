import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signOut, 
  onAuthStateChanged as onFirebaseAuthStateChanged,
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Determine the correct authDomain:
// In production (Vercel), use our own domain so signInWithPopup works same-origin.
// The /__/auth rewrite in next.config.mjs & vercel.json proxies Firebase auth endpoints.
// Locally, use the default Firebase authDomain.
function getAuthDomain(): string {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    // On production, use the current hostname as authDomain
    return window.location.host;
  }
  return process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'instauto-93b71.firebaseapp.com';
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCm7cq10d8cD773PY9LoERWolKt2CpEobU",
  authDomain: getAuthDomain(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "instauto-93b71",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "instauto-93b71.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "167054234575",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:167054234575:web:ac1dab20bb5c5e1e5338ba",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-117ZPF3SYX"
};

// Initialize Firebase (singleton pattern)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Enforce LocalStorage persistence so auth session survives tab close and navigation
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.debug('[Firebase] Persistence setup:', err.message);
  });
}

/**
 * Simple, standard Google Sign-In via popup.
 * This is a synchronous call from the click handler — no async wrapping, no redirect fallback.
 * The popup will NOT be blocked because it's called directly in the user gesture event.
 */
export function signInWithGoogle(): Promise<{ user: FirebaseUser | null; error: string | null }> {
  return signInWithPopup(auth, googleProvider)
    .then((result) => {
      return { user: result.user, error: null };
    })
    .catch((error: any) => {
      console.error('[Firebase] Google Sign-in Error:', error.code, error.message);

      // User closed the popup or cancelled
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return { user: null, error: null }; // Not an error, user just cancelled
      }

      if (error.code === 'auth/popup-blocked') {
        return { 
          user: null, 
          error: 'Pop-up was blocked. Please allow pop-ups for this site in your browser settings.'
        };
      }

      return { user: null, error: error.message || 'Failed to sign in with Google' };
    });
}

export async function logOut() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    console.error('[Firebase] Sign-out Error:', error);
    return { success: false, error: error.message };
  }
}

export function subscribeToAuthChanges(callback: (user: FirebaseUser | null) => void) {
  return onFirebaseAuthStateChanged(auth, callback);
}
