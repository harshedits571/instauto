'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Shield, Instagram, Link as LinkIcon, MessageSquare, RefreshCw, UserCheck } from 'lucide-react';
import { AutomationRule } from '@/types';
import { getStoredAccount, getStoredToken } from '@/lib/storage';

interface AutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: Partial<AutomationRule>) => void;
  initialRule?: AutomationRule | null;
}

interface RealReel {
  id: string;
  title: string;
  thumbnail: string;
  commentsCount: number;
  permalink?: string;
}

export default function AutomationModal({
  isOpen,
  onClose,
  onSave,
  initialRule
}: AutomationModalProps) {
  const [name, setName] = useState(initialRule?.name || '');
  const [targetType, setTargetType] = useState<'specific_reel' | 'all_reels'>(
    initialRule?.targetType === 'all_reels' ? 'all_reels' : 'specific_reel'
  );
  
  const [reelUrlInput, setReelUrlInput] = useState(initialRule?.reelUrl || '');
  const [selectedReelId, setSelectedReelId] = useState(initialRule?.reelId || '');
  const [realReels, setRealReels] = useState<RealReel[]>([]);
  const [isLoadingReels, setIsLoadingReels] = useState(false);

  const [keywordsInput, setKeywordsInput] = useState(
    initialRule?.keywords ? initialRule.keywords.join(', ') : 'LINK'
  );
  const [triggerType, setTriggerType] = useState<'contains' | 'exact'>('contains');
  
  // Public comment auto-reply
  const [autoReplyComment, setAutoReplyComment] = useState(
    initialRule?.autoReplyComment ?? true
  );
  const [commentVariations, setCommentVariations] = useState(
    initialRule?.commentVariations ? initialRule.commentVariations.join('\n') :
    'Sent to your DMs @{{username}}! Check your inbox 🚀\nJust sent you the link in your DMs @{{username}}! ⚡'
  );

  // DM Content
  const [dmMessage, setDmMessage] = useState(
    initialRule?.dmMessage || 
    'Hey @{{username}}! Thanks for your comment. Here is the link you requested:'
  );
  const [linkUrl, setLinkUrl] = useState(
    initialRule?.linkUrl || ''
  );
  const [linkButtonText, setLinkButtonText] = useState(
    initialRule?.linkButtonText || 'Open Link 🔗'
  );

  // Follower Gate (ManyChat Pro Flow: Automatic Follower Detection)
  const [requireFollow, setRequireFollow] = useState(
    initialRule?.requireFollow ?? false
  );
  const [welcomeMessage, setWelcomeMessage] = useState(
    initialRule?.welcomeMessage || 
    initialRule?.followPromptMessage ||
    "Hey! I'm so glad you're here - thanks a ton for stopping by 😊\n\nTap below and I'll send you the access in just a moment ✨"
  );
  const [accessButtonText, setAccessButtonText] = useState(
    initialRule?.accessButtonText || initialRule?.followButtonText || "Send me the access"
  );
  const [notFollowingMessage, setNotFollowingMessage] = useState(
    initialRule?.notFollowingMessage || 
    "Oops! Looks like you haven't followed me yet 👀\n\nIt would mean a lot if you could visit my profile and hit that follow button 😁."
  );
  const [visitProfileButtonText, setVisitProfileButtonText] = useState(
    initialRule?.visitProfileButtonText || "Visit Profile"
  );
  const [confirmFollowButtonText, setConfirmFollowButtonText] = useState(
    initialRule?.confirmFollowButtonText || "I'm following ✅"
  );
  const [unlockedMessage, setUnlockedMessage] = useState(
    initialRule?.unlockedMessage || "🎉 Awesome, thanks for following! Here is your exclusive link:"
  );

  // Safety
  const [antiBanMode, setAntiBanMode] = useState(true);
  const [dailyDmCap, setDailyDmCap] = useState(300);

  // When modal opens, try fetching user's real reels if connected
  useEffect(() => {
    if (!isOpen) return;
    const account = getStoredAccount();
    const token = getStoredToken();

    if (account.isConnected && account.id && token) {
      setIsLoadingReels(true);
      fetch(`/api/instagram/reels?igAccountId=${account.id}&accessToken=${encodeURIComponent(token)}`)
        .then(res => res.json())
        .then(data => {
          if (data.reels && Array.isArray(data.reels)) {
            setRealReels(data.reels);
            if (!selectedReelId && data.reels.length > 0) {
              setSelectedReelId(data.reels[0].id);
            }
          }
        })
        .catch(err => console.error('Failed to load real reels:', err))
        .finally(() => setIsLoadingReels(false));
    }
  }, [isOpen, selectedReelId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const keywordsArray = keywordsInput
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);

    const variationsArray = commentVariations
      .split('\n')
      .map(v => v.trim())
      .filter(Boolean);

    const matchedReel = realReels.find(r => r.id === selectedReelId);

    const ruleData: Partial<AutomationRule> = {
      id: initialRule?.id || `auto_${Date.now()}`,
      name: name || (targetType === 'specific_reel' ? matchedReel?.title || 'Reel Automation' : 'All Reels Automation'),
      targetType,
      reelId: targetType === 'specific_reel' ? (selectedReelId || reelUrlInput) : undefined,
      reelUrl: reelUrlInput || matchedReel?.permalink,
      reelTitle: targetType === 'specific_reel' ? (matchedReel?.title || reelUrlInput || 'Selected Reel') : 'All Active Reels & Posts',
      reelThumbnail: matchedReel?.thumbnail,
      triggerType,
      keywords: keywordsArray.length ? keywordsArray : ['LINK'],
      autoReplyComment,
      commentVariations: variationsArray.length ? variationsArray : ['Sent to your DMs! Check inbox 🚀'],
      dmMessage,
      linkUrl,
      linkButtonText,
      requireFollow,
      welcomeMessage,
      accessButtonText,
      notFollowingMessage,
      visitProfileButtonText,
      confirmFollowButtonText,
      unlockedMessage,
      followPromptMessage: welcomeMessage,
      followButtonText: accessButtonText,
      safetySettings: {
        antiBanMode,
        randomDelaySeconds: [2, 6],
        dailyDmCap,
        dmsSentToday: initialRule?.safetySettings.dmsSentToday || 0,
        sendOnlyOncePerUser: true
      },
      status: initialRule?.status || 'active',
      stats: initialRule?.stats || {
        commentsDetected: 0,
        dmsDelivered: 0,
        linkClicks: 0,
        deliveryRate: 100
      }
    };

    onSave(ruleData);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{initialRule ? 'Edit Automation' : 'Create Comment-to-DM Campaign'}</h3>
            <p className="card-subtitle">Setup instant automated link delivery when someone comments on your Reel</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Automation Name */}
            <div className="form-group">
              <label className="form-label">
                <span>Campaign Name</span>
                <span className="form-help">Internal name for your reference</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Free Course Link Reel"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            {/* Target Reel Selector */}
            <div className="form-group">
              <label className="form-label">
                <span>Where should this trigger?</span>
              </label>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${targetType === 'specific_reel' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTargetType('specific_reel')}
                >
                  <Instagram size={14} />
                  Specific Reel
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${targetType === 'all_reels' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTargetType('all_reels')}
                >
                  All Reels &amp; Posts
                </button>
              </div>

              {targetType === 'specific_reel' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">
                      <span>Reel URL or Media ID</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Paste your Instagram Reel link (e.g. https://www.instagram.com/reel/...)"
                      value={reelUrlInput}
                      onChange={e => setReelUrlInput(e.target.value)}
                    />
                  </div>

                  {/* Real Reels from connected account */}
                  {isLoadingReels && (
                    <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Loading your real published Reels from Instagram...</span>
                    </div>
                  )}

                  {realReels.length > 0 && (
                    <div>
                      <span className="form-help" style={{ marginBottom: '6px', display: 'block' }}>Or select from your published Reels:</span>
                      <div className="reel-selector-grid">
                        {realReels.map(reel => (
                          <div
                            key={reel.id}
                            className={`reel-item-card ${selectedReelId === reel.id ? 'selected' : ''}`}
                            onClick={() => { setSelectedReelId(reel.id); setReelUrlInput(reel.permalink || ''); }}
                          >
                            {reel.thumbnail ? (
                              <img src={reel.thumbnail} alt={reel.title} className="reel-thumb-img" />
                            ) : (
                              <div style={{ height: '110px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Instagram size={24} color="#64748b" />
                              </div>
                            )}
                            <div className="reel-meta">
                              <p className="reel-meta-title">{reel.title}</p>
                              <span style={{ fontSize: '10px', color: '#64748b' }}>💬 {reel.commentsCount} comments</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Trigger Keywords */}
            <div className="form-group">
              <label className="form-label">
                <span>Trigger Keyword(s)</span>
                <span className="form-help">Comma separated words (e.g. LINK, SEND, GUIDE)</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. LINK, GUIDE, YES"
                value={keywordsInput}
                onChange={e => setKeywordsInput(e.target.value)}
                required
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <input
                    type="radio"
                    name="triggerType"
                    checked={triggerType === 'contains'}
                    onChange={() => setTriggerType('contains')}
                  />
                  Contains keyword in comment
                </label>
                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <input
                    type="radio"
                    name="triggerType"
                    checked={triggerType === 'exact'}
                    onChange={() => setTriggerType('exact')}
                  />
                  Exact single word match
                </label>
              </div>
            </div>

            {/* Direct Message (DM) to Send */}
            <div className="form-group">
              <label className="form-label">
                <span>Direct Message (DM) Text</span>
                <span className="form-help">Use {"{{username}}"} to address the user</span>
              </label>
              <textarea
                className="form-textarea"
                rows={3}
                value={dmMessage}
                onChange={e => setDmMessage(e.target.value)}
                placeholder="Hey @{{username}}! Here is the link you asked for:"
                required
              />
            </div>

            {/* Destination Link & Button */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">
                  <span>Destination Link URL</span>
                </label>
                <input
                  type="url"
                  className="form-input"
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  placeholder="https://yourwebsite.com/guide"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  <span>Button Title</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={linkButtonText}
                  onChange={e => setLinkButtonText(e.target.value)}
                  placeholder="e.g. Get Access 🔗"
                  required
                />
              </div>
            </div>

            {/* Follower Gate: ManyChat Pro Flow (Automatic Follower Detection) */}
            <div className="form-group" style={{ 
              background: requireFollow ? '#f8fafc' : '#ffffff', 
              padding: '16px', 
              borderRadius: '12px', 
              border: requireFollow ? '1.5px solid #6366f1' : '1px solid #e2e8f0',
              boxShadow: requireFollow ? '0 4px 12px rgba(99, 102, 241, 0.08)' : 'none',
              transition: 'all 0.2s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserCheck size={20} color="#4f46e5" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>ManyChat Follower-Gate (Auto-Detect Flow)</span>
                      <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '10px', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>PRO ACTIVE</span>
                    </div>
                    <p style={{ fontSize: '11px', color: '#64748b' }}>Live checks if commenter follows you. Prompts to follow before delivering link.</p>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={requireFollow}
                    onChange={e => setRequireFollow(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {requireFollow && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                  
                  {/* Step 1 Card: Welcome & Access Button */}
                  <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#4338ca', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ background: '#4338ca', color: '#fff', width: '18px', height: '18px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>1</span>
                        Step 1: Welcome Greeting &amp; Access Prompt (Sent on Comment)
                      </span>
                    </div>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      value={welcomeMessage}
                      onChange={e => setWelcomeMessage(e.target.value)}
                      placeholder="Hey! I'm so glad you're here - thanks a ton for stopping by 😊..."
                      style={{ fontSize: '12px', marginBottom: '8px' }}
                    />
                    <div>
                      <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                        <span>Button Text:</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={accessButtonText}
                        onChange={e => setAccessButtonText(e.target.value)}
                        placeholder="Send me the access"
                        style={{ fontSize: '12px' }}
                      />
                    </div>
                  </div>

                  {/* Step 2 Card: "Not Following Yet" Polite Gate */}
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#b45309', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ background: '#b45309', color: '#fff', width: '18px', height: '18px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>2</span>
                        Step 2: "Oops! Not Following Yet" Reminder (Auto-Detection)
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: '#78350f', marginBottom: '8px' }}>
                      ⚡ <em>If user is ALREADY following, this step is skipped automatically and the link is sent instantly!</em>
                    </p>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      value={notFollowingMessage}
                      onChange={e => setNotFollowingMessage(e.target.value)}
                      placeholder="Oops! Looks like you haven't followed me yet 👀..."
                      style={{ fontSize: '12px', marginBottom: '8px' }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                          <span>Button 1: Profile Link Text</span>
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={visitProfileButtonText}
                          onChange={e => setVisitProfileButtonText(e.target.value)}
                          placeholder="Visit Profile"
                          style={{ fontSize: '12px' }}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                          <span>Button 2: Re-check Follow Text</span>
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={confirmFollowButtonText}
                          onChange={e => setConfirmFollowButtonText(e.target.value)}
                          placeholder="I'm following ✅"
                          style={{ fontSize: '12px' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step 3 Card: Unlocked Link Delivery */}
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ background: '#15803d', color: '#fff', width: '18px', height: '18px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>3</span>
                        Step 3: Unlocked Link Card (Verified Follower)
                      </span>
                    </div>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      value={unlockedMessage}
                      onChange={e => setUnlockedMessage(e.target.value)}
                      placeholder="🎉 Awesome, thanks for following! Here is your exclusive link:"
                      style={{ fontSize: '12px', marginBottom: '8px' }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '8px' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                          <span>Access Button Text</span>
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={linkButtonText}
                          onChange={e => setLinkButtonText(e.target.value)}
                          placeholder="e.g. Guide / Download"
                          style={{ fontSize: '12px' }}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                          <span>Destination URL</span>
                        </label>
                        <input
                          type="url"
                          className="form-input"
                          value={linkUrl}
                          onChange={e => setLinkUrl(e.target.value)}
                          placeholder="https://..."
                          style={{ fontSize: '12px' }}
                          required
                        />
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Public Auto-Reply to Comment */}
            <div className="form-group" style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Public Comment Auto-Reply</span>
                  <p style={{ fontSize: '11px', color: '#64748b' }}>Boosts Instagram algorithm reach and confirms the DM was sent</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={autoReplyComment}
                    onChange={e => setAutoReplyComment(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {autoReplyComment && (
                <div>
                  <span className="form-help" style={{ marginBottom: '4px', display: 'block' }}>
                    Variations (1 per line - randomly rotated to prevent spam flags):
                  </span>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={commentVariations}
                    onChange={e => setCommentVariations(e.target.value)}
                    placeholder="Enter multiple reply options..."
                  />
                </div>
              )}
            </div>

            {/* Anti-Ban Protection Info */}
            <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '12px', color: '#166534' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                <Shield size={14} color="#15803d" />
                <span>Zero Ban Guarantee Active</span>
              </div>
              <p style={{ marginTop: '2px' }}>
                Uses Meta Private Replies API (`/{'{comment-id}'}/replies`) with humanized delay buffer (2-6s).
              </p>
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Sparkles size={16} />
              <span>{initialRule ? 'Update Campaign' : 'Publish Campaign'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
