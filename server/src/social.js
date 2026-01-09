const express = require('express');

const { requireAuth } = require('./auth');

const router = express.Router();

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function asInt(v, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function isBadFieldError(err) {
  return err && (err.code === 'ER_BAD_FIELD_ERROR' || err.errno === 1054);
}

function isNoSuchTableError(err) {
  return err && (err.code === 'ER_NO_SUCH_TABLE' || err.errno === 1146);
}

const allowedReactions = new Set(['love']);

function asReaction(v) {
  const s = String(v ?? '').trim();
  if (!allowedReactions.has(s)) return null;
  return s;
}

router.get('/posts', asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;
  const limit = Math.min(Math.max(asInt(req.query.limit, 20), 1), 50);
  const offset = Math.max(asInt(req.query.offset, 0), 0);
  const viewerUserId = req.user && req.user.id ? Math.max(asInt(req.user.id, 0), 0) : 0;

  let rows;
  try {
    const [r] = await pool.query(
      `SELECT
        p.id,
        p.user_id,
        u.display_name AS user_display_name,
        p.institution_id,
        p.class_id,
        p.body,
        p.media_url,
        p.media_kind,
        p.media_mime,
        p.media_name,
        p.media_size_bytes,
        p.video_status,
        p.video_duration_ms,
        p.video_width,
        p.video_height,
        p.video_thumb_url,
        p.video_hls_url,
        p.video_variants_json,
        p.tags_json,
        p.status,
        p.created_at,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.status = 'published') AS comments_count,
        (SELECT COUNT(*) FROM post_reactions pr WHERE pr.post_id = p.id) AS likes_count,
        CASE
          WHEN ? > 0 THEN EXISTS(SELECT 1 FROM post_reactions pr2 WHERE pr2.post_id = p.id AND pr2.user_id = ?)
          ELSE 0
        END AS liked_by_me,
        CASE
          WHEN ? > 0 THEN EXISTS(SELECT 1 FROM post_bookmarks pb WHERE pb.post_id = p.id AND pb.user_id = ?)
          ELSE 0
        END AS bookmarked_by_me,
        CASE
          WHEN ? > 0 THEN (
            SELECT CASE WHEN pr3.reaction = 'like' THEN 'love' ELSE pr3.reaction END
            FROM post_reactions pr3
            WHERE pr3.post_id = p.id AND pr3.user_id = ?
            LIMIT 1
          )
          ELSE NULL
        END AS my_reaction
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.status = 'published'
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?`,
      [viewerUserId, viewerUserId, viewerUserId, viewerUserId, viewerUserId, viewerUserId, limit, offset],
    );
    rows = r;
  } catch (e) {
    if (!isBadFieldError(e) && !isNoSuchTableError(e)) throw e;
    const [r] = await pool.query(
      `SELECT
        p.id,
        p.user_id,
        u.display_name AS user_display_name,
        p.institution_id,
        p.class_id,
        p.body,
        p.media_url,
        p.media_kind,
        p.media_mime,
        p.media_name,
        p.media_size_bytes,
        NULL AS video_status,
        NULL AS video_duration_ms,
        NULL AS video_width,
        NULL AS video_height,
        NULL AS video_thumb_url,
        NULL AS video_hls_url,
        NULL AS video_variants_json,
        p.tags_json,
        p.status,
        p.created_at,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.status = 'published') AS comments_count,
        (SELECT COUNT(*) FROM post_likes l WHERE l.post_id = p.id) AS likes_count,
        CASE
          WHEN ? > 0 THEN EXISTS(SELECT 1 FROM post_likes l2 WHERE l2.post_id = p.id AND l2.user_id = ?)
          ELSE 0
        END AS liked_by_me,
        0 AS bookmarked_by_me,
        NULL AS my_reaction
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.status = 'published'
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?`,
      [viewerUserId, viewerUserId, limit, offset],
    );
    rows = r;
  }

  res.json({ items: rows, limit, offset });
}));

