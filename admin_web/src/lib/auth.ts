import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { cookies } from 'next/headers';

import { pool } from './db';
import { env } from './env';

export type AdminUser = {
  id: number;
  username: string;
  display_name: string;
  role: 'admin' | 'moderator' | 'teacher' | 'student';
  password_hash: string | null;
};

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

export async function getAdminUserByUsername(username: string): Promise<AdminUser | null> {
  const [rows] = await pool.query(
    'SELECT id, username, display_name, role, password_hash FROM users WHERE username = ? LIMIT 1',
    [username],
  );

  const r = (rows as any[])[0];
  if (!r) return null;
  return r as AdminUser;
}

export async function getAdminUserById(id: number): Promise<AdminUser | null> {
  const [rows] = await pool.query(
    'SELECT id, username, display_name, role, password_hash FROM users WHERE id = ? LIMIT 1',
    [id],
  );

  const r = (rows as any[])[0];
  if (!r) return null;
  return r as AdminUser;
}

export async function setPasswordForUser(userId: number, password: string): Promise<void> {
  const hash = await bcrypt.hash(password, 10);
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function randomTokenHex(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export async function createAdminSession(userId: number): Promise<string> {
  const token = randomTokenHex(32);
  const expiresAt = new Date(Date.now() + env.ADMIN_SESSION_DAYS * 24 * 60 * 60 * 1000);
  await pool.query('INSERT INTO admin_sessions (user_id, token, expires_at) VALUES (?, ?, ?)', [
    userId,
    token,
    expiresAt,
  ]);
  return token;
}

export async function deleteAdminSession(token: string): Promise<void> {
  await pool.query('DELETE FROM admin_sessions WHERE token = ?', [token]);
}

export async function getSessionUser(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;

  const [rows] = await pool.query(
    'SELECT user_id FROM admin_sessions WHERE token = ? AND expires_at > NOW() LIMIT 1',
    [token],
  );

  const r = (rows as any[])[0];
  if (!r) return null;
  return getAdminUserById(Number(r.user_id));
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(env.ADMIN_COOKIE_NAME, token, COOKIE_OPTIONS);
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(env.ADMIN_COOKIE_NAME, '', { ...COOKIE_OPTIONS, maxAge: 0 });
}

export async function requireAdmin(): Promise<AdminUser> {
  const user = await getSessionUser();
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}
