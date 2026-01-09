const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const { videoQueue } = require('./video_queue');
const {
  publicObjectUrl,
  uploadBuffer,
  uploadFile,
  listAllObjects,
  removeByPrefix,
  removeObjects,
  getObjectResponse,
} = require('./supabase_storage');

const router = express.Router();

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function asInt(v, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function isBadFieldError(err) {
  return err && (err.code === 'ER_BAD_FIELD_ERROR' || err.errno === 1054);
}

function isNoSuchTableError(err) {
  return err && (err.code === 'ER_NO_SUCH_TABLE' || err.errno === 1146);
}

function extFromVideoMime(mime) {
  const m = String(mime ?? '').toLowerCase().trim();
  if (m === 'video/mp4') return '.mp4';
  if (m === 'video/quicktime') return '.mov';
  if (m === 'video/x-matroska') return '.mkv';
  return '.mp4';
}

function padPart(n) {
  return String(n).padStart(6, '0');
}

function maxVideoSizeBytes() {
  const raw = process.env.MAX_VIDEO_SIZE_BYTES;
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return Math.trunc(n);
  return 1024 * 1024 * 1024; // 1GB
}

function extFromMime(mime) {
  if (mime === 'image/jpeg') return '.jpg';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'application/pdf') return '.pdf';
  return '';
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const ok =
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'image/jpeg' ||
      file.mimetype === 'image/png' ||
      file.mimetype === 'image/webp';

    if (!ok) {
      const err = new Error('Unsupported file type');
      err.code = 'UNSUPPORTED_MEDIA_TYPE';
      return cb(err);
    }

    cb(null, true);
  },
});

router.post('/uploads', upload.single('file'), asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ ok: false, error: 'file is required' });
  }

  const safeBase = String(file.originalname || 'file')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 80);

  const ext = path.extname(safeBase) || extFromMime(file.mimetype) || '';
  const baseNoExt = safeBase.replace(new RegExp(`${ext.replace('.', '\\.')}$`), '') || 'file';

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const rand = Math.random().toString(16).slice(2, 10);
  const objectPath = `uploads/${baseNoExt}_${stamp}_${rand}${ext}`;

  const uploaded = await uploadBuffer({
    objectPath,
    buffer: file.buffer,
    contentType: file.mimetype,
    upsert: false,
  });

  const url = uploaded.url;

  const kind = file.mimetype === 'application/pdf' ? 'pdf' : 'image';
  res.status(201).json({
    ok: true,
    url,
    kind,
    mime: file.mimetype,
    original_name: file.originalname,
    size_bytes: file.size,
  });
}));

router.post('/uploads/video/init', asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;

  const userId = asInt(req.body.user_id, 0);
  const filename = String(req.body.filename ?? '').trim();
  const mime = String(req.body.mime ?? '').trim();
  const sizeBytes = asInt(req.body.size_bytes, 0);

  if (!userId || !filename || !mime || !sizeBytes) {
    return res.status(400).json({ ok: false, error: 'user_id, filename, mime, size_bytes are required' });
  }

  const maxBytes = maxVideoSizeBytes();
  if (sizeBytes > maxBytes) {
    return res.status(413).json({ ok: false, error: `Video too large (max ${maxBytes} bytes)` });
  }

  const uploadId = uuidv4();
  const ext = path.extname(filename) || extFromVideoMime(mime);
  const safeExt = ext && ext.length <= 6 ? ext : '.mp4';

  const originalObjectPath = `videos/original/${uploadId}${safeExt}`;

  try {
    await pool.query(
      'INSERT INTO video_uploads (user_id, upload_id, original_path, original_mime, original_size_bytes, status) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, uploadId, originalObjectPath, mime, sizeBytes, 'init'],
    );
  } catch (e) {
    if (!isBadFieldError(e) && !isNoSuchTableError(e)) throw e;
    return res.status(500).json({ ok: false, error: 'video_uploads table/schema not ready' });
  }

  res.status(201).json({
    ok: true,
    upload_id: uploadId,
    max_bytes: maxBytes,
  });
}));

