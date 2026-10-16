import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  onAuthStateChanged as onFirebaseAuthStateChanged,
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile
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

// Enforce LocalStorage persistence so auth session survives tab close and navigation
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.debug('[Firebase] Persistence setup:', err.message);
  });
}

const getActionCodeSettings = () => {
  const origin = typeof window !== 'undefined' && window.location.origin 
    ? window.location.origin 
    : (process.env.NEXT_PUBLIC_APP_URL || 'https://instauto-nine.vercel.app');
  return {
    url: `${origin}/login?verified=true`,
    handleCodeInApp: false
  };
};

/**
 * Register a new user with Email and Password, set their name, and send an email verification link.
 */
export async function registerWithEmail(
  email: string, 
  pass: string, 
  displayName: string
): Promise<{ user: FirebaseUser | null; error: string | null }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    if (displayName.trim() && cred.user) {
      await updateProfile(cred.user, { displayName: displayName.trim() });
    }

    // Dispatch branded custom email via Resend
    let customEmailSent = false;
    try {
      const res = await fetch('/api/auth/send-custom-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          type: 'verification',
          displayName: displayName.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        customEmailSent = true;
      } else {
        console.warn('[Custom Email API warning]:', data.error);
      }
    } catch (e: any) {
      console.warn('[Custom Email API Network]:', e.message);
    }

    // Seamless fallback to standard Firebase mail if custom API was not reached
    if (!customEmailSent && cred.user) {
      try {
        await sendEmailVerification(cred.user, getActionCodeSettings());
      } catch (emailErr: any) {
        console.warn('[Firebase] Verification email send warning:', emailErr.message);
      }
    }

    return { user: cred.user, error: null };
  } catch (error: any) {
    console.debug('[Firebase] Registration Note:', error.code || error.message);
    return { user: null, error: formatAuthError(error) };
  }
}

/**
 * Sign in with Email and Password.
 */
export async function loginWithEmail(
  email: string, 
  pass: string
): Promise<{ user: FirebaseUser | null; error: string | null }> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), pass);
    return { user: cred.user, error: null };
  } catch (error: any) {
    console.error('[Firebase] Login Error:', error);
    return { user: null, error: formatAuthError(error) };
  }
}

/**
 * Resend verification email link to the user.
 */
export async function resendVerificationEmail(user?: FirebaseUser | null): Promise<{ success: boolean; error: string | null }> {
  try {
    const targetUser = user || auth.currentUser;
    if (!targetUser?.email) {
      return { success: false, error: 'No active user session found to verify.' };
    }

    // Try custom Resend email first
    try {
      const res = await fetch('/api/auth/send-custom-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetUser.email,
          type: 'verification',
          displayName: targetUser.displayName
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, error: null };
      }
    } catch (e) {}

    // Fallback
    await sendEmailVerification(targetUser, getActionCodeSettings());
    return { success: true, error: null };
  } catch (error: any) {
    console.error('[Firebase] Resend verification error:', error);
    return { success: false, error: formatAuthError(error) };
  }
}

/**
 * Send password reset email link.
 */
export async function sendPasswordReset(email: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const cleanEmail = email.trim().toLowerCase();

    // Try custom Resend email first
    try {
      const res = await fetch('/api/auth/send-custom-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          type: 'password_reset'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, error: null };
      }
    } catch (e) {}

    // Fallback
    await sendPasswordResetEmail(auth, cleanEmail);
    return { success: true, error: null };
  } catch (error: any) {
    console.error('[Firebase] Password Reset Error:', error);
    return { success: false, error: formatAuthError(error) };
  }
}

/**
 * Convert Firebase error codes to user-friendly messages.
 */
export function formatAuthError(error: any): string {
  const code = error?.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please try again or reset your password.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a moment or reset your password.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not enabled in Firebase Console. Go to Firebase Console > Authentication > Sign-in method > Enable Email/Password.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection.';
    default:
      return error?.message || 'An unexpected authentication error occurred. Please try again.';
  }
}

/**
 * Standard Google Sign-In via popup (preserved if needed).
 */
export function signInWithGoogle(): Promise<{ user: FirebaseUser | null; error: string | null; isPopupBlocked?: boolean }> {
  return signInWithPopup(auth, googleProvider)
    .then((result) => {
      return { user: result.user, error: null };
    })
    .catch((error: any) => {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return { user: null, error: null };
      }
      if (error.code === 'auth/popup-blocked') {
        return { 
          user: null, 
          error: 'Pop-up was blocked by your browser.',
          isPopupBlocked: true
        };
      }
      return { user: null, error: formatAuthError(error) };
    });
}

export function signInWithGoogleRedirect(): Promise<void> {
  return signInWithRedirect(auth, googleProvider);
}

export async function getRedirectAuthResult(): Promise<FirebaseUser | null> {
  try {
    const result = await getRedirectResult(auth);
    return result?.user || null;
  } catch (err: any) {
    return null;
  }
}

export async function logOut() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export function subscribeToAuthChanges(callback: (user: FirebaseUser | null) => void) {
  return onFirebaseAuthStateChanged(auth, callback);
}
