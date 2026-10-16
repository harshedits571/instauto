export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'creator' | 'agency' | 'admin';
  plan: 'free' | 'pro' | 'agency';
}

export interface InstagramAccount {
  id: string;
  username: string;
  name: string;
  profilePicture: string;
  followersCount: number;
  facebookPageId?: string;
  facebookPageName?: string;
  pageAccessToken?: string;
  isConnected: boolean;
  accessTokenExpiresAt: string;
  tokenType: 'official_graph_api';
  status: 'active' | 'expired' | 'error';
}

export interface AutomationRule {
  id: string;
  userId: string;
  name: string;
  targetType: 'specific_reel' | 'all_reels' | 'next_post';
  reelId?: string;
  reelUrl?: string;
  reelTitle?: string;
  reelThumbnail?: string;
  
  // Triggers
  triggerType: 'exact' | 'contains' | 'any';
  keywords: string[]; // e.g., ["LINK", "SEND", "EBOOK"]
  excludeKeywords?: string[];
  
  // Public Comment Auto-Reply (Rotates to prevent spam detection)
  autoReplyComment: boolean;
  commentVariations: string[];
  
  // Direct Message to send
  dmMessage: string; // supports {{name}}, {{username}}
  linkUrl: string;
  linkButtonText: string;

  // Follower Gate (ManyChat Pro Flow: Automatic Follower Detection)
  requireFollow?: boolean;
  welcomeMessage?: string; // Step 1: "Hey! I'm so glad you're here... Tap below and I'll send you the access ✨"
  accessButtonText?: string; // e.g. "Send me the access"
  notFollowingMessage?: string; // Step 2: "Oops! Looks like you haven't followed me yet 👀..."
  visitProfileButtonText?: string; // e.g. "Visit Profile"
  confirmFollowButtonText?: string; // e.g. "I'm following ✅"
  unlockedMessage?: string; // Step 3: "🎉 Here is your exclusive link:"
  followPromptMessage?: string; // backward compat
  followButtonText?: string; // backward compat
  
  // Anti-Ban & Safety Engine
  safetySettings: {
    antiBanMode: boolean; // Uses official private reply endpoint + randomized jitter
    randomDelaySeconds: [number, number]; // e.g. [2, 7]
    dailyDmCap: number; // e.g. 250 DMs/day
    dmsSentToday: number;
    sendOnlyOncePerUser: boolean; // don't spam the same person if they comment twice
  };

  // Status & Metrics
  status: 'active' | 'paused';
  createdAt: string;
  stats: {
    commentsDetected: number;
    dmsDelivered: number;
    linkClicks: number;
    deliveryRate: number; // percentage
  };
}

export interface CommentLog {
  id: string;
  automationId: string;
  automationName: string;
  commenterUsername: string;
  commenterId?: string;
  commentText: string;
  mediaId?: string;
  matchedKeyword: string;
  publicReplySent?: boolean | string;
  publicReplyText?: string;
  dmSent: boolean;
  dmText?: string;
  linkClicked?: boolean;
  timestamp: string;
  delayMs?: number;
  errorMessage?: string;
  status: 'delivered' | 'rate_limited' | 'skipped_duplicate' | 'failed' | 'success';
}

export interface SafetyMetrics {
  officialMetaApiVerified: boolean;
  antiBanStatus: 'optimal' | 'moderate' | 'warning';
  healthScore: number; // 0-100
  dmsSentLast24h: number;
  maxSafeLimit24h: number;
  duplicateSuppressionRate: number;
}