router.post('/posts', requireAuth, asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const body = String(req.body.body ?? '').trim();
  const institutionId = req.body.institution_id === null || req.body.institution_id === undefined ? null : asInt(req.body.institution_id, 0);
  const classId = req.body.class_id === null || req.body.class_id === undefined ? null : asInt(req.body.class_id, 0);
  const tagsJson = req.body.tags_json === undefined ? null : JSON.stringify(req.body.tags_json);

  const mediaUrl = req.body.media_url === undefined || req.body.media_url === null ? null : String(req.body.media_url);
  const mediaKind = req.body.media_kind === undefined || req.body.media_kind === null ? null : String(req.body.media_kind);
  const mediaMime = req.body.media_mime === undefined || req.body.media_mime === null ? null : String(req.body.media_mime);
  const mediaName = req.body.media_name === undefined || req.body.media_name === null ? null : String(req.body.media_name);
  const mediaSizeBytes = req.body.media_size_bytes === undefined || req.body.media_size_bytes === null ? null : asInt(req.body.media_size_bytes, 0);

  if (!userId || (body.length < 1 && !mediaUrl)) return res.status(400).json({ error: '(body or media_url) are required' });

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

  let result;
  try {
    const [r] = await pool.query(
      'INSERT INTO posts (user_id, institution_id, class_id, body, media_url, media_kind, media_mime, media_name, media_size_bytes, tags_json, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        userId,
        institutionId || null,
        classId || null,
        body,
        mediaUrl,
        mediaKind,
        mediaMime,
        mediaName,
        mediaSizeBytes || null,
        tagsJson,
        'published',
      ],
    );
    result = r;
  } catch (e) {
    if (!isBadFieldError(e)) throw e;
    const [r] = await pool.query(
      'INSERT INTO posts (user_id, institution_id, class_id, body, tags_json, status) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, institutionId || null, classId || null, body, tagsJson, 'published'],
    );
    result = r;
  }

  const insertId = result.insertId;
  const [rows] = await pool.query('SELECT * FROM posts WHERE id = ? LIMIT 1', [insertId]);
  res.status(201).json(rows[0]);
}));

router.post('/posts/:postId/reaction', requireAuth, asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;
  const postId = asInt(req.params.postId, 0);
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const reaction = asReaction(req.body.reaction);

  if (!postId || !userId || !reaction) {
    return res.status(400).json({ error: 'postId and reaction are required' });
  }

  try {
    await pool.query(
      'INSERT INTO post_reactions (post_id, user_id, reaction) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE reaction = VALUES(reaction)',
      [postId, userId, reaction],
    );
  } catch (e) {
    if (!isNoSuchTableError(e)) throw e;
    await pool.query('INSERT IGNORE INTO post_likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
  }

  try {
    await pool.query('INSERT IGNORE INTO post_likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
  } catch (e) {
    if (!isNoSuchTableError(e)) throw e;
  }
  res.json({ ok: true });
}));

router.post('/posts/:postId/bookmark', requireAuth, asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;
  const postId = asInt(req.params.postId, 0);
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);

  if (!postId || !userId) {
    return res.status(400).json({ error: 'postId is required' });
  }

  try {
    await pool.query('INSERT IGNORE INTO post_bookmarks (post_id, user_id) VALUES (?, ?)', [postId, userId]);
  } catch (e) {
    if (!isNoSuchTableError(e)) throw e;
    return res.status(501).json({ error: 'Bookmarks not supported (missing table post_bookmarks)' });
  }

  res.json({ ok: true });
}));

router.delete('/posts/:postId/bookmark', requireAuth, asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;
  const postId = asInt(req.params.postId, 0);
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);

  if (!postId || !userId) {
    return res.status(400).json({ error: 'postId is required' });
  }

  try {
    await pool.query('DELETE FROM post_bookmarks WHERE post_id = ? AND user_id = ?', [postId, userId]);
  } catch (e) {
    if (!isNoSuchTableError(e)) throw e;
    return res.status(501).json({ error: 'Bookmarks not supported (missing table post_bookmarks)' });
  }

  res.json({ ok: true });
}));

router.delete('/posts/:postId/reaction', requireAuth, asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;
  const postId = asInt(req.params.postId, 0);
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);

  if (!postId || !userId) {
    return res.status(400).json({ error: 'postId is required' });
  }

  try {
    await pool.query('DELETE FROM post_reactions WHERE post_id = ? AND user_id = ?', [postId, userId]);
  } catch (e) {
    if (!isNoSuchTableError(e)) throw e;
  }

  try {
    await pool.query('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
  } catch (e) {
    if (!isNoSuchTableError(e)) throw e;
  }
  res.json({ ok: true });
}));

