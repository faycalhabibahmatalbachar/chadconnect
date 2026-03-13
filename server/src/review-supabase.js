/**
 * Review Module - Supabase Version
 * Spaced Repetition System (SRS) with SM-2 algorithm
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

/**
 * SM-2 Algorithm implementation
 * @param {number} rating - 0=again, 1=hard, 2=good, 3=easy
 * @param {object} card - { interval_seconds, ease_factor, repetitions, lapses }
 * @returns {object} - New card state
 */
function sm2Algorithm(rating, card) {
  const { interval_seconds = 0, ease_factor = 2.5, repetitions = 0, lapses = 0 } = card;

  let newInterval = 0;
  let newEase = ease_factor;
  let newReps = repetitions;
  let newLapses = lapses;

  // Rating: 0=again, 1=hard, 2=good, 3=easy
  if (rating === 0) {
    // Again - reset
    newInterval = 60; // 1 minute
    newReps = 0;
    newLapses = lapses + 1;
    newEase = Math.max(1.3, ease_factor - 0.2);
  } else if (rating === 1) {
    // Hard
    newInterval = Math.max(60, interval_seconds * 1.2);
    newEase = Math.max(1.3, ease_factor - 0.15);
    newReps = repetitions + 1;
  } else if (rating === 2) {
    // Good
    if (repetitions === 0) {
      newInterval = 600; // 10 minutes
    } else if (repetitions === 1) {
      newInterval = 86400; // 1 day
    } else {
      newInterval = interval_seconds * ease_factor;
    }
    newEase = ease_factor;
    newReps = repetitions + 1;
  } else if (rating === 3) {
    // Easy
    if (repetitions === 0) {
      newInterval = 1200; // 20 minutes
    } else if (repetitions === 1) {
      newInterval = 172800; // 2 days
    } else {
      newInterval = interval_seconds * ease_factor * 1.3;
    }
    newEase = ease_factor + 0.15;
    newReps = repetitions + 1;
  }

  return {
    interval_seconds: Math.round(newInterval),
    ease_factor: Math.round(newEase * 100) / 100,
    repetitions: newReps,
    lapses: newLapses,
  };
}

// GET /review/items - Get review items due for user
router.get('/review/items', requireAuth, asyncHandler(async (req, res) => {
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const limit = Math.min(Math.max(asInt(req.query.limit, 20), 1), 50);

  if (!userId) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const now = new Date().toISOString();

  const { data: items, error } = await supabase
    .from('user_review_schedule')
    .select(`
      review_item_id,
      due_at,
      interval_seconds,
      ease_factor,
      repetitions,
      lapses,
      review_items (
        id,
        chapter_id,
        item_type,
        chapters (
          id,
          title_fr,
          title_ar,
          subject_id,
          subjects (id, name_fr, name_ar)
        )
      )
    `)
    .eq('user_id', userId)
    .eq('suspended', false)
    .lte('due_at', now)
    .order('due_at', { ascending: true })
    .limit(limit);

  if (error) throw error;

  res.json({
    items: (items || []).map(item => ({
      review_item_id: item.review_item_id,
      due_at: item.due_at,
      interval_seconds: item.interval_seconds,
      ease_factor: item.ease_factor,
      repetitions: item.repetitions,
      lapses: item.lapses,
      chapter_id: item.review_items?.chapter_id,
      chapter_title: item.review_items?.chapters?.title_fr,
      subject_id: item.review_items?.chapters?.subject_id,
      subject_name: item.review_items?.chapters?.subjects?.name_fr,
    })),
  });
}));

// GET /review/count - Get due items count
router.get('/review/count', requireAuth, asyncHandler(async (req, res) => {
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);

  if (!userId) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const now = new Date().toISOString();

  const { count, error } = await supabase
    .from('user_review_schedule')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('suspended', false)
    .lte('due_at', now);

  res.json({ count: count || 0 });
}));

