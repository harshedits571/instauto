'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  MessageSquare, 
  Send, 
  MousePointerClick, 
  ShieldCheck, 
  CheckCircle2, 
  Play, 
  Pause, 
  ExternalLink, 
  Plus, 
  Sparkles,
  Instagram,
  ArrowRight,
  TrendingUp,
  Clock,
  Check
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import SafetyBadge from '@/components/SafetyBadge';
import AutomationModal from '@/components/AutomationModal';
import AuthModal from '@/components/AuthModal';
import { 
  DEFAULT_USER,
  DEFAULT_INSTAGRAM_ACCOUNT,
  INITIAL_AUTOMATIONS,
  INITIAL_LOGS,
  getStoredUser, 
  saveStoredUser, 
  getStoredAccount, 
  saveStoredAccount, 
  getStoredAutomations, 
  saveStoredAutomations, 
  getStoredLogs,
  saveStoredLogs,
  INITIAL_SAFETY_METRICS
} from '@/lib/storage';
import { AutomationRule, CommentLog, InstagramAccount, User } from '@/types';

export default function DashboardPage() {
  const [user, setUser] = useState<User>(DEFAULT_USER);
  const [account, setAccount] = useState<InstagramAccount>(DEFAULT_INSTAGRAM_ACCOUNT);
  const [automations, setAutomations] = useState<AutomationRule[]>(INITIAL_AUTOMATIONS);
  const [logs, setLogs] = useState<CommentLog[]>(INITIAL_LOGS);
  
  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
    setAccount(getStoredAccount());
    setAutomations(getStoredAutomations());
    setLogs(getStoredLogs());
  }, []);

  const handleToggleAutomation = (id: string) => {
    const updated = automations.map(rule => {
      if (rule.id === id) {
        return {
          ...rule,
          status: (rule.status === 'active' ? 'paused' : 'active') as 'active' | 'paused'
        };
      }
      return rule;
    });
    setAutomations(updated);
    saveStoredAutomations(updated);
  };

  const handleSaveAutomation = (ruleData: Partial<AutomationRule>) => {
    let updated: AutomationRule[];
    const existingIndex = automations.findIndex(a => a.id === ruleData.id);

    if (existingIndex >= 0) {
      updated = [...automations];
      updated[existingIndex] = { ...updated[existingIndex], ...ruleData } as AutomationRule;
    } else {
      updated = [ruleData as AutomationRule, ...automations];
    }

    setAutomations(updated);
    saveStoredAutomations(updated);
    setEditingRule(null);
  };

  const handleLoginSuccess = (newUser: User) => {
    setUser(newUser);
    saveStoredUser(newUser);
  };

  // Aggregated Stats
  const totalComments = automations.reduce((sum, a) => sum + a.stats.commentsDetected, 0);
  const totalDms = automations.reduce((sum, a) => sum + a.stats.dmsDelivered, 0);
  const totalClicks = automations.reduce((sum, a) => sum + a.stats.linkClicks, 0);
  const activeCount = automations.filter(a => a.status === 'active').length;
  const avgDeliveryRate = automations.length 
    ? (automations.reduce((sum, a) => sum + a.stats.deliveryRate, 0) / automations.length).toFixed(1)
    : '100';

  return (
    <div className="app-container">
      {/* Sidebar */}
      <Sidebar account={account} activeAutomationsCount={activeCount} />

      {/* Main Content Area */}
      <div className="main-content">
        <Header 
          user={user} 
          account={account} 
          onOpenCreateModal={() => { setEditingRule(null); setIsCreateModalOpen(true); }}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
        />

        <main className="content-wrapper">
          {/* Official Meta Safety Guarantee Notice */}
          <SafetyBadge />

          {/* Top Performance Metrics */}
          <div className="stats-grid">
            <div className="stat-card">
              <div>
                <span className="stat-label">Comments Detected</span>
                <div className="stat-value">{totalComments.toLocaleString()}</div>
                <div className="stat-trend positive">
                  <TrendingUp size={14} />
                  <span>+18.4% this week</span>
                </div>
              </div>
              <div className="stat-icon-wrapper icon-purple">
                <MessageSquare size={22} />
              </div>
            </div>

            <div className="stat-card">
              <div>
                <span className="stat-label">DMs Delivered Safely</span>
                <div className="stat-value">{totalDms.toLocaleString()}</div>
                <div className="stat-trend positive">
                  <CheckCircle2 size={14} />
                  <span>{avgDeliveryRate}% success rate</span>
                </div>
              </div>
              <div className="stat-icon-wrapper icon-blue">
                <Send size={22} />
              </div>
            </div>

            <div className="stat-card">
              <div>
                <span className="stat-label">Resource Link Clicks</span>
                <div className="stat-value">{totalClicks.toLocaleString()}</div>
                <div className="stat-trend positive">
                  <TrendingUp size={14} />
                  <span>68.2% click conversion</span>
                </div>
              </div>
              <div className="stat-icon-wrapper icon-emerald">
                <MousePointerClick size={22} />
              </div>
            </div>

            <div className="stat-card">
              <div>
                <span className="stat-label">Anti-Ban Health Score</span>
                <div className="stat-value" style={{ color: '#059669' }}>
                  {INITIAL_SAFETY_METRICS.healthScore}%
                </div>
                <div className="stat-trend positive">
                  <ShieldCheck size={14} />
                  <span>Zero risk / Graph API</span>
                </div>
              </div>
              <div className="stat-icon-wrapper icon-emerald">
                <ShieldCheck size={22} />
              </div>
            </div>
          </div>

          {/* Account Not Connected Notice Banner */}
          {!account.isConnected && (
            <div style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Instagram size={24} color="#d97706" />
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#92400e' }}>
                    Connect Your Real Instagram Account
                  </h4>
                  <p style={{ fontSize: '12px', color: '#b45309', marginTop: '2px' }}>
                    Paste your Meta Graph API access token in Instagram Connect to fetch your real Reels and start testing.
                  </p>
                </div>
              </div>
              <Link href="/connect" className="btn btn-primary btn-sm" style={{ background: '#d97706', borderColor: '#d97706' }}>
                <span>Connect Account</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {/* Quick Action Banner: Test in Simulator */}
          <div style={{
            background: 'linear-gradient(90deg, #1e1b4b 0%, #312e81 100%)',
            color: 'white',
            borderRadius: '14px',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '32px',
            boxShadow: 'var(--shadow-md)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles size={22} color="#a5b4fc" />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Test Your Automations in Real-Time Simulator</h3>
                <p style={{ fontSize: '13px', color: '#c7d2fe', marginTop: '2px' }}>
                  Simulate someone commenting on your Reel and preview the exact DM &amp; link received on Instagram!
                </p>
              </div>
            </div>
            <Link href="/simulator" className="btn" style={{ background: 'white', color: '#312e81', fontWeight: 700 }}>
              <span>Launch Live Simulator</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Active Automations Section */}
          <div className="card" style={{ marginBottom: '32px' }}>
            <div className="card-header">
              <div>
                <h3 className="card-title">Active Reel Automations ({automations.length})</h3>
                <p className="card-subtitle">Custom keywords, destination links, and safe DM delivery triggers</p>
              </div>
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => { setEditingRule(null); setIsCreateModalOpen(true); }}
              >
                <Plus size={14} />
                <span>Add Automation</span>
              </button>
            </div>

            {automations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 20px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                <MessageSquare size={32} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#334155' }}>No Automations Configured Yet</h4>
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', marginBottom: '16px' }}>
                  Create your first comment-to-DM campaign to automatically send links when people comment on your Reels.
                </p>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => { setEditingRule(null); setIsCreateModalOpen(true); }}
                >
                  <Plus size={14} />
                  <span>Create Your First Automation</span>
                </button>
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Reel &amp; Campaign</th>
                      <th>Trigger Keywords</th>
                      <th>Destination Link</th>
                      <th>Stats (Comments &rarr; DMs &rarr; Clicks)</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {automations.map((rule) => (
                      <tr key={rule.id}>
                        {/* Reel Info */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {rule.reelThumbnail ? (
                              <img 
                                src={rule.reelThumbnail} 
                                alt={rule.reelTitle} 
                                style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }}
                              />
                            ) : (
                              <div style={{ 
                                width: '40px', 
                                height: '40px', 
                                borderRadius: '6px', 
                                background: '#f1f5f9', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                color: '#64748b'
                              }}>
                                <Instagram size={20} />
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>
                                {rule.name}
                              </div>
                              <div style={{ fontSize: '12px', color: '#64748b', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {rule.reelTitle || 'All active posts'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Keywords */}
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {rule.keywords.map(kw => (
                              <span key={kw} className="pill pill-keyword">
                                {kw}
                              </span>
                            ))}
                          </div>
                          <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                            {rule.triggerType === 'exact' ? 'Exact match' : 'Contains keyword'}
                          </span>
                        </td>

                        {/* Link */}
                        <td>
                          <a 
                            href={rule.linkUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#4f46e5', fontWeight: 500, fontSize: '13px' }}
                          >
                            <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {rule.linkButtonText}
                            </span>
                            <ExternalLink size={12} />
                          </a>
                        </td>

                        {/* Stats */}
                        <td>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                            {rule.stats.commentsDetected} <span style={{ color: '#94a3b8', fontWeight: 400 }}>comments</span> &rarr; {rule.stats.dmsDelivered} <span style={{ color: '#94a3b8', fontWeight: 400 }}>DMs</span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#059669', fontWeight: 500 }}>
                            {rule.stats.linkClicks} clicks ({rule.stats.deliveryRate}% delivered)
                          </div>
                        </td>

                        {/* Status Toggle */}
                        <td>
                          <label className="toggle-switch">
                            <input 
                              type="checkbox" 
                              checked={rule.status === 'active'}
                              onChange={() => handleToggleAutomation(rule.id)}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setEditingRule(rule);
                                setIsCreateModalOpen(true);
                              }}
                            >
                              Edit
                            </button>
                            <Link 
                              href={`/simulator?ruleId=${rule.id}`} 
                              className="btn btn-secondary btn-sm"
                              title="Test this automation in simulator"
                            >
                              <Play size={12} />
                              Test
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Live Comment Logs */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Recent Automated Actions &amp; Webhook Events</h3>
                <p className="card-subtitle">Live stream of incoming comments and automated DM deliveries</p>
              </div>
              <Link href="/analytics" className="btn btn-secondary btn-sm">
                <span>View Full Audit Log</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 20px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                <Clock size={28} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>No Comment Events Logged Yet</h4>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  When someone comments on your Reel or you run a test in the Simulator, the delivery log will appear here.
                </p>
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>User &amp; Comment</th>
                      <th>Triggered Automation</th>
                      <th>Keyword</th>
                      <th>Public Reply Posted</th>
                      <th>DM Status</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.slice(0, 5).map((log) => (
                      <tr key={log.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>
                            @{log.commenterUsername}
                          </div>
                          <div style={{ fontSize: '13px', color: '#475569', fontStyle: 'italic' }}>
                            &ldquo;{log.commentText}&rdquo;
                          </div>
                        </td>

                        <td>
                          <span style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>
                            {log.automationName}
                          </span>
                        </td>

                        <td>
                          <span className="pill pill-keyword">
                            {log.matchedKeyword}
                          </span>
                        </td>

                        <td>
                          <div style={{ fontSize: '12px', color: '#166534', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {log.publicReplySent || 'None'}
                          </div>
                        </td>

                        <td>
                          <span className="pill pill-success">
                            <Check size={12} />
                            Delivered
                          </span>
                        </td>

                        <td style={{ fontSize: '12px', color: '#64748b' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} />
                            <span>{log.timestamp}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Create / Edit Automation Modal */}
      <AutomationModal
        isOpen={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false); setEditingRule(null); }}
        onSave={handleSaveAutomation}
        initialRule={editingRule}
      />

      {/* Multi-User Login & Profile Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={user}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
