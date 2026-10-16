'use client';

import { useState } from 'react';
import { X, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleGoogleSignIn = () => {
    setErrorMsg('');
    setIsLoading(true);

    // Call signInWithPopup directly — this is synchronous from the click handler
    // so the browser won't block the popup
    signInWithGoogle()
      .then((res) => {
        setIsLoading(false);

        // User cancelled (closed popup) — not an error, just do nothing
        if (!res.error && !res.user) return;

        if (res.error) {
          setErrorMsg(res.error);
          return;
        }

        if (res.user) {
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
        }
      })
      .catch(() => {
        setIsLoading(false);
        setErrorMsg('Something went wrong. Please try again.');
      });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Sign In to InstaAuto</h3>
            <p className="card-subtitle">Connect your Instagram and automate Reel comments safely</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ gap: '20px' }}>
          {errorMsg && (
            <div style={{ 
              padding: '14px 16px', 
              background: '#fef2f2', 
              border: '1px solid #fecaca', 
              borderRadius: '10px', 
              color: '#991b1b', 
              fontSize: '13px', 
              lineHeight: 1.5 
            }}>
              <div style={{ fontWeight: 600 }}>{errorMsg}</div>
            </div>
          )}

          {/* Google Sign In — the only auth method */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '15px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              border: '1.5px solid #e2e8f0',
              background: '#ffffff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              borderRadius: '12px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {isLoading ? (
              <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            )}
            <span>{isLoading ? 'Signing in...' : 'Continue with Google'}</span>
          </button>

          {/* Benefits / Trust signals */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#4b5563' }}>
              <ShieldCheck size={14} color="#059669" />
              <span>100% Meta Graph API Compliant — zero risk to your account</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#4b5563' }}>
              <ShieldCheck size={14} color="#059669" />
              <span>Your Instagram password is never required or stored</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#4b5563' }}>
              <ShieldCheck size={14} color="#059669" />
              <span>Private workspace — only you can see your data</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
