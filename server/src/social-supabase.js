/**
 * Social Module - Supabase Version
 * Handles posts, comments, reactions, bookmarks, reports
 */

const express = require('express');

const { requireAuth } = require('./auth-supabase');
const { supabase } = require('./db-supabase');
const {
  parsePostBody,
  processHashtags,
  processMentions,
} = require('./socialUtils-supabase');

const router = express.Router();

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function asInt(v, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

const allowedReactions = new Set(['like', 'love', 'haha', 'wow', 'sad', 'angry']);

function asReaction(v) {
  const s = String(v ?? '').trim();
  if (!allowedReactions.has(s)) return null;
  return s;
}

// Helper to get reaction counts for posts
async function getPostReactionCounts(postIds) {
  if (!postIds || postIds.length === 0) return {};
  
  const { data, error } = await supabase
    .from('post_reactions')
    .select('post_id, reaction')
    .in('post_id', postIds);

  if (error) return {};

  const counts = {};
  data.forEach(row => {
    if (!counts[row.post_id]) {
      counts[row.post_id] = { total: 0, like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 };
    }
    counts[row.post_id].total++;
    if (counts[row.post_id][row.reaction] !== undefined) {
      counts[row.post_id][row.reaction]++;
    }
  });
  return counts;
}

// Helper to get comment counts
async function getCommentCounts(postIds) {
  if (!postIds || postIds.length === 0) return {};
  
  const { data, error } = await supabase
    .from('comments')
    .select('post_id')
    .in('post_id', postIds)
    .eq('status', 'published');

  if (error) return {};

  const counts = {};
  data.forEach(row => {
    counts[row.post_id] = (counts[row.post_id] || 0) + 1;
  });
  return counts;
}

// Helper to get bookmark counts
async function getBookmarkCounts(postIds) {
  if (!postIds || postIds.length === 0) return {};
  
  const { data, error } = await supabase
    .from('post_bookmarks')
    .select('post_id')
    .in('post_id', postIds);

  if (error) return {};

  const counts = {};
  data.forEach(row => {
    counts[row.post_id] = (counts[row.post_id] || 0) + 1;
  });
  return counts;
}

// Helper to get user's reactions and bookmarks
async function getUserPostInteractions(postIds, userId) {
  if (!userId || !postIds || postIds.length === 0) {
    return { reactions: {}, bookmarks: {} };
  }

  const [reactionsResult, bookmarksResult] = await Promise.all([
    supabase
      .from('post_reactions')
      .select('post_id, reaction')
      .eq('user_id', userId)
      .in('post_id', postIds),
    supabase
      .from('post_bookmarks')
      .select('post_id')
      .eq('user_id', userId)
      .in('post_id', postIds),
  ]);

  const reactions = {};
  (reactionsResult.data || []).forEach(row => {
    reactions[row.post_id] = row.reaction;
  });

  const bookmarks = {};
  (bookmarksResult.data || []).forEach(row => {
    bookmarks[row.post_id] = true;
  });

  return { reactions, bookmarks };
}

// GET /posts - List posts
router.get('/posts', asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(asInt(req.query.limit, 20), 1), 50);
  const offset = Math.max(asInt(req.query.offset, 0), 0);
  const viewerUserId = req.user && req.user.id ? Math.max(asInt(req.user.id, 0), 0) : 0;

  // Fetch posts
  const { data: posts, error } = await supabase
    .from('posts')
    .select(`
      id,
      user_id,
      institution_id,
      class_id,
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
      status,
      created_at
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  if (!posts || posts.length === 0) {
    return res.json({ items: [], total: 0 });
  }

  const postIds = posts.map(p => p.id);
  const userIds = [...new Set(posts.map(p => p.user_id))].filter(Boolean);

  // Fetch users separately
  const { data: users } = await supabase
    .from('users')
    .select('id, display_name, avatar_url')
    .in('id', userIds);

  const usersMap = {};
  (users || []).forEach(u => {
    usersMap[u.id] = u;
  });

  // Fetch counts and user interactions in parallel
  const [reactionCounts, commentCounts, bookmarkCounts, userInteractions] = await Promise.all([
    getPostReactionCounts(postIds),
    getCommentCounts(postIds),
    getBookmarkCounts(postIds),
    getUserPostInteractions(postIds, viewerUserId),
  ]);

  // Format response
  const items = posts.map(post => {
    const counts = reactionCounts[post.id] || { total: 0, like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 };
    const userReaction = userInteractions.reactions[post.id];
    const user = usersMap[post.user_id];
    
    return {
      id: post.id,
      user_id: post.user_id,
      user_display_name: user?.display_name || null,
      user_avatar_url: user?.avatar_url || null,
      institution_id: post.institution_id,
      class_id: post.class_id,
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
      status: post.status,
      created_at: post.created_at,
      comments_count: commentCounts[post.id] || 0,
      likes_count: counts.total,
      reaction_like_count: counts.like,
      reaction_love_count: counts.love,
      reaction_haha_count: counts.haha,
      reaction_wow_count: counts.wow,
      reaction_sad_count: counts.sad,
      reaction_angry_count: counts.angry,
      liked_by_me: !!userReaction,
      bookmarked_by_me: !!userInteractions.bookmarks[post.id],
      bookmarks_count: bookmarkCounts[post.id] || 0,
      my_reaction: userReaction || null,
    };
  });

  res.json({ items, total: items.length });
}));

// GET /posts/:postId - Single post
router.get('/posts/:postId', asyncHandler(async (req, res) => {
  const postId = asInt(req.params.postId, 0);
  const viewerUserId = req.user && req.user.id ? Math.max(asInt(req.user.id, 0), 0) : 0;

  if (!postId) {
    return res.status(400).json({ error: 'Invalid post ID' });
  }

  const { data: post, error } = await supabase
    .from('posts')
    .select(`
      id,
      user_id,
      institution_id,
      class_id,
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
      status,
      created_at,
      users!posts_user_id_fkey (id, display_name)
    `)
    .eq('id', postId)
    .single();

  if (error || !post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  // Get counts and interactions
  const [reactionCounts, commentCounts, bookmarkCounts, userInteractions] = await Promise.all([
    getPostReactionCounts([postId]),
    getCommentCounts([postId]),
    getBookmarkCounts([postId]),
    getUserPostInteractions([postId], viewerUserId),
  ]);

  const counts = reactionCounts[postId] || { total: 0, like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 };
  const userReaction = userInteractions.reactions[postId];

  res.json({
    id: post.id,
    user_id: post.user_id,
    user_display_name: post.users?.display_name || null,
    institution_id: post.institution_id,
    class_id: post.class_id,
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
    status: post.status,
    created_at: post.created_at,
    comments_count: commentCounts[postId] || 0,
    likes_count: counts.total,
    reaction_like_count: counts.like,
    reaction_love_count: counts.love,
    reaction_haha_count: counts.haha,
    reaction_wow_count: counts.wow,
    reaction_sad_count: counts.sad,
    reaction_angry_count: counts.angry,
    liked_by_me: !!userReaction,
    bookmarked_by_me: !!userInteractions.bookmarks[postId],
    bookmarks_count: bookmarkCounts[postId] || 0,
    my_reaction: userReaction || null,
  });
}));

// POST /posts - Create post
router.post('/posts', requireAuth, asyncHandler(async (req, res) => {
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const body = String(req.body.body ?? '').trim();
  const institutionId = req.body.institution_id === null || req.body.institution_id === undefined 
    ? null 
    : asInt(req.body.institution_id, 0);
  const classId = req.body.class_id === null || req.body.class_id === undefined 
    ? null 
    : asInt(req.body.class_id, 0);
  const tagsJson = req.body.tags_json === undefined ? null : req.body.tags_json;

  const mediaUrl = req.body.media_url === undefined || req.body.media_url === null 
    ? null 
    : String(req.body.media_url);
  const mediaKind = req.body.media_kind === undefined || req.body.media_kind === null 
    ? null 
    : String(req.body.media_kind);
  const mediaMime = req.body.media_mime === undefined || req.body.media_mime === null 
    ? null 
    : String(req.body.media_mime);
  const mediaName = req.body.media_name === undefined || req.body.media_name === null 
    ? null 
    : String(req.body.media_name);
  const mediaSizeBytes = req.body.media_size_bytes === undefined || req.body.media_size_bytes === null 
    ? null 
    : asInt(req.body.media_size_bytes, 0);

  if (!userId || (body.length < 1 && !mediaUrl)) {
    return res.status(400).json({ error: '(body or media_url) are required' });
  }

  if (mediaUrl) {
    if (mediaKind !== 'image' && mediaKind !== 'pdf' && mediaKind !== 'video') {
      return res.status(400).json({ error: 'media_kind must be image, pdf or video' });
    }
    if (mediaKind === 'pdf' && mediaMime !== 'application/pdf') {
      return res.status(400).json({ error: 'media_mime does not match media_kind' });
    }
    if (mediaKind === 'video' && !String(mediaMime ?? '').toLowerCase().startsWith('video/')) {
      return res.status(400).json({ error: 'media_mime does not match media_kind' });
    }
  }

  // Insert post
  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      institution_id: institutionId || null,
      class_id: classId || null,
      body,
      media_url: mediaUrl,
      media_kind: mediaKind,
      media_mime: mediaMime,
      media_name: mediaName,
      media_size_bytes: mediaSizeBytes || null,
      tags_json: tagsJson,
      status: 'published',
    })
    .select()
    .single();

  if (error) throw error;

  // Process hashtags and mentions
  try {
    const { hashtags, mentions } = parsePostBody(body);

    if (hashtags.length > 0) {
      await processHashtags(post.id, hashtags);
    }

    if (mentions.length > 0) {
      await processMentions(userId, 'post', post.id, mentions);
    }
  } catch (e) {
    console.error('Failed to process hashtags/mentions:', e);
  }

  // Update user posts count
  try {
    await supabase.rpc('increment_posts_count', { user_id: userId });
  } catch (e) {
    // Ignore if function doesn't exist
  }

  res.status(201).json(post);
}));

// POST /posts/:postId/reaction - Add/update reaction
router.post('/posts/:postId/reaction', requireAuth, asyncHandler(async (req, res) => {
  const postId = asInt(req.params.postId, 0);
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const reaction = asReaction(req.body.reaction);

  if (!postId || !userId) {
    return res.status(400).json({ error: 'Invalid post or user' });
  }
  if (!reaction) {
    return res.status(400).json({ error: 'Invalid reaction' });
  }

  // Check if post exists
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('id')
    .eq('id', postId)
    .single();

  if (postError || !post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  // Upsert reaction
  const { error } = await supabase
    .from('post_reactions')
    .upsert(
      { post_id: postId, user_id: userId, reaction },
      { onConflict: 'post_id,user_id' }
    );

  if (error) throw error;

  res.json({ ok: true, reaction });
}));

// DELETE /posts/:postId/reaction - Remove reaction
router.delete('/posts/:postId/reaction', requireAuth, asyncHandler(async (req, res) => {
  const postId = asInt(req.params.postId, 0);
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);

  if (!postId || !userId) {
    return res.status(400).json({ error: 'Invalid post or user' });
  }

  await supabase
    .from('post_reactions')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);

  res.json({ ok: true });
}));

// POST /posts/:postId/bookmark - Bookmark post
router.post('/posts/:postId/bookmark', requireAuth, asyncHandler(async (req, res) => {
  const postId = asInt(req.params.postId, 0);
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);

  if (!postId || !userId) {
    return res.status(400).json({ error: 'Invalid post or user' });
  }

  const { error } = await supabase
    .from('post_bookmarks')
    .insert({ post_id: postId, user_id: userId });

  if (error) {
    if (error.code === '23505') {
      return res.json({ ok: true, message: 'Already bookmarked' });
    }
    throw error;
  }

  res.json({ ok: true });
}));

// DELETE /posts/:postId/bookmark - Remove bookmark
router.delete('/posts/:postId/bookmark', requireAuth, asyncHandler(async (req, res) => {
  const postId = asInt(req.params.postId, 0);
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);

  if (!postId || !userId) {
    return res.status(400).json({ error: 'Invalid post or user' });
  }

  await supabase
    .from('post_bookmarks')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);

  res.json({ ok: true });
}));

// GET /posts/:postId/comments - List comments
router.get('/posts/:postId/comments', asyncHandler(async (req, res) => {
  const postId = asInt(req.params.postId, 0);
  const limit = Math.min(Math.max(asInt(req.query.limit, 20), 1), 50);
  const offset = Math.max(asInt(req.query.offset, 0), 0);
  const viewerUserId = req.user && req.user.id ? Math.max(asInt(req.user.id, 0), 0) : 0;

  if (!postId) {
    return res.status(400).json({ error: 'Invalid post ID' });
  }

  const { data: comments, error } = await supabase
    .from('comments')
    .select(`
      id,
      post_id,
      user_id,
      parent_comment_id,
      body,
      created_at,
      users!comments_user_id_fkey (id, display_name)
    `)
    .eq('post_id', postId)
    .eq('status', 'published')
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  // Get post author to mark is_post_author
  const { data: post } = await supabase
    .from('posts')
    .select('user_id')
    .eq('id', postId)
    .single();

  const postAuthorId = post?.user_id;

  // Get comment likes
  const commentIds = (comments || []).map(c => c.id);
  const { data: likes } = await supabase
    .from('comment_likes')
    .select('comment_id, user_id')
    .in('comment_id', commentIds);

  const likeCounts = {};
  const likedByMe = new Set();
  (likes || []).forEach(l => {
    likeCounts[l.comment_id] = (likeCounts[l.comment_id] || 0) + 1;
    if (l.user_id === viewerUserId) {
      likedByMe.add(l.comment_id);
    }
  });

  const items = (comments || []).map(comment => ({
    id: comment.id,
    post_id: comment.post_id,
    user_id: comment.user_id,
    parent_comment_id: comment.parent_comment_id,
    body: comment.body,
    created_at: comment.created_at,
    user_display_name: comment.users?.display_name || null,
    is_post_author: comment.user_id === postAuthorId,
    likes_count: likeCounts[comment.id] || 0,
    liked_by_me: likedByMe.has(comment.id),
  }));

  res.json({ items });
}));

// POST /posts/:postId/comments - Create comment
router.post('/posts/:postId/comments', requireAuth, asyncHandler(async (req, res) => {
  const postId = asInt(req.params.postId, 0);
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const body = String(req.body.body ?? '').trim();
  const parentCommentId = req.body.parent_comment_id 
    ? asInt(req.body.parent_comment_id, null) 
    : null;

  if (!postId || !userId) {
    return res.status(400).json({ error: 'Invalid post or user' });
  }
  if (!body || body.length < 1) {
    return res.status(400).json({ error: 'body is required' });
  }

  // Check post exists
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('id')
    .eq('id', postId)
    .single();

  if (postError || !post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      user_id: userId,
      parent_comment_id: parentCommentId,
      body,
      status: 'published',
    })
    .select()
    .single();

  if (error) throw error;

  // Process mentions in comment
  try {
    const { mentions } = parsePostBody(body);
    if (mentions.length > 0) {
      await processMentions(userId, 'comment', comment.id, mentions);
    }
  } catch (e) {
    console.error('Failed to process mentions in comment:', e);
  }

  res.status(201).json(comment);
}));

// POST /comments/:commentId/like - Like comment
router.post('/comments/:commentId/like', requireAuth, asyncHandler(async (req, res) => {
  const commentId = asInt(req.params.commentId, 0);
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);

  if (!commentId || !userId) {
    return res.status(400).json({ error: 'Invalid comment or user' });
  }

  const { error } = await supabase
    .from('comment_likes')
    .insert({ comment_id: commentId, user_id: userId });

  if (error) {
    if (error.code === '23505') {
      return res.json({ ok: true, message: 'Already liked' });
    }
    throw error;
  }

  res.json({ ok: true });
}));

// DELETE /comments/:commentId/like - Unlike comment
router.delete('/comments/:commentId/like', requireAuth, asyncHandler(async (req, res) => {
  const commentId = asInt(req.params.commentId, 0);
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);

  if (!commentId || !userId) {
    return res.status(400).json({ error: 'Invalid comment or user' });
  }

  await supabase
    .from('comment_likes')
    .delete()
    .eq('comment_id', commentId)
    .eq('user_id', userId);

  res.json({ ok: true });
}));

// POST /reports - Create report
router.post('/reports', requireAuth, asyncHandler(async (req, res) => {
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const targetType = String(req.body.target_type ?? '').trim();
  const targetId = asInt(req.body.target_id, 0);
  const reason = String(req.body.reason ?? '').trim();
  const details = req.body.details ? String(req.body.details).trim() : null;

  if (!userId) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (!['post', 'comment', 'user'].includes(targetType)) {
    return res.status(400).json({ error: 'Invalid target_type' });
  }
  if (!targetId) {
    return res.status(400).json({ error: 'Invalid target_id' });
  }
  if (!reason || reason.length < 2) {
    return res.status(400).json({ error: 'reason is required' });
  }

  const { data: report, error } = await supabase
    .from('reports')
    .insert({
      reporter_user_id: userId,
      target_type: targetType,
      target_id: targetId,
      reason,
      details,
      status: 'open',
    })
    .select()
    .single();

  if (error) throw error;

  res.status(201).json(report);
}));

// GET /bookmarks - List user's bookmarks
router.get('/bookmarks', requireAuth, asyncHandler(async (req, res) => {
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const limit = Math.min(Math.max(asInt(req.query.limit, 20), 1), 50);
  const offset = Math.max(asInt(req.query.offset, 0), 0);

  if (!userId) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const { data: bookmarks, error } = await supabase
    .from('post_bookmarks')
    .select(`
      created_at,
      posts (
        id,
        user_id,
        body,
        media_url,
        media_kind,
        created_at,
        users!posts_user_id_fkey (id, display_name)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const items = (bookmarks || []).map(b => ({
    bookmarked_at: b.created_at,
    ...b.posts,
    user_display_name: b.posts?.users?.display_name || null,
  }));

  res.json({ items });
}));

module.exports = {
  socialRouter: router,
};
