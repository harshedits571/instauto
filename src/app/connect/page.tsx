'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Instagram, 
  ShieldCheck, 
  CheckCircle2, 
  Lock, 
  Trash2,
  Sparkles,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  Zap,
  Check
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import AutomationModal from '@/components/AutomationModal';
import AuthModal from '@/components/AuthModal';
import { 
  DEFAULT_USER,
  DEFAULT_INSTAGRAM_ACCOUNT, 
  getStoredUser, 
  getStoredAccount, 
  saveStoredAccount, 
  getStoredAutomations,
  saveStoredUser,
  saveStoredToken
} from '@/lib/storage';
import { subscribeToAuthChanges } from '@/lib/firebase';
import { InstagramAccount, User } from '@/types';

export default function ConnectInstagramPage() {
  const [user, setUser] = useState<User>(DEFAULT_USER);
  const [account, setAccount] = useState<InstagramAccount>(DEFAULT_INSTAGRAM_ACCOUNT);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const initialUser = getStoredUser();
    setUser(initialUser);
    setAccount(getStoredAccount());

    // 1. Listen for real-time Firebase Auth updates
    const unsubscribe = subscribeToAuthChanges(async (firebaseUser) => {
      if (firebaseUser) {
        const mappedUser: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Creator',
          email: firebaseUser.email || '',
          role: 'creator',
          plan: 'pro',
          avatar: firebaseUser.photoURL || undefined
        };
        setUser(mappedUser);
        saveStoredUser(mappedUser);

        // Fetch their connected Instagram account from Firestore
        try {
          const res = await fetch(`/api/user/account?userId=${encodeURIComponent(firebaseUser.uid)}`);
          const data = await res.json();
          if (data.connected && data.account) {
            setAccount(data.account);
            saveStoredAccount(data.account);
          }
        } catch (e) {
          console.debug('[ConnectPage] Error fetching account:', e);
        }
      }
    });

    // 2. Check for OAuth callback URL parameters
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const oauthSuccess = params.get('oauth_success');
      const accountJson = params.get('account');
      const token = params.get('token');
      const urlError = params.get('error');

      if (urlError) {
        setErrorMessage(decodeURIComponent(urlError));
      }

      if (oauthSuccess && accountJson && token) {
        try {
          const parsedAccount: InstagramAccount = JSON.parse(decodeURIComponent(accountJson));
          setAccount(parsedAccount);
          saveStoredAccount(parsedAccount);
          saveStoredToken(decodeURIComponent(token));
          setSuccessMessage(`🎉 Successfully connected @${parsedAccount.username}!`);
          window.history.replaceState({}, '', '/connect');
        } catch (err) {
          console.error('Failed to parse OAuth account payload', err);
        }
      }
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleLoginSuccess = async (newUser: User) => {
    setUser(newUser);
    saveStoredUser(newUser);
    setSuccessMessage(`🎉 Welcome, ${newUser.name}! Your workspace is active. Now connect your Instagram below.`);

    try {
      const res = await fetch(`/api/user/account?userId=${encodeURIComponent(newUser.id)}`);
      const data = await res.json();
      if (data.connected && data.account) {
        setAccount(data.account);
        saveStoredAccount(data.account);
      }
    } catch (e) {}
  };

  const handleDisconnect = () => {
    if (confirm('Disconnect your Instagram account from this workspace?')) {
      setAccount(DEFAULT_INSTAGRAM_ACCOUNT);
      saveStoredAccount(DEFAULT_INSTAGRAM_ACCOUNT);
      saveStoredToken('');
      setSuccessMessage('Account disconnected.');
      setErrorMessage('');
    }
  };

  const isLoggedIn = !!user.id && user.id !== 'usr_default';

  return (
    <div className="app-container">
      <Sidebar 
        account={account} 
        activeAutomationsCount={getStoredAutomations().filter(a => a.status === 'active').length} 
      />

      <div className="main-content">
        <Header 
          user={user} 
          account={account} 
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
        />

        <main className="content-wrapper" style={{ maxWidth: '880px', margin: '0 auto' }}>
          {/* Header Title Area */}
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 800 }}>Connect Your Instagram Account</h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
              Link your Instagram Creator or Business profile via official Meta Graph API to automate Reel comment-to-DM flows.
            </p>
          </div>

          {/* Feedback messages */}
          {errorMessage && (
            <div style={{ padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#991b1b', fontSize: '13px', marginBottom: '20px' }}>
              <strong>Connection Error:</strong> {errorMessage}
            </div>
          )}

          {successMessage && (
            <div style={{ padding: '14px 18px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', color: '#166534', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Main Account Card */}
          {account.isConnected ? (
            /* STATE 1: ALREADY CONNECTED */
            <div className="card" style={{ border: '2px solid #86efac', padding: '28px', background: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
              <div className="card-header" style={{ marginBottom: '24px' }}>
                <div>
                  <h3 className="card-title" style={{ fontSize: '18px', fontWeight: 800 }}>Instagram Account Connected</h3>
                  <p className="card-subtitle">Verified live via Meta Developer Graph API</p>
                </div>
                <span className="pill pill-success" style={{ padding: '6px 12px', fontSize: '12px' }}>
                  <CheckCircle2 size={13} />
                  Live &amp; Active
                </span>
              </div>

              {/* Profile Details */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', background: '#f0fdf4', borderRadius: '14px', border: '1px solid #bbf7d0', marginBottom: '24px' }}>
                {account.profilePicture ? (
                  <img
                    src={account.profilePicture}
                    alt={account.username}
                    style={{ width: '72px', height: '72px', borderRadius: '50%', border: '3px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534' }}>
                    <Instagram size={36} />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '20px', fontWeight: 800, color: '#14532d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    @{account.username}
                    <span style={{ fontSize: '12px', fontWeight: 600, background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '6px' }}>Verified</span>
                  </h4>
                  <p style={{ fontSize: '14px', color: '#166534', marginTop: '4px' }}>
                    {account.name} • <strong>{account.followersCount.toLocaleString()}</strong> followers
                  </p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <span className="pill pill-subtle" style={{ fontSize: '11px', background: 'white' }}>
                      Linked Facebook Page: {account.facebookPageName} (ID: {account.facebookPageId})
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                <Link href="/automations" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}>
                  <Zap size={16} />
                  <span>Manage Reel Automations</span>
                </Link>

                <button
                  className="btn btn-secondary btn-sm"
                  style={{ color: '#ef4444', borderColor: '#fecaca', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={handleDisconnect}
                >
                  <Trash2 size={14} />
                  <span>Disconnect Account</span>
                </button>
              </div>
            </div>
          ) : (
            /* STATE 2: NOT CONNECTED (Clean 2-Step Flow) */
            <div className="card" style={{ padding: '32px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
              
              {/* Step 1: Workspace Account */}
              <div style={{ 
                padding: '20px', 
                borderRadius: '12px', 
                background: isLoggedIn ? '#f0fdf4' : '#f8fafc', 
                border: `1.5px solid ${isLoggedIn ? '#bbf7d0' : '#e2e8f0'}`,
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '50%', 
                    background: isLoggedIn ? '#22c55e' : '#4f46e5', 
                    color: 'white', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '14px'
                  }}>
                    {isLoggedIn ? <Check size={18} strokeWidth={3} /> : '1'}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, color: isLoggedIn ? '#14532d' : '#0f172a' }}>
                      {isLoggedIn ? 'Step 1: Workspace Account Active' : 'Step 1: Sign In to Your Workspace'}
                    </h4>
                    <p style={{ fontSize: '13px', color: isLoggedIn ? '#15803d' : '#64748b', marginTop: '2px' }}>
                      {isLoggedIn 
                        ? `Logged in as ${user.name} (${user.email || 'Google Account'})` 
                        : 'Sign in with Google to create your private, isolated creator dashboard.'}
                    </p>
                  </div>
                </div>

                {!isLoggedIn && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setIsAuthModalOpen(true)}
                    style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', padding: '8px 18px', fontWeight: 700 }}
                  >
                    <span>Sign In with Google</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>

              {/* Step 2: Connect Instagram Account via Meta OAuth */}
              <div style={{ 
                padding: '28px 24px', 
                borderRadius: '12px', 
                background: isLoggedIn ? '#ffffff' : '#f8fafc', 
                border: `1.5px solid ${isLoggedIn ? '#e2e8f0' : '#e2e8f0'}`,
                textAlign: 'center',
                opacity: isLoggedIn ? 1 : 0.7
              }}>
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '18px', 
                  background: 'var(--ig-gradient)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 16px', 
                  color: 'white',
                  boxShadow: '0 8px 20px rgba(225, 48, 108, 0.25)'
                }}>
                  <Instagram size={32} />
                </div>

                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                  Step 2: Link Your Instagram Profile
                </h3>
                <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '440px', margin: '0 auto 24px', lineHeight: 1.5 }}>
                  Authorize your Instagram Creator or Business account in 1 click. Zero passwords required. Safe from automated bot bans.
                </p>

                {isLoggedIn ? (
                  <a
                    href={`/api/auth/instagram?userId=${encodeURIComponent(user.id)}`}
                    className="btn btn-primary"
                    style={{ 
                      width: '100%', 
                      maxWidth: '380px', 
                      margin: '0 auto', 
                      background: 'var(--ig-gradient)', 
                      borderColor: 'transparent', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '10px', 
                      padding: '14px 28px', 
                      fontSize: '16px', 
                      fontWeight: 700, 
                      borderRadius: '12px', 
                      textDecoration: 'none',
                      boxShadow: '0 6px 20px rgba(225, 48, 108, 0.3)',
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    <Instagram size={20} />
                    <span>1-Click Connect with Instagram</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled
                    style={{ width: '100%', maxWidth: '380px', margin: '0 auto', padding: '14px 28px', fontSize: '14px', opacity: 0.6 }}
                  >
                    <Lock size={16} />
                    <span>Please complete Step 1 first</span>
                  </button>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '18px', fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>
                  <ShieldCheck size={16} />
                  <span>Official Meta Graph API OAuth 2.0 Partner Flow</span>
                </div>
              </div>

            </div>
          )}

          {/* Official Meta Safe Architecture Guarantee */}
          <div className="card" style={{ marginTop: '24px', border: '1.5px solid #bbf7d0', background: '#fcfdfd', padding: '24px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d' }}>
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#14532d' }}>
                  Official Meta Graph API Architecture
                </h3>
                <p style={{ fontSize: '12px', color: '#166534', marginTop: '1px' }}>
                  Designed specifically to comply with Instagram Community Guidelines &amp; Platform Policies.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '12px' }}>
              <div style={{ background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block', marginBottom: '4px' }}>🔒 No Password Stored</strong>
                <span style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                  Authentication is handled entirely on Facebook/Meta&apos;s official login servers. We never see your password.
                </span>
              </div>

              <div style={{ background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block', marginBottom: '4px' }}>🛡️ Zero Ban Risk</strong>
                <span style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                  Uses Meta&apos;s verified Private Replies endpoint (`/{'{comment-id}'}/replies`), never bot emulators or scraping.
                </span>
              </div>

              <div style={{ background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block', marginBottom: '4px' }}>⚡ 100% Automated</strong>
                <span style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                  Real-time webhook triggers instantly send follower verification &amp; DM links to your commenters 24/7.
                </span>
              </div>
            </div>
          </div>

        </main>
      </div>

      <AutomationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={() => {}}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={user}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
