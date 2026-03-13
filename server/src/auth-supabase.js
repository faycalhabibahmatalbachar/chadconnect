/**
 * Authentication with Supabase Auth
 * Hybrid approach: Uses Supabase Auth for password management + custom users table
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');

const { supabase, supabaseAnon, handleResult } = require('./db-supabase');

const router = express.Router();

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
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

async function createUserSession(userId) {
  const refreshToken = randomTokenHex(32);
  const refreshHash = sha256Hex(refreshToken);
  const expiresAt = new Date(Date.now() + refreshTtlDays() * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('user_sessions')
    .insert({
      user_id: userId,
      refresh_token_hash: refreshHash,
      expires_at: expiresAt.toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '42P01' || error.code === 'ER_NO_SUCH_TABLE') {
      const err = new Error('AUTH_SCHEMA_NOT_READY');
      err.code = 'AUTH_SCHEMA_NOT_READY';
      throw err;
    }
    throw error;
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

// Register endpoint
router.post('/auth/register', asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const displayName = String(req.body.display_name ?? req.body.displayName ?? '').trim();
  const password = String(req.body.password ?? '');
  const email = req.body.email ? String(req.body.email).trim() : null;

  if (!phone || phone.length < 6) {
    return res.status(400).json({ error: 'phone is required' });
  }
  if (!displayName || displayName.length < 2) {
    return res.status(400).json({ error: 'display_name is required' });
  }
  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'password is required' });
  }

  // Hash password for our users table
  const passwordHash = await bcrypt.hash(password, 10);

  // Insert user into our custom users table
  const { data: user, error: insertError } = await supabase
    .from('users')
    .insert({
      phone,
      email,
      display_name: displayName,
      password_hash: passwordHash,
      role: 'student',
      status: 'active',
    })
    .select('id, phone, email, display_name, role, status')
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      return res.status(409).json({ error: 'phone or email already exists' });
    }
    throw insertError;
  }

  // Optionally: Create user in Supabase Auth (for future Supabase Auth integration)
  // This is optional - we're keeping our custom auth for now
  try {
    await supabaseAnon.auth.signUp({
      email: email || `${phone}@chadconnect.local`,
      password,
      options: {
        data: {
          phone,
          display_name: displayName,
        },
      },
    });
  } catch (supabaseAuthError) {
    // Log but don't fail - we're using our custom auth
    console.warn('Supabase Auth signup optional:', supabaseAuthError.message);
  }

  const accessToken = signAccessToken(user);
  const session = await createUserSession(user.id);

  res.status(201).json({
    user,
    access_token: accessToken,
    refresh_token: session.refreshToken,
    token_type: 'Bearer',
    expires_in: accessTtlSeconds(),
  });
}));

// Login endpoint
router.post('/auth/login', asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const password = String(req.body.password ?? '');

  if (!phone || !password) {
    return res.status(400).json({ error: 'phone and password are required' });
  }

  // Find user by phone
  const { data: users, error: findError } = await supabase
    .from('users')
    .select('id, phone, email, display_name, role, status, password_hash')
    .eq('phone', phone)
    .limit(1);

  if (findError) throw findError;

  const user = users && users[0] ? users[0] : null;
  if (!user || !user.password_hash) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
  if (String(user.status) !== 'active') {
    return res.status(403).json({ error: 'forbidden' });
  }

  // Verify password
  const ok = await bcrypt.compare(password, String(user.password_hash));
  if (!ok) {
    return res.status(401).json({ error: 'invalid credentials' });
  }

  const accessToken = signAccessToken(user);
  const session = await createUserSession(user.id);

  // Update last_seen_at
  await supabase
    .from('users')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', user.id);

  res.json({
    user: {
      id: user.id,
      phone: user.phone,
      email: user.email,
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

// Refresh token endpoint
router.post('/auth/refresh', asyncHandler(async (req, res) => {
  const refreshToken = String(req.body.refresh_token ?? '').trim();
  if (!refreshToken) {
    return res.status(400).json({ error: 'refresh_token is required' });
  }

  const refreshHash = sha256Hex(refreshToken);

  // Find session
  const { data: sessions, error: sessionError } = await supabase
    .from('user_sessions')
    .select(`
      id,
      user_id,
      users!inner(id, role, status)
    `)
    .eq('refresh_token_hash', refreshHash)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .limit(1);

  if (sessionError) {
    if (sessionError.code === '42P01') {
      return res.status(500).json({ error: 'schema not ready' });
    }
    throw sessionError;
  }

  const session = sessions && sessions[0] ? sessions[0] : null;
  if (!session) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  // Revoke old session
  await supabase
    .from('user_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', session.id);

  const user = session.users;
  if (String(user.status) !== 'active') {
    return res.status(403).json({ error: 'forbidden' });
  }

  const accessToken = signAccessToken({ id: session.user_id, role: user.role });
  const newSession = await createUserSession(session.user_id);

  res.json({
    access_token: accessToken,
    refresh_token: newSession.refreshToken,
    token_type: 'Bearer',
    expires_in: accessTtlSeconds(),
  });
}));

// Logout endpoint
router.post('/auth/logout', asyncHandler(async (req, res) => {
  const refreshToken = String(req.body.refresh_token ?? '').trim();
  if (!refreshToken) {
    return res.status(400).json({ error: 'refresh_token is required' });
  }

  const refreshHash = sha256Hex(refreshToken);

  const { error } = await supabase
    .from('user_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('refresh_token_hash', refreshHash)
    .is('revoked_at', null);

  if (error && error.code !== '42P01') {
    throw error;
  }

  res.json({ ok: true });
}));

// Get current user
router.get('/auth/me', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'unauthorized' });

  const { data: user, error } = await supabase
    .from('users')
    .select('id, phone, email, display_name, role, status, avatar_url, bio, followers_count, following_count, posts_count')
    .eq('id', userId)
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ user });
}));

// Update profile
router.patch('/auth/me', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'unauthorized' });

  const updates = {};
  
  if (req.body.display_name) {
    updates.display_name = String(req.body.display_name).trim();
  }
  if (req.body.bio !== undefined) {
    updates.bio = String(req.body.bio).trim();
  }
  if (req.body.avatar_url !== undefined) {
    updates.avatar_url = String(req.body.avatar_url).trim() || null;
  }
  if (req.body.preferred_lang) {
    updates.preferred_lang = String(req.body.preferred_lang);
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const { data: user, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select('id, phone, email, display_name, role, status, avatar_url, bio')
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ user });
}));

module.exports = {
  authRouter: router,
  optionalAuth,
  requireAuth,
};
