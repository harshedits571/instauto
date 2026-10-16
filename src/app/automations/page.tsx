'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Sparkles, 
  Instagram, 
  ExternalLink, 
  Trash2, 
  Edit3, 
  Play, 
  Pause,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import AutomationModal from '@/components/AutomationModal';
import AuthModal from '@/components/AuthModal';
import { 
  DEFAULT_USER,
  DEFAULT_INSTAGRAM_ACCOUNT,
  INITIAL_AUTOMATIONS,
  getStoredUser, 
  getStoredAccount, 
  getStoredAutomations, 
  saveStoredAutomations 
} from '@/lib/storage';
import { AutomationRule, InstagramAccount, User } from '@/types';

export default function AutomationsPage() {
  const [user, setUser] = useState<User>(DEFAULT_USER);
  const [account, setAccount] = useState<InstagramAccount>(DEFAULT_INSTAGRAM_ACCOUNT);
  const [automations, setAutomations] = useState<AutomationRule[]>(INITIAL_AUTOMATIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);

  useEffect(() => {
    const u = getStoredUser();
    setUser(u);
    setAccount(getStoredAccount());
    const local = getStoredAutomations();
    setAutomations(local);

    // Only fetch from server if a real user is logged in
    if (u && u.id && u.id !== 'usr_default') {
      fetch(`/api/automations?userId=${encodeURIComponent(u.id)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            setAutomations(data.data);
            saveStoredAutomations(data.data);
          } else if (local.length > 0) {
            saveStoredAutomations(local);
          }
        })
        .catch(err => console.warn('Could not sync automations from server:', err));
    }
  }, []);

  const handleToggle = (id: string) => {
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

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this automation?')) {
      const updated = automations.filter(a => a.id !== id);
      setAutomations(updated);
      saveStoredAutomations(updated);
    }
  };

  const handleSave = (ruleData: Partial<AutomationRule>) => {
    let updated: AutomationRule[];
    const idx = automations.findIndex(a => a.id === ruleData.id);
    if (idx >= 0) {
      updated = [...automations];
      updated[idx] = { ...updated[idx], ...ruleData } as AutomationRule;
    } else {
      updated = [ruleData as AutomationRule, ...automations];
    }
    setAutomations(updated);
    saveStoredAutomations(updated);
    setEditingRule(null);
  };

  const filtered = automations.filter(a => {
    const matchesSearch = 
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.reelTitle && a.reelTitle.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = 
      statusFilter === 'all' || a.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="app-container">
      <Sidebar account={account} activeAutomationsCount={automations.filter(a => a.status === 'active').length} />

      <div className="main-content">
        <Header 
          user={user} 
          account={account} 
          onOpenCreateModal={() => { setEditingRule(null); setIsCreateModalOpen(true); }}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
        />

        <main className="content-wrapper">
          {/* Header Title */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Comment-to-DM Campaigns</h2>
              <p style={{ color: '#64748b', fontSize: '14px', marginTop: '2px' }}>
                Create, customize, and monitor automated DM link delivery for your Reels.
              </p>
            </div>

            <button 
              className="btn btn-primary"
              onClick={() => { setEditingRule(null); setIsCreateModalOpen(true); }}
            >
              <Plus size={16} />
              <span>Create New Automation</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search by keyword, reel title, or campaign name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              {(['all', 'active', 'paused'] as const).map(tab => (
                <button
                  key={tab}
                  className={`btn btn-sm ${statusFilter === tab ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setStatusFilter(tab)}
                  style={{ textTransform: 'capitalize' }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
            {filtered.map(rule => (
              <div key={rule.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  {/* Top Bar of Card */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {rule.reelThumbnail ? (
                        <img 
                          src={rule.reelThumbnail} 
                          alt="" 
                          style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} 
                        />
                      ) : (
                        <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                          <Instagram size={22} />
                        </div>
                      )}
                      <div>
                        <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{rule.name}</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            {rule.targetType === 'specific_reel' ? 'Specific Reel' : 'All Reels & Posts'}
                          </span>
                          {rule.requireFollow && (
                            <span style={{ background: '#e0e7ff', color: '#4338ca', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              Follower Gate 🔒
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={rule.status === 'active'}
                        onChange={() => handleToggle(rule.id)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  {/* Trigger Keywords */}
                  <div style={{ marginBottom: '14px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                      Trigger Keywords ({rule.triggerType}):
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {rule.keywords.map(kw => (
                        <span key={kw} className="pill pill-keyword">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* DM Preview */}
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Direct Message Sent:
                    </span>
                    <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.4, marginBottom: '8px' }}>
                      {rule.dmMessage}
                    </p>
                    <a
                      href={rule.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#4f46e5', fontSize: '12px', fontWeight: 600 }}
                    >
                      <span>Button: {rule.linkButtonText}</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>

                  {/* Stats Mini Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: '#f1f5f9', padding: '10px', borderRadius: '8px', textAlign: 'center', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{rule.stats.commentsDetected}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Comments</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#059669' }}>{rule.stats.dmsDelivered}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>DMs Sent</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#4f46e5' }}>{rule.stats.linkClicks}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Clicks</div>
                    </div>
                  </div>
                </div>

                {/* Bottom Card Footer Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                  <Link 
                    href={`/simulator?ruleId=${rule.id}`}
                    className="btn btn-secondary btn-sm"
                  >
                    <Play size={12} />
                    <span>Test in Simulator</span>
                  </Link>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => { setEditingRule(rule); setIsCreateModalOpen(true); }}
                    >
                      <Edit3 size={12} />
                      <span>Edit</span>
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#ef4444' }}
                      onClick={() => handleDelete(rule.id)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
              <Instagram size={40} style={{ margin: '0 auto 12px', color: '#94a3b8' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>No automations found</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', marginBottom: '16px' }}>
                Create your first Reel comment-to-DM campaign to start collecting leads automatically.
              </p>
              <button 
                className="btn btn-primary"
                onClick={() => { setEditingRule(null); setIsCreateModalOpen(true); }}
              >
                <Plus size={16} />
                <span>Create Automation</span>
              </button>
            </div>
          )}
        </main>
      </div>

      <AutomationModal
        isOpen={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false); setEditingRule(null); }}
        onSave={handleSave}
        initialRule={editingRule}
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
