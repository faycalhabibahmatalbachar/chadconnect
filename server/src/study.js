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

router.get('/study/catalog', asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;
  const lang = String(req.query.lang ?? 'fr').toLowerCase() === 'ar' ? 'ar' : 'fr';

  const [subjects] = await pool.query(
    `SELECT id, name_fr, name_ar, track, created_at
     FROM subjects
     ORDER BY id ASC`,
  );

  const [chapters] = await pool.query(
    `SELECT id, subject_id, title_fr, title_ar, sort_order
     FROM chapters
     ORDER BY subject_id ASC, sort_order ASC, id ASC`,
  );

  const bySubject = new Map();
  for (const s of subjects) {
    bySubject.set(s.id, {
      id: s.id,
      title: lang === 'ar' ? s.name_ar : s.name_fr,
      chapters: [],
    });
  }

  for (const c of chapters) {
    const s = bySubject.get(c.subject_id);
    if (!s) continue;
    s.chapters.push({
      id: c.id,
      title: lang === 'ar' ? c.title_ar : c.title_fr,
      order_index: c.sort_order,
    });
  }

  res.json({ items: Array.from(bySubject.values()) });
}));

router.get('/study/state', asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  if (!userId) return res.status(401).json({ error: 'unauthorized' });

  const [progressRows] = await pool.query(
    `SELECT chapter_id, completed
     FROM study_progress
     WHERE user_id = ?`,
    [userId],
  );

  const [favRows] = await pool.query(
    `SELECT chapter_id
     FROM study_favorites
     WHERE user_id = ?`,
    [userId],
  );

  const completed = progressRows.filter((r) => Number(r.completed) === 1).map((r) => r.chapter_id);
  const favorites = favRows.map((r) => r.chapter_id);

  res.json({ completed_chapter_ids: completed, favorite_chapter_ids: favorites });
}));

router.post('/study/chapters/:chapterId/completed', requireAuth, asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const chapterId = asInt(req.params.chapterId, 0);
  const completedRaw = req.body.completed;

  if (!userId || !chapterId) return res.status(400).json({ error: 'chapterId is required' });

  const [rows] = await pool.query(
    'SELECT completed FROM study_progress WHERE user_id = ? AND chapter_id = ? LIMIT 1',
    [userId, chapterId],
  );

  const current = rows[0] ? Number(rows[0].completed) === 1 : false;
  const next = completedRaw === undefined ? !current : Boolean(completedRaw);

  await pool.query(
    `INSERT INTO study_progress (user_id, chapter_id, completed, completed_at)
     VALUES (?, ?, ?, IF(?, NOW(), NULL))
     ON DUPLICATE KEY UPDATE
       completed = VALUES(completed),
       completed_at = IF(VALUES(completed)=1, NOW(), NULL)`,
    [userId, chapterId, next ? 1 : 0, next ? 1 : 0],
  );

  res.json({ ok: true, completed: next });
}));

router.post('/study/chapters/:chapterId/favorite', requireAuth, asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const chapterId = asInt(req.params.chapterId, 0);
  const favoriteRaw = req.body.favorite;

  if (!userId || !chapterId) return res.status(400).json({ error: 'chapterId is required' });

  const [rows] = await pool.query(
    'SELECT 1 FROM study_favorites WHERE user_id = ? AND chapter_id = ? LIMIT 1',
    [userId, chapterId],
  );

  const current = !!rows[0];
  const next = favoriteRaw === undefined ? !current : Boolean(favoriteRaw);

  if (next) {
    await pool.query(
      'INSERT IGNORE INTO study_favorites (user_id, chapter_id) VALUES (?, ?)',
      [userId, chapterId],
    );
  } else {
    await pool.query(
      'DELETE FROM study_favorites WHERE user_id = ? AND chapter_id = ?',
      [userId, chapterId],
    );
  }

  res.json({ ok: true, favorite: next });
}));

module.exports = {
  studyRouter: router,
};
