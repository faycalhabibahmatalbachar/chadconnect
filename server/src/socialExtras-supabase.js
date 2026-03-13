/**
 * Social Extras Module - Supabase Version
 * Followers, personalized feed, mentions, hashtags, search
 */

const express = require('express');

const { requireAuth } = require('./auth-supabase');
const { supabase } = require('./db-supabase');
const { notifyFollow } = require('./notifications-supabase');
const { getPostsByTag, getTrendingTags } = require('./socialUtils-supabase');

const router = express.Router();

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function asInt(v, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

// ==================== FOLLOWERS ====================

// POST /users/:userId/follow - Follow user
router.post('/users/:userId/follow', requireAuth, asyncHandler(async (req, res) => {
  const followingId = asInt(req.params.userId, 0);
  const followerId = Math.max(asInt(req.user && req.user.id, 0), 0);

  if (!followerId || !followingId) {
    return res.status(400).json({ error: 'Invalid user IDs' });
  }

  if (followerId === followingId) {
    return res.status(400).json({ error: 'Cannot follow yourself' });
  }

  // Check if target user exists
  const { data: targetUser, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('id', followingId)
    .single();

  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Create follow relationship
  const { error } = await supabase
    .from('user_follows')
    .insert({ follower_id: followerId, following_id: followingId });

  if (error) {
    if (error.code === '23505') {
      return res.json({ ok: true, message: 'Already following' });
    }
    throw error;
  }

  // Update follower/following counts
  try {
    await Promise.all([
      supabase.rpc('increment_following_count', { user_id: followerId }),
      supabase.rpc('increment_followers_count', { user_id: followingId }),
    ]);
  } catch (e) {
    // Ignore if functions don't exist
  }

  // Send notification (async)
  notifyFollow(followingId, followerId).catch(e => 
    console.error('Failed to send follow notification:', e)
  );

  res.json({ ok: true });
}));

// DELETE /users/:userId/follow - Unfollow user
router.delete('/users/:userId/follow', requireAuth, asyncHandler(async (req, res) => {
  const followingId = asInt(req.params.userId, 0);
  const followerId = Math.max(asInt(req.user && req.user.id, 0), 0);

  if (!followerId || !followingId) {
    return res.status(400).json({ error: 'Invalid user IDs' });
  }

  await supabase
    .from('user_follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);

  // Update counts
  try {
    await Promise.all([
      supabase.rpc('decrement_following_count', { user_id: followerId }),
      supabase.rpc('decrement_followers_count', { user_id: followingId }),
    ]);
  } catch (e) {
    // Ignore if functions don't exist
  }

  res.json({ ok: true });
}));

// GET /users/:userId/followers - Get user's followers
router.get('/users/:userId/followers', asyncHandler(async (req, res) => {
  const userId = asInt(req.params.userId, 0);
  const limit = Math.min(Math.max(asInt(req.query.limit, 20), 1), 50);
  const offset = Math.max(asInt(req.query.offset, 0), 0);
  const viewerUserId = req.user && req.user.id ? Math.max(asInt(req.user.id, 0), 0) : 0;

  if (!userId) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  const { data: follows, error } = await supabase
    .from('user_follows')
    .select('follower_id, created_at')
    .eq('following_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const followerIds = (follows || []).map(f => f.follower_id).filter(Boolean);

  // Fetch users separately
  const { data: users } = await supabase
    .from('users')
    .select('id, display_name, username, avatar_url, bio, followers_count, following_count, posts_count')
    .in('id', followerIds);

  const usersMap = {};
  (users || []).forEach(u => {
    usersMap[u.id] = u;
  });

  // Check if viewer follows each user
  let viewerFollowing = new Set();
  if (viewerUserId && followerIds.length > 0) {
    const { data: viewerFollows } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', viewerUserId)
      .in('following_id', followerIds);

    viewerFollowing = new Set((viewerFollows || []).map(f => f.following_id));
  }

  const items = (follows || []).map(f => {
    const user = usersMap[f.follower_id];
    return {
      id: user?.id || f.follower_id,
      display_name: user?.display_name || null,
      username: user?.username || null,
      avatar_url: user?.avatar_url || null,
      bio: user?.bio || null,
      followers_count: user?.followers_count || 0,
      following_count: user?.following_count || 0,
      posts_count: user?.posts_count || 0,
      is_following: viewerFollowing.has(f.follower_id),
      followed_at: f.created_at,
    };
  });

  res.json({ items });
}));

// GET /users/:userId/following - Get users that a user follows
router.get('/users/:userId/following', asyncHandler(async (req, res) => {
  const userId = asInt(req.params.userId, 0);
  const limit = Math.min(Math.max(asInt(req.query.limit, 20), 1), 50);
  const offset = Math.max(asInt(req.query.offset, 0), 0);

  if (!userId) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  const { data: follows, error } = await supabase
    .from('user_follows')
    .select('following_id, created_at')
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const followingIds = (follows || []).map(f => f.following_id).filter(Boolean);

  // Fetch users separately
  const { data: users } = await supabase
    .from('users')
    .select('id, display_name, username, avatar_url, bio, followers_count, following_count, posts_count')
    .in('id', followingIds);

  const usersMap = {};
  (users || []).forEach(u => {
    usersMap[u.id] = u;
  });

  const items = (follows || []).map(f => {
    const user = usersMap[f.following_id];
    return {
      id: user?.id || f.following_id,
      display_name: user?.display_name || null,
      username: user?.username || null,
      avatar_url: user?.avatar_url || null,
      bio: user?.bio || null,
      followers_count: user?.followers_count || 0,
      following_count: user?.following_count || 0,
      posts_count: user?.posts_count || 0,
      is_following: true,
      followed_at: f.created_at,
    };
  });

  res.json({ items });
}));

// GET /users/:userId/following-status - Check if current user follows another
router.get('/users/:userId/following-status', requireAuth, asyncHandler(async (req, res) => {
  const targetUserId = asInt(req.params.userId, 0);
  const viewerUserId = Math.max(asInt(req.user && req.user.id, 0), 0);

  if (!targetUserId || !viewerUserId) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  const { data, error } = await supabase
    .from('user_follows')
    .select('follower_id')
    .eq('follower_id', viewerUserId)
    .eq('following_id', targetUserId)
    .single();

  res.json({ is_following: !!data });
}));

// ==================== FEED ====================

// GET /feed - Personalized feed from followed users
router.get('/feed', requireAuth, asyncHandler(async (req, res) => {
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const limit = Math.min(Math.max(asInt(req.query.limit, 20), 1), 50);
  const offset = Math.max(asInt(req.query.offset, 0), 0);

  if (!userId) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  // Get user's following list
  const { data: follows, error: followsError } = await supabase
    .from('user_follows')
    .select('following_id')
    .eq('follower_id', userId);

  if (followsError) throw followsError;

  const followingIds = (follows || []).map(f => f.following_id);

  if (followingIds.length === 0) {
    return res.json({ items: [], total: 0 });
  }

  // Get posts from followed users
  const { data: posts, error } = await supabase
    .from('posts')
    .select(`
      id,
      user_id,
      body,
      media_url,
      media_kind,
      media_mime,
      media_name,
      media_size_bytes,
      video_status,
      video_duration_ms,
      video_width,
      video_height,
      video_thumb_url,
      video_hls_url,
      video_variants_json,
      tags_json,
      created_at
    `)
    .in('user_id', followingIds)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  // Fetch users separately
  const postUserIds = [...new Set((posts || []).map(p => p.user_id))].filter(Boolean);
  const { data: users } = await supabase
    .from('users')
    .select('id, display_name, avatar_url')
    .in('id', postUserIds);

  const usersMap = {};
  (users || []).forEach(u => {
    usersMap[u.id] = u;
  });

  const items = (posts || []).map(post => {
    const user = usersMap[post.user_id];
    return {
      id: post.id,
      user_id: post.user_id,
      user_display_name: user?.display_name || null,
      user_avatar_url: user?.avatar_url || null,
      body: post.body,
      media_url: post.media_url,
      media_kind: post.media_kind,
      media_mime: post.media_mime,
      media_name: post.media_name,
      media_size_bytes: post.media_size_bytes,
      video_status: post.video_status,
      video_duration_ms: post.video_duration_ms,
      video_width: post.video_width,
      video_height: post.video_height,
      video_thumb_url: post.video_thumb_url,
      video_hls_url: post.video_hls_url,
      video_variants_json: post.video_variants_json,
      tags_json: post.tags_json,
      created_at: post.created_at,
    };
  });

  res.json({ items, total: items.length });
}));

// ==================== HASHTAGS ====================

// GET /tags/trending - Get trending hashtags
router.get('/tags/trending', asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(asInt(req.query.limit, 10), 1), 50);

  const tags = await getTrendingTags(limit);

  res.json({ items: tags });
}));

// GET /tags/:tagName/posts - Get posts by hashtag
router.get('/tags/:tagName/posts', asyncHandler(async (req, res) => {
  const tagName = String(req.params.tagName || '').toLowerCase().trim();
  const limit = Math.min(Math.max(asInt(req.query.limit, 20), 1), 50);
  const offset = Math.max(asInt(req.query.offset, 0), 0);

  if (!tagName) {
    return res.status(400).json({ error: 'Tag name is required' });
  }

  const posts = await getPostsByTag(tagName, { limit, offset });

  res.json({ items: posts, tag: tagName });
}));

// ==================== MENTIONS ====================

// GET /mentions - Get mentions for current user
router.get('/mentions', requireAuth, asyncHandler(async (req, res) => {
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const limit = Math.min(Math.max(asInt(req.query.limit, 20), 1), 50);
  const offset = Math.max(asInt(req.query.offset, 0), 0);
  const unreadOnly = req.query.unread === 'true';

  if (!userId) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  let query = supabase
    .from('mentions')
    .select(`
      id,
      entity_type,
      entity_id,
      seen_at,
      created_at,
      mentioner_user_id,
      users!mentions_mentioner_user_id_fkey (id, display_name, avatar_url)
    `)
    .eq('mentioned_user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (unreadOnly) {
    query = query.is('seen_at', null);
  }

  const { data: mentions, error } = await query;

  if (error) throw error;

  // Get entity bodies
  const items = await Promise.all((mentions || []).map(async (m) => {
    let entityBody = null;
    
    if (m.entity_type === 'post') {
      const { data: post } = await supabase
        .from('posts')
        .select('body')
        .eq('id', m.entity_id)
        .single();
      entityBody = post?.body?.substring(0, 100);
    } else if (m.entity_type === 'comment') {
      const { data: comment } = await supabase
        .from('comments')
        .select('body')
        .eq('id', m.entity_id)
        .single();
      entityBody = comment?.body?.substring(0, 100);
    }

    return {
      id: m.id,
      entity_type: m.entity_type,
      entity_id: m.entity_id,
      seen_at: m.seen_at,
      created_at: m.created_at,
      mentioner_id: m.mentioner_user_id,
      mentioner_display_name: m.users?.display_name || null,
      mentioner_avatar_url: m.users?.avatar_url || null,
      entity_body: entityBody,
    };
  }));

  res.json({ items });
}));

// POST /mentions/read - Mark mentions as read
router.post('/mentions/read', requireAuth, asyncHandler(async (req, res) => {
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const mentionIds = req.body.mention_ids; // null = mark all as read

  if (!userId) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  let query = supabase
    .from('mentions')
    .update({ seen_at: new Date().toISOString() })
    .eq('mentioned_user_id', userId)
    .is('seen_at', null);

  if (mentionIds && Array.isArray(mentionIds) && mentionIds.length > 0) {
    query = query.in('id', mentionIds);
  }

  await query;

  res.json({ ok: true });
}));

// GET /mentions/unread-count - Get unread mentions count
router.get('/mentions/unread-count', requireAuth, asyncHandler(async (req, res) => {
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);

  if (!userId) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const { count, error } = await supabase
    .from('mentions')
    .select('*', { count: 'exact', head: true })
    .eq('mentioned_user_id', userId)
    .is('seen_at', null);

  res.json({ count: count || 0 });
}));

