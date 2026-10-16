const fs = require('fs');
const path = require('path');

const STORE_PATH = path.resolve(__dirname, '../data/store.json');

function getStore() {
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
  } catch (e) {
    return null;
  }
}

function saveStore(store) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
  } catch (e) {
    console.error('[LiveEngine] Error saving store:', e.message);
  }
}

// Track processed comments in-memory and in file
const processedCommentIds = new Set();

// Load already replied comment IDs from store logs
const initialStore = getStore();
if (initialStore && initialStore.logs) {
  initialStore.logs.forEach(log => {
    if (log.commenterId) processedCommentIds.add(log.commenterId);
    if (log.id) processedCommentIds.add(log.id);
  });
}
if (initialStore && initialStore.processedComments) {
  initialStore.processedComments.forEach(id => processedCommentIds.add(id));
}

// Pre-mark all existing comments on reel 18088533106767504 so we don't double-reply to old ones
processedCommentIds.add('17993637933105224'); // tropexedits (already replied)
processedCommentIds.add('18087347537291910'); // snipixstudio_ (already replied)
processedCommentIds.add('18500307550097123'); // creativeedits.mov
processedCommentIds.add('18109039289194849'); // nizam.mp4_
processedCommentIds.add('18102184982630313'); // nizam.mp4_
processedCommentIds.add('18001963226800965'); // mai_unknown_hu_7
processedCommentIds.add('18121294333940850'); // mai_unknown_hu_7
processedCommentIds.add('18188908270412667'); // solo.10111
processedCommentIds.add('18436445506100322'); // veeru
processedCommentIds.add('18064195646165756'); // veeru
processedCommentIds.add('18069861953522341'); // self

function matchesKeywords(text, keywords, triggerType) {
  const clean = (text || '').trim().toLowerCase();
  if (triggerType === 'any') return true;
  for (const kw of keywords) {
    const k = kw.trim().toLowerCase();
    if (!k) continue;
    if (triggerType === 'exact') {
      if (clean === k) return true;
    } else {
      const regex = new RegExp(`\\b${k}\\b`, 'i');
      if (regex.test(clean) || clean.includes(k)) return true;
    }
  }
  return false;
}

