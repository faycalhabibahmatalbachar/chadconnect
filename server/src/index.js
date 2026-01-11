require('dotenv').config();

const cors = require('cors');
const express = require('express');

const { pool } = require('./db');
const { authRouter, optionalAuth } = require('./auth');
const { uploadsRouter } = require('./uploads');
const { socialRouter } = require('./social');
const { pushRouter } = require('./push');
const { institutionsRouter } = require('./institutions');
const { planningRouter } = require('./planning');
const { studyRouter } = require('./study');

const app = express();

app.locals.pool = pool;

function parseCorsOrigins() {
  const raw = process.env.CORS_ORIGINS;
  if (!raw) return [];

  const trimmed = String(raw).trim();
  if (trimmed === '*') return ['*'];

  return trimmed
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const corsOrigins = parseCorsOrigins();

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (corsOrigins.length === 0) return cb(null, true);
    if (corsOrigins.includes('*')) return cb(null, true);
    return cb(null, corsOrigins.includes(origin));
  },
}));
app.use(express.json({ limit: '1mb' }));
app.use(optionalAuth);

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

app.use('/api', authRouter);
app.use('/api', uploadsRouter);
app.use('/api', socialRouter);
app.use('/api', pushRouter);
app.use('/api', institutionsRouter);
app.use('/api', planningRouter);
app.use('/api', studyRouter);

app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  if (res.headersSent) return next(err);

  const status = err && (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST')
    ? 503
    : err && err.code === 'VIDEO_QUEUE_DISABLED'
      ? 503
    : err && err.code === 'UNSUPPORTED_MEDIA_TYPE'
      ? 415
      : err && err.code === 'LIMIT_FILE_SIZE'
        ? 413
        : 500;
  res.status(status).json({ ok: false, error: String(err?.message ?? err), code: err?.code ?? null });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  process.stdout.write(`ChadConnect API listening on port ${port}\n`);
});
