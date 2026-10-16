'use client';

import { useState } from 'react';
import { 
  X, 
  ArrowRight, 
  ShieldCheck, 
  RefreshCw, 
  Mail, 
  KeyRound, 
  User as UserIcon, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  Send
} from 'lucide-react';
import { User } from '@/types';
import { auth, registerWithEmail, loginWithEmail, resendVerificationEmail, sendPasswordReset } from '@/lib/firebase';
import { saveStoredUser } from '@/lib/storage';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onLoginSuccess: (user: User) => void;
}

type ModalView = 'login' | 'signup' | 'verify' | 'forgot_password';

export default function AuthModal({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess
}: AuthModalProps) {
  const [view, setView] = useState<ModalView>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');

  if (!isOpen) return null;

  const switchView = (newView: ModalView) => {
    setView(newView);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleCompleteSuccess = (firebaseUser: any, creatorName?: string) => {
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
    onLoginSuccess(mappedUser);
    onClose();
  };

  // Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMsg('Please enter both email and password.');
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
      if (!result.user.emailVerified) {
        setUnverifiedEmail(cleanEmail);
        setView('verify');
        setErrorMsg('Please verify your email address to continue.');
        return;
      }
      handleCompleteSuccess(result.user, result.user.displayName || name);
    }
  };

  // Sign Up
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
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
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
      setSuccessMsg('Account created! A verification link has been sent to your email.');
    }
  };

  // Check verification status
  const checkVerification = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          handleCompleteSuccess(auth.currentUser, name);
          return;
        }
      }
      setErrorMsg('Email not verified yet. Please check your inbox and click the link.');
    } catch (e: any) {
      setErrorMsg('Unable to refresh verification status. Please sign in again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend verification
  const handleResend = async () => {
    setIsLoading(true);
    setErrorMsg('');
    const res = await resendVerificationEmail(auth.currentUser);
    setIsLoading(false);
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg(`Verification email resent to ${unverifiedEmail || email}!`);
    }
  };

  // Forgot password
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    const res = await sendPasswordReset(cleanEmail);
    setIsLoading(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg(`Password reset link sent to ${cleanEmail}. Check your inbox.`);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-dialog" 
        style={{ maxWidth: '440px' }} 
        onClick={e => e.stopPropagation()}
        suppressHydrationWarning
      >
        <div className="modal-header">
          <div>
            <h3>
              {view === 'login' && 'Sign In to InstaAuto'}
              {view === 'signup' && 'Create InstaAuto Account'}
              {view === 'verify' && 'Verify Your Email'}
              {view === 'forgot_password' && 'Reset Password'}
            </h3>
            <p className="card-subtitle">
              {view === 'login' && 'Connect your Instagram and automate DMs safely'}
              {view === 'signup' && 'Join creators growing with automated comments'}
              {view === 'verify' && 'Click the link in your email to verify'}
              {view === 'forgot_password' && "We'll send a password reset link to your email"}
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ gap: '16px' }} suppressHydrationWarning>
          {/* Tab switcher */}
          {(view === 'login' || view === 'signup') && (
            <div style={{
              display: 'flex',
              backgroundColor: '#f1f5f9',
              padding: '4px',
              borderRadius: '8px',
              marginBottom: '4px'
            }}>
              <button
                type="button"
                onClick={() => switchView('login')}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: view === 'login' ? '#ffffff' : 'transparent',
                  color: view === 'login' ? '#0f172a' : '#64748b',
                  boxShadow: view === 'login' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchView('signup')}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: view === 'signup' ? '#ffffff' : 'transparent',
                  color: view === 'signup' ? '#0f172a' : '#64748b',
                  boxShadow: view === 'signup' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div style={{
              padding: '10px 12px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              color: '#15803d',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div style={{
              padding: '10px 12px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#991b1b',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* View 1: Sign In */}
          {view === 'login' && (
            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                  Email address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: '10px', top: '11px', color: '#94a3b8' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="creator@example.com"
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 34px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => switchView('forgot_password')}
                    style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: '11px', fontWeight: 500, cursor: 'pointer' }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={15} style={{ position: 'absolute', left: '10px', top: '11px', color: '#94a3b8' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    style={{
                      width: '100%',
                      padding: '8px 34px 8px 34px',
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

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '11px',
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  marginTop: '4px'
                }}
              >
                {isLoading ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <span>Sign In to Dashboard</span>}
              </button>
            </form>
          )}

          {/* View 2: Sign Up */}
          {view === 'signup' && (
            <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Your Name / Creator Name
                </label>
                <div style={{ position: 'relative' }}>
                  <UserIcon size={15} style={{ position: 'absolute', left: '10px', top: '11px', color: '#94a3b8' }} />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Harsh Edits"
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 34px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Email address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: '10px', top: '11px', color: '#94a3b8' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="creator@example.com"
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 34px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Password (min 6 chars)
                </label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={15} style={{ position: 'absolute', left: '10px', top: '11px', color: '#94a3b8' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    minLength={6}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 34px 8px 34px',
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
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Confirm Password
                </label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={15} style={{ position: 'absolute', left: '10px', top: '11px', color: '#94a3b8' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    minLength={6}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 34px',
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
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '11px',
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  marginTop: '4px'
                }}
              >
                {isLoading ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <span>Create Account & Verify</span>}
              </button>
            </form>
          )}

          {/* View 3: Verify Email */}
          {view === 'verify' && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#eef2ff',
                color: '#4f46e5',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px'
              }}>
                <Send size={22} />
              </div>
              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                We sent a verification link to:<br />
                <strong style={{ color: '#0f172a' }}>{unverifiedEmail || email}</strong>
              </p>

              <button
                type="button"
                onClick={checkVerification}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '11px',
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  marginBottom: '8px'
                }}
              >
                {isLoading ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <span>I Have Verified (Continue)</span>}
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '9px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  marginBottom: '12px'
                }}
              >
                Resend Verification Email
              </button>

              <button
                type="button"
                onClick={() => switchView('login')}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '12px', cursor: 'pointer' }}
              >
                ← Back to Sign In
              </button>
            </div>
          )}

          {/* View 4: Forgot Password */}
          {view === 'forgot_password' && (
            <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                  Account Email address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: '10px', top: '11px', color: '#94a3b8' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="creator@example.com"
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 34px',
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
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '11px',
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: isLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {isLoading ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <span>Send Password Reset Link</span>}
              </button>

              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => switchView('login')}
                  style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: '12px', cursor: 'pointer' }}
                >
                  ← Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* Compliance notice */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b' }}>
              <ShieldCheck size={13} color="#059669" />
              <span>Official Meta Graph API v21.0 &bull; 100% compliant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
