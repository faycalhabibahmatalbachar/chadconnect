/**
 * Planning Module - Supabase Version
 * Handles weekly planning goals
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

function normalizeDateString(s) {
  const v = String(s ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return v;
}

// GET /planning/goals - Get goals for a week
router.get('/planning/goals', requireAuth, asyncHandler(async (req, res) => {
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const weekStart = normalizeDateString(req.query.week_start);

  if (!weekStart) return res.status(400).json({ error: 'week_start=YYYY-MM-DD is required' });

  const { data, error } = await supabase
    .from('planning_goals')
    .select('id, user_id, week_start, title, done, created_at, updated_at')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .order('created_at', { ascending: true });

  if (error) throw error;
  res.json({ items: data });
}));

// POST /planning/goals - Create a new goal
router.post('/planning/goals', requireAuth, asyncHandler(async (req, res) => {
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const weekStart = normalizeDateString(req.body.week_start);
  const title = String(req.body.title ?? '').trim();

  if (!weekStart || title.length < 1) return res.status(400).json({ error: 'week_start and title are required' });

  const { data, error } = await supabase
    .from('planning_goals')
    .insert({
      user_id: userId,
      week_start: weekStart,
      title,
      done: false,
    })
    .select()
    .single();

  if (error) throw error;
  res.status(201).json(data);
}));

// PATCH /planning/goals/:id - Update a goal
router.patch('/planning/goals/:id', requireAuth, asyncHandler(async (req, res) => {
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const id = asInt(req.params.id, 0);

  if (!id) return res.status(400).json({ error: 'invalid id' });

  const title = req.body.title == null ? null : String(req.body.title).trim();
  const done = req.body.done === undefined ? null : !!req.body.done;

  if (title == null && done == null) {
    return res.status(400).json({ error: 'nothing to update' });
  }

  const updates = {};
  if (title != null) updates.title = title;
  if (done != null) updates.done = done;

  const { data, error } = await supabase
    .from('planning_goals')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'goal not found' });

  res.json(data);
}));

// DELETE /planning/goals/:id - Delete a goal
router.delete('/planning/goals/:id', requireAuth, asyncHandler(async (req, res) => {
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const id = asInt(req.params.id, 0);

  if (!id) return res.status(400).json({ error: 'invalid id' });

  const { error } = await supabase
    .from('planning_goals')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
  res.json({ ok: true });
}));

module.exports = {
  planningRouter: router,
};
