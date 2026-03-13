/**
 * Notifications Module - Supabase Version
 * Handles push notifications and in-app notifications
 */

const { supabase } = require('./db-supabase');

// Firebase Admin SDK (optional)
let firebaseApp = null;
let messaging = null;

try {
  const admin = require('firebase-admin');
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (projectId && privateKey && clientEmail) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          privateKey: privateKey.replace(/\\n/g, '\n'),
          clientEmail,
        }),
      });
    }
    messaging = admin.messaging();
    console.log('Firebase Admin initialized for notifications');
  }
} catch (e) {
  console.warn('Firebase Admin not initialized:', e.message);
}

/**
 * Get user's notification preferences
 * @param {number} userId - User ID
 * @returns {Promise<object>} - Preferences object
 */
async function getUserNotificationPreferences(userId) {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    // Return defaults
    return {
      push_enabled: true,
      email_enabled: false,
      follow_notify: true,
      mention_notify: true,
      like_notify: true,
      comment_notify: true,
      review_notify: true,
    };
  }

  return data;
}

/**
 * Get user's push tokens
 * @param {number} userId - User ID
 * @returns {Promise<string[]>} - Array of FCM tokens
 */
async function getUserPushTokens(userId) {
  const { data, error } = await supabase
    .from('user_push_tokens')
    .select('token')
    .eq('user_id', userId);

  if (error || !data) {
    return [];
  }

  return data.map(row => row.token);
}

/**
 * Create in-app notification
 * @param {number} userId - Target user ID
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} dataJson - Additional data
 * @returns {Promise<object>} - Created notification
 */
async function createInAppNotification(userId, title, body, dataJson = null) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      channel: 'inapp',
      title,
      body,
      status: 'sent',
      sent_at: new Date().toISOString(),
      data_json: dataJson,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create in-app notification:', error);
    return null;
  }

  return data;
}

/**
 * Send push notification via Firebase
 * @param {string[]} tokens - FCM tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data
 * @returns {Promise<boolean>} - Success status
 */
