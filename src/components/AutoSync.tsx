'use client';

import { useEffect } from 'react';
import { 
  getStoredAccount, 
  getStoredToken, 
  getStoredAutomations, 
  saveStoredAccount, 
  saveStoredToken 
} from '@/lib/storage';

export default function AutoSync() {
  useEffect(() => {
    async function syncData() {
      try {
        const clientAcc = getStoredAccount();
        const clientTok = getStoredToken();
        const clientRules = getStoredAutomations();

        // 1. If client has connected account & token, push to server
        if (clientAcc?.isConnected && clientTok) {
          await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              account: clientAcc,
              token: clientTok,
              automations: clientRules
            })
          });
          return;
        }

        // 2. Otherwise, check if server already has an account & pull to client
        const res = await fetch('/api/sync');
        const data = await res.json();
        if (data.connected && data.account) {
          saveStoredAccount(data.account);
          if (data.account.pageAccessToken) {
            saveStoredToken(data.account.pageAccessToken);
          }
        }
      } catch (e) {
        console.debug('[AutoSync] Background sync check:', e);
      }
    }

    syncData();
  }, []);

  return null;
}
