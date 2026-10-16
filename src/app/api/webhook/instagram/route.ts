import { NextRequest, NextResponse } from 'next/server';
import { 
  matchesCommentTrigger, 
  getSafePublicReply, 
  sendPrivateReply, 
  sendPublicCommentReply, 
  checkUserFollowsBusiness,
  sendInstagramDM
} from '@/lib/metaApi';
import { 
  getActiveAutomationsForAccount,
  getAccountByIgId,
  savePendingUnlockDb,
  findPendingUnlockDb,
  removePendingUnlockDb,
  addAuditLog,
  saveAutomation
} from '@/lib/dbService';

// Acceptable secret verify tokens
const VALID_TOKENS = [
  'insta_auto_secure_verify_token_2026',
  'insta_auto_live_secret_2026',
  process.env.META_VERIFY_TOKEN,
  process.env.META_WEBHOOK_VERIFY_TOKEN
].filter(Boolean);

/**
 * GET /api/webhook/instagram
 * Meta Webhook Challenge Verification
 * When you enter this URL in developers.facebook.com, Meta calls this endpoint with hub.challenge
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    console.log('[Meta Webhook] Challenge Verification Request:', { mode, token, challenge });

    if (mode === 'subscribe' && token && VALID_TOKENS.includes(token)) {
      console.log('[Meta Webhook] Successfully verified with Meta!');
      return new NextResponse(challenge || 'ok', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    return NextResponse.json({ error: 'Verification token mismatch' }, { status: 403 });
  } catch (err: any) {
    console.error('[Meta Webhook] GET Error:', err);
    return NextResponse.json({ error: err?.message || 'Verification failed' }, { status: 500 });
  }
}

async function handleFollowerCheckAndDelivery({
  senderId,
  igAccountId,
  token,
  facebookPageId,
  igUsername
}: {
  senderId: string;
  igAccountId?: string;
  token: string;
  facebookPageId?: string;
  igUsername?: string;
}) {
  const pending = await findPendingUnlockDb(senderId);
  if (!pending) {
    console.log(`[Meta Webhook] No pending follow unlock found for sender ${senderId}.`);
    return;
  }

  const pageId = facebookPageId || 'me';
  const username = igUsername || 'the.editor_harsh';

  console.log(`[Meta Webhook] Checking live follower status for sender ${senderId}...`);
  const checkResult = await checkUserFollowsBusiness({ igsid: senderId, accessToken: token });
  const isFollowing = checkResult.isFollowing;
  console.log(`[Meta Webhook] Follower check for ${senderId}: isFollowing = ${isFollowing} (verifiedByApi: ${checkResult.verifiedByApi})`);

  if (isFollowing) {
    // User is verified as FOLLOWING! Deliver Step 3: Unlocked Link Card
    const unlockMsg = (pending.unlockedMessage || "🎉 Awesome, thanks for following! Here is your exclusive link:")
      .replace(/{{username}}/g, pending.commenterUsername ? `@${pending.commenterUsername}` : '');

    const deliverRes = await sendInstagramDM({
      recipientId: senderId,
      messageText: unlockMsg,
      linkUrl: pending.linkUrl,
      linkButtonText: pending.linkButtonText || 'Get Access 🔗',
      buttons: [
        {
          type: 'web_url',
          url: pending.linkUrl,
          title: pending.linkButtonText || 'Get Access 🔗'
        }
      ],
      pageId,
      accessToken: token
    });

    if (deliverRes.success) {
      await removePendingUnlockDb(senderId, pending.commenterUsername);
      console.log(`[Meta Webhook] Unlocked link delivered to verified follower ${senderId}!`);
    }
  } else {
    // User is NOT following! Deliver Step 2: "Oops! Looks like you haven't followed me yet 👀"
    const notFollowMsg = (pending.notFollowingMessage || "Oops! Looks like you haven't followed me yet 👀\n\nIt would mean a lot if you could visit my profile and hit that follow button 😁.")
      .replace(/{{username}}/g, pending.commenterUsername ? `@${pending.commenterUsername}` : '')
      .replace(/{{profile}}/g, `@${username}`);

    await sendInstagramDM({
      recipientId: senderId,
      messageText: notFollowMsg,
      buttons: [
        {
          type: 'web_url',
          url: `https://www.instagram.com/${username}`,
          title: pending.visitProfileButtonText || 'Visit Profile'
        },
        {
          type: 'postback',
          title: pending.confirmFollowButtonText || "I'm following ✅",
          payload: 'CONFIRM_FOLLOW_CHECK'
        }
      ],
      quickReplies: [
        {
          title: pending.confirmFollowButtonText || "I'm following ✅",
          payload: 'CONFIRM_FOLLOW_CHECK'
        }
      ],
      pageId,
      accessToken: token
    });
    console.log(`[Meta Webhook] Sent "Not Following" notice to ${senderId}. Awaiting follow confirmation.`);
  }
}

/**
 * POST /api/webhook/instagram
 * Multi-Tenant Serverless Instagram Webhook Handler for Vercel
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[Meta Webhook] Received Event Payload:', JSON.stringify(body, null, 2));

    if (body.object === 'instagram') {
      const entries = body.entry || [];

      for (const entry of entries) {
        const igAccountId = entry.id; // Target Instagram Account ID
        const changes = entry.changes || [];

        // 1. Resolve Account & Active Automations from Cloud Firestore
        let { mapping, automations } = await getActiveAutomationsForAccount(igAccountId);

        // Fallback to default credentials if mapping is not yet in DB
        let token = mapping?.pageAccessToken || process.env.META_ACCESS_TOKEN || '';
        let pageId = mapping?.facebookPageId || 'me';
        let igUsername = mapping?.username || 'the.editor_harsh';
        let userId = mapping?.userId || 'default_creator';

        for (const change of changes) {
          // Check for new comment events on Reels/Posts
          if (change.field === 'comments') {
            const commentData = change.value;
            const commentId = commentData.id;
            const commentText = commentData.text || '';
            const commenterUsername = commentData.from?.username || 'user';
            const commenterId = commentData.from?.id;
            const mediaId = commentData.media?.id;

            console.log(`[Meta Webhook] New Comment on Reel/Post (${mediaId}): "${commentText}" by @${commenterUsername} (ID: ${commentId})`);

            // Find matching automation
            let matchedRule = automations.find(rule => {
              if (rule.targetType === 'specific_reel' && rule.reelId && mediaId) {
                if (rule.reelId !== mediaId) return false;
              }
              const res = matchesCommentTrigger(commentText, rule.keywords, rule.triggerType);
              return res.matched;
            });

            // Default fallback trigger if no specific rule matched but automations exist
            if (!matchedRule && automations.length > 0) {
              const defaultKeywords = ['LINK', 'SEND', 'INFO', 'GUIDE', 'FREE', 'BUY', 'PRICE', 'link', 'send', 'info'];
              const match = matchesCommentTrigger(commentText, defaultKeywords, 'contains');
              if (match.matched) {
                matchedRule = automations[0];
              }
            }

            if (matchedRule && token) {
              console.log(`[Meta Webhook] Matched automation "${matchedRule.name}" for user ${userId}! Delivering response...`);

              const isFollowGate = !!matchedRule.requireFollow;

              // Prepare Direct Message
              let dmText = '';
              let quickReplies: Array<{ title: string; payload: string }> | undefined = undefined;
              let buttons: Array<{ type: 'web_url' | 'postback'; title: string; url?: string; payload?: string }> | undefined = undefined;

              if (isFollowGate) {
                // Step 1: Warm welcoming greeting + "Send me the access"
                dmText = (matchedRule.welcomeMessage || 
                  "Hey! I'm so glad you're here - thanks a ton for stopping by 😊\n\nTap below and I'll send you the access in just a moment ✨"
                ).replace(/{{username}}/g, `@${commenterUsername}`);
                
                const btnTitle = matchedRule.accessButtonText || "Send me the access";
                buttons = [
                  {
                    type: 'postback',
                    title: btnTitle,
                    payload: 'CHECK_ACCESS'
                  }
                ];
                quickReplies = [
                  {
                    title: btnTitle,
                    payload: 'CHECK_ACCESS'
                  }
                ];
              } else {
                // Standard mode: Send link directly
                dmText = matchedRule.dmMessage.replace(/{{username}}/g, `@${commenterUsername}`);
              }

              // Prepare Public Comment Reply (if enabled)
              let publicReplyText = '';
              if (matchedRule.autoReplyComment) {
                if (isFollowGate) {
                  publicReplyText = getSafePublicReply([
                    'Sent to your DMs @{{username}}! Follow & check inbox to unlock 🚀',
                    'Check your messages @{{username}}! Follow to unlock your link 📩'
                  ], commenterUsername);
                } else {
                  publicReplyText = getSafePublicReply(matchedRule.commentVariations, commenterUsername);
                }
              }

              // Send DM and Public Reply concurrently for instant delivery
              console.log(`[Meta Webhook] Sending instant responses (DM + Public Reply) to @${commenterUsername}...`);
              const dmPromise = sendPrivateReply({
                commentId,
                messageText: dmText,
                linkUrl: isFollowGate ? undefined : matchedRule.linkUrl,
                pageId,
                buttons,
                quickReplies,
                accessToken: token
              });

              const replyPromise = (matchedRule.autoReplyComment && publicReplyText)
                ? sendPublicCommentReply({ commentId, messageText: publicReplyText, accessToken: token })
                : Promise.resolve({ success: false });

              const [dmResult, commentResult] = await Promise.all([dmPromise, replyPromise]);

              // If follow-gated, record pending unlock in Firestore
              if (isFollowGate && dmResult.success) {
                const assignedSenderId = commenterId || dmResult.recipientId || commentId;
                await savePendingUnlockDb({
                  id: `unlock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                  senderId: assignedSenderId,
                  commenterUsername,
                  ruleId: matchedRule.id,
                  linkUrl: matchedRule.linkUrl,
                  linkButtonText: matchedRule.linkButtonText || 'Get Access 🔗',
                  unlockedMessage: matchedRule.unlockedMessage || "🎉 Awesome, thanks for following! Here is your exclusive link:",
                  notFollowingMessage: matchedRule.notFollowingMessage || "Oops! Looks like you haven't followed me yet 👀\n\nIt would mean a lot if you could visit my profile and hit that follow button 😁.",
                  visitProfileButtonText: matchedRule.visitProfileButtonText || "Visit Profile",
                  confirmFollowButtonText: matchedRule.confirmFollowButtonText || "I'm following ✅",
                  timestamp: new Date().toISOString()
                });
                console.log(`[Meta Webhook] Saved pending follower unlock in Firestore for @${commenterUsername} (ID: ${assignedSenderId})`);
              }

              // Update stats in Firestore
              matchedRule.stats.commentsDetected = (matchedRule.stats.commentsDetected || 0) + 1;
              if (dmResult.success) {
                matchedRule.stats.dmsDelivered = (matchedRule.stats.dmsDelivered || 0) + 1;
              }
              await saveAutomation(userId, matchedRule);

              // Add audit log in Firestore
              await addAuditLog(userId, {
                id: `log_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                automationId: matchedRule.id,
                automationName: matchedRule.name,
                commenterUsername,
                commenterId: commenterId || commentId,
                commentText,
                mediaId: mediaId || '',
                matchedKeyword: matchedRule.keywords[0] || 'TRIGGER',
                status: dmResult.success ? 'success' : 'failed',
                publicReplySent: commentResult.success,
                publicReplyText,
                dmSent: dmResult.success,
                dmText,
                timestamp: new Date().toISOString(),
                delayMs: 1200,
                errorMessage: dmResult.error
              });

              console.log(`[Meta Webhook] Completed comment automation for @${commenterUsername}. DM Success: ${dmResult.success}`);
            }
          }

          // Check for incoming DM messages (e.g. user clicked "Send me the access" or "I'm following ✅")
          if (change.field === 'messages') {
            const messageData = change.value;
            const senderId = messageData?.sender?.id || messageData?.from?.id;

            if (senderId && token) {
              await handleFollowerCheckAndDelivery({ 
                senderId, 
                igAccountId, 
                token, 
                facebookPageId: pageId, 
                igUsername 
              });
            }
          }
        }

        // Also check standard entry.messaging array (Messenger/Instagram format)
        const messagingList = entry.messaging || [];
        for (const msgItem of messagingList) {
          const senderId = msgItem?.sender?.id;
          if (senderId && token) {
            await handleFollowerCheckAndDelivery({ 
              senderId, 
              igAccountId, 
              token, 
              facebookPageId: pageId, 
              igUsername 
            });
          }
        }
      }

      return NextResponse.json({ received: true }, { status: 200 });
    }

    return NextResponse.json({ received: true, note: 'Not an instagram event' }, { status: 200 });
  } catch (error) {
    console.error('[Meta Webhook] Error processing event:', error);
    return NextResponse.json({ received: true, error: 'Internal processing error' }, { status: 200 });
  }
}
