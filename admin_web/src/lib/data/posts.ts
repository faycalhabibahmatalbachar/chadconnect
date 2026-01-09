import { pool } from '../db';

export type PostStatus = 'published' | 'hidden' | 'deleted';

export type PostRow = {
  id: number;
  user_id: number;
  user_display_name: string;
  body: string;
  status: PostStatus;
  created_at: string;
  media_url: string | null;
  media_kind: string | null;
  media_mime: string | null;
  media_name: string | null;
  video_status: string | null;
};

function safeLimit(limit: number) {
  const n = Number(limit);
  if (!Number.isFinite(n)) return 200;
  return Math.min(Math.max(Math.trunc(n), 1), 500);
}

function safeOffset(offset: number) {
  const n = Number(offset);
  if (!Number.isFinite(n)) return 0;
  return Math.max(Math.trunc(n), 0);
}

function isBadFieldError(e: unknown): boolean {
  return !!(e && typeof e === 'object' && 'code' in e && (e as any).code === 'ER_BAD_FIELD_ERROR');
}

export async function listPosts(limit = 200, offset = 0): Promise<PostRow[]> {
  const l = safeLimit(limit);
  const o = safeOffset(offset);

  try {
    const [rows] = await pool.query(
      `SELECT
         p.id,
         p.user_id,
         u.display_name AS user_display_name,
         p.body,
         p.status,
         p.created_at,
         p.media_url,
         p.media_kind,
         p.media_mime,
         p.media_name,
         p.video_status
       FROM posts p
       JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [l, o],
    );
    return rows as PostRow[];
  } catch (e) {
    if (!isBadFieldError(e)) throw e;

    const [rows] = await pool.query(
      `SELECT
         p.id,
         p.user_id,
         u.display_name AS user_display_name,
         p.body,
         p.status,
         p.created_at,
         p.media_url,
         p.media_kind,
         p.media_mime,
         p.media_name,
         NULL AS video_status
       FROM posts p
       JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [l, o],
    );
    return rows as PostRow[];
  }
}

export async function setPostStatus(id: number, status: PostStatus): Promise<void> {
  await pool.query('UPDATE posts SET status = ? WHERE id = ? LIMIT 1', [status, id]);
}
