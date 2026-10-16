import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged as onFirebaseAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCm7cq10d8cD773PY9LoERWolKt2CpEobU",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "instauto-93b71.firebaseapp.com",
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

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { user: result.user, error: null };
  } catch (error: any) {
    console.error('[Firebase Client] Google Sign-in Error:', error);
    return { user: null, error: error.message || 'Failed to sign in with Google' };
  }
}

export async function logOut() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    console.error('[Firebase Client] Sign-out Error:', error);
    return { success: false, error: error.message };
  }
}

export function subscribeToAuthChanges(callback: (user: FirebaseUser | null) => void) {
  return onFirebaseAuthStateChanged(auth, callback);
}