router.put(
  '/uploads/video/chunk',
  express.raw({ type: '*/*', limit: '64mb' }),
  asyncHandler(async (req, res) => {
    const { pool } = req.app.locals;

    const uploadId = String(req.query.upload_id ?? req.header('upload-id') ?? '').trim();
    const partNumber = asInt(req.query.part ?? req.header('part-number') ?? 0, 0);

    if (!uploadId || !partNumber || partNumber < 1) {
      return res.status(400).json({ ok: false, error: 'upload_id and part are required' });
    }

    const body = req.body;
    if (!Buffer.isBuffer(body) || body.length < 1) {
      return res.status(400).json({ ok: false, error: 'chunk body is required' });
    }

    // validate upload exists
    try {
      const [rows] = await pool.query('SELECT upload_id, status FROM video_uploads WHERE upload_id = ? LIMIT 1', [uploadId]);
      const row = rows && rows[0];
      if (!row) return res.status(404).json({ ok: false, error: 'upload not found' });

      const status = String(row.status ?? '');
      if (status === 'processing' || status === 'ready') {
        return res.status(409).json({ ok: false, error: 'upload already finalized' });
      }
    } catch (e) {
      if (!isNoSuchTableError(e)) throw e;
      return res.status(500).json({ ok: false, error: 'video_uploads table missing' });
    }

    const objectPath = `videos/uploads/${uploadId}/parts/part_${padPart(partNumber)}.bin`;
    await uploadBuffer({
      objectPath,
      buffer: body,
      contentType: 'application/octet-stream',
      upsert: true,
    });

    await pool.query(
      'UPDATE video_uploads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE upload_id = ? LIMIT 1',
      ['uploaded', uploadId],
    );

    res.json({ ok: true, upload_id: uploadId, part: partNumber, bytes: body.length });
  }),
);

router.post('/uploads/video/complete', asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;

  const userId = asInt(req.body.user_id, 0);
  const uploadId = String(req.body.upload_id ?? '').trim();
  const totalParts = asInt(req.body.total_parts, 0);
  const body = String(req.body.body ?? '').trim();

  if (!userId || !uploadId || !totalParts || totalParts < 1) {
    return res.status(400).json({ ok: false, error: 'user_id, upload_id, total_parts are required' });
  }

  let uploadRow;
  try {
    const [rows] = await pool.query('SELECT * FROM video_uploads WHERE upload_id = ? LIMIT 1', [uploadId]);
    uploadRow = rows && rows[0];
  } catch (e) {
    if (!isNoSuchTableError(e)) throw e;
    return res.status(500).json({ ok: false, error: 'video_uploads table missing' });
  }

  if (!uploadRow) return res.status(404).json({ ok: false, error: 'upload not found' });
  if (asInt(uploadRow.user_id, 0) !== userId) return res.status(403).json({ ok: false, error: 'forbidden' });

  const originalObjectPath = String(uploadRow.original_path ?? '').trim();
  if (!originalObjectPath) return res.status(500).json({ ok: false, error: 'upload original_path missing' });

  const partsPrefix = `videos/uploads/${uploadId}/parts/`;

  const existingObjects = await listAllObjects({ prefix: partsPrefix });
  const existingParts = new Set(
    existingObjects
      .map((o) => String(o.name ?? ''))
      .map((name) => {
        const m = /part_(\d{6})\.bin$/.exec(name);
        return m ? Number(m[1]) : null;
      })
      .filter((n) => Number.isFinite(n)),
  );

  for (let i = 1; i <= totalParts; i += 1) {
    if (!existingParts.has(i)) {
      return res.status(400).json({ ok: false, error: `missing part ${i}` });
    }
  }

  const tmpRootDir = path.join(os.tmpdir(), 'chadconnect');
  fs.mkdirSync(tmpRootDir, { recursive: true });
  const tmpAssembledPath = path.join(tmpRootDir, `video_${uploadId}_${uuidv4()}${path.extname(originalObjectPath) || '.mp4'}`);

  const { Readable } = require('stream');

  try {
    const out = fs.createWriteStream(tmpAssembledPath);

    for (let i = 1; i <= totalParts; i += 1) {
      const partObjectPath = `${partsPrefix}part_${padPart(i)}.bin`;
      const resp = await getObjectResponse({ objectPath: partObjectPath, mode: 'authenticated' });
      if (!resp.body) throw new Error('Supabase Storage download stream missing');

      const readable = Readable.fromWeb(resp.body);
      for await (const chunk of readable) {
        if (!out.write(chunk)) {
          await new Promise((resolve) => out.once('drain', resolve));
        }
      }
    }

    await new Promise((resolve, reject) => {
      out.end();
      out.on('finish', resolve);
      out.on('error', reject);
    });

    await uploadFile({
      objectPath: originalObjectPath,
      filePath: tmpAssembledPath,
      contentType: String(uploadRow.original_mime ?? 'video/mp4'),
      upsert: true,
    });
  } finally {
    try {
      fs.rmSync(tmpAssembledPath, { force: true });
    } catch (_) {
    }
  }

  // Create post (video)
  const mediaUrl = publicObjectUrl(originalObjectPath);
  const mediaName = path.basename(originalObjectPath);
  const mediaSizeBytes = asInt(uploadRow.original_size_bytes, 0) || null;
  const mediaMime = String(uploadRow.original_mime ?? 'video/mp4');

  let insertId;
  try {
    const [r] = await pool.query(
      'INSERT INTO posts (user_id, body, media_url, media_kind, media_mime, media_name, media_size_bytes, status, video_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, body, mediaUrl, 'video', mediaMime, mediaName, mediaSizeBytes, 'published', 'processing'],
    );
    insertId = r.insertId;
  } catch (e) {
    if (!isBadFieldError(e)) throw e;
    // If video columns not present, still create a post.
    const [r] = await pool.query(
      'INSERT INTO posts (user_id, body, media_url, media_kind, media_mime, media_name, media_size_bytes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, body, mediaUrl, 'video', mediaMime, mediaName, mediaSizeBytes, 'published'],
    );
    insertId = r.insertId;
  }

  await pool.query(
    'UPDATE video_uploads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE upload_id = ? LIMIT 1',
    ['processing', uploadId],
  );

  try {
    await removeByPrefix(`videos/uploads/${uploadId}/`);
  } catch (_) {
  }

  await videoQueue.add(
    'transcode',
    {
      postId: insertId,
      uploadId,
      originalObjectPath,
    },
    {
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 100,
    },
  );

  res.status(201).json({ ok: true, post_id: insertId, video_status: 'processing' });
}));

