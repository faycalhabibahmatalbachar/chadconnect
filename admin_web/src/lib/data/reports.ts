import { pool } from '../db';

export type ReportStatus = 'open' | 'resolved' | 'rejected';
export type ReportTargetType = 'post' | 'comment' | 'user';

export type ReportRow = {
  id: number;
  reporter_user_id: number;
  reporter_display_name: string;
  target_type: ReportTargetType;
  target_id: number;
  reason: string;
  details: string | null;
  status: ReportStatus;
  created_at: string;
  post_body: string | null;
  post_status: string | null;
  comment_body: string | null;
  comment_status: string | null;
  target_user_display_name: string | null;
  target_user_status: string | null;
};

export type CommentStatus = 'published' | 'hidden' | 'deleted';
export type UserStatus = 'active' | 'suspended' | 'deleted';

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

export async function listReports(limit = 200, offset = 0): Promise<ReportRow[]> {
  const l = safeLimit(limit);
  const o = safeOffset(offset);

  const [rows] = await pool.query(
    `SELECT
       r.id,
       r.reporter_user_id,
       reporter.display_name AS reporter_display_name,
       r.target_type,
       r.target_id,
       r.reason,
       r.details,
       r.status,
       r.created_at,
       p.body AS post_body,
       p.status AS post_status,
       c.body AS comment_body,
       c.status AS comment_status,
       tu.display_name AS target_user_display_name,
       tu.status AS target_user_status
     FROM reports r
     JOIN users reporter ON reporter.id = r.reporter_user_id
     LEFT JOIN posts p ON (r.target_type = 'post' AND p.id = r.target_id)
     LEFT JOIN comments c ON (r.target_type = 'comment' AND c.id = r.target_id)
     LEFT JOIN users tu ON (r.target_type = 'user' AND tu.id = r.target_id)
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [l, o],
  );

  return rows as ReportRow[];
}

export async function setReportStatus(id: number, status: ReportStatus): Promise<void> {
  await pool.query('UPDATE reports SET status = ? WHERE id = ? LIMIT 1', [status, id]);
}

export async function setCommentStatus(id: number, status: CommentStatus): Promise<void> {
  await pool.query('UPDATE comments SET status = ? WHERE id = ? LIMIT 1', [status, id]);
}

export async function setUserStatus(id: number, status: UserStatus): Promise<void> {
  await pool.query('UPDATE users SET status = ? WHERE id = ? LIMIT 1', [status, id]);
}
