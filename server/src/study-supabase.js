/**
 * Study Module - Supabase Version
 * Handles subjects, chapters, lessons, progress, favorites
 */

const express = require('express');

const { requireAuth, optionalAuth } = require('./auth-supabase');
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

// ==================== SUBJECTS ====================

// GET /study/subjects - List all subjects
router.get('/study/subjects', asyncHandler(async (req, res) => {
  const lang = req.query.lang === 'ar' ? 'ar' : 'fr';

  const { data: subjects, error } = await supabase
    .from('subjects')
    .select('id, name_fr, name_ar, track')
    .order('name_fr', { ascending: true });

  if (error) throw error;

  const items = (subjects || []).map(s => ({
    id: s.id,
    name: lang === 'ar' ? s.name_ar : s.name_fr,
    track: s.track,
  }));

  res.json({ items });
}));

// GET /study/subjects/:subjectId - Get subject with chapters
router.get('/study/subjects/:subjectId', asyncHandler(async (req, res) => {
  const subjectId = asInt(req.params.subjectId, 0);
  const lang = req.query.lang === 'ar' ? 'ar' : 'fr';

  if (!subjectId) {
    return res.status(400).json({ error: 'Invalid subject ID' });
  }

  const { data: subject, error } = await supabase
    .from('subjects')
    .select('id, name_fr, name_ar, track')
    .eq('id', subjectId)
    .single();

  if (error || !subject) {
    return res.status(404).json({ error: 'Subject not found' });
  }

  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, title_fr, title_ar, sort_order')
    .eq('subject_id', subjectId)
    .order('sort_order', { ascending: true });

  res.json({
    id: subject.id,
    name: lang === 'ar' ? subject.name_ar : subject.name_fr,
    track: subject.track,
    chapters: (chapters || []).map(c => ({
      id: c.id,
      title: lang === 'ar' ? c.title_ar : c.title_fr,
      sort_order: c.sort_order,
    })),
  });
}));

// ==================== CHAPTERS ====================

// GET /study/chapters/:chapterId - Get chapter with lessons
router.get('/study/chapters/:chapterId', asyncHandler(async (req, res) => {
  const chapterId = asInt(req.params.chapterId, 0);
  const lang = req.query.lang === 'ar' ? 'ar' : 'fr';
  const viewerUserId = req.user && req.user.id ? Math.max(asInt(req.user.id, 0), 0) : 0;

  if (!chapterId) {
    return res.status(400).json({ error: 'Invalid chapter ID' });
  }

  const { data: chapter, error } = await supabase
    .from('chapters')
    .select(`
      id,
      title_fr,
      title_ar,
      sort_order,
      subject_id,
      subjects (id, name_fr, name_ar)
    `)
    .eq('id', chapterId)
    .single();

  if (error || !chapter) {
    return res.status(404).json({ error: 'Chapter not found' });
  }

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, kind, content_fr, content_ar')
    .eq('chapter_id', chapterId);

  // Get user progress if authenticated
  let progress = null;
  if (viewerUserId) {
    const { data: progressData } = await supabase
      .from('study_progress')
      .select('completed, completed_at')
      .eq('user_id', viewerUserId)
      .eq('chapter_id', chapterId)
      .single();
    progress = progressData;
  }

  // Check if favorited
  let isFavorite = false;
  if (viewerUserId) {
    const { data: fav } = await supabase
      .from('study_favorites')
      .select('user_id')
      .eq('user_id', viewerUserId)
      .eq('chapter_id', chapterId)
      .single();
    isFavorite = !!fav;
  }

  res.json({
    id: chapter.id,
    title: lang === 'ar' ? chapter.title_ar : chapter.title_fr,
    sort_order: chapter.sort_order,
    subject_id: chapter.subject_id,
    subject_name: lang === 'ar' ? chapter.subjects?.name_ar : chapter.subjects?.name_fr,
    lessons: (lessons || []).map(l => ({
      id: l.id,
      kind: l.kind,
      content: lang === 'ar' ? l.content_ar : l.content_fr,
    })),
    progress: progress ? {
      completed: progress.completed,
      completed_at: progress.completed_at,
    } : null,
    is_favorite: isFavorite,
  });
}));

// ==================== PROGRESS ====================

