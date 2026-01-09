const express = require('express');

const { getMessaging } = require('./firebase');

const router = express.Router();

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function asInt(v, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function isNoSuchTableError(err) {
  return err && (err.code === 'ER_NO_SUCH_TABLE' || err.errno === 1146);
}

function normalizePlatform(p) {
  const s = String(p ?? '').trim().toLowerCase();
  if (s === 'android' || s === 'ios' || s === 'web') return s;
  return 'unknown';
}

router.post('/push/register', asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;

  const authUserId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const bodyUserId = Math.max(asInt(req.body?.user_id, 0), 0);
  const userId = authUserId || bodyUserId;
  const token = String(req.body?.token ?? '').trim();
  const platform = normalizePlatform(req.body?.platform);

  if (!userId) return res.status(400).json({ ok: false, error: 'user_id required' });
  if (!token) return res.status(400).json({ ok: false, error: 'token required' });

  try {
    await pool.query(
      'INSERT INTO user_push_tokens (user_id, token, platform) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), platform = VALUES(platform), updated_at = CURRENT_TIMESTAMP',
      [userId, token, platform],
    );
  } catch (e) {
    if (isNoSuchTableError(e)) {
      return res.status(503).json({ ok: false, error: 'push token table missing (run migrations)' });
    }
    throw e;
  }

  return res.json({ ok: true });
}));

router.post('/push/send-test', asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;

  const authUserId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const bodyUserId = Math.max(asInt(req.body?.user_id, 0), 0);
  const userId = authUserId || bodyUserId;
  if (!userId) return res.status(400).json({ ok: false, error: 'user_id required' });

  const title = String(req.body?.title ?? 'ChadConnect').trim() || 'ChadConnect';
  const body = String(req.body?.body ?? 'Test notification').trim() || 'Test notification';
  const data = req.body?.data && typeof req.body.data === 'object' ? req.body.data : undefined;

  let rows;
  try {
    const [r] = await pool.query(
      'SELECT token FROM user_push_tokens WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50',
      [userId],
    );
    rows = r;
  } catch (e) {
    if (isNoSuchTableError(e)) {
      return res.status(503).json({ ok: false, error: 'push token table missing (run migrations)' });
    }
    throw e;
  }

  const tokens = (Array.isArray(rows) ? rows : []).map((x) => String(x.token ?? '').trim()).filter(Boolean);
  if (tokens.length === 0) return res.status(404).json({ ok: false, error: 'no tokens for this user' });

  const messaging = getMessaging();

  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    data,
  });

  const invalidTokens = [];
  response.responses.forEach((r, idx) => {
    if (r.success) return;
    const code = r.error?.code;
    if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
      invalidTokens.push(tokens[idx]);
    }
  });

  if (invalidTokens.length > 0) {
    try {
      await pool.query(
        `DELETE FROM user_push_tokens
         WHERE user_id = ? AND token IN (${invalidTokens.map(() => '?').join(',')})`,
        [userId, ...invalidTokens],
      );
    } catch (_) {
    }
  }

  return res.json({
    ok: true,
    requested: tokens.length,
    successCount: response.successCount,
    failureCount: response.failureCount,
    invalidTokensRemoved: invalidTokens.length,
  });
}));

module.exports = { pushRouter: router };