router.post('/posts/:postId/like', requireAuth, asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;
  const postId = asInt(req.params.postId, 0);
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);

  if (!postId || !userId) {
    return res.status(400).json({ error: 'postId is required' });
  }

  try {
    await pool.query(
      'INSERT INTO post_reactions (post_id, user_id, reaction) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE reaction = VALUES(reaction)',
      [postId, userId, 'love'],
    );
  } catch (e) {
    if (!isNoSuchTableError(e)) throw e;
  }

  try {
    await pool.query('INSERT IGNORE INTO post_likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
  } catch (e) {
    if (!isNoSuchTableError(e)) throw e;
  }
  res.json({ ok: true });
}));

router.delete('/posts/:postId/like', requireAuth, asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;
  const postId = asInt(req.params.postId, 0);
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);

  if (!postId || !userId) {
    return res.status(400).json({ error: 'postId is required' });
  }

  try {
    await pool.query('DELETE FROM post_reactions WHERE post_id = ? AND user_id = ?', [postId, userId]);
  } catch (e) {
    if (!isNoSuchTableError(e)) throw e;
  }

  try {
    await pool.query('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
  } catch (e) {
    if (!isNoSuchTableError(e)) throw e;
  }
  res.json({ ok: true });
}));

router.get('/posts/:postId/comments', asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;
  const postId = asInt(req.params.postId, 0);
  const limit = Math.min(Math.max(asInt(req.query.limit, 50), 1), 100);
  const offset = Math.max(asInt(req.query.offset, 0), 0);
  const viewerUserId = req.user && req.user.id ? Math.max(asInt(req.user.id, 0), 0) : 0;

  if (!postId) {
    return res.status(400).json({ error: 'postId is required' });
  }

  let rows;
  try {
    const [r] = await pool.query(
      `SELECT
         c.id,
         c.post_id,
         c.user_id,
         c.parent_comment_id,
         c.body,
         c.status,
         c.created_at,
         u.display_name AS user_display_name,
         CASE WHEN p.user_id = c.user_id THEN 1 ELSE 0 END AS is_post_author,
         (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id) AS likes_count,
         CASE
           WHEN ? > 0 THEN EXISTS(SELECT 1 FROM comment_likes cl2 WHERE cl2.comment_id = c.id AND cl2.user_id = ?)
           ELSE 0
         END AS liked_by_me
       FROM comments c
       JOIN users u ON u.id = c.user_id
       JOIN posts p ON p.id = c.post_id
       WHERE c.post_id = ? AND c.status = 'published'
       ORDER BY c.created_at ASC
       LIMIT ? OFFSET ?`,
      [viewerUserId, viewerUserId, postId, limit, offset],
    );
    rows = r;
  } catch (e) {
    if (!isBadFieldError(e) && !isNoSuchTableError(e)) throw e;
    const [r] = await pool.query(
      `SELECT
         c.id,
         c.post_id,
         c.user_id,
         c.body,
         c.status,
         c.created_at,
         u.display_name AS user_display_name,
         CASE WHEN p.user_id = c.user_id THEN 1 ELSE 0 END AS is_post_author
       FROM comments c
       JOIN users u ON u.id = c.user_id
       JOIN posts p ON p.id = c.post_id
       WHERE c.post_id = ? AND c.status = 'published'
       ORDER BY c.created_at ASC
       LIMIT ? OFFSET ?`,
      [postId, limit, offset],
    );
    rows = r;
  }

  res.json({ items: rows, limit, offset });
}));

