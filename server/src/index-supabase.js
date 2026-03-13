/**
 * ChadConnect Server - Supabase Version
 * Main entry point with all routes
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { supabase, pool } = require('./db-supabase');
const { authRouter, optionalAuth } = require('./auth-supabase');
const { socialRouter } = require('./social-supabase');
const { socialExtrasRouter } = require('./socialExtras-supabase');
const { studyRouter } = require('./study-supabase');
const { reviewRouter } = require('./review-supabase');
const { institutionsRouter } = require('./institutions-supabase');
const { planningRouter } = require('./planning-supabase');
const { uploadsRouter } = require('./uploads-supabase');

const app = express();

// ==================== MIDDLEWARE ====================

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : true;

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Increased for mobile apps
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(generalLimiter);

// Auth rate limiter (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Increased for mobile apps
  message: { error: 'Too many auth attempts, please try again later.' },
});

// ==================== HEALTH CHECK ====================

app.get('/health', async (req, res) => {
  try {
    // Test Supabase connection
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error && error.code !== '42P01') {
      return res.status(503).json({
        status: 'unhealthy',
        database: 'disconnected',
        error: error.message,
      });
    }

    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    res.status(503).json({
      status: 'unhealthy',
      error: e.message,
    });
  }
});

app.get('/', (req, res) => {
  res.json({
    name: 'ChadConnect API',
    version: '2.0.0-supabase',
    endpoints: [
      'GET /health',
      'POST /auth/register',
      'POST /auth/login',
      'POST /auth/refresh',
      'POST /auth/logout',
      'GET /auth/me',
      'GET /posts',
      'POST /posts',
      'GET /posts/:postId',
      'POST /posts/:postId/reaction',
      'DELETE /posts/:postId/reaction',
      'POST /posts/:postId/bookmark',
      'DELETE /posts/:postId/bookmark',
      'GET /posts/:postId/comments',
      'POST /posts/:postId/comments',
      'POST /comments/:commentId/like',
      'DELETE /comments/:commentId/like',
      'GET /bookmarks',
      'POST /reports',
      'GET /users/:userId/followers',
      'GET /users/:userId/following',
      'POST /users/:userId/follow',
      'DELETE /users/:userId/follow',
      'GET /users/:userId/following-status',
      'GET /feed',
      'GET /tags/trending',
      'GET /tags/:tagName/posts',
      'GET /mentions',
      'POST /mentions/read',
      'GET /mentions/unread-count',
      'GET /search',
      'GET /study/subjects',
      'GET /study/subjects/:subjectId',
      'GET /study/chapters/:chapterId',
      'POST /study/chapters/:chapterId/completed',
      'DELETE /study/chapters/:chapterId/completed',
      'GET /study/progress',
      'POST /study/chapters/:chapterId/favorite',
      'DELETE /study/chapters/:chapterId/favorite',
      'GET /study/favorites',
      'GET /review/items',
      'GET /review/count',
      'POST /review/start',
      'POST /review/answer',
      'GET /review/stats',
      'POST /review/initialize',
      'POST /review/suspend',
      'POST /review/resume',
      'GET /institutions',
      'POST /institutions',
      'PATCH /institutions/:id/status',
      'GET /institutions/:id/classes',
      'POST /institutions/:id/classes',
      'GET /classes/:id/members',
      'POST /classes/:id/join',
      'DELETE /classes/:id/leave',
      'GET /planning/goals',
      'POST /planning/goals',
      'PATCH /planning/goals/:id',
      'DELETE /planning/goals/:id',
      'POST /uploads/image',
      'POST /uploads/document',
      'POST /uploads/video',
      'DELETE /uploads/:path',
    ],
  });
});

// ==================== ROUTES ====================

// Auth routes (with stricter rate limiting)
app.use('/api', authLimiter, authRouter);

// Social routes
app.use('/api', optionalAuth, socialRouter);

// Social extras (followers, feed, tags, mentions, search)
app.use('/api', optionalAuth, socialExtrasRouter);

// Study routes
app.use('/api', optionalAuth, studyRouter);

// Review routes
app.use('/api', optionalAuth, reviewRouter);

// Institutions routes
app.use('/api', optionalAuth, institutionsRouter);

// Planning routes
app.use('/api', optionalAuth, planningRouter);

// Uploads routes
app.use('/api', optionalAuth, uploadsRouter);

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Handle known error types
  if (err.code === 'ER_DUP_ENTRY' || err.code === '23505') {
    return res.status(409).json({ error: 'Duplicate entry' });
  }

  if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42P01') {
    return res.status(500).json({ error: 'Database schema not ready' });
  }

  if (err.code === 'AUTH_SCHEMA_NOT_READY') {
    return res.status(500).json({ error: 'Auth schema not ready' });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  // Default error
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ==================== START SERVER ====================

const PORT = Number(process.env.PORT) || 3001;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`ChadConnect API (Supabase) running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API docs: http://localhost:${PORT}/`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server };
