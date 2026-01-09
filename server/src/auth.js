const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function isNoSuchTableError(err) {
  return err && (err.code === 'ER_NO_SUCH_TABLE' || err.errno === 1146);
}

function isDuplicateError(err) {
  return err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062);
}

function normalizePhone(v) {
  return String(v ?? '').replace(/\s+/g, '').trim();
}

function sha256Hex(v) {
  return crypto.createHash('sha256').update(String(v ?? ''), 'utf8').digest('hex');
}

function randomTokenHex(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function accessTtlSeconds() {
  const raw = process.env.JWT_ACCESS_TTL_SECONDS;
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return Math.trunc(n);
  return 15 * 60;
}

function refreshTtlDays() {
  const raw = process.env.JWT_REFRESH_TTL_DAYS;
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return Math.trunc(n);
  return 30;
}

function jwtSecret() {
  return process.env.JWT_SECRET || 'dev-secret';
}

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      role: String(user.role ?? 'student'),
    },
    jwtSecret(),
    { expiresIn: accessTtlSeconds() },
  );
}

async function createUserSession(pool, userId) {
  const refreshToken = randomTokenHex(32);
  const refreshHash = sha256Hex(refreshToken);
  const expiresAt = new Date(Date.now() + refreshTtlDays() * 24 * 60 * 60 * 1000);

  try {
    await pool.query(
      'INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at) VALUES (?, ?, ?)',
      [userId, refreshHash, expiresAt],
    );
  } catch (e) {
    if (isNoSuchTableError(e)) {
      const err = new Error('AUTH_SCHEMA_NOT_READY');
      err.code = 'AUTH_SCHEMA_NOT_READY';
      throw err;
    }
    throw e;
  }

  return { refreshToken, expiresAt };
}

function bearerToken(req) {
  const h = String(req.header('authorization') ?? '').trim();
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (!m) return null;
  const token = m[1].trim();
  return token || null;
}

function decodeJwtToUser(token) {
  const decoded = jwt.verify(token, jwtSecret());
  const sub = decoded && typeof decoded === 'object' ? decoded.sub : null;
  const role = decoded && typeof decoded === 'object' ? decoded.role : null;

  const id = Number(sub);
  if (!Number.isFinite(id) || id <= 0) return null;

  return {
    id: Math.trunc(id),
    role: String(role ?? 'student'),
  };
}

function optionalAuth(req, _res, next) {
  const token = bearerToken(req);
  if (!token) return next();

  try {
    const user = decodeJwtToUser(token);
    if (user) req.user = user;
  } catch (_) {
    // ignore
  }

  return next();
}

function requireAuth(req, res, next) {
  const token = bearerToken(req);
  if (!token) return res.status(401).json({ error: 'unauthorized' });

  try {
    const user = decodeJwtToUser(token);
    if (!user) return res.status(401).json({ error: 'unauthorized' });
    req.user = user;
    return next();
  } catch (_) {
    return res.status(401).json({ error: 'unauthorized' });
  }
}

router.post('/auth/register', asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;

  const phone = normalizePhone(req.body.phone);
  const displayName = String(req.body.display_name ?? req.body.displayName ?? '').trim();
  const password = String(req.body.password ?? '');

  if (!phone || phone.length < 6) {
    return res.status(400).json({ error: 'phone is required' });
  }
  if (!displayName || displayName.length < 2) {
    return res.status(400).json({ error: 'display_name is required' });
  }
  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'password is required' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  let insertId;
  try {
    const [result] = await pool.query(
      'INSERT INTO users (phone, display_name, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      [phone, displayName, passwordHash, 'student', 'active'],
    );
    insertId = result.insertId;
  } catch (e) {
    if (isDuplicateError(e)) return res.status(409).json({ error: 'phone already exists' });
    throw e;
  }

  const [rows] = await pool.query(
    'SELECT id, phone, display_name, role, status FROM users WHERE id = ? LIMIT 1',
    [insertId],
  );

  const user = rows && rows[0] ? rows[0] : null;
  if (!user) return res.status(500).json({ error: 'user not found' });

  const accessToken = signAccessToken(user);
  const session = await createUserSession(pool, user.id);

  res.status(201).json({
    user,
    access_token: accessToken,
    refresh_token: session.refreshToken,
    token_type: 'Bearer',
    expires_in: accessTtlSeconds(),
  });
}));

