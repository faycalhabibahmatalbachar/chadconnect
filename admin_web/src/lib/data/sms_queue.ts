import { pool } from '../db';

export type SmsQueueRow = {
  id: number;
  to_phone: string;
  message: string;
  priority: number;
  provider: string | null;
  status: 'pending' | 'sent' | 'failed';
  try_count: number;
  last_error: string | null;
  scheduled_at: string | null;
  created_at: string;
  sent_at: string | null;
};

export async function listSmsQueue(limit = 200): Promise<SmsQueueRow[]> {
  const [rows] = await pool.query(
    'SELECT id, to_phone, message, priority, provider, status, try_count, last_error, scheduled_at, created_at, sent_at FROM sms_queue ORDER BY created_at DESC LIMIT ?',
    [limit],
  );
  return rows as SmsQueueRow[];
}

export async function retrySms(id: number): Promise<void> {
  await pool.query(
    "UPDATE sms_queue SET status='pending', last_error=NULL, scheduled_at=NULL WHERE id=?",
    [id],
  );
}
