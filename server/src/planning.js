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

function normalizeDateString(s) {
  const v = String(s ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return v;
}

router.get('/planning/goals', requireAuth, asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;

  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const weekStart = normalizeDateString(req.query.week_start);

  if (!weekStart) return res.status(400).json({ error: 'week_start=YYYY-MM-DD is required' });

  const [rows] = await pool.query(
    `SELECT id, user_id, week_start, title, done, created_at, updated_at
     FROM planning_goals
     WHERE user_id = ? AND week_start = ?
     ORDER BY created_at ASC`,
    [userId, weekStart],
  );

  res.json({ items: rows });
}));

router.post('/planning/goals', requireAuth, asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;

  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const weekStart = normalizeDateString(req.body.week_start);
  const title = String(req.body.title ?? '').trim();

  if (!weekStart || title.length < 1) return res.status(400).json({ error: 'week_start and title are required' });

  const [result] = await pool.query(
    `INSERT INTO planning_goals (user_id, week_start, title, done)
     VALUES (?, ?, ?, 0)`,
    [userId, weekStart, title],
  );

  const insertId = result.insertId;
  const [rows] = await pool.query(
    `SELECT id, user_id, week_start, title, done, created_at, updated_at
     FROM planning_goals WHERE id = ? LIMIT 1`,
    [insertId],
  );

  res.status(201).json(rows[0]);
}));

router.patch('/planning/goals/:id', requireAuth, asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;

  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);

  const id = asInt(req.params.id, 0);
  if (!id) return res.status(400).json({ error: 'invalid id' });

  const title = req.body.title == null ? null : String(req.body.title).trim();
  const doneRaw = req.body.done;
  const done = doneRaw === undefined ? null : doneRaw ? 1 : 0;

  if (title == null && done == null) {
    return res.status(400).json({ error: 'nothing to update' });
  }

  await pool.query(
    `UPDATE planning_goals
     SET title = COALESCE(?, title),
         done = COALESCE(?, done)
     WHERE id = ? AND user_id = ?`,
    [title, done, id, userId],
  );

  const [rows] = await pool.query(
    `SELECT id, user_id, week_start, title, done, created_at, updated_at
     FROM planning_goals WHERE id = ? AND user_id = ? LIMIT 1`,
    [id, userId],
  );

  res.json(rows[0] ?? null);
}));

router.delete('/planning/goals/:id', requireAuth, asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const id = asInt(req.params.id, 0);
  if (!id) return res.status(400).json({ error: 'invalid id' });

  await pool.query('DELETE FROM planning_goals WHERE id = ? AND user_id = ?', [id, userId]);
  res.json({ ok: true });
}));

module.exports = {
  planningRouter: router,
};
