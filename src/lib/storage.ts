'use client';

import { AutomationRule, CommentLog, InstagramAccount, User, SafetyMetrics } from '@/types';

// Default initial user (clean, unauthenticated visitor)
export const DEFAULT_USER: User = {
  id: '',
  name: 'Sign In',
  email: '',
  avatar: '',
  role: 'creator',
  plan: 'free'
};

// Default Instagram account: NOT connected
export const DEFAULT_INSTAGRAM_ACCOUNT: InstagramAccount = {
  id: '',
  username: '',
  name: 'Not Connected',
  profilePicture: '',
  followersCount: 0,
  facebookPageId: '',
  facebookPageName: '',
  isConnected: false,
  accessTokenExpiresAt: '',
  tokenType: 'official_graph_api',
  status: 'error'
};

// Clean: zero dummy automations
export const INITIAL_AUTOMATIONS: AutomationRule[] = [];

// Clean: zero dummy logs
export const INITIAL_LOGS: CommentLog[] = [];

// Clean initial safety metrics
export const INITIAL_SAFETY_METRICS: SafetyMetrics = {
  officialMetaApiVerified: false,
  antiBanStatus: 'optimal',
  healthScore: 100,
  dmsSentLast24h: 0,
  maxSafeLimit24h: 500,
  duplicateSuppressionRate: 100
};

// Local storage key names (v3 to isolate multi-tenant user accounts cleanly)
const STORAGE_KEYS = {
  USER: 'insta_auto_user_v3',
  ACCOUNT: 'insta_auto_account_v3',
  AUTOMATIONS: 'insta_auto_rules_v3',
  LOGS: 'insta_auto_logs_v3',
  ACCESS_TOKEN: 'insta_auto_meta_token_v3'
};

export function getStoredUser(): User {
  if (typeof window === 'undefined') return DEFAULT_USER;
  const data = localStorage.getItem(STORAGE_KEYS.USER);
  return data ? JSON.parse(data) : DEFAULT_USER;
}

export function saveStoredUser(user: User): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

export function getStoredAccount(): InstagramAccount {
  if (typeof window === 'undefined') return DEFAULT_INSTAGRAM_ACCOUNT;
  const data = localStorage.getItem(STORAGE_KEYS.ACCOUNT);
  return data ? JSON.parse(data) : DEFAULT_INSTAGRAM_ACCOUNT;
}

export function saveStoredAccount(account: InstagramAccount): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.ACCOUNT, JSON.stringify(account));
}

export function getStoredToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || '';
}

export function saveStoredToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
}

export function getStoredAutomations(): AutomationRule[] {
  if (typeof window === 'undefined') return INITIAL_AUTOMATIONS;
  const data = localStorage.getItem(STORAGE_KEYS.AUTOMATIONS);
  return data ? JSON.parse(data) : INITIAL_AUTOMATIONS;
}

export function saveStoredAutomations(automations: AutomationRule[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.AUTOMATIONS, JSON.stringify(automations));
  
  // Asynchronously sync with server store
  try {
    fetch('/api/automations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(automations)
    }).catch(err => console.warn('[Storage] Background sync to server failed:', err.message));
  } catch (e) {
    // Ignore in SSR
  }
}

export function getStoredLogs(): CommentLog[] {
  if (typeof window === 'undefined') return INITIAL_LOGS;
  const data = localStorage.getItem(STORAGE_KEYS.LOGS);
  return data ? JSON.parse(data) : INITIAL_LOGS;
}

export function saveStoredLogs(logs: CommentLog[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
}

export function clearAllStoredData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.USER);
  localStorage.removeItem(STORAGE_KEYS.ACCOUNT);
  localStorage.removeItem(STORAGE_KEYS.AUTOMATIONS);
  localStorage.removeItem(STORAGE_KEYS.LOGS);
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  // Also remove old v1 keys if any
  localStorage.removeItem('insta_auto_user');
  localStorage.removeItem('insta_auto_account');
  localStorage.removeItem('insta_auto_rules');
  localStorage.removeItem('insta_auto_logs');
}
