import { adminDb } from '@/lib/firebaseAdmin';
import { AutomationRule, CommentLog, InstagramAccount, User } from '@/types';
import { PendingFollowUnlock } from '@/lib/serverStore';

/**
 * Multi-Tenant Firestore Database Service
 * Handles user isolation, account mappings, automations, logs, and webhook lookups.
 */

export interface AccountMapping {
  userId: string;
  igAccountId: string;
  username: string;
  facebookPageId?: string;
  facebookPageName?: string;
  pageAccessToken: string;
  updatedAt: string;
}

// -------------------------------------------------------------
// USER PROFILES
// -------------------------------------------------------------

export async function saveUserProfile(user: User): Promise<void> {
  try {
    await adminDb.collection('users').doc(user.id).set({
      ...user,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.error('[DbService] saveUserProfile error:', err);
  }
}

export async function getUserProfile(userId: string): Promise<User | null> {
  try {
    const doc = await adminDb.collection('users').doc(userId).get();
    if (!doc.exists) return null;
    return doc.data() as User;
  } catch (err) {
    console.error('[DbService] getUserProfile error:', err);
    return null;
  }
}

// -------------------------------------------------------------
// INSTAGRAM ACCOUNTS & GLOBAL WEBHOOK INDEX
// -------------------------------------------------------------

export async function saveConnectedAccount(
  userId: string, 
  account: InstagramAccount, 
  token: string
): Promise<void> {
  try {
    const accountData = {
      ...account,
      pageAccessToken: token,
      userId,
      updatedAt: new Date().toISOString()
    };

    // 1. Save under user subcollection
    await adminDb
      .collection('users')
      .doc(userId)
      .collection('accounts')
      .doc(account.id)
      .set(accountData, { merge: true });

    // 2. Global reverse lookup index: Maps igAccountId -> User & Token
    // Allows incoming Meta webhooks to resolve account owner instantly in <10ms
    const mapping: AccountMapping = {
      userId,
      igAccountId: account.id,
      username: account.username,
      facebookPageId: account.facebookPageId,
      facebookPageName: account.facebookPageName,
      pageAccessToken: token,
      updatedAt: new Date().toISOString()
    };

    await adminDb.collection('instagram_accounts').doc(account.id).set(mapping, { merge: true });
    console.log(`[DbService] Account ${account.username} (${account.id}) mapped to user ${userId}`);
  } catch (err) {
    console.error('[DbService] saveConnectedAccount error:', err);
    throw err;
  }
}

export async function getAccountByIgId(igAccountId: string): Promise<AccountMapping | null> {
  try {
    const doc = await adminDb.collection('instagram_accounts').doc(igAccountId).get();
    if (!doc.exists) return null;
    return doc.data() as AccountMapping;
  } catch (err) {
    console.error('[DbService] getAccountByIgId error:', err);
    return null;
  }
}

export async function getUserInstagramAccount(userId: string): Promise<InstagramAccount | null> {
  try {
    const snapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('accounts')
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as InstagramAccount;
  } catch (err) {
    console.error('[DbService] getUserInstagramAccount error:', err);
    return null;
  }
}

// -------------------------------------------------------------
// AUTOMATIONS
// -------------------------------------------------------------

export async function saveAutomation(userId: string, rule: AutomationRule): Promise<void> {
  try {
    const ruleWithUser = {
      ...rule,
      userId,
      updatedAt: new Date().toISOString()
    };

    // Save under user's automations
    await adminDb
      .collection('users')
      .doc(userId)
      .collection('automations')
      .doc(rule.id)
      .set(ruleWithUser, { merge: true });
    
    console.log(`[DbService] Saved automation "${rule.name}" for user ${userId}`);
  } catch (err) {
    console.error('[DbService] saveAutomation error:', err);
    throw err;
  }
}

export async function getUserAutomations(userId: string): Promise<AutomationRule[]> {
  try {
    const snapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('automations')
      .get();

    return snapshot.docs.map(doc => doc.data() as AutomationRule);
  } catch (err) {
    console.error('[DbService] getUserAutomations error:', err);
    return [];
  }
}

export async function getActiveAutomationsForAccount(igAccountId: string): Promise<{
  mapping: AccountMapping | null;
  automations: AutomationRule[];
}> {
  try {
    const mapping = await getAccountByIgId(igAccountId);
    if (!mapping) return { mapping: null, automations: [] };

    const automations = await getUserAutomations(mapping.userId);
    const active = automations.filter(a => a.status === 'active');
    return { mapping, automations: active };
  } catch (err) {
    console.error('[DbService] getActiveAutomationsForAccount error:', err);
    return { mapping: null, automations: [] };
  }
}

export async function deleteAutomation(userId: string, ruleId: string): Promise<void> {
  try {
    await adminDb
      .collection('users')
      .doc(userId)
      .collection('automations')
      .doc(ruleId)
      .delete();
  } catch (err) {
    console.error('[DbService] deleteAutomation error:', err);
  }
}

// -------------------------------------------------------------
// AUDIT LOGS
// -------------------------------------------------------------

export async function addAuditLog(userId: string, log: CommentLog): Promise<void> {
  try {
    await adminDb
      .collection('users')
      .doc(userId)
      .collection('logs')
      .doc(log.id)
      .set(log);
  } catch (err) {
    console.error('[DbService] addAuditLog error:', err);
  }
}

export async function getUserLogs(userId: string, limitCount = 50): Promise<CommentLog[]> {
  try {
    const snapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('logs')
      .orderBy('timestamp', 'desc')
      .limit(limitCount)
      .get();

    return snapshot.docs.map(doc => doc.data() as CommentLog);
  } catch (err) {
    // If index isn't created yet, query without order
    try {
      const fallbackSnapshot = await adminDb
        .collection('users')
        .doc(userId)
        .collection('logs')
        .limit(limitCount)
        .get();
      return fallbackSnapshot.docs.map(doc => doc.data() as CommentLog);
    } catch {
      return [];
    }
  }
}

// -------------------------------------------------------------
// FOLLOWER GATE PENDING UNLOCKS (GLOBAL CLOUD REGISTRY)
// -------------------------------------------------------------

export async function savePendingUnlockDb(unlock: PendingFollowUnlock): Promise<void> {
  try {
    await adminDb.collection('pending_unlocks').doc(unlock.senderId).set(unlock);
    if (unlock.commenterUsername) {
      await adminDb.collection('pending_unlocks_by_user').doc(unlock.commenterUsername.toLowerCase()).set(unlock);
    }
  } catch (err) {
    console.error('[DbService] savePendingUnlockDb error:', err);
  }
}

export async function findPendingUnlockDb(senderId: string, username?: string): Promise<PendingFollowUnlock | null> {
  try {
    // 1. Try by senderId
    const doc = await adminDb.collection('pending_unlocks').doc(senderId).get();
    if (doc.exists) return doc.data() as PendingFollowUnlock;

    // 2. Try by username
    if (username) {
      const uDoc = await adminDb.collection('pending_unlocks_by_user').doc(username.toLowerCase()).get();
      if (uDoc.exists) return uDoc.data() as PendingFollowUnlock;
    }

    // 3. Fallback: most recent pending unlock
    const recent = await adminDb.collection('pending_unlocks').orderBy('timestamp', 'desc').limit(1).get();
    if (!recent.empty) return recent.docs[0].data() as PendingFollowUnlock;

    return null;
  } catch (err) {
    console.error('[DbService] findPendingUnlockDb error:', err);
    return null;
  }
}

export async function removePendingUnlockDb(senderId: string, username?: string): Promise<void> {
  try {
    await adminDb.collection('pending_unlocks').doc(senderId).delete();
    if (username) {
      await adminDb.collection('pending_unlocks_by_user').doc(username.toLowerCase()).delete();
    }
  } catch (err) {
    console.error('[DbService] removePendingUnlockDb error:', err);
  }
}