// POST /review/start - Start a review session
router.post('/review/start', requireAuth, asyncHandler(async (req, res) => {
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const limit = Math.min(Math.max(asInt(req.body.limit, 20), 1), 50);

  if (!userId) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const now = new Date().toISOString();

  const { data: items, error } = await supabase
    .from('user_review_schedule')
    .select(`
      review_item_id,
      due_at,
      interval_seconds,
      ease_factor,
      repetitions,
      lapses,
      review_items (
        id,
        chapter_id,
        item_type,
        chapters (
          id,
          title_fr,
          title_ar,
          lessons (content_fr, content_ar, kind)
        )
      )
    `)
    .eq('user_id', userId)
    .eq('suspended', false)
    .lte('due_at', now)
    .order('due_at', { ascending: true })
    .limit(limit);

  if (error) throw error;

  const sessionId = Date.now().toString(36) + Math.random().toString(36).substring(2);

  res.json({
    session_id: sessionId,
    total: items?.length || 0,
    items: (items || []).map(item => ({
      review_item_id: item.review_item_id,
      due_at: item.due_at,
      interval_seconds: item.interval_seconds,
      ease_factor: item.ease_factor,
      repetitions: item.repetitions,
      lapses: item.lapses,
      chapter_id: item.review_items?.chapter_id,
      chapter_title: item.review_items?.chapters?.title_fr,
      // Get summary content
      content: item.review_items?.chapters?.lessons?.find(l => l.kind === 'summary')?.content_fr || null,
    })),
  });
}));

// POST /review/answer - Submit answer for a review item
router.post('/review/answer', requireAuth, asyncHandler(async (req, res) => {
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const reviewItemId = asInt(req.body.review_item_id, 0);
  const ratingStr = String(req.body.rating ?? 'good').toLowerCase();

  if (!userId) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (!reviewItemId) {
    return res.status(400).json({ error: 'review_item_id is required' });
  }

  const ratingMap = { again: 0, hard: 1, good: 2, easy: 3 };
  const rating = ratingMap[ratingStr];
  if (rating === undefined) {
    return res.status(400).json({ error: 'Invalid rating. Use: again, hard, good, easy' });
  }

  // Get current schedule
  const { data: schedule, error: scheduleError } = await supabase
    .from('user_review_schedule')
    .select('*')
    .eq('user_id', userId)
    .eq('review_item_id', reviewItemId)
    .single();

  if (scheduleError || !schedule) {
    return res.status(404).json({ error: 'Review item not found in schedule' });
  }

  // Calculate new schedule using SM-2
  const newState = sm2Algorithm(rating, {
    interval_seconds: schedule.interval_seconds,
    ease_factor: schedule.ease_factor,
    repetitions: schedule.repetitions,
    lapses: schedule.lapses,
  });

  const now = new Date();
  const dueAfter = new Date(now.getTime() + newState.interval_seconds * 1000);

  // Update schedule
  const { error: updateError } = await supabase
    .from('user_review_schedule')
    .update({
      due_at: dueAfter.toISOString(),
      interval_seconds: newState.interval_seconds,
      ease_factor: newState.ease_factor,
      repetitions: newState.repetitions,
      lapses: newState.lapses,
      last_reviewed_at: now.toISOString(),
    })
    .eq('user_id', userId)
    .eq('review_item_id', reviewItemId);

  if (updateError) throw updateError;

  // Log the review
  await supabase
    .from('review_logs')
    .insert({
      user_id: userId,
      review_item_id: reviewItemId,
      rating: ratingStr,
      reviewed_at: now.toISOString(),
      due_before: schedule.due_at,
      due_after: dueAfter.toISOString(),
      interval_before_seconds: schedule.interval_seconds,
      interval_after_seconds: newState.interval_seconds,
      ease_before: schedule.ease_factor,
      ease_after: newState.ease_factor,
      reps_before: schedule.repetitions,
      reps_after: newState.repetitions,
      lapses_before: schedule.lapses,
      lapses_after: newState.lapses,
    });

  res.json({
    ok: true,
    next_due: dueAfter.toISOString(),
    interval_seconds: newState.interval_seconds,
    ease_factor: newState.ease_factor,
    repetitions: newState.repetitions,
    lapses: newState.lapses,
  });
}));

