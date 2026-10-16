'use client';

import { useEffect } from 'react';
import { subscribeToAuthChanges, getRedirectAuthResult } from '@/lib/firebase';
import { getStoredUser, saveStoredUser, saveStoredAccount } from '@/lib/storage';
import { User } from '@/types';

export default function AutoSync() {
  useEffect(() => {
    // 1. Block external Chrome extensions (e.g. Urban VPN, adblockers) from popping up Next.js dev error overlays
    const handleExtensionError = (event: ErrorEvent) => {
      const isExtension = 
        event.filename?.startsWith('chrome-extension://') ||
        event.filename?.startsWith('moz-extension://') ||
        event.message?.includes('M_ID') ||
        event.message?.includes('bis_skin_checked');

      if (isExtension) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    };
    window.addEventListener('error', handleExtensionError, true);

    // 2. Check if returning from Google Redirect Auth
    getRedirectAuthResult().then((firebaseUser) => {
      if (firebaseUser) {
        const mappedUser: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Creator',
          email: firebaseUser.email || '',
          role: 'creator',
          plan: 'pro',
          avatar: firebaseUser.photoURL || undefined
        };
        saveStoredUser(mappedUser);
        window.location.reload();
      }
    });

    // Synchronize with Firebase Auth session
    const unsubscribe = subscribeToAuthChanges(async (firebaseUser) => {
      if (firebaseUser) {
        const currentUser = getStoredUser();
        if (!currentUser.id || currentUser.id !== firebaseUser.uid) {
          const mappedUser: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Creator',
            email: firebaseUser.email || '',
            role: 'creator',
            plan: 'pro',
            avatar: firebaseUser.photoURL || undefined
          };
          saveStoredUser(mappedUser);
        }

        // Fetch user's connected Instagram account
        try {
          const res = await fetch(`/api/user/account?userId=${encodeURIComponent(firebaseUser.uid)}`);
          const data = await res.json();
          if (data.connected && data.account) {
            saveStoredAccount(data.account);
          }
        } catch (e) {
          console.debug('[AutoSync] Account fetch error:', e);
        }
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  return null;
}
