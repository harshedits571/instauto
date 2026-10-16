'use client';

import { useState, useEffect } from 'react';
import { 
  Instagram, 
  Send, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  ExternalLink, 
  RefreshCw,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  UserCheck,
  UserX,
  ArrowLeft,
  Video,
  Flag,
  Smile
} from 'lucide-react';
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
  saveStoredLogs,
  getStoredLogs
} from '@/lib/storage';
import { matchesCommentTrigger, getSafePublicReply } from '@/lib/metaApi';
import { AutomationRule, CommentLog, InstagramAccount, User } from '@/types';

interface DmMessageItem {
  id: string;
  sender: 'system' | 'user';
  text: string;
  step?: 'step1_access' | 'step2_not_following' | 'step3_unlocked' | 'standard';
  accessButtonText?: string;
  visitProfileButtonText?: string;
  confirmFollowButtonText?: string;
  linkButtonText?: string;
  linkUrl?: string;
  time: string;
}

export default function SimulatorPage() {
  const [user, setUser] = useState<User>(DEFAULT_USER);
  const [account, setAccount] = useState<InstagramAccount>(DEFAULT_INSTAGRAM_ACCOUNT);
  const [automations, setAutomations] = useState<AutomationRule[]>(INITIAL_AUTOMATIONS);
  const [selectedRuleId, setSelectedRuleId] = useState<string>('');

  // Simulator state
  const [commentInput, setCommentInput] = useState('LINK');
  const [isProcessing, setIsProcessing] = useState(false);
  const [delayCountdown, setDelayCountdown] = useState<number | null>(null);
  const [isSimulatedUserFollowing, setIsSimulatedUserFollowing] = useState<boolean>(false);
  
  // Interactive Reel comments stream
  const [commentsStream, setCommentsStream] = useState<Array<{
    id: string;
    username: string;
    text: string;
    time: string;
    reply?: string;
  }>>([
    {
      id: 'c1',
      username: 'jordan_design',
      text: 'Insane workflow, thanks for sharing!',
      time: '1h ago'
    }
  ]);

  // Simulated DM thread (Instagram Dark Mode ManyChat Flow)
  const [dmThread, setDmThread] = useState<DmMessageItem[]>([]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    setAccount(getStoredAccount());
    const rules = getStoredAutomations();
    setAutomations(rules);
    if (rules.length > 0) {
      setSelectedRuleId(rules[0].id);
      setCommentInput(rules[0].keywords[0] || 'LINK');
    }
  }, []);

  // Fallback test rule if user has not created any campaign yet
  const fallbackRule: AutomationRule = {
    id: 'sim_default',
    userId: 'me',
    name: 'Quick Test Automation',
    targetType: 'all_reels',
    triggerType: 'contains',
    keywords: ['LINK', 'SEND', 'INFO', 'GUIDE'],
    autoReplyComment: true,
    commentVariations: [
      'Sent to your DMs @{{username}}! Check your inbox 🚀',
      'Check your messages @{{username}}, link is on the way! 📩'
    ],
    dmMessage: 'Hey @{{username}}! Thanks for checking out the reel. Here is the link you requested:',
    linkUrl: 'https://instagram.com/the.editor_harsh',
    linkButtonText: 'Open Free Link 🔗',
    requireFollow: true,
    welcomeMessage: "Hey! I'm so glad you're here - thanks a ton for stopping by 😊\n\nTap below and I'll send you the access in just a moment ✨",
    accessButtonText: "Send me the access",
    notFollowingMessage: "Oops! Looks like you haven't followed me yet 👀\n\nIt would mean a lot if you could visit my profile and hit that follow button 😁.",
    visitProfileButtonText: "Visit Profile",
    confirmFollowButtonText: "I'm following ✅",
    unlockedMessage: "Most AI-generated apps aren't hacked because of AI they're hacked because basic security is skipped.",
    safetySettings: {
      antiBanMode: true,
      randomDelaySeconds: [2, 5],
      dailyDmCap: 500,
      dmsSentToday: 0,
      sendOnlyOncePerUser: true
    },
    status: 'active',
    createdAt: new Date().toISOString(),
    stats: { commentsDetected: 0, dmsDelivered: 0, linkClicks: 0, deliveryRate: 100 }
  };

  const selectedRule = automations.find(r => r.id === selectedRuleId) || automations[0] || fallbackRule;

  // Step 1 Click Handler: User taps "Send me the access"
  const handleSendMeAccess = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    const testUsername = 'you_test_user';

    const btnTitle = selectedRule.accessButtonText || "Send me the access";

    // 1. Add purple user message
    setDmThread(prev => [
      ...prev,
      {
        id: `dm_user_${Date.now()}`,
        sender: 'user',
        text: btnTitle,
        time: 'Just now'
      }
    ]);

    // 2. Typing delay simulation
    await new Promise(r => setTimeout(r, 650));

    // 3. Live Follower Detection Check
    if (isSimulatedUserFollowing) {
      // User IS FOLLOWING -> Send Step 3 Unlocked Card directly!
      const unlockText = (selectedRule.unlockedMessage || "🎉 Awesome, thanks for following! Here is your exclusive link:")
        .replace(/{{username}}/g, `@${testUsername}`);

      setDmThread(prev => [
        ...prev,
        {
          id: `dm_unlock_${Date.now()}`,
          sender: 'system',
          step: 'step3_unlocked',
          text: unlockText,
          linkButtonText: selectedRule.linkButtonText || "Guide",
          linkUrl: selectedRule.linkUrl || "https://instagram.com/the.editor_harsh",
          time: 'Just now'
        }
      ]);
    } else {
      // User IS NOT FOLLOWING -> Send Step 2 "Oops! Looks like you haven't followed me yet 👀"
      const notFollowText = (selectedRule.notFollowingMessage || "Oops! Looks like you haven't followed me yet 👀\n\nIt would mean a lot if you could visit my profile and hit that follow button 😁.")
        .replace(/{{username}}/g, `@${testUsername}`)
        .replace(/{{profile}}/g, `@${account.username || 'the.editor_harsh'}`);

      setDmThread(prev => [
        ...prev,
        {
          id: `dm_not_following_${Date.now()}`,
          sender: 'system',
          step: 'step2_not_following',
          text: notFollowText,
          visitProfileButtonText: selectedRule.visitProfileButtonText || "Visit Profile",
          confirmFollowButtonText: selectedRule.confirmFollowButtonText || "I'm following ✅",
          time: 'Just now'
        }
      ]);
    }

    setIsProcessing(false);
  };

  // Step 2 Click Handler: User taps "I'm following ✅"
  const handleConfirmFollowCheck = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    const testUsername = 'you_test_user';

    const btnTitle = selectedRule.confirmFollowButtonText || "I'm following ✅";

    // 1. Add user confirmation message in purple
    setDmThread(prev => [
      ...prev,
      {
        id: `dm_user_${Date.now()}`,
        sender: 'user',
        text: btnTitle,
        time: 'Just now'
      }
    ]);

    // 2. Typing delay simulation
    await new Promise(r => setTimeout(r, 700));

    // 3. Re-check live follower status
    if (isSimulatedUserFollowing) {
      // User has now followed -> Deliver Step 3 Unlocked Card
      const unlockText = (selectedRule.unlockedMessage || "🎉 Awesome, thanks for following! Here is your exclusive link:")
        .replace(/{{username}}/g, `@${testUsername}`);

      setDmThread(prev => [
        ...prev,
        {
          id: `dm_unlock_${Date.now()}`,
          sender: 'system',
          step: 'step3_unlocked',
          text: unlockText,
          linkButtonText: selectedRule.linkButtonText || "Guide",
          linkUrl: selectedRule.linkUrl || "https://instagram.com/the.editor_harsh",
          time: 'Just now'
        }
      ]);
    } else {
      // User STILL has NOT followed -> Repeat Step 2 Error Message!
      const notFollowText = (selectedRule.notFollowingMessage || "Oops! Looks like you haven't followed me yet 👀\n\nIt would mean a lot if you could visit my profile and hit that follow button 😁.")
        .replace(/{{username}}/g, `@${testUsername}`)
        .replace(/{{profile}}/g, `@${account.username || 'the.editor_harsh'}`);

      setDmThread(prev => [
        ...prev,
        {
          id: `dm_repeat_err_${Date.now()}`,
          sender: 'system',
          step: 'step2_not_following',
          text: notFollowText,
          visitProfileButtonText: selectedRule.visitProfileButtonText || "Visit Profile",
          confirmFollowButtonText: selectedRule.confirmFollowButtonText || "I'm following ✅",
          time: 'Just now'
        }
      ]);
    }

    setIsProcessing(false);
  };

  // Trigger from comment
  const handleTestComment = async () => {
    if (!commentInput.trim() || !selectedRule || isProcessing) return;

    setIsProcessing(true);
    const testUsername = 'you_test_user';

    // 1. Add comment to Reel stream
    const newCommentId = `comment_${Date.now()}`;
    setCommentsStream(prev => [
      ...prev,
      {
        id: newCommentId,
        username: testUsername,
        text: commentInput,
        time: 'Just now'
      }
    ]);

    // 2. Check keyword matching
    const match = matchesCommentTrigger(
      commentInput,
      selectedRule.keywords,
      selectedRule.triggerType
    );

    if (!match.matched) {
      setIsProcessing(false);
      return;
    }

    // 3. Humanized Anti-Ban Delay simulation
    setDelayCountdown(2);
    await new Promise(r => setTimeout(r, 800));
    setDelayCountdown(1);
    await new Promise(r => setTimeout(r, 700));
    setDelayCountdown(null);

    // 4. Send Safe Public Reply
    let replyText = '';
    if (selectedRule.autoReplyComment) {
      if (selectedRule.requireFollow) {
        replyText = getSafePublicReply([
          'Sent to your DMs @{{username}}! Follow us & check inbox to unlock 🚀',
          'Check your messages @{{username}}! Follow to unlock your link 📩'
        ], testUsername);
      } else {
        replyText = getSafePublicReply(selectedRule.commentVariations, testUsername);
      }
      setCommentsStream(prev => 
        prev.map(c => c.id === newCommentId ? { ...c, reply: replyText } : c)
      );
    }

    // 5. Send Direct Message to the user's inbox
    if (selectedRule.requireFollow) {
      // Step 1: Warm welcome + "Send me the access"
      const welcomeText = (selectedRule.welcomeMessage || 
        "Hey! I'm so glad you're here - thanks a ton for stopping by 😊\n\nTap below and I'll send you the access in just a moment ✨"
      ).replace(/{{username}}/g, `@${testUsername}`);

      setDmThread(prev => [
        ...prev,
        {
          id: `dm_${Date.now()}`,
          sender: 'system',
          step: 'step1_access',
          text: welcomeText,
          accessButtonText: selectedRule.accessButtonText || "Send me the access",
          time: 'Just now'
        }
      ]);
    } else {
      // Standard Direct Link
      const personalizedDM = selectedRule.dmMessage.replace(/{{username}}/g, `@${testUsername}`);
      setDmThread(prev => [
        ...prev,
        {
          id: `dm_${Date.now()}`,
          sender: 'system',
          step: 'standard',
          text: personalizedDM,
          linkUrl: selectedRule.linkUrl,
          linkButtonText: selectedRule.linkButtonText,
          time: 'Just now'
        }
      ]);
    }

    // Record to audit logs
    const newLog: CommentLog = {
      id: `log_sim_${Date.now()}`,
      automationId: selectedRule.id,
      automationName: selectedRule.name,
      commenterUsername: testUsername,
      commentText: commentInput,
      matchedKeyword: match.matchedKeyword,
      publicReplySent: replyText,
      dmSent: true,
      linkClicked: false,
      timestamp: 'Just now',
      status: 'delivered'
    };
    saveStoredLogs([newLog, ...getStoredLogs()]);

    setIsProcessing(false);
  };

  const resetSimulation = () => {
    setCommentsStream([
      {
        id: 'c1',
        username: 'jordan_design',
        text: 'Insane workflow, thanks for sharing!',
        time: '1h ago'
      }
    ]);
    setDmThread([]);
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
          {/* Title Area */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 800 }}>ManyChat Pro Automation Simulator</h2>
                <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '11px', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                  3-STEP FLOW
                </span>
              </div>
              <p style={{ color: '#64748b', fontSize: '14px', marginTop: '2px' }}>
                Interactive simulator matching Instagram ManyChat Pro follower-gate flow. Test all 3 steps with live follower status simulation.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary btn-sm" onClick={resetSimulation}>
                <RefreshCw size={14} />
                <span>Reset Test</span>
              </button>
            </div>
          </div>

          {/* Selector & Simulation Controls Bar */}
          <div className="card" style={{ marginBottom: '24px', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '240px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Select Automation Campaign:
                </label>
                <select
                  className="form-select"
                  value={selectedRuleId}
                  onChange={e => setSelectedRuleId(e.target.value)}
                >
                  {automations.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} (Keywords: {a.keywords.join(', ')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Follower State Toggle for Testing Both Scenarios */}
              <div style={{ background: '#f8fafc', padding: '8px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Simulate Follower Status:
                  </div>
                  <div style={{ fontSize: '12px', color: isSimulatedUserFollowing ? '#15803d' : '#b45309', fontWeight: 600 }}>
                    {isSimulatedUserFollowing ? 'User IS Following You ✅' : 'User is NOT Following ❌'}
                  </div>
                </div>

                <button
                  type="button"
                  className={`btn btn-sm ${isSimulatedUserFollowing ? 'btn-success' : 'btn-secondary'}`}
                  style={{
                    background: isSimulatedUserFollowing ? '#16a34a' : '#f1f5f9',
                    color: isSimulatedUserFollowing ? '#ffffff' : '#334155',
                    border: '1px solid ' + (isSimulatedUserFollowing ? '#15803d' : '#cbd5e1'),
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 600
                  }}
                  onClick={() => setIsSimulatedUserFollowing(!isSimulatedUserFollowing)}
                >
                  {isSimulatedUserFollowing ? <UserCheck size={14} /> : <UserX size={14} />}
                  <span>{isSimulatedUserFollowing ? 'Toggle to Not Following' : 'Toggle to Following'}</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Quick Keyword:</span>
                {selectedRule?.keywords.slice(0, 3).map(kw => (
                  <button
                    key={kw}
                    className="pill pill-keyword"
                    onClick={() => setCommentInput(kw)}
                    style={{ cursor: 'pointer' }}
                    title="Click to insert keyword"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive 2-Column Split: Reel on Left, Instagram Dark Mode DM Screen on Right */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '24px' }}>
            
            {/* LEFT: Instagram Reel Mockup */}
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Instagram size={18} color="#e1306c" />
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>Instagram Reel Preview</span>
                </div>
                <span className="pill pill-subtle">Comment Trigger</span>
              </div>

              {/* Reel Video Simulation */}
              <div style={{ position: 'relative', height: '240px', background: '#000', overflow: 'hidden' }}>
                <img
                  src={selectedRule?.reelThumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80'}
                  alt="Reel Preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
                />
                
                {/* Overlay Reel Info */}
                <div style={{ position: 'absolute', bottom: '16px', left: '16px', right: '60px', color: 'white' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    {account.profilePicture ? (
                      <img src={account.profilePicture} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: 700 }}>
                        {account.username?.[0]?.toUpperCase() || 'H'}
                      </div>
                    )}
                    <span style={{ fontWeight: 700, fontSize: '13px' }}>@{account.username || 'the.editor_harsh'}</span>
                  </div>
                  <p style={{ fontSize: '12px', lineHeight: 1.3, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                    {selectedRule?.reelTitle || 'Exclusive Guide Revealed! Comment "LINK" below to receive the resource 👇'}
                  </p>
                </div>

                {/* Reel Right Action Buttons */}
                <div style={{ position: 'absolute', right: '16px', bottom: '16px', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', color: 'white' }}>
                  <Heart size={20} fill="white" />
                  <MessageCircle size={20} />
                  <Share2 size={20} />
                  <Bookmark size={20} />
                </div>
              </div>

              {/* Reel Comments Section */}
              <div style={{ padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Comments Stream ({commentsStream.length})
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto', marginBottom: '14px' }}>
                  {commentsStream.map(c => (
                    <div key={c.id} style={{ fontSize: '13px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <strong style={{ color: '#0f172a' }}>@{c.username}</strong>
                        <span style={{ color: '#334155' }}>{c.text}</span>
                      </div>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{c.time}</span>

                      {/* Automated Public Reply */}
                      {c.reply && (
                        <div style={{ marginTop: '6px', marginLeft: '16px', paddingLeft: '8px', borderLeft: '2px solid #6366f1' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <strong style={{ color: '#4f46e5', fontSize: '12px' }}>@{account.username || 'the.editor_harsh'}</strong>
                            <span className="pill pill-success" style={{ fontSize: '9px', padding: '1px 5px' }}>Auto-Reply</span>
                          </div>
                          <p style={{ color: '#1e293b', fontSize: '12px', marginTop: '2px' }}>{c.reply}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Comment Input Simulation Box */}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder='Type comment: "LINK"...'
                      value={commentInput}
                      onChange={e => setCommentInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleTestComment()}
                    />
                    <button
                      className="btn btn-primary"
                      onClick={handleTestComment}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <span>Simulating...</span>
                      ) : (
                        <>
                          <span>Post</span>
                          <Send size={14} />
                        </>
                      )}
                    </button>
                  </div>

                  {delayCountdown !== null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', fontSize: '12px', color: '#15803d', background: '#f0fdf4', padding: '6px 12px', borderRadius: '6px' }}>
                      <ShieldCheck size={16} />
                      <span>Applying humanized anti-ban delay buffer ({delayCountdown}s)...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: Authentic Instagram Dark Mode DM Screen (Exact layout of user screenshot 2) */}
            <div className="card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#000000', border: '1px solid #262626' }}>
              
              {/* Instagram DM Top Bar */}
              <div style={{ 
                padding: '12px 16px', 
                background: '#000000', 
                borderBottom: '1px solid #1f1f1f', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <ArrowLeft size={20} color="#ffffff" style={{ cursor: 'pointer' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {account.profilePicture ? (
                      <img src={account.profilePicture} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px', fontWeight: 700 }}>
                        {account.username?.[0]?.toUpperCase() || 'H'}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{account.username || 'the.editor_harsh'}</span>
                        <span style={{ color: '#0095f6', fontSize: '12px' }}>●</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#a8a8a8' }}>
                        Active now
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: '#ffffff' }}>
                  <Video size={20} />
                  <Flag size={18} />
                </div>
              </div>

              {/* Chat Canvas (Pure Black Background) */}
              <div style={{ 
                flex: 1, 
                minHeight: '440px', 
                maxHeight: '480px', 
                overflowY: 'auto', 
                background: '#000000', 
                padding: '16px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '14px' 
              }}>
                {dmThread.length === 0 ? (
                  <div style={{ margin: 'auto', textAlign: 'center', color: '#737373', maxWidth: '250px' }}>
                    <MessageCircle size={38} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#a8a8a8' }}>No DMs in inbox yet.</p>
                    <p style={{ fontSize: '12px', marginTop: '6px', lineHeight: 1.4 }}>
                      Post a comment with keyword <strong>&ldquo;{selectedRule?.keywords[0] || 'LINK'}&rdquo;</strong> on the left to trigger Step 1!
                    </p>
                  </div>
                ) : (
                  dmThread.map(dm => {
                    // USER MESSAGE: Sleek Instagram Purple Bubble (Right aligned)
                    if (dm.sender === 'user') {
                      return (
                        <div key={dm.id} style={{ maxWidth: '75%', alignSelf: 'flex-end' }}>
                          <div style={{
                            background: '#7c3aed',
                            color: '#ffffff',
                            borderRadius: '18px',
                            borderBottomRightRadius: '4px',
                            padding: '10px 16px',
                            fontSize: '14px',
                            fontWeight: 500,
                            lineHeight: 1.4,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                          }}>
                            {dm.text}
                          </div>
                        </div>
                      );
                    }

                    // BOT MESSAGE: Sleek Dark Card with Embedded Buttons (Left aligned)
                    return (
                      <div key={dm.id} style={{ maxWidth: '85%', alignSelf: 'flex-start', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                        {/* Tiny creator profile pic avatar */}
                        {account.profilePicture ? (
                          <img src={account.profilePicture} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>
                            {account.username?.[0]?.toUpperCase() || 'H'}
                          </div>
                        )}

                        <div style={{
                          background: '#262626',
                          borderRadius: '18px',
                          borderBottomLeftRadius: '4px',
                          padding: '14px',
                          color: '#f5f5f5',
                          width: '100%',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
                        }}>
                          <p style={{ fontSize: '13.5px', lineHeight: 1.45, whiteSpace: 'pre-line', margin: 0 }}>
                            {dm.text}
                          </p>

                          {/* STEP 1: Button Template "Send me the access" */}
                          {dm.step === 'step1_access' && (
                            <div style={{ marginTop: '12px' }}>
                              <button
                                type="button"
                                style={{
                                  width: '100%',
                                  padding: '10px 14px',
                                  background: '#363636',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '8px',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'background 0.2s ease',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px'
                                }}
                                onClick={handleSendMeAccess}
                                disabled={isProcessing}
                                onMouseEnter={e => (e.currentTarget.style.background = '#444444')}
                                onMouseLeave={e => (e.currentTarget.style.background = '#363636')}
                              >
                                <span>{dm.accessButtonText || 'Send me the access'}</span>
                              </button>
                            </div>
                          )}

                          {/* STEP 2: "Oops! Not following yet" with [ Visit Profile ] and [ I'm following ✅ ] */}
                          {dm.step === 'step2_not_following' && (
                            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <a
                                href={`https://www.instagram.com/${account.username || 'the.editor_harsh'}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  width: '100%',
                                  padding: '10px 14px',
                                  background: '#363636',
                                  color: '#ffffff',
                                  borderRadius: '8px',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  textAlign: 'center',
                                  textDecoration: 'none',
                                  display: 'block',
                                  boxSizing: 'border-box'
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#444444')}
                                onMouseLeave={e => (e.currentTarget.style.background = '#363636')}
                              >
                                {dm.visitProfileButtonText || 'Visit Profile'}
                              </a>

                              <button
                                type="button"
                                style={{
                                  width: '100%',
                                  padding: '10px 14px',
                                  background: '#363636',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '8px',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'background 0.2s ease',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px'
                                }}
                                onClick={handleConfirmFollowCheck}
                                disabled={isProcessing}
                                onMouseEnter={e => (e.currentTarget.style.background = '#444444')}
                                onMouseLeave={e => (e.currentTarget.style.background = '#363636')}
                              >
                                <span>{dm.confirmFollowButtonText || "I'm following ✅"}</span>
                              </button>
                            </div>
                          )}

                          {/* STEP 3: Unlocked Link Card with Direct URL Button (Guide) */}
                          {(dm.step === 'step3_unlocked' || dm.step === 'standard') && dm.linkUrl && (
                            <div style={{ marginTop: '12px' }}>
                              <a
                                href={dm.linkUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  width: '100%',
                                  padding: '10px 14px',
                                  background: '#363636',
                                  color: '#ffffff',
                                  borderRadius: '8px',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  textAlign: 'center',
                                  textDecoration: 'none',
                                  display: 'block',
                                  boxSizing: 'border-box'
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#444444')}
                                onMouseLeave={e => (e.currentTarget.style.background = '#363636')}
                              >
                                {dm.linkButtonText || 'Guide'}
                              </a>
                            </div>
                          )}

                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Instagram DM Input Simulation Bar (Bottom) */}
              <div style={{ 
                padding: '10px 14px', 
                background: '#000000', 
                borderTop: '1px solid #1f1f1f', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px' 
              }}>
                <div style={{ 
                  flex: 1, 
                  background: '#262626', 
                  borderRadius: '20px', 
                  padding: '8px 14px', 
                  color: '#737373', 
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>Message...</span>
                  <Smile size={18} color="#a8a8a8" />
                </div>
                <div style={{ color: '#0095f6', fontSize: '13px', fontWeight: 700 }}>
                  Active
                </div>
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
