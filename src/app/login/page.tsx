'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Lock, 
  Instagram, 
  ArrowRight, 
  RefreshCw, 
  ArrowLeft, 
  Mail, 
  KeyRound, 
  User as UserIcon, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  Send,
  HelpCircle
} from 'lucide-react';
import { User } from '@/types';
import { auth, registerWithEmail, loginWithEmail, resendVerificationEmail, sendPasswordReset } from '@/lib/firebase';
import { saveStoredUser } from '@/lib/storage';

type AuthView = 'login' | 'signup' | 'verify' | 'forgot_password';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get('redirect') || '/';

  // Mode state
  const [view, setView] = useState<AuthView>('login');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Check for verified redirect param
  useEffect(() => {
    if (searchParams?.get('verified') === 'true') {
      setSuccessMsg('Email verified successfully! You can now sign in with your password.');
    }
  }, [searchParams]);

  // Cooldown timer for resend email
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Clear messages when switching views
  const switchView = (newView: AuthView) => {
    setView(newView);
    setErrorMsg('');
    setSuccessMsg('');
  };

  // Helper: Save user & redirect
  const completeLogin = (firebaseUser: any, creatorName?: string) => {
    const displayName = creatorName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Creator';
    const mappedUser: User = {
      id: firebaseUser.uid,
      name: displayName,
      email: firebaseUser.email || '',
      role: 'creator',
      plan: 'pro',
      avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`
    };

    saveStoredUser(mappedUser);
    window.location.href = redirectTo;
  };

  // 1. Handle Sign Up (Register + Send Verification Email)
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    const result = await registerWithEmail(cleanEmail, password, name.trim() || cleanEmail.split('@')[0]);
    setIsLoading(false);

    if (result.error) {
      setErrorMsg(result.error);
      return;
    }

    if (result.user) {
      setUnverifiedEmail(cleanEmail);
      setView('verify');
      setResendCooldown(60);
      setSuccessMsg('Account created! A verification link has been sent to your email.');
    }
  };

  // 2. Handle Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Please enter your email.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsLoading(true);
    const result = await loginWithEmail(cleanEmail, password);
    setIsLoading(false);

    if (result.error) {
      setErrorMsg(result.error);
      return;
    }

    if (result.user) {
      // Check if email is verified
      if (!result.user.emailVerified) {
        setUnverifiedEmail(cleanEmail);
        setView('verify');
        setErrorMsg('Your email is not verified yet. Please check your inbox or resend the verification link.');
        return;
      }

      // Success: verified user logged in
      completeLogin(result.user, result.user.displayName || name);
    }
  };

  // 3. Check Verification Status (When user clicks "I have verified")
  const checkVerificationStatus = async () => {
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          setSuccessMsg('Email verified successfully! Redirecting...');
          setTimeout(() => {
            completeLogin(auth.currentUser, name);
          }, 800);
          return;
        }
      }
      setErrorMsg('Your email is not verified yet. Please click the link sent to your email, then click this button again.');
    } catch (err: any) {
      setErrorMsg('Could not check verification status. Please sign in again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Resend Verification Link
  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    setErrorMsg('');

    const res = await resendVerificationEmail(auth.currentUser);
    setIsLoading(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg(`A new verification link has been sent to ${unverifiedEmail || email}!`);
      setResendCooldown(60);
    }
  };

  // 5. Handle Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter your account email address.');
      return;
    }

    setIsLoading(true);
    const res = await sendPasswordReset(cleanEmail);
    setIsLoading(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg(`Password reset link sent to ${cleanEmail}. Please check your inbox and spam folder.`);
    }
  };

  return (
    <div 
      suppressHydrationWarning
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        color: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px 20px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >
      {/* Back to Home Link */}
      <div style={{ width: '100%', maxWidth: '440px', marginBottom: '20px' }}>
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
          maxWidth: '440px',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '36px 32px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)'
        }}
      >
        {/* Brand Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            marginBottom: '12px',
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
            {view === 'login' && 'Sign in to InstaAuto'}
            {view === 'signup' && 'Create your Account'}
            {view === 'verify' && 'Verify Your Email'}
            {view === 'forgot_password' && 'Reset Password'}
          </h1>
          <p style={{
            fontSize: '13px',
            color: '#64748b',
            margin: 0,
            lineHeight: 1.5
          }}>
            {view === 'login' && 'Automate Instagram comments and DMs safely'}
            {view === 'signup' && 'Join thousands of creators automating replies'}
            {view === 'verify' && 'Check your inbox to complete verification'}
            {view === 'forgot_password' && "We'll send you a link to reset your password"}
          </p>
        </div>

        {/* Tab Switcher (Only visible for Login / Sign Up views) */}
        {(view === 'login' || view === 'signup') && (
          <div style={{
            display: 'flex',
            backgroundColor: '#f1f5f9',
            padding: '4px',
            borderRadius: '10px',
            marginBottom: '22px'
          }}>
            <button
              type="button"
              onClick={() => switchView('login')}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: view === 'login' ? '#ffffff' : 'transparent',
                color: view === 'login' ? '#0f172a' : '#64748b',
                boxShadow: view === 'login' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchView('signup')}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: view === 'signup' ? '#ffffff' : 'transparent',
                color: view === 'signup' ? '#0f172a' : '#64748b',
                boxShadow: view === 'signup' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Success Alert Banner */}
        {successMsg && (
          <div style={{
            padding: '12px 14px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '10px',
            color: '#15803d',
            fontSize: '13px',
            lineHeight: 1.4,
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert Banner */}
        {errorMsg && (
          <div style={{
            padding: '12px 14px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            color: '#b91c1c',
            fontSize: '13px',
            lineHeight: 1.4,
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <AlertCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ----------------- VIEW 1: SIGN IN ----------------- */}
        {view === 'login' && (
          <form onSubmit={handleSignIn} suppressHydrationWarning style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div suppressHydrationWarning>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Email address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="creator@example.com"
                  required
                  suppressHydrationWarning
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    color: '#0f172a',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div suppressHydrationWarning>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => switchView('forgot_password')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: '12px',
                    color: '#4f46e5',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <KeyRound size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  suppressHydrationWarning
                  style={{
                    width: '100%',
                    padding: '10px 38px 10px 38px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    color: '#0f172a',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '12px',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
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
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                transition: 'background-color 0.15s ease'
              }}
            >
              {isLoading ? (
                <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '6px' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Don't have an account? </span>
              <button
                type="button"
                onClick={() => switchView('signup')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4f46e5',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Sign Up
              </button>
            </div>
          </form>
        )}

        {/* ----------------- VIEW 2: SIGN UP ----------------- */}
        {view === 'signup' && (
          <form onSubmit={handleSignUp} suppressHydrationWarning style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div suppressHydrationWarning>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Your Name / Brand
              </label>
              <div style={{ position: 'relative' }}>
                <UserIcon size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Harsh Edits"
                  required
                  suppressHydrationWarning
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    color: '#0f172a',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div suppressHydrationWarning>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Email address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="creator@example.com"
                  required
                  suppressHydrationWarning
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    color: '#0f172a',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div suppressHydrationWarning>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Password (min 6 characters)
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  required
                  minLength={6}
                  suppressHydrationWarning
                  style={{
                    width: '100%',
                    padding: '10px 38px 10px 38px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    color: '#0f172a',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '12px',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div suppressHydrationWarning>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  minLength={6}
                  suppressHydrationWarning
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    color: '#0f172a',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
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
                  <span>Create Account & Send Verification</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '6px' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Already have an account? </span>
              <button
                type="button"
                onClick={() => switchView('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4f46e5',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* ----------------- VIEW 3: VERIFY EMAIL PENDING ----------------- */}
        {view === 'verify' && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#eef2ff',
              color: '#4f46e5',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <Send size={28} />
            </div>

            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
              Verify Your Email Address
            </h3>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, margin: '0 0 20px 0' }}>
              We sent an official verification link to:<br />
              <strong style={{ color: '#0f172a' }}>{unverifiedEmail || email}</strong>
            </p>

            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '12px 14px',
              fontSize: '12px',
              color: '#64748b',
              textAlign: 'left',
              lineHeight: 1.5,
              marginBottom: '20px'
            }}>
              <p style={{ margin: '0 0 6px 0', fontWeight: 600, color: '#334155' }}>
                Quick instructions:
              </p>
              <ol style={{ margin: 0, paddingLeft: '18px' }}>
                <li>Open your email inbox (and check the Spam/Promotions folder if needed).</li>
                <li>Click the verification link from Firebase/InstaAuto.</li>
                <li>Return here and tap <strong>"I Have Verified My Email"</strong> below.</li>
              </ol>
            </div>

            <button
              type="button"
              onClick={checkVerificationStatus}
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
                marginBottom: '10px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}
            >
              {isLoading ? (
                <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>I Have Verified My Email</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResendVerification}
              disabled={isLoading || resendCooldown > 0}
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                color: resendCooldown > 0 ? '#94a3b8' : '#334155',
                fontSize: '13px',
                fontWeight: 600,
                cursor: (isLoading || resendCooldown > 0) ? 'not-allowed' : 'pointer',
                marginBottom: '16px'
              }}
            >
              {resendCooldown > 0 ? `Resend link in ${resendCooldown}s` : 'Resend Verification Link'}
            </button>

            <div>
              <button
                type="button"
                onClick={() => switchView('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ← Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* ----------------- VIEW 4: FORGOT PASSWORD ----------------- */}
        {view === 'forgot_password' && (
          <form onSubmit={handleForgotPassword} suppressHydrationWarning style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div suppressHydrationWarning>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Account Email address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="creator@example.com"
                  required
                  suppressHydrationWarning
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    color: '#0f172a',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
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
                marginTop: '4px'
              }}
            >
              {isLoading ? (
                <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <>
                  <Send size={16} />
                  <span>Send Password Reset Link</span>
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => switchView('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4f46e5',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                ← Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* Trust & Compliance info */}
        <div style={{
          marginTop: '26px',
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