async function pollOnce() {
  const store = getStore();
  if (!store || !store.accessToken || !store.account?.id) return;

  const token = store.accessToken;
  const igUserId = store.account.id;
  const pageId = store.account.facebookPageId;
  const automations = (store.automations || []).filter(a => a.status === 'active');

  if (automations.length === 0) return;

  // 1. Gather all target media IDs from rules
  const targetMediaMap = new Map();

  for (const rule of automations) {
    if (rule.targetType === 'specific_reel' && rule.reelId) {
      if (!targetMediaMap.has(rule.reelId)) {
        targetMediaMap.set(rule.reelId, { id: rule.reelId, shortcode: '', rules: [] });
      }
      targetMediaMap.get(rule.reelId).rules.push(rule);
    }
  }

  // 2. If any rule targets all_reels, fetch recent media list
  const hasAllReelsRule = automations.some(r => r.targetType === 'all_reels');
  if (hasAllReelsRule) {
    try {
      const mediaRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media?fields=id,caption,shortcode&limit=30&access_token=${token}`);
      const mediaData = await mediaRes.json();
      if (mediaData.error) {
        if (mediaData.error.code === 190) {
          console.error('\n❌ [LiveEngine ERROR] Meta Access Token EXPIRED! Please refresh your token in Graph API Explorer.');
        } else {
          console.error('\n❌ [LiveEngine Meta API Error]:', mediaData.error.message);
        }
        return;
      }
      (mediaData.data || []).forEach(m => {
        if (!targetMediaMap.has(m.id)) {
          targetMediaMap.set(m.id, { id: m.id, shortcode: m.shortcode || '', rules: [] });
        }
        // attach all_reels rules
        automations.filter(r => r.targetType === 'all_reels').forEach(r => {
          if (!targetMediaMap.get(m.id).rules.some(existing => existing.id === r.id)) {
            targetMediaMap.get(m.id).rules.push(r);
          }
        });
      });
    } catch (e) {
      return;
    }
  }

  for (const [mediaId, targetItem] of targetMediaMap.entries()) {
    const applicableRules = targetItem.rules;
    if (applicableRules.length === 0) continue;

    // Fetch latest comments on this media
    let comments = [];
    try {
      const cRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}/comments?fields=id,text,username,from,timestamp&limit=25&access_token=${token}`);
      const cData = await cRes.json();
      if (cData.error && cData.error.code === 190) {
        console.error('\n❌ [LiveEngine ERROR] Meta Access Token EXPIRED!');
        return;
      }
      comments = cData.data || [];
    } catch (e) {
      continue;
    }

    for (const comment of comments) {
      if (processedCommentIds.has(comment.id)) continue;
      if (comment.username === store.account.username) {
        processedCommentIds.add(comment.id);
        continue;
      }

      // Check against applicable rules
      for (const rule of applicableRules) {
        const isMatch = matchesKeywords(comment.text, rule.keywords, rule.triggerType);
        if (isMatch) {
          console.log(`\n⚡ [LiveEngine] DETECTED NEW COMMENT!`);
          console.log(`  Author: @${comment.username} (from.id: ${comment.from?.id})`);
          console.log(`  Text: "${comment.text}"`);
          console.log(`  Media: ${mediaId} (${targetItem.shortcode || ''})`);
          console.log(`  Rule: "${rule.name}"`);

          // Mark processed immediately to prevent duplicate sends
          processedCommentIds.add(comment.id);
          if (!store.processedComments) store.processedComments = [];
          store.processedComments.push(comment.id);

          const isFollowGate = !!rule.requireFollow;

          // Prepare DM
          let dmText = '';
          let quickReplies = undefined;
          if (isFollowGate) {
            dmText = (rule.welcomeMessage || rule.followPromptMessage || 
              "Hey! I'm so glad you're here - thanks a ton for stopping by 😊\n\nTap below and I'll send you the access in just a moment ✨"
            ).replace(/{{username}}/g, `@${comment.username}`);
            quickReplies = [
              {
                content_type: 'text',
                title: rule.accessButtonText || rule.followButtonText || "Send me the access",
                payload: 'CHECK_ACCESS'
              }
            ];
          } else {
            dmText = rule.dmMessage.replace(/{{username}}/g, `@${comment.username}`);
            if (rule.linkUrl) {
              dmText += `\n\n🔗 ${rule.linkUrl}`;
            }
          }

          // Prepare Public Reply
          const variations = rule.commentVariations && rule.commentVariations.length > 0 
            ? rule.commentVariations 
            : ['Sent to your DMs @{{username}}! Check your inbox 🚀'];
          const randomVariation = variations[Math.floor(Math.random() * variations.length)];
          const publicReply = randomVariation.replace(/{{username}}/g, `@${comment.username}`);

          // Send in parallel
          try {
            console.log(`  Sending instant DM and Public Reply to @${comment.username}...`);
            const pubPromise = fetch(`https://graph.facebook.com/v19.0/${comment.id}/replies`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: publicReply, access_token: token })
            }).then(r => r.json());

            const messageBody = {
              recipient: { comment_id: comment.id },
              message: { text: dmText }
            };
            if (quickReplies) {
              messageBody.message.quick_replies = quickReplies;
            }

            const dmPromise = fetch(`https://graph.facebook.com/v19.0/${pageId}/messages`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...messageBody, access_token: token })
            }).then(r => r.json());

            const [pubResult, dmResult] = await Promise.all([pubPromise, dmPromise]);

            console.log(`  ✅ Public Reply Sent:`, pubResult.id ? `ID ${pubResult.id}` : JSON.stringify(pubResult));
            console.log(`  ✅ DM Sent:`, dmResult.message_id ? `ID ${dmResult.message_id}` : JSON.stringify(dmResult));

            // If follow gate, record pending unlock
            if (isFollowGate) {
              if (!store.pendingUnlocks) store.pendingUnlocks = [];
              const assignedSenderId = comment.from?.id || dmResult.recipient_id || comment.id;
              store.pendingUnlocks.push({
                id: `unlock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                senderId: assignedSenderId,
                commenterUsername: comment.from?.username || comment.username,
                ruleId: rule.id,
                linkUrl: rule.linkUrl,
                linkButtonText: rule.linkButtonText || 'Get Access 🔗',
                unlockedMessage: rule.unlockedMessage || "🎉 Awesome, thanks for following! Here is your exclusive link:",
                notFollowingMessage: rule.notFollowingMessage || "Oops! Looks like you haven't followed me yet 👀\n\nIt would mean a lot if you could visit my profile and hit that follow button 😁.",
                visitProfileButtonText: rule.visitProfileButtonText || "Visit Profile",
                confirmFollowButtonText: rule.confirmFollowButtonText || "I'm following ✅",
                timestamp: new Date().toISOString()
              });
            }

            // Update stats
            rule.stats.commentsDetected = (rule.stats.commentsDetected || 0) + 1;
            if (dmResult.message_id) {
              rule.stats.dmsDelivered = (rule.stats.dmsDelivered || 0) + 1;
            }

            // Log event
            if (!store.logs) store.logs = [];
            store.logs.unshift({
              id: `log_${Date.now()}`,
              automationId: rule.id,
              automationName: rule.name,
              commenterUsername: comment.username,
              commenterId: comment.id,
              commentText: comment.text,
              mediaId: mediaId,
              matchedKeyword: rule.keywords[0] || 'LINK',
              status: dmResult.message_id ? 'success' : 'failed',
              publicReplySent: !!pubResult.id,
              publicReplyText: publicReply,
              dmSent: !!dmResult.message_id,
              dmText,
              timestamp: new Date().toISOString()
            });

            saveStore(store);
          } catch (err) {
            console.error(`  ❌ Error delivering response:`, err.message);
          }
          break; // rule matched, move to next comment
        }
      }
    }
  }
}

console.log('🚀 [LiveEngine] Instant Instagram Comment Automation Engine Started!');
console.log('👀 Actively watching top reels every 3 seconds for new comments...');

// Run continuously
setInterval(pollOnce, 3000);
pollOnce();
