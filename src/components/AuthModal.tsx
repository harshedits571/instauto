'use client';

import { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, ArrowRight, ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';
import { User } from '@/types';
import { signInWithGoogle } from '@/lib/firebase';
import { saveStoredUser } from '@/lib/storage';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onLoginSuccess: (user: User) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await signInWithGoogle();
      if (res.error || !res.user) {
        setErrorMsg(res.error || 'Failed to sign in with Google');
        setIsLoading(false);
        return;
      }

      const mappedUser: User = {
        id: res.user.uid,
        name: res.user.displayName || res.user.email?.split('@')[0] || 'Creator',
        email: res.user.email || '',
        role: 'creator',
        plan: 'pro',
        avatar: res.user.photoURL || undefined
      };

      saveStoredUser(mappedUser);
      onLoginSuccess(mappedUser);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Google sign-in error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRedirectSignIn = async () => {
    setIsLoading(true);
    const { signInWithGoogleRedirect } = await import('@/lib/firebase');
    await signInWithGoogleRedirect();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      id: `usr_${Date.now()}`,
      name: name || (email.split('@')[0] || 'Creator'),
      email: email || 'creator@workspace.io',
      role: 'creator',
      plan: 'pro',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    };

    saveStoredUser(newUser);
    onLoginSuccess(newUser);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{mode === 'login' ? 'Sign In to InstaAuto' : 'Create Free Creator Account'}</h3>
            <p className="card-subtitle">Connect your Instagram and automate Reel comments safely</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ gap: '16px' }}>
          {errorMsg && (
            <div style={{ padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '12px' }}>
              <div>{errorMsg}</div>
              {(errorMsg.toLowerCase().includes('pop-up') || errorMsg.includes('popup-blocked')) && (
                <div style={{ marginTop: '10px' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#7f1d1d' }}>
                    Your browser blocked the sign-in pop-up window. You can click below to sign in directly without pop-ups:
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleRedirectSignIn}
                    style={{ width: '100%', background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
                  >
                    <span>Sign In with Google (Direct Redirect)</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 1-Click Google Sign In Button */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              border: '1.5px solid #cbd5e1',
              background: '#ffffff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
            }}
          >
            {isLoading ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Or with Email</span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {mode === 'signup' && (
              <div className="form-group">
                <label className="form-label">Your Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Maya Chen"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="you@domain.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              <span>{mode === 'login' ? 'Sign In with Email' : 'Create Account'}</span>
              <ArrowRight size={16} />
            </button>

            <div style={{ textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
              {mode === 'login' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    style={{ color: '#4f46e5', fontWeight: 600 }}
                    onClick={() => setMode('signup')}
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    style={{ color: '#4f46e5', fontWeight: 600 }}
                    onClick={() => setMode('login')}
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#166534', background: '#f0fdf4', padding: '10px 12px', borderRadius: '8px' }}>
              <ShieldCheck size={16} />
              <span>100% Meta Graph API Compliant. Your Instagram password is never required.</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
