'use client';

import { useState, useEffect } from 'react';
import { 
  Instagram, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Key, 
  ExternalLink, 
  Copy, 
  Check, 
  Sparkles, 
  RefreshCw,
  Send,
  Trash2,
  HelpCircle
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import AutomationModal from '@/components/AutomationModal';
import AuthModal from '@/components/AuthModal';
import { 
  DEFAULT_INSTAGRAM_ACCOUNT, 
  getStoredUser, 
  getStoredAccount, 
  saveStoredAccount, 
  getStoredAutomations,
  getStoredToken,
  saveStoredToken
} from '@/lib/storage';
import { InstagramAccount, User } from '@/types';

export default function ConnectInstagramPage() {
  const [user, setUser] = useState<User>(getStoredUser());
  const [account, setAccount] = useState<InstagramAccount>(DEFAULT_INSTAGRAM_ACCOUNT);
  const [tokenInput, setTokenInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Live test DM state
  const [testRecipientId, setTestRecipientId] = useState('');
  const [testMessage, setTestMessage] = useState('Hey! This is a real test DM from your InstaAuto server 🚀');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    const storedAcc = getStoredAccount();
    setAccount(storedAcc);
    const storedTok = getStoredToken();
    if (storedTok) setTokenInput(storedTok);

    // Check for OAuth callback URL params
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
          setTokenInput(decodeURIComponent(token));
          setSuccessMessage(`🎉 1-Click Login Successful! Connected to @${parsedAccount.username}`);
          // Clean URL without refresh
          window.history.replaceState({}, '', '/connect');
        } catch (err) {
          console.error('Failed to parse OAuth account payload', err);
        }
      }
    }
  }, []);

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Connect real token with Meta API
  const handleConnectToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setErrorMessage('Please enter a valid Meta Access Token.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/instagram/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: tokenInput.trim() })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setErrorMessage(data.error || 'Failed to connect. Please verify token permissions.');
        setIsVerifying(false);
        return;
      }

      // Successfully connected real Instagram account!
      const connectedAcc: InstagramAccount = data.account;
      setAccount(connectedAcc);
      saveStoredAccount(connectedAcc);
      saveStoredToken(tokenInput.trim());
      setSuccessMessage(`Successfully connected @${connectedAcc.username} (${connectedAcc.name})!`);

      // Keep server store in sync for webhook triggers
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: connectedAcc, token: tokenInput.trim() })
      }).catch(() => {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      setErrorMessage(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  // Disconnect account
  const handleDisconnect = () => {
    if (confirm('Disconnect your Instagram account from this workspace?')) {
      setAccount(DEFAULT_INSTAGRAM_ACCOUNT);
      saveStoredAccount(DEFAULT_INSTAGRAM_ACCOUNT);
      saveStoredToken('');
      setTokenInput('');
      setSuccessMessage('');
      setErrorMessage('');
    }
  };

  // Send real live test DM
  const handleSendTestDM = async () => {
    if (!testRecipientId.trim()) {
      alert('Please enter your recipient Instagram Scoped ID (IGSID) or commenter ID.');
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/instagram/send-test-dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: testRecipientId.trim(),
          messageText: testMessage,
          accessToken: tokenInput.trim()
        })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setTestResult({
          success: false,
          message: data.error || 'Failed to deliver message via Meta API.'
        });
      } else {
        setTestResult({
          success: true,
          message: `Live DM dispatched successfully! Message ID: ${data.messageId}`
        });
      }
    } catch (err: unknown) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Error sending message'
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="app-container">
      <Sidebar account={account} activeAutomationsCount={getStoredAutomations().filter(a => a.status === 'active').length} />

      <div className="main-content">
        <Header 
          user={user} 
          account={account} 
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
        />

        <main className="content-wrapper">
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Connect Your Real Instagram Account</h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
              Link your actual Instagram Creator or Business account via Meta Graph API to test real comment-to-DM triggers.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '28px' }}>
            
            {/* LEFT COLUMN: Real Connection Setup */}
            <div>
              {/* Account Status Card */}
              {account.isConnected ? (
                <div className="card" style={{ marginBottom: '24px', border: '2px solid #86efac' }}>
                  <div className="card-header">
                    <div>
                      <h3 className="card-title">Real Instagram Account Connected</h3>
                      <p className="card-subtitle">Verified live via Meta Developer Graph API</p>
                    </div>
                    <span className="pill pill-success">
                      <CheckCircle2 size={12} />
                      Live &amp; Active
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '18px', padding: '16px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0', marginBottom: '20px' }}>
                    {account.profilePicture ? (
                      <img
                        src={account.profilePicture}
                        alt={account.username}
                        style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid white', boxShadow: 'var(--shadow-sm)', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534' }}>
                        <Instagram size={30} />
                      </div>
                    )}
                    <div>
                      <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#14532d' }}>
                        @{account.username}
                      </h4>
                      <p style={{ fontSize: '13px', color: '#166534', marginTop: '2px' }}>
                        {account.name} • <strong>{account.followersCount.toLocaleString()}</strong> followers
                      </p>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <span className="pill pill-subtle" style={{ fontSize: '11px', background: 'white' }}>
                          Linked Page: {account.facebookPageName} (ID: {account.facebookPageId})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#ef4444' }}
                      onClick={handleDisconnect}
                    >
                      <Trash2 size={14} />
                      <span>Disconnect This Account</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="card" style={{ marginBottom: '24px' }}>
                  <div className="card-header">
                    <div>
                      <h3 className="card-title">Connect with Meta Access Token</h3>
                      <p className="card-subtitle">Connect your real account in 60 seconds (100% Free)</p>
                    </div>
                    <span className="pill pill-subtle">
                      <Lock size={12} />
                      Official Meta OAuth
                    </span>
                  </div>

                  {errorMessage && (
                    <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '13px', marginBottom: '16px' }}>
                      <strong>Connection Error:</strong> {errorMessage}
                    </div>
                  )}

                  {successMessage && (
                    <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '13px', marginBottom: '16px' }}>
                      <strong>Success:</strong> {successMessage}
                    </div>
                  )}

                  {/* 1-Click Meta Login (Primary Official OAuth Flow) */}
                  <div style={{ marginBottom: '24px', padding: '24px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '14px', textAlign: 'center' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'var(--ig-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'white' }}>
                      <Instagram size={28} />
                    </div>
                    <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                      Connect Your Instagram Account
                    </h4>
                    <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '360px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                      Authorize with Facebook &amp; Instagram in 1 click. No passwords required. Zero risk of account bans.
                    </p>
                    
                    {!user.id ? (
                      <button
                        type="button"
                        onClick={() => setIsAuthModalOpen(true)}
                        className="btn btn-primary"
                        style={{ 
                          width: '100%', 
                          maxWidth: '380px', 
                          margin: '0 auto', 
                          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', 
                          borderColor: 'transparent', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '10px', 
                          padding: '14px 24px', 
                          fontSize: '15px', 
                          fontWeight: 700, 
                          borderRadius: '10px', 
                          boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)',
                          cursor: 'pointer'
                        }}
                      >
                        <Lock size={18} />
                        <span>Sign In with Google to Connect</span>
                      </button>
                    ) : (
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
                          padding: '14px 24px', 
                          fontSize: '15px', 
                          fontWeight: 700, 
                          borderRadius: '10px', 
                          textDecoration: 'none',
                          boxShadow: '0 4px 14px rgba(225, 48, 108, 0.25)'
                        }}
                      >
                        <Instagram size={20} />
                        <span>1-Click Connect with Instagram</span>
                      </a>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '16px', fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>
                      <ShieldCheck size={16} />
                      <span>Official Meta Graph API OAuth 2.0</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Live Test DM Section (When token is available) */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <h3 className="card-title">Live DM Delivery Test</h3>
                    <p className="card-subtitle">Test sending an actual DM to verify your token has Send API permission</p>
                  </div>
                  <span className="pill pill-subtle">Live Meta API</span>
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label">
                    <span>Recipient Instagram-Scoped ID (IGSID) or User ID</span>
                    <span className="form-help">The ID of any user who has messaged or commented</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 7891240182409"
                    value={testRecipientId}
                    onChange={e => setTestRecipientId(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">
                    <span>Message Text</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={testMessage}
                    onChange={e => setTestMessage(e.target.value)}
                  />
                </div>

                {testResult && (
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    marginBottom: '16px',
                    background: testResult.success ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${testResult.success ? '#bbf7d0' : '#fecaca'}`,
                    color: testResult.success ? '#166534' : '#991b1b'
                  }}>
                    {testResult.message}
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleSendTestDM}
                  disabled={isSendingTest || !tokenInput.trim()}
                  style={{ width: '100%' }}
                >
                  {isSendingTest ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Sending Live DM...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Send Live Test DM</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: Webhook Configuration for Local Testing */}
            <div>
              <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                  <div>
                    <h3 className="card-title">Live Webhook Setup (Localhost to Internet)</h3>
                    <p className="card-subtitle">Connect Meta&apos;s real-time events to your local server</p>
                  </div>
                  <span className="pill pill-success">Webhook Ready</span>
                </div>

                <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, marginBottom: '16px' }}>
                  To let Meta send real Reel comments to your local machine:
                </p>

                <div style={{ background: '#0f172a', color: '#f8fafc', padding: '12px 16px', borderRadius: '8px', fontFamily: 'var(--font-mono)', fontSize: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <code>npx localtunnel --port 3005</code>
                  <button
                    className="btn btn-sm"
                    style={{ background: 'rgba(255,255,255,0.15)', color: 'white', padding: '4px 8px' }}
                    onClick={() => handleCopy('npx localtunnel --port 3005', 'cmd')}
                  >
                    {copiedField === 'cmd' ? <Check size={12} color="#86efac" /> : <Copy size={12} />}
                  </button>
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label">
                    <span>Webhook Callback Path</span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="form-input"
                      readOnly
                      value="/api/webhook/instagram"
                      style={{ background: '#f8fafc', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                    />
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleCopy('/api/webhook/instagram', 'path')}
                    >
                      {copiedField === 'path' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label">
                    <span>Verify Token</span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="form-input"
                      readOnly
                      value="insta_auto_secure_verify_token_2026"
                      style={{ background: '#f8fafc', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                    />
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleCopy('insta_auto_secure_verify_token_2026', 'token')}
                    >
                      {copiedField === 'token' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '12px', color: '#1e40af' }}>
                  Paste the generated HTTPS URL + <code>/api/webhook/instagram</code> into Meta App Dashboard &gt; Instagram &gt; Webhooks.
                </div>
              </div>

              {/* Anti-Ban Guarantee Card */}
              <div className="card" style={{ border: '2px solid #bbf7d0', background: '#fcfdfd' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <ShieldCheck size={24} color="#15803d" />
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#14532d' }}>
                    Safe Official Meta Architecture
                  </h3>
                </div>
                <ul style={{ fontSize: '12px', color: '#166534', paddingLeft: '18px', lineHeight: 1.5 }}>
                  <li>Uses Meta&apos;s verified <strong>Private Replies</strong> API (`/{'{comment-id}'}/replies`).</li>
                  <li>No account password is ever requested or stored.</li>
                  <li>Zero risk of shadowbans or automated bot suspensions.</li>
                </ul>
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
        onLoginSuccess={u => setUser(u)}
      />
    </div>
  );
}