// ==================== SEARCH ====================

// GET /search - Global search (users, posts, tags)
router.get('/search', asyncHandler(async (req, res) => {
  const query = String(req.query.q || '').trim();
  const limit = Math.min(Math.max(asInt(req.query.limit, 20), 1), 50);

  if (!query || query.length < 2) {
    return res.json({ query, users: [], posts: [], tags: [] });
  }

  // Search users
  const { data: users } = await supabase
    .from('users')
    .select('id, display_name, username, avatar_url, followers_count')
    .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
    .eq('status', 'active')
    .limit(limit);

  // Search posts
  const { data: posts } = await supabase
    .from('posts')
    .select(`
      id,
      user_id,
      body,
      media_url,
      media_kind,
      created_at,
      users!posts_user_id_fkey (id, display_name)
    `)
    .ilike('body', `%${query}%`)
    .eq('status', 'published')
    .limit(limit);

  // Search tags
  const { data: tags } = await supabase
    .from('tags')
    .select('id, name')
    .ilike('name', `%${query}%`)
    .limit(limit);

  res.json({
    query,
    users: (users || []).map(u => ({
      id: u.id,
      display_name: u.display_name,
      username: u.username,
      avatar_url: u.avatar_url,
      followers_count: u.followers_count || 0,
    })),
    posts: (posts || []).map(p => ({
      id: p.id,
      user_id: p.user_id,
      user_display_name: p.users?.display_name || null,
      body: p.body?.substring(0, 200),
      media_url: p.media_url,
      media_kind: p.media_kind,
      created_at: p.created_at,
    })),
    tags: (tags || []).map(t => ({
      id: t.id,
      name: t.name,
    })),
  });
}));

module.exports = {
  socialExtrasRouter: router,
};
