'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Lock, Instagram, ArrowRight, RefreshCw, ArrowLeft } from 'lucide-react';
import { User } from '@/types';
import { auth, getRedirectAuthResult, signInWithGoogleRedirect } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import { saveStoredUser } from '@/lib/storage';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get('redirect') || '/';

  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isPopupBlocked, setIsPopupBlocked] = useState(false);

  // Check for redirect auth result on mount
  useEffect(() => {
    getRedirectAuthResult().then((user) => {
      if (user) {
        const mappedUser: User = {
          id: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'Creator',
          email: user.email || '',
          role: 'creator',
          plan: 'pro',
          avatar: user.photoURL || undefined
        };
        saveStoredUser(mappedUser);
        window.location.href = redirectTo;
      }
    }).catch((err) => {
      console.debug('[Redirect Auth Error]:', err);
    });
  }, [redirectTo]);

  // Direct, reliable Firebase Google Sign-in
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg('');
    setIsPopupBlocked(false);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      if (user) {
        const mappedUser: User = {
          id: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'Creator',
          email: user.email || '',
          role: 'creator',
          plan: 'pro',
          avatar: user.photoURL || undefined
        };
        saveStoredUser(mappedUser);
        window.location.href = redirectTo;
      }
    } catch (err: any) {
      console.error('[Google Sign In Error]:', err);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        // User closed the popup, no error needed
      } else if (err.code === 'auth/popup-blocked') {
        setIsPopupBlocked(true);
        setErrorMsg('Pop-up was blocked by your browser. You can click below to sign in directly without a pop-up.');
      } else if (err.code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
        setErrorMsg(`Domain unauthorized: "${host}" is not added to Firebase Console > Authentication > Settings > Authorized domains.`);
      } else {
        setErrorMsg(err.message || 'Pop-up could not complete. You can sign in using your email below.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRedirectSignIn = () => {
    setIsLoading(true);
    signInWithGoogleRedirect().catch((err) => {
      setIsLoading(false);
      setErrorMsg(err.message || 'Redirect failed');
    });
  };

  // Direct fast Email/Creator login (100% reliable)
  const handleDirectEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    const creatorName = nameInput.trim() || cleanEmail.split('@')[0];
    
    const mappedUser: User = {
      id: `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
      name: creatorName,
      email: cleanEmail,
      role: 'creator',
      plan: 'pro',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(creatorName)}`
    };

    saveStoredUser(mappedUser);
    setTimeout(() => {
      window.location.href = redirectTo;
    }, 100);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      color: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '40px 20px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* Back to Home Link */}
      <div style={{ width: '100%', maxWidth: '420px', marginBottom: '20px' }}>
        <Link 
          href="/" 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: '#64748b',
            textDecoration: 'none',
            fontWeight: 500
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Main Card */}
      <div 
        suppressHydrationWarning
        style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '36px 32px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)'
      }}>
        {/* Brand Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            marginBottom: '14px',
            boxShadow: '0 4px 12px rgba(225, 48, 108, 0.25)'
          }}>
            <Instagram size={24} />
          </div>

          <h1 style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#0f172a',
            margin: '0 0 6px 0',
            letterSpacing: '-0.02em'
          }}>
            Sign in to InstaAuto
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#64748b',
            margin: 0,
            lineHeight: 1.5
          }}>
            Automate Instagram comments and DMs safely
          </p>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div style={{
            padding: '12px 14px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            color: '#b91c1c',
            fontSize: '13px',
            lineHeight: 1.4,
            marginBottom: '20px'
          }}>
            {errorMsg}
          </div>
        )}

        {/* Google Sign-in Button */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '20px'
        }}>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              backgroundColor: '#ffffff',
              color: '#1f2937',
              border: '1.5px solid #cbd5e1',
              borderRadius: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
          >
            {isLoading ? (
              <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            )}
            <span>{isLoading ? 'Signing in with Google...' : 'Continue with Google'}</span>
          </button>

          {isPopupBlocked && (
            <button
              type="button"
              onClick={handleRedirectSignIn}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Sign In in current tab (No pop-up required)
            </button>
          )}
        </div>

        {/* Clean Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          margin: '20px 0',
          color: '#94a3b8',
          fontSize: '12px',
          fontWeight: 500
        }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
          <span>or continue with email</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
        </div>

        {/* Email Entry Form */}
        <form onSubmit={handleDirectEmailLogin} suppressHydrationWarning style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div suppressHydrationWarning>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Email address
            </label>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="you@example.com"
              required
              suppressHydrationWarning
              style={{
                width: '100%',
                padding: '10px 14px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                color: '#0f172a',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div suppressHydrationWarning>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Your Name (Optional)
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Harsh Edits"
              suppressHydrationWarning
              style={{
                width: '100%',
                padding: '10px 14px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                color: '#0f172a',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: '#4f46e5',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginTop: '4px',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
            }}
          >
            {isLoading ? (
              <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <>
                <span>Continue to Dashboard</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Trust & Compliance info */}
        <div style={{
          marginTop: '24px',
          paddingTop: '18px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b' }}>
            <ShieldCheck size={14} color="#059669" />
            <span>Official Meta Graph API v21.0 &bull; 100% compliant</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b' }}>
            <Lock size={14} color="#059669" />
            <span>Your Instagram password is never required</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
        &copy; {new Date().getFullYear()} InstaAuto Platform &bull; All rights reserved.
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748b',
        fontFamily: "'Inter', sans-serif"
      }}>
        Loading...
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
