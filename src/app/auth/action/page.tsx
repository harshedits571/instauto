'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Instagram, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ShieldCheck,
  Lock
} from 'lucide-react';
import { 
  applyActionCode, 
  verifyPasswordResetCode, 
  confirmPasswordReset 
} from 'firebase/auth';
import { auth, formatAuthError } from '@/lib/firebase';
import { saveStoredUser } from '@/lib/storage';
import { User } from '@/types';

function AuthActionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode = searchParams?.get('mode') || '';
  const oobCode = searchParams?.get('oobCode') || '';

  // States
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'ready'>('loading');
  const [message, setMessage] = useState('');
  const [accountEmail, setAccountEmail] = useState('');

  // Password reset fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!oobCode || !mode) {
      setStatus('error');
      setMessage('Invalid or expired action link. Please request a new verification or password reset email.');
      return;
    }

    if (mode === 'verifyEmail') {
      // 1. Automatically verify email address
      setStatus('loading');
      applyActionCode(auth, oobCode)
        .then(() => {
          setStatus('success');
          setMessage('Your email has been successfully verified! You can now access your InstaAuto dashboard.');
          
          // If already signed in, update local stored user
          if (auth.currentUser) {
            const mappedUser: User = {
              id: auth.currentUser.uid,
              name: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Creator',
              email: auth.currentUser.email || '',
              role: 'creator',
              plan: 'pro'
            };
            saveStoredUser(mappedUser);
          }
        })
        .catch((err: any) => {
          setStatus('error');
          if (err.code === 'auth/invalid-action-code') {
            setMessage('This verification link has already been used or has expired. Please sign in or request a new link.');
          } else {
            setMessage(formatAuthError(err));
          }
        });
    } else if (mode === 'resetPassword') {
      // 2. Verify password reset code and retrieve email
      setStatus('loading');
      verifyPasswordResetCode(auth, oobCode)
        .then((email) => {
          setAccountEmail(email);
          setStatus('ready');
        })
        .catch((err: any) => {
          setStatus('error');
          if (err.code === 'auth/invalid-action-code') {
            setMessage('This password reset link has already been used or has expired. Please request a new one.');
          } else {
            setMessage(formatAuthError(err));
          }
        });
    } else {
      setStatus('error');
      setMessage('Unsupported action request.');
    }
  }, [mode, oobCode]);

  // Handle password reset submission
  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setStatus('success');
      setMessage('Your password has been reset successfully! You can now sign in with your new password.');
    } catch (err: any) {
      setMessage(formatAuthError(err));
    } finally {
      setIsSubmitting(false);
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
      <div 
        suppressHydrationWarning
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '40px 32px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
          textAlign: 'center'
        }}
      >
        {/* Brand Header */}
        <div style={{
          width: '50px',
          height: '50px',
          borderRadius: '14px',
          background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          marginBottom: '16px',
          boxShadow: '0 4px 12px rgba(225, 48, 108, 0.25)'
        }}>
          <Instagram size={26} />
        </div>

        {/* LOADING STATE */}
        {status === 'loading' && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 10px 0', color: '#0f172a' }}>
              {mode === 'verifyEmail' ? 'Verifying Your Email...' : 'Validating Request...'}
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 24px 0', lineHeight: 1.5 }}>
              Please wait while we verify your security credentials.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
              <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: '#4f46e5' }} />
            </div>
          </div>
        )}

        {/* SUCCESS STATE */}
        {status === 'success' && (
          <div>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#f0fdf4',
              color: '#16a34a',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <CheckCircle2 size={32} />
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px 0', color: '#0f172a' }}>
              {mode === 'verifyEmail' ? 'Email Verified Successfully!' : 'Password Reset Complete!'}
            </h2>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, margin: '0 0 24px 0' }}>
              {message}
            </p>

            <Link
              href="/login"
              style={{
                width: '100%',
                padding: '12px 18px',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxSizing: 'border-box',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}
            >
              <span>Continue to Sign In</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {/* ERROR STATE */}
        {status === 'error' && (
          <div>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <AlertCircle size={32} />
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px 0', color: '#0f172a' }}>
              Action Link Issue
            </h2>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, margin: '0 0 24px 0' }}>
              {message}
            </p>

            <Link
              href="/login"
              style={{
                width: '100%',
                padding: '12px 18px',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxSizing: 'border-box'
              }}
            >
              <span>Return to Login</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {/* PASSWORD RESET FORM */}
        {status === 'ready' && mode === 'resetPassword' && (
          <div style={{ textAlign: 'left' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0', color: '#0f172a', textAlign: 'center' }}>
              Set New Password
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0', textAlign: 'center' }}>
              Create a new secure password for <strong>{accountEmail}</strong>
            </p>

            {message && (
              <div style={{
                padding: '10px 12px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#b91c1c',
                fontSize: '12px',
                marginBottom: '14px'
              }}>
                {message}
              </div>
            )}

            <form onSubmit={handlePasswordResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                  New Password (min 6 characters)
                </label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={15} style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    minLength={6}
                    required
                    style={{
                      width: '100%',
                      padding: '9px 34px 9px 34px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                  Confirm New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={15} style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    minLength={6}
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 34px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  marginTop: '6px'
                }}
              >
                {isSubmitting ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <span>Update Password</span>}
              </button>
            </form>
          </div>
        )}

        {/* Footer trust badge */}
        <div style={{
          marginTop: '28px',
          paddingTop: '16px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          color: '#64748b'
        }}>
          <ShieldCheck size={14} color="#059669" />
          <span>Official Meta Graph API v21.0 &bull; 100% compliant</span>
        </div>
      </div>
    </div>
  );
}

export default function AuthActionPage() {
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
      <AuthActionContent />
    </Suspense>
  );
}
