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

function requireAdminOrModerator(req, res) {
  const role = String((req.user && req.user.role) ?? req.header('x-role') ?? '').toLowerCase();
  if (role !== 'admin' && role !== 'moderator') {
    res.status(403).json({ error: 'forbidden' });
    return false;
  }
  return true;
}

router.get('/institutions', asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;

  const [rows] = await pool.query(
    `SELECT id, name, city, country, created_by_user_id, validation_status, created_at
     FROM institutions
     ORDER BY created_at DESC`,
  );

  res.json({ items: rows });
}));

router.post('/institutions', asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;

  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const name = String(req.body.name ?? '').trim();
  const city = String(req.body.city ?? '').trim();
  const country = String(req.body.country ?? 'Chad').trim() || 'Chad';

  if (!userId) return res.status(401).json({ error: 'unauthorized' });
  if (name.length < 2 || city.length < 2) return res.status(400).json({ error: 'name and city are required' });

  const [result] = await pool.query(
    `INSERT INTO institutions (name, city, country, created_by_user_id, validation_status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [name, city, country, userId],
  );

  const insertId = result.insertId;
  const [rows] = await pool.query(
    `SELECT id, name, city, country, created_by_user_id, validation_status, created_at
     FROM institutions WHERE id = ? LIMIT 1`,
    [insertId],
  );

  res.status(201).json(rows[0]);
}));

router.patch('/institutions/:id/status', requireAuth, asyncHandler(async (req, res) => {
  if (!requireAdminOrModerator(req, res)) return;

  const { pool } = req.app.locals;
  const id = asInt(req.params.id, 0);
  const status = String(req.body.status ?? '').toLowerCase();
  const validatedByUserId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const rejectionReason = req.body.rejection_reason == null ? null : String(req.body.rejection_reason).slice(0, 255);

  if (!id) return res.status(400).json({ error: 'invalid id' });

  if (status !== 'pending' && status !== 'approved' && status !== 'rejected') {
    return res.status(400).json({ error: 'status must be pending|approved|rejected' });
  }

  await pool.query(
    `UPDATE institutions
     SET validation_status = ?,
         validated_by_user_id = ?,
         validated_at = NOW(),
         rejection_reason = ?
     WHERE id = ?`,
    [status, validatedByUserId || null, status === 'rejected' ? rejectionReason : null, id],
  );

  const [rows] = await pool.query(
    `SELECT id, name, city, country, created_by_user_id, validation_status, created_at
     FROM institutions WHERE id = ? LIMIT 1`,
    [id],
  );

  res.json(rows[0] ?? null);
}));

module.exports = {
  institutionsRouter: router,
};
