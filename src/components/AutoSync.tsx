'use client';

import { useEffect } from 'react';
import { getStoredUser, getStoredAccount, saveStoredAccount } from '@/lib/storage';

export default function AutoSync() {
  useEffect(() => {
    async function syncUserData() {
      try {
        const user = getStoredUser();
        // Only fetch account for authenticated users with a real user ID
        if (user && user.id && user.id !== 'usr_default') {
          const res = await fetch(`/api/user/account?userId=${encodeURIComponent(user.id)}`);
          const data = await res.json();
          if (data.connected && data.account) {
            saveStoredAccount(data.account);
          }
        }
      } catch (e) {
        console.debug('[AutoSync] Sync error:', e);
      }
    }

    syncUserData();
  }, []);

  return null;
}
