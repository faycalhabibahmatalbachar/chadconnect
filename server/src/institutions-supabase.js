/**
 * Institutions Module - Supabase Version
 * Handles institutions, classes, and class membership
 */

const express = require('express');

const { requireAuth } = require('./auth-supabase');
const { supabase } = require('./db-supabase');

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
  const role = String((req.user && req.user.role) ?? '').toLowerCase();
  if (role !== 'admin' && role !== 'moderator') {
    res.status(403).json({ error: 'forbidden' });
    return false;
  }
  return true;
}

// GET /institutions - List all institutions
router.get('/institutions', asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('institutions')
    .select('id, name, city, country, created_by_user_id, validation_status, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  res.json({ items: data });
}));

// POST /institutions - Create new institution
router.post('/institutions', requireAuth, asyncHandler(async (req, res) => {
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const name = String(req.body.name ?? '').trim();
  const city = String(req.body.city ?? '').trim();
  const country = String(req.body.country ?? 'Chad').trim() || 'Chad';

  if (!userId) return res.status(401).json({ error: 'unauthorized' });
  if (name.length < 2 || city.length < 2) return res.status(400).json({ error: 'name and city are required' });

  const { data, error } = await supabase
    .from('institutions')
    .insert({
      name,
      city,
      country,
      created_by_user_id: userId,
      validation_status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  res.status(201).json(data);
}));

// PATCH /institutions/:id/status - Update institution status (admin/moderator only)
router.patch('/institutions/:id/status', requireAuth, asyncHandler(async (req, res) => {
  if (!requireAdminOrModerator(req, res)) return;

  const id = asInt(req.params.id, 0);
  const status = String(req.body.status ?? '').toLowerCase();
  const validatedByUserId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const rejectionReason = req.body.rejection_reason == null ? null : String(req.body.rejection_reason).slice(0, 255);

  if (!id) return res.status(400).json({ error: 'invalid id' });

  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be pending|approved|rejected' });
  }

  const { data, error } = await supabase
    .from('institutions')
    .update({
      validation_status: status,
      validated_by_user_id: validatedByUserId || null,
      validated_at: new Date().toISOString(),
      rejection_reason: status === 'rejected' ? rejectionReason : null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  res.json(data);
}));

// GET /institutions/:id/classes - Get classes for an institution
router.get('/institutions/:id/classes', asyncHandler(async (req, res) => {
  const institutionId = asInt(req.params.id, 0);
  if (!institutionId) return res.status(400).json({ error: 'invalid id' });

  const { data, error } = await supabase
    .from('classes')
    .select('id, name, academic_year, created_by_user_id, created_at')
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  res.json({ items: data });
}));

// POST /institutions/:id/classes - Create a class in an institution
router.post('/institutions/:id/classes', requireAuth, asyncHandler(async (req, res) => {
  const institutionId = asInt(req.params.id, 0);
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const name = String(req.body.name ?? '').trim();
  const academicYear = String(req.body.academic_year ?? '').trim();

  if (!institutionId) return res.status(400).json({ error: 'invalid institution id' });
  if (!userId) return res.status(401).json({ error: 'unauthorized' });
  if (name.length < 2) return res.status(400).json({ error: 'name is required' });

  const { data, error } = await supabase
    .from('classes')
    .insert({
      institution_id: institutionId,
      name,
      academic_year: academicYear || new Date().getFullYear().toString(),
      created_by_user_id: userId,
    })
    .select()
    .single();

  if (error) throw error;
  res.status(201).json(data);
}));

// GET /classes/:id/members - Get members of a class
router.get('/classes/:id/members', asyncHandler(async (req, res) => {
  const classId = asInt(req.params.id, 0);
  if (!classId) return res.status(400).json({ error: 'invalid class id' });

  const { data, error } = await supabase
    .from('class_members')
    .select(`
      user_id,
      member_role,
      joined_at
    `)
    .eq('class_id', classId);

  if (error) throw error;
  res.json({ items: data });
}));

// POST /classes/:id/join - Join a class
router.post('/classes/:id/join', requireAuth, asyncHandler(async (req, res) => {
  const classId = asInt(req.params.id, 0);
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const memberRole = String(req.body.role ?? 'student').toLowerCase();

  if (!classId) return res.status(400).json({ error: 'invalid class id' });
  if (!userId) return res.status(401).json({ error: 'unauthorized' });
  if (!['student', 'teacher'].includes(memberRole)) {
    return res.status(400).json({ error: 'role must be student or teacher' });
  }

  const { data, error } = await supabase
    .from('class_members')
    .upsert({
      class_id: classId,
      user_id: userId,
      member_role: memberRole,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return res.json({ ok: true, message: 'Already a member' });
    }
    throw error;
  }

  res.json({ ok: true, member: data });
}));

// DELETE /classes/:id/leave - Leave a class
router.delete('/classes/:id/leave', requireAuth, asyncHandler(async (req, res) => {
  const classId = asInt(req.params.id, 0);
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);

  if (!classId || !userId) return res.status(400).json({ error: 'invalid parameters' });

  await supabase
    .from('class_members')
    .delete()
    .eq('class_id', classId)
    .eq('user_id', userId);

  res.json({ ok: true });
}));

module.exports = {
  institutionsRouter: router,
};