router.post('/posts/:postId/comments', requireAuth, asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;
  const postId = asInt(req.params.postId, 0);
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const body = String(req.body.body ?? '').trim();
  const parentCommentId = req.body.parent_comment_id === undefined || req.body.parent_comment_id === null
    ? null
    : asInt(req.body.parent_comment_id, 0);

  if (!postId || !userId || body.length < 1) return res.status(400).json({ error: 'postId and body are required' });

  let result;
  try {
    const [r] = await pool.query(
      'INSERT INTO comments (post_id, user_id, parent_comment_id, body, status) VALUES (?, ?, ?, ?, ?)',
      [postId, userId, parentCommentId || null, body, 'published'],
    );
    result = r;
  } catch (e) {
    if (!isBadFieldError(e)) throw e;
    const [r] = await pool.query(
      'INSERT INTO comments (post_id, user_id, body, status) VALUES (?, ?, ?, ?)',
      [postId, userId, body, 'published'],
    );
    result = r;
  }

  const insertId = result.insertId;
  const [rows] = await pool.query('SELECT * FROM comments WHERE id = ? LIMIT 1', [insertId]);
  res.status(201).json(rows[0]);
}));

router.delete('/comments/:commentId', requireAuth, asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;
  const commentId = asInt(req.params.commentId, 0);
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);

  if (!commentId || !userId) {
    return res.status(400).json({ error: 'commentId is required' });
  }

  const [result] = await pool.query(
    "UPDATE comments c JOIN posts p ON p.id = c.post_id SET c.status = 'deleted' WHERE c.id = ? AND (c.user_id = ? OR p.user_id = ?)",
    [commentId, userId, userId],
  );

  if (!result.affectedRows) {
    return res.status(403).json({ error: 'Not allowed or comment not found' });
  }

  res.json({ ok: true });
}));

router.post('/comments/:commentId/like', requireAuth, asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;
  const commentId = asInt(req.params.commentId, 0);
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);

  if (!commentId || !userId) {
    return res.status(400).json({ error: 'commentId is required' });
  }

  await pool.query('INSERT IGNORE INTO comment_likes (comment_id, user_id) VALUES (?, ?)', [commentId, userId]);
  res.json({ ok: true });
}));

router.delete('/comments/:commentId/like', requireAuth, asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;
  const commentId = asInt(req.params.commentId, 0);
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);

  if (!commentId || !userId) {
    return res.status(400).json({ error: 'commentId is required' });
  }

  await pool.query('DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?', [commentId, userId]);
  res.json({ ok: true });
}));

router.put('/posts/:postId', requireAuth, asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;
  const postId = asInt(req.params.postId, 0);
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const body = String(req.body.body ?? '').trim();

  if (!postId || !userId || body.length < 1) {
    return res.status(400).json({ error: 'postId and body are required' });
  }

  const [result] = await pool.query(
    'UPDATE posts SET body = ? WHERE id = ? AND user_id = ? AND status = \'published\'',
    [body, postId, userId],
  );

  if (!result.affectedRows) {
    return res.status(403).json({ error: 'Not allowed or post not found' });
  }

  const [rows] = await pool.query('SELECT * FROM posts WHERE id = ? LIMIT 1', [postId]);
  res.json(rows[0]);
}));

router.delete('/posts/:postId', requireAuth, asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;
  const postId = asInt(req.params.postId, 0);
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);

  if (!postId || !userId) {
    return res.status(400).json({ error: 'postId is required' });
  }

  const [result] = await pool.query(
    "UPDATE posts SET status = 'deleted' WHERE id = ? AND user_id = ?",
    [postId, userId],
  );

  if (!result.affectedRows) {
    return res.status(403).json({ error: 'Not allowed or post not found' });
  }

  res.json({ ok: true });
}));

router.post('/reports', requireAuth, asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;
  const reporterUserId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const targetType = String(req.body.target_type ?? '').trim();
  const targetId = asInt(req.body.target_id, 0);
  const reason = String(req.body.reason ?? '').trim();
  const details = req.body.details === undefined || req.body.details === null ? null : String(req.body.details);

  if (!reporterUserId || !targetId || !reason) return res.status(400).json({ error: 'target_id and reason are required' });

  if (targetType !== 'post' && targetType !== 'comment' && targetType !== 'user') {
    return res.status(400).json({ error: 'target_type must be post|comment|user' });
  }

  const [result] = await pool.query(
    'INSERT INTO reports (reporter_user_id, target_type, target_id, reason, details, status) VALUES (?, ?, ?, ?, ?, ?)',
    [reporterUserId, targetType, targetId, reason, details, 'open'],
  );

  res.status(201).json({ ok: true, id: result.insertId });
}));

module.exports = {
  socialRouter: router,
};