// GET /review/stats - Get review statistics
router.get('/review/stats', requireAuth, asyncHandler(async (req, res) => {
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);

  if (!userId) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const now = new Date().toISOString();

  // Get due count
  const { count: dueCount } = await supabase
    .from('user_review_schedule')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('suspended', false)
    .lte('due_at', now);

  // Get total count
  const { count: totalCount } = await supabase
    .from('user_review_schedule')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('suspended', false);

  // Get today's reviews
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count: todayCount } = await supabase
    .from('review_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('reviewed_at', today.toISOString());

  // Get average ease factor
  const { data: avgEase } = await supabase
    .from('user_review_schedule')
    .select('ease_factor')
    .eq('user_id', userId);

  const avgEaseFactor = avgEase && avgEase.length > 0
    ? avgEase.reduce((sum, s) => sum + (s.ease_factor || 2.5), 0) / avgEase.length
    : 2.5;

  res.json({
    due_count: dueCount || 0,
    total_cards: totalCount || 0,
    reviewed_today: todayCount || 0,
    average_ease_factor: Math.round(avgEaseFactor * 100) / 100,
  });
}));

// POST /review/initialize - Initialize review items for a chapter
router.post('/review/initialize', requireAuth, asyncHandler(async (req, res) => {
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const chapterId = asInt(req.body.chapter_id, 0);

  if (!userId) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (!chapterId) {
    return res.status(400).json({ error: 'chapter_id is required' });
  }

  // Check chapter exists
  const { data: chapter } = await supabase
    .from('chapters')
    .select('id')
    .eq('id', chapterId)
    .single();

  if (!chapter) {
    return res.status(404).json({ error: 'Chapter not found' });
  }

  // Create review item if not exists
  const { data: reviewItem, error: itemError } = await supabase
    .from('review_items')
    .upsert(
      { chapter_id: chapterId, item_type: 'summary_card' },
      { onConflict: 'chapter_id,item_type' }
    )
    .select('id')
    .single();

  if (itemError) {
    // Try to get existing
    const { data: existing } = await supabase
      .from('review_items')
      .select('id')
      .eq('chapter_id', chapterId)
      .eq('item_type', 'summary_card')
      .single();
    
    if (!existing) throw itemError;
    reviewItem = existing;
  }

  // Create user schedule if not exists
  const now = new Date();
  const initialDue = new Date(now.getTime() + 60 * 1000); // Due in 1 minute

  const { error: scheduleError } = await supabase
    .from('user_review_schedule')
    .upsert({
      user_id: userId,
      review_item_id: reviewItem.id,
      due_at: initialDue.toISOString(),
      interval_seconds: 60,
      ease_factor: 2.5,
      repetitions: 0,
      lapses: 0,
    }, { onConflict: 'user_id,review_item_id' });

  if (scheduleError) throw scheduleError;

  res.json({ ok: true, review_item_id: reviewItem.id });
}));

// POST /review/suspend - Suspend a review item
router.post('/review/suspend', requireAuth, asyncHandler(async (req, res) => {
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const reviewItemId = asInt(req.body.review_item_id, 0);

  if (!userId || !reviewItemId) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  await supabase
    .from('user_review_schedule')
    .update({ suspended: true })
    .eq('user_id', userId)
    .eq('review_item_id', reviewItemId);

  res.json({ ok: true });
}));

// POST /review/resume - Resume a suspended review item
router.post('/review/resume', requireAuth, asyncHandler(async (req, res) => {
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const reviewItemId = asInt(req.body.review_item_id, 0);

  if (!userId || !reviewItemId) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  const now = new Date();

  await supabase
    .from('user_review_schedule')
    .update({
      suspended: false,
      due_at: now.toISOString(),
    })
    .eq('user_id', userId)
    .eq('review_item_id', reviewItemId);

  res.json({ ok: true });
}));

module.exports = {
  reviewRouter: router,
  sm2Algorithm,
};