router.post('/auth/login', asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;

  const phone = normalizePhone(req.body.phone);
  const password = String(req.body.password ?? '');

  if (!phone || !password) {
    return res.status(400).json({ error: 'phone and password are required' });
  }

  const [rows] = await pool.query(
    'SELECT id, phone, display_name, role, status, password_hash FROM users WHERE phone = ? LIMIT 1',
    [phone],
  );

  const user = rows && rows[0] ? rows[0] : null;
  if (!user || !user.password_hash) return res.status(401).json({ error: 'invalid credentials' });
  if (String(user.status) !== 'active') return res.status(403).json({ error: 'forbidden' });

  const ok = await bcrypt.compare(password, String(user.password_hash));
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });

  const accessToken = signAccessToken(user);
  const session = await createUserSession(pool, user.id);

  res.json({
    user: {
      id: user.id,
      phone: user.phone,
      display_name: user.display_name,
      role: user.role,
      status: user.status,
    },
    access_token: accessToken,
    refresh_token: session.refreshToken,
    token_type: 'Bearer',
    expires_in: accessTtlSeconds(),
  });
}));

router.post('/auth/refresh', asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;

  const refreshToken = String(req.body.refresh_token ?? '').trim();
  if (!refreshToken) return res.status(400).json({ error: 'refresh_token is required' });

  const refreshHash = sha256Hex(refreshToken);

  let row;
  try {
    const [rows] = await pool.query(
      `SELECT
         us.id,
         us.user_id,
         u.role,
         u.status
       FROM user_sessions us
       JOIN users u ON u.id = us.user_id
       WHERE us.refresh_token_hash = ?
         AND us.revoked_at IS NULL
         AND us.expires_at > NOW()
       LIMIT 1`,
      [refreshHash],
    );
    row = rows && rows[0] ? rows[0] : null;
  } catch (e) {
    if (isNoSuchTableError(e)) return res.status(500).json({ error: 'schema not ready' });
    throw e;
  }

  if (!row) return res.status(401).json({ error: 'unauthorized' });

  await pool.query('UPDATE user_sessions SET revoked_at = NOW() WHERE id = ? LIMIT 1', [row.id]);

  if (String(row.status) !== 'active') return res.status(403).json({ error: 'forbidden' });

  const accessToken = signAccessToken({ id: row.user_id, role: row.role });
  const session = await createUserSession(pool, row.user_id);

  res.json({
    access_token: accessToken,
    refresh_token: session.refreshToken,
    token_type: 'Bearer',
    expires_in: accessTtlSeconds(),
  });
}));

router.post('/auth/logout', asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;

  const refreshToken = String(req.body.refresh_token ?? '').trim();
  if (!refreshToken) return res.status(400).json({ error: 'refresh_token is required' });

  const refreshHash = sha256Hex(refreshToken);

  try {
    await pool.query(
      'UPDATE user_sessions SET revoked_at = NOW() WHERE refresh_token_hash = ? AND revoked_at IS NULL LIMIT 1',
      [refreshHash],
    );
  } catch (e) {
    if (isNoSuchTableError(e)) return res.status(200).json({ ok: true });
    throw e;
  }

  res.json({ ok: true });
}));

router.get('/auth/me', requireAuth, asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;

  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'unauthorized' });

  const [rows] = await pool.query(
    'SELECT id, phone, display_name, role, status FROM users WHERE id = ? LIMIT 1',
    [userId],
  );

  res.json(rows && rows[0] ? rows[0] : null);
}));

module.exports = {
  authRouter: router,
  optionalAuth,
  requireAuth,
};
