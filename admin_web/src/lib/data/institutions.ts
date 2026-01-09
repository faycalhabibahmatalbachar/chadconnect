import { pool } from '../db';

export type InstitutionRow = {
  id: number;
  name: string;
  city: string;
  country: string;
  created_by_user_id: number;
  validation_status: 'pending' | 'approved' | 'rejected';
  validated_by_user_id: number | null;
  validated_at: string | null;
  rejection_reason: string | null;
  created_at: string;
};

export async function listInstitutions(): Promise<InstitutionRow[]> {
  const [rows] = await pool.query(
    'SELECT id, name, city, country, created_by_user_id, validation_status, validated_by_user_id, validated_at, rejection_reason, created_at FROM institutions ORDER BY created_at DESC',
  );
  return rows as InstitutionRow[];
}

export async function approveInstitution(id: number, adminUserId: number): Promise<void> {
  await pool.query(
    "UPDATE institutions SET validation_status='approved', validated_by_user_id=?, validated_at=NOW(), rejection_reason=NULL WHERE id=?",
    [adminUserId, id],
  );
}

export async function rejectInstitution(id: number, adminUserId: number, reason: string | null): Promise<void> {
  await pool.query(
    "UPDATE institutions SET validation_status='rejected', validated_by_user_id=?, validated_at=NOW(), rejection_reason=? WHERE id=?",
    [adminUserId, reason, id],
  );
}