router.get('/uploads/video/status', asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;

  const uploadId = String(req.query.upload_id ?? '').trim();
  if (!uploadId) return res.status(400).json({ ok: false, error: 'upload_id is required' });

  let uploadRow;
  try {
    const [rows] = await pool.query('SELECT * FROM video_uploads WHERE upload_id = ? LIMIT 1', [uploadId]);
    uploadRow = rows && rows[0];
  } catch (e) {
    if (!isNoSuchTableError(e)) throw e;
    return res.status(500).json({ ok: false, error: 'video_uploads table missing' });
  }

  if (!uploadRow) return res.status(404).json({ ok: false, error: 'upload not found' });

  const objects = await listAllObjects({ prefix: `videos/uploads/${uploadId}/parts/` });
  const parts = objects
    .map((o) => {
      const m = /part_(\d{6})\.bin$/.exec(String(o.name ?? ''));
      return m ? Number(m[1]) : null;
    })
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  let nextPart = 1;
  for (const p of parts) {
    if (p === nextPart) nextPart += 1;
    else break;
  }

  res.json({
    ok: true,
    upload_id: uploadId,
    status: uploadRow.status,
    original_path: uploadRow.original_path,
    original_size_bytes: uploadRow.original_size_bytes,
    received_parts: parts,
    next_part: nextPart,
  });
}));

router.delete('/uploads/video', asyncHandler(async (req, res) => {
  const { pool } = req.app.locals;

  const uploadId = String(req.query.upload_id ?? '').trim();
  const userId = asInt(req.query.user_id, 0);

  if (!uploadId || !userId) {
    return res.status(400).json({ ok: false, error: 'upload_id and user_id are required' });
  }

  let uploadRow;
  try {
    const [rows] = await pool.query('SELECT * FROM video_uploads WHERE upload_id = ? LIMIT 1', [uploadId]);
    uploadRow = rows && rows[0];
  } catch (e) {
    if (!isNoSuchTableError(e)) throw e;
    return res.status(500).json({ ok: false, error: 'video_uploads table missing' });
  }

  if (!uploadRow) return res.status(404).json({ ok: false, error: 'upload not found' });
  if (asInt(uploadRow.user_id, 0) !== userId) return res.status(403).json({ ok: false, error: 'forbidden' });

  try {
    await removeByPrefix(`videos/uploads/${uploadId}/`);
  } catch (_) {
  }

  const originalObjectPath = String(uploadRow.original_path ?? '').trim();
  if (originalObjectPath) {
    try {
      await removeObjects([originalObjectPath]);
    } catch (_) {
    }
  }

  await pool.query('DELETE FROM video_uploads WHERE upload_id = ? LIMIT 1', [uploadId]);
  res.json({ ok: true });
}));

module.exports = {
  uploadsRouter: router,
};