// POST /study/chapters/:chapterId/completed - Mark chapter as completed
router.post('/study/chapters/:chapterId/completed', requireAuth, asyncHandler(async (req, res) => {
  const chapterId = asInt(req.params.chapterId, 0);
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);

  if (!chapterId || !userId) {
    return res.status(400).json({ error: 'Invalid chapter or user' });
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

  // Upsert progress
  const { data: progress, error } = await supabase
    .from('study_progress')
    .upsert({
      user_id: userId,
      chapter_id: chapterId,
      completed: true,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,chapter_id' })
    .select()
    .single();

  if (error) throw error;

  res.json({ ok: true, progress });
}));

// DELETE /study/chapters/:chapterId/completed - Unmark chapter as completed
router.delete('/study/chapters/:chapterId/completed', requireAuth, asyncHandler(async (req, res) => {
  const chapterId = asInt(req.params.chapterId, 0);
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);

  if (!chapterId || !userId) {
    return res.status(400).json({ error: 'Invalid chapter or user' });
  }

  await supabase
    .from('study_progress')
    .update({ completed: false, completed_at: null })
    .eq('user_id', userId)
    .eq('chapter_id', chapterId);

  res.json({ ok: true });
}));

// GET /study/progress - Get user's study progress
router.get('/study/progress', requireAuth, asyncHandler(async (req, res) => {
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const subjectId = req.query.subject_id ? asInt(req.query.subject_id, 0) : null;

  if (!userId) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  let query = supabase
    .from('study_progress')
    .select(`
      chapter_id,
      completed,
      completed_at,
      chapters (
        id,
        title_fr,
        title_ar,
        subject_id,
        subjects (id, name_fr, name_ar)
      )
    `)
    .eq('user_id', userId);

  const { data: progress, error } = await query;

  if (error) throw error;

  // Filter by subject if specified
  let items = progress || [];
  if (subjectId) {
    items = items.filter(p => p.chapters?.subject_id === subjectId);
  }

  res.json({
    items: items.map(p => ({
      chapter_id: p.chapter_id,
      completed: p.completed,
      completed_at: p.completed_at,
      chapter_title: p.chapters?.title_fr,
      subject_id: p.chapters?.subject_id,
      subject_name: p.chapters?.subjects?.name_fr,
    })),
  });
}));

// ==================== FAVORITES ====================

// POST /study/chapters/:chapterId/favorite - Add to favorites
router.post('/study/chapters/:chapterId/favorite', requireAuth, asyncHandler(async (req, res) => {
  const chapterId = asInt(req.params.chapterId, 0);
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);

  if (!chapterId || !userId) {
    return res.status(400).json({ error: 'Invalid chapter or user' });
  }

  const { error } = await supabase
    .from('study_favorites')
    .insert({ user_id: userId, chapter_id: chapterId });

  if (error) {
    if (error.code === '23505') {
      return res.json({ ok: true, message: 'Already favorited' });
    }
    throw error;
  }

  res.json({ ok: true });
}));

// DELETE /study/chapters/:chapterId/favorite - Remove from favorites
router.delete('/study/chapters/:chapterId/favorite', requireAuth, asyncHandler(async (req, res) => {
  const chapterId = asInt(req.params.chapterId, 0);
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);

  if (!chapterId || !userId) {
    return res.status(400).json({ error: 'Invalid chapter or user' });
  }

  await supabase
    .from('study_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('chapter_id', chapterId);

  res.json({ ok: true });
}));

// GET /study/favorites - Get user's favorite chapters
router.get('/study/favorites', requireAuth, asyncHandler(async (req, res) => {
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const lang = req.query.lang === 'ar' ? 'ar' : 'fr';

  if (!userId) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const { data: favorites, error } = await supabase
    .from('study_favorites')
    .select(`
      chapter_id,
      created_at,
      chapters (
        id,
        title_fr,
        title_ar,
        subject_id,
        subjects (id, name_fr, name_ar)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  res.json({
    items: (favorites || []).map(f => ({
      chapter_id: f.chapter_id,
      chapter_title: lang === 'ar' ? f.chapters?.title_ar : f.chapters?.title_fr,
      subject_id: f.chapters?.subject_id,
      subject_name: lang === 'ar' ? f.chapters?.subjects?.name_ar : f.chapters?.subjects?.name_fr,
      favorited_at: f.created_at,
    })),
  });
}));

module.exports = {
  studyRouter: router,
};