async function sendPushNotification(tokens, title, body, data = {}) {
  if (!messaging || !tokens || tokens.length === 0) {
    return false;
  }

  try {
    const message = {
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      tokens,
    };

    const response = await messaging.sendEachForMulticast(message);
    
    // Remove invalid tokens
    if (response.failureCount > 0) {
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          if (
            resp.error.code === 'messaging/invalid-registration-token' ||
            resp.error.code === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      // Remove invalid tokens from DB
      if (invalidTokens.length > 0) {
        await supabase
          .from('user_push_tokens')
          .delete()
          .in('token', invalidTokens);
      }
    }

    return response.successCount > 0;
  } catch (e) {
    console.error('Failed to send push notification:', e);
    return false;
  }
}

/**
 * Notify user about mention
 * @param {number} mentionedUserId - User who was mentioned
 * @param {number} mentionerId - User who made the mention
 * @param {string} entityType - 'post' or 'comment'
 * @param {number} entityId - Entity ID
 * @param {string} entityBody - Preview of entity content
 */
async function notifyMention(mentionedUserId, mentionerId, entityType, entityId, entityBody) {
  const prefs = await getUserNotificationPreferences(mentionedUserId);
  
  if (!prefs.mention_notify) {
    return;
  }

  // Get mentioner info
  const { data: mentioner } = await supabase
    .from('users')
    .select('display_name')
    .eq('id', mentionerId)
    .single();

  const mentionerName = mentioner?.display_name || 'Someone';
  const title = `${mentionerName} vous a mentionné`;
  const body = entityBody ? entityBody.substring(0, 100) : `Dans un ${entityType === 'post' ? 'post' : 'commentaire'}`;

  // Create in-app notification
  await createInAppNotification(mentionedUserId, title, body, {
    type: 'mention',
    entity_type: entityType,
    entity_id: String(entityId),
    mentioner_id: String(mentionerId),
  });

  // Send push notification if enabled
  if (prefs.push_enabled) {
    const tokens = await getUserPushTokens(mentionedUserId);
    if (tokens.length > 0) {
      await sendPushNotification(tokens, title, body, {
        type: 'mention',
        entity_type: entityType,
        entity_id: String(entityId),
      });
    }
  }
}

/**
 * Notify user about new follower
 * @param {number} followedUserId - User who was followed
 * @param {number} followerId - Follower user ID
 */
async function notifyFollow(followedUserId, followerId) {
  const prefs = await getUserNotificationPreferences(followedUserId);
  
  if (!prefs.follow_notify) {
    return;
  }

  // Get follower info
  const { data: follower } = await supabase
    .from('users')
    .select('display_name')
    .eq('id', followerId)
    .single();

  const followerName = follower?.display_name || 'Someone';
  const title = `${followerName} vous suit`;
  const body = `Vous avez un nouvel abonné`;

  // Create in-app notification
  await createInAppNotification(followedUserId, title, body, {
    type: 'follow',
    follower_id: String(followerId),
  });

  // Send push notification if enabled
  if (prefs.push_enabled) {
    const tokens = await getUserPushTokens(followedUserId);
    if (tokens.length > 0) {
      await sendPushNotification(tokens, title, body, {
        type: 'follow',
        follower_id: String(followerId),
      });
    }
  }
}

/**
 * Notify user about like/reaction on their post
 * @param {number} postOwnerId - Post owner user ID
 * @param {number} reactorId - User who reacted
 * @param {number} postId - Post ID
 * @param {string} reaction - Reaction type
 */
async function notifyReaction(postOwnerId, reactorId, postId, reaction) {
  if (postOwnerId === reactorId) {
    return; // Don't notify self-reactions
  }

  const prefs = await getUserNotificationPreferences(postOwnerId);
  
  if (!prefs.like_notify) {
    return;
  }

  // Get reactor info
  const { data: reactor } = await supabase
    .from('users')
    .select('display_name')
    .eq('id', reactorId)
    .single();

  const reactorName = reactor?.display_name || 'Someone';
  const reactionEmoji = {
    like: '👍',
    love: '❤️',
    haha: '😂',
    wow: '😮',
    sad: '😢',
    angry: '😠',
  }[reaction] || '';

  const title = `${reactorName} a réagi ${reactionEmoji}`;
  const body = `À votre publication`;

  // Create in-app notification
  await createInAppNotification(postOwnerId, title, body, {
    type: 'reaction',
    reaction,
    post_id: String(postId),
    reactor_id: String(reactorId),
  });

  // Send push notification if enabled
  if (prefs.push_enabled) {
    const tokens = await getUserPushTokens(postOwnerId);
    if (tokens.length > 0) {
      await sendPushNotification(tokens, title, body, {
        type: 'reaction',
        post_id: String(postId),
      });
    }
  }
}

/**
 * Notify user about comment on their post
 * @param {number} postOwnerId - Post owner user ID
 * @param {number} commenterId - Commenter user ID
 * @param {number} postId - Post ID
 * @param {number} commentId - Comment ID
 * @param {string} commentBody - Comment text
 */
async function notifyComment(postOwnerId, commenterId, postId, commentId, commentBody) {
  if (postOwnerId === commenterId) {
    return; // Don't notify self-comments
  }

  const prefs = await getUserNotificationPreferences(postOwnerId);
  
  if (!prefs.comment_notify) {
    return;
  }

  // Get commenter info
  const { data: commenter } = await supabase
    .from('users')
    .select('display_name')
    .eq('id', commenterId)
    .single();

  const commenterName = commenter?.display_name || 'Someone';
  const title = `${commenterName} a commenté`;
  const body = commentBody ? commentBody.substring(0, 100) : 'Sur votre publication';

  // Create in-app notification
  await createInAppNotification(postOwnerId, title, body, {
    type: 'comment',
    post_id: String(postId),
    comment_id: String(commentId),
    commenter_id: String(commenterId),
  });

  // Send push notification if enabled
  if (prefs.push_enabled) {
    const tokens = await getUserPushTokens(postOwnerId);
    if (tokens.length > 0) {
      await sendPushNotification(tokens, title, body, {
        type: 'comment',
        post_id: String(postId),
        comment_id: String(commentId),
      });
    }
  }
}

/**
 * Notify user about review reminder
 * @param {number} userId - User ID
 * @param {number} dueCount - Number of items due
 */
async function notifyReviewReminder(userId, dueCount) {
  const prefs = await getUserNotificationPreferences(userId);
  
  if (!prefs.review_notify) {
    return;
  }

  const title = `Rappel de révision`;
  const body = `Vous avez ${dueCount} carte${dueCount > 1 ? 's' : ''} à réviser`;

  // Create in-app notification
  await createInAppNotification(userId, title, body, {
    type: 'review_reminder',
    due_count: String(dueCount),
  });

  // Send push notification if enabled
  if (prefs.push_enabled) {
    const tokens = await getUserPushTokens(userId);
    if (tokens.length > 0) {
      await sendPushNotification(tokens, title, body, {
        type: 'review_reminder',
        due_count: String(dueCount),
      });
    }
  }
}

/**
 * Get user notifications
 * @param {number} userId - User ID
 * @param {object} options - { limit, offset, unreadOnly }
 * @returns {Promise<object[]>} - Notifications array
 */
async function getUserNotifications(userId, options = {}) {
  const limit = options.limit || 20;
  const offset = options.offset || 0;

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (options.unreadOnly) {
    query = query.is('read_at', null);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to get notifications:', error);
    return [];
  }

  return data || [];
}

/**
 * Mark notifications as read
 * @param {number} userId - User ID
 * @param {number[]} notificationIds - Notification IDs to mark as read (null = all)
 */
async function markNotificationsRead(userId, notificationIds = null) {
  let query = supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (notificationIds && notificationIds.length > 0) {
    query = query.in('id', notificationIds);
  }

  const { error } = await query;

  if (error) {
    console.error('Failed to mark notifications as read:', error);
  }
}

/**
 * Get unread notification count
 * @param {number} userId - User ID
 * @returns {Promise<number>} - Unread count
 */
async function getUnreadNotificationCount(userId) {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) {
    return 0;
  }

  return count || 0;
}

module.exports = {
  getUserNotificationPreferences,
  getUserPushTokens,
  createInAppNotification,
  sendPushNotification,
  notifyMention,
  notifyFollow,
  notifyReaction,
  notifyComment,
  notifyReviewReminder,
  getUserNotifications,
  markNotificationsRead,
  getUnreadNotificationCount,
};
