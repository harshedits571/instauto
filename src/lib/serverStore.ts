import fs from 'fs';
import path from 'path';
import { AutomationRule, CommentLog, InstagramAccount } from '@/types';

export interface PendingFollowUnlock {
  id: string;
  senderId: string;
  commenterUsername?: string;
  ruleId: string;
  linkUrl: string;
  linkButtonText: string;
  unlockedMessage?: string;
  notFollowingMessage?: string;
  visitProfileButtonText?: string;
  confirmFollowButtonText?: string;
  timestamp: string;
}

interface ServerData {
  account: InstagramAccount | null;
  accessToken: string;
  automations: AutomationRule[];
  logs: CommentLog[];
  pendingUnlocks?: PendingFollowUnlock[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

const DEFAULT_STORE: ServerData = {
  account: null,
  accessToken: '',
  automations: [
    {
      id: 'rule_1',
      userId: 'usr_default',
      name: 'Reel Comment to DM Automation',
      targetType: 'all_reels',
      triggerType: 'contains',
      keywords: ['LINK', 'SEND', 'INFO', 'GUIDE', 'FREE'],
      autoReplyComment: true,
      commentVariations: [
        'Sent you a DM @{{username}}! Check your inbox 🚀',
        'Check your messages @{{username}}, link is on the way! 📩',
        'Just sent it over @{{username}}! Let me know if you got it ✨'
      ],
      dmMessage: 'Hey @{{username}}! Thanks for watching. Here is the direct link you requested: https://instagram.com/the.editor_harsh',
      linkUrl: 'https://instagram.com/the.editor_harsh',
      linkButtonText: 'Open Link',
      safetySettings: {
        antiBanMode: true,
        randomDelaySeconds: [2, 5],
        dailyDmCap: 500,
        dmsSentToday: 0,
        sendOnlyOncePerUser: true
      },
      status: 'active',
      createdAt: new Date().toISOString(),
      stats: {
        commentsDetected: 0,
        dmsDelivered: 0,
        linkClicks: 0,
        deliveryRate: 100
      }
    }
  ],
  logs: [],
  pendingUnlocks: []
};

function readStore(): ServerData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORE_PATH)) {
      fs.writeFileSync(STORE_PATH, JSON.stringify(DEFAULT_STORE, null, 2), 'utf-8');
      return DEFAULT_STORE;
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[ServerStore] Failed to read store.json:', err);
    return DEFAULT_STORE;
  }
}

function writeStore(data: ServerData) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[ServerStore] Failed to write store.json:', err);
  }
}

export function getServerAccount(): InstagramAccount | null {
  return readStore().account;
}

export function getServerToken(): string {
  const store = readStore();
  return store.accessToken || (store.account as any)?.pageAccessToken || '';
}

export function saveServerAccount(account: InstagramAccount, token: string) {
  const store = readStore();
  store.account = account;
  store.accessToken = token;
  writeStore(store);
}

export function getServerAutomations(): AutomationRule[] {
  return readStore().automations || [];
}

export function saveServerAutomations(rules: AutomationRule[]) {
  const store = readStore();
  store.automations = rules;
  writeStore(store);
}

export function getServerLogs(): CommentLog[] {
  return readStore().logs || [];
}

export function appendServerLog(log: CommentLog) {
  const store = readStore();
  store.logs.unshift(log);
  if (store.logs.length > 100) store.logs = store.logs.slice(0, 100);
  writeStore(store);
}

export function savePendingUnlock(unlock: PendingFollowUnlock) {
  const store = readStore();
  if (!store.pendingUnlocks) store.pendingUnlocks = [];
  store.pendingUnlocks = store.pendingUnlocks.filter(p => 
    p.senderId !== unlock.senderId && 
    (!unlock.commenterUsername || p.commenterUsername?.toLowerCase() !== unlock.commenterUsername.toLowerCase())
  );
  store.pendingUnlocks.push(unlock);
  writeStore(store);
}

export function findPendingUnlock(senderId: string, username?: string): PendingFollowUnlock | undefined {
  const store = readStore();
  if (!store.pendingUnlocks) return undefined;
  return store.pendingUnlocks.find(p => 
    p.senderId === senderId || 
    (username && p.commenterUsername && p.commenterUsername.toLowerCase() === username.toLowerCase())
  );
}

export function removePendingUnlock(senderId: string, username?: string) {
  const store = readStore();
  if (!store.pendingUnlocks) return;
  store.pendingUnlocks = store.pendingUnlocks.filter(p => 
    p.senderId !== senderId && 
    (!username || !p.commenterUsername || p.commenterUsername.toLowerCase() !== username.toLowerCase())
  );
  writeStore(store);
}
