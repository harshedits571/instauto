'use client';

import { useEffect } from 'react';
import { subscribeToAuthChanges, getRedirectAuthResult } from '@/lib/firebase';
import { getStoredUser, saveStoredUser, saveStoredAccount } from '@/lib/storage';
import { User } from '@/types';

export default function AutoSync() {
  useEffect(() => {
    // 1. Check if user just returned from Google Redirect Sign-In
    getRedirectAuthResult()
      .then((firebaseUser) => {
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
      })
      .catch((e) => console.debug('[AutoSync] Redirect error:', e));

    // 2. Synchronize with Firebase Auth session
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
