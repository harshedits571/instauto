'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, 
  ShieldCheck, 
  Save, 
  Check, 
  Sliders, 
  Bell, 
  Lock,
  Instagram,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  LogOut
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
  getStoredAutomations,
  saveStoredUser 
} from '@/lib/storage';
import { InstagramAccount, User } from '@/types';

export default function SettingsPage() {
  const [user, setUser] = useState<User>(DEFAULT_USER);
  const [account, setAccount] = useState<InstagramAccount>(DEFAULT_INSTAGRAM_ACCOUNT);

  // User Profile
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Anti-Ban Engine limits
  const [defaultDelayMin, setDefaultDelayMin] = useState(2);
  const [defaultDelayMax, setDefaultDelayMax] = useState(6);
  const [dailyDmCap, setDailyDmCap] = useState(500);
  const [deduplicateHours, setDeduplicateHours] = useState(24);

  const [isSaved, setIsSaved] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const u = getStoredUser();
    setUser(u);
    setName(u.name || '');
    setEmail(u.email || '');
    setAccount(getStoredAccount());
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUser = { ...user, name, email };
    setUser(updatedUser);
    saveStoredUser(updatedUser);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
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
            <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Account &amp; Safety Preferences</h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginTop: '2px' }}>
              Manage your creator profile, connected Instagram account, and anti-ban rate limiting throttles.
            </p>
          </div>

          <form onSubmit={handleSaveSettings}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
              
              {/* Creator Account Profile & Status */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="card">
                  <div className="card-header">
                    <div>
                      <h3 className="card-title">Creator Profile</h3>
                      <p className="card-subtitle">Your personal workspace details</p>
                    </div>
                    <span className="pill pill-success">
                      PRO ACTIVE
                    </span>
                  </div>

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label">
                      <span>Display Name</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your Name"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label">
                      <span>Email Address</span>
                    </label>
                    <input
                      type="email"
                      className="form-input"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@domain.com"
                      required
                    />
                  </div>

                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>Account ID:</strong> <span style={{ fontFamily: 'var(--font-mono)' }}>{user.id || 'Not signed in'}</span>
                    </div>
                    <span className="pill pill-subtle" style={{ fontSize: '10px' }}>{user.id ? 'Free Pro Tier' : 'Guest'}</span>
                  </div>

                  {user.id && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#ef4444', borderColor: '#fecaca', marginTop: '14px', width: 'fit-content' }}
                      onClick={async () => {
                        if (confirm('Log out from this workspace?')) {
                          const { logOut } = await import('@/lib/firebase');
                          const { clearAllStoredData } = await import('@/lib/storage');
                          await logOut();
                          clearAllStoredData();
                          window.location.href = '/';
                        }
                      }}
                    >
                      <LogOut size={14} />
                      <span>Log Out of Account</span>
                    </button>
                  )}
                </div>

                {/* Connected Instagram Account Status Card */}
                <div className="card">
                  <div className="card-header">
                    <div>
                      <h3 className="card-title">Connected Instagram Profile</h3>
                      <p className="card-subtitle">Active connection for automated comment &amp; DM replies</p>
                    </div>
                    {account.isConnected ? (
                      <span className="pill pill-success">
                        <CheckCircle2 size={12} />
                        Connected
                      </span>
                    ) : (
                      <span className="pill pill-subtle">Not Connected</span>
                    )}
                  </div>

                  {account.isConnected ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                      {account.profilePicture ? (
                        <img 
                          src={account.profilePicture} 
                          alt={account.username} 
                          style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} 
                        />
                      ) : (
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                          {account.username?.[0]?.toUpperCase() || 'I'}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: '#14532d' }}>
                          @{account.username}
                        </div>
                        <div style={{ fontSize: '12px', color: '#166534', marginTop: '2px' }}>
                          {account.followersCount.toLocaleString()} Followers • Linked Page: {account.facebookPageName || 'Facebook Page'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '16px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a', fontSize: '13px', color: '#b45309' }}>
                      No Instagram profile linked yet. Visit the <a href="/connect" style={{ color: '#4f46e5', fontWeight: 700 }}>Connect page</a> to link your account via 1-Click Meta OAuth.
                    </div>
                  )}

                  <div style={{ marginTop: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Lock size={14} color="#6366f1" />
                    <span>All Meta credentials and tokens are encrypted and stored securely on serverless cloud infrastructure.</span>
                  </div>
                </div>
              </div>

              {/* Anti-Ban & Rate-Limit Engine */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <h3 className="card-title">Anti-Ban Engine Throttles</h3>
                    <p className="card-subtitle">Fine-tune automated delivery behavior to protect account standing</p>
                  </div>
                  <span className="pill pill-success">
                    <ShieldCheck size={12} />
                    Active
                  </span>
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">
                    <span>Random Jitter Delay (Seconds)</span>
                    <span className="form-help">Simulates realistic human reaction time</span>
                  </label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="number"
                      className="form-input"
                      value={defaultDelayMin}
                      onChange={e => setDefaultDelayMin(Number(e.target.value))}
                      min={1}
                      max={10}
                      style={{ width: '80px' }}
                    />
                    <span style={{ fontSize: '13px', color: '#64748b' }}>to</span>
                    <input
                      type="number"
                      className="form-input"
                      value={defaultDelayMax}
                      onChange={e => setDefaultDelayMax(Number(e.target.value))}
                      min={2}
                      max={20}
                      style={{ width: '80px' }}
                    />
                    <span style={{ fontSize: '13px', color: '#64748b' }}>seconds</span>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">
                    <span>Daily Maximum Safe DM Cap</span>
                    <span className="form-help">Meta recommends &lt; 1,000 DMs/day for standard creator tier</span>
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={dailyDmCap}
                    onChange={e => setDailyDmCap(Number(e.target.value))}
                    max={2000}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">
                    <span>Duplicate Comment Suppression Window</span>
                    <span className="form-help">Prevent spamming a user if they leave multiple comments</span>
                  </label>
                  <select
                    className="form-select"
                    value={deduplicateHours}
                    onChange={e => setDeduplicateHours(Number(e.target.value))}
                  >
                    <option value={12}>12 Hours</option>
                    <option value={24}>24 Hours (Recommended)</option>
                    <option value={48}>48 Hours</option>
                    <option value={168}>7 Days</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  {isSaved ? (
                    <>
                      <Check size={16} />
                      <span>Settings Saved!</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Save Platform Settings</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </form>
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
