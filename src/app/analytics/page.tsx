'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  CheckCircle2, 
  Download, 
  Filter, 
  Clock, 
  Check, 
  AlertCircle,
  ShieldCheck,
  MousePointerClick,
  MessageSquare
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import AutomationModal from '@/components/AutomationModal';
import AuthModal from '@/components/AuthModal';
import { 
  DEFAULT_USER,
  DEFAULT_INSTAGRAM_ACCOUNT,
  INITIAL_LOGS,
  getStoredUser, 
  getStoredAccount, 
  getStoredAutomations, 
  getStoredLogs 
} from '@/lib/storage';
import { CommentLog, InstagramAccount, User } from '@/types';

export default function AnalyticsPage() {
  const [user, setUser] = useState<User>(DEFAULT_USER);
  const [account, setAccount] = useState<InstagramAccount>(DEFAULT_INSTAGRAM_ACCOUNT);
  const [logs, setLogs] = useState<CommentLog[]>(INITIAL_LOGS);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    setAccount(getStoredAccount());
    setLogs(getStoredLogs());
  }, []);

  const automations = getStoredAutomations();
  const totalComments = automations.reduce((sum, a) => sum + a.stats.commentsDetected, 0);
  const totalDms = automations.reduce((sum, a) => sum + a.stats.dmsDelivered, 0);
  const totalClicks = automations.reduce((sum, a) => sum + a.stats.linkClicks, 0);

  const filteredLogs = logs.filter(log => {
    if (filterStatus === 'all') return true;
    return log.status === filterStatus;
  });

  const exportCSV = () => {
    const headers = 'ID,Commenter,CommentText,Keyword,PublicReply,DMSent,Timestamp,Status\n';
    const rows = logs.map(l => 
      `"${l.id}","${l.commenterUsername}","${l.commentText.replace(/"/g, '""')}","${l.matchedKeyword}","${String(l.publicReplyText || l.publicReplySent || '').replace(/"/g, '""')}","${l.dmSent}","${l.timestamp}","${l.status}"`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `instagram-comment-dm-logs-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="app-container">
      <Sidebar account={account} activeAutomationsCount={automations.filter(a => a.status === 'active').length} />

      <div className="main-content">
        <Header 
          user={user} 
          account={account} 
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
        />

        <main className="content-wrapper">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Analytics &amp; Audit Logs</h2>
              <p style={{ color: '#64748b', fontSize: '14px', marginTop: '2px' }}>
                Track conversion funnels, keyword performance, and verified Meta API delivery logs.
              </p>
            </div>

            <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Funnel Overview Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div>
                <span className="stat-label">Total Comments Detected</span>
                <div className="stat-value">{totalComments}</div>
                <div className="stat-trend positive">
                  <TrendingUp size={14} />
                  <span>100% webhook capture</span>
                </div>
              </div>
              <div className="stat-icon-wrapper icon-purple">
                <MessageSquare size={20} />
              </div>
            </div>

            <div className="stat-card">
              <div>
                <span className="stat-label">DMs Delivered (Private Replies)</span>
                <div className="stat-value">{totalDms}</div>
                <div className="stat-trend positive">
                  <CheckCircle2 size={14} />
                  <span>98.8% delivery rate</span>
                </div>
              </div>
              <div className="stat-icon-wrapper icon-blue">
                <Check size={20} />
              </div>
            </div>

            <div className="stat-card">
              <div>
                <span className="stat-label">Resource Link Clicks</span>
                <div className="stat-value">{totalClicks}</div>
                <div className="stat-trend positive">
                  <MousePointerClick size={14} />
                  <span>68.2% CTR</span>
                </div>
              </div>
              <div className="stat-icon-wrapper icon-emerald">
                <MousePointerClick size={20} />
              </div>
            </div>

            <div className="stat-card">
              <div>
                <span className="stat-label">Duplicate Suppression</span>
                <div className="stat-value" style={{ color: '#059669' }}>100%</div>
                <div className="stat-trend positive">
                  <ShieldCheck size={14} />
                  <span>Zero spam duplicate DMs</span>
                </div>
              </div>
              <div className="stat-icon-wrapper icon-emerald">
                <ShieldCheck size={20} />
              </div>
            </div>
          </div>

          {/* Top Trigger Keywords Breakdown */}
          <div className="card" style={{ marginBottom: '28px' }}>
            <div className="card-header">
              <h3 className="card-title">Top Performing Trigger Keywords</h3>
              <span className="pill pill-subtle">Highest Click-Through Rate</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {[
                { keyword: 'LINK', count: 420, ctr: '74.2%' },
                { keyword: 'GUIDE', count: 310, ctr: '69.8%' },
                { keyword: 'FIGMA', count: 192, ctr: '80.2%' },
                { keyword: 'AI', count: 184, ctr: '66.5%' },
              ].map(k => (
                <div key={k.keyword} style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <span className="pill pill-keyword" style={{ fontSize: '13px', padding: '3px 8px' }}>{k.keyword}</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '8px', color: '#0f172a' }}>{k.count} triggered</div>
                  <div style={{ fontSize: '12px', color: '#059669', fontWeight: 600, marginTop: '2px' }}>{k.ctr} click-through</div>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Real-Time Event &amp; Delivery Audit Log</h3>
                <p className="card-subtitle">Every detected comment, triggered automation, and sent direct message</p>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                {(['all', 'delivered', 'skipped_duplicate'] as const).map(s => (
                  <button
                    key={s}
                    className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setFilterStatus(s)}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>User &amp; Comment</th>
                    <th>Campaign</th>
                    <th>Matched Keyword</th>
                    <th>Auto Public Reply</th>
                    <th>DM Status</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(log => (
                    <tr key={log.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>@{log.commenterUsername}</div>
                        <div style={{ fontSize: '13px', color: '#475569' }}>&ldquo;{log.commentText}&rdquo;</div>
                      </td>

                      <td>
                        <span style={{ fontSize: '13px', fontWeight: 500 }}>{log.automationName}</span>
                      </td>

                      <td>
                        <span className="pill pill-keyword">{log.matchedKeyword}</span>
                      </td>

                      <td>
                        <div style={{ fontSize: '12px', color: '#166534', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
