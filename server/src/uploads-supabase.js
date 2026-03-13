/**
 * Uploads Module - Supabase Version
 * Handles file uploads with Supabase Storage
 */

const express = require('express');
const multer = require('multer');
const path = require('path');

const { requireAuth } = require('./auth-supabase');
const { supabase } = require('./db-supabase');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function asInt(v, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

// POST /uploads/image - Upload an image
router.post('/uploads/image', requireAuth, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  if (!userId) return res.status(401).json({ error: 'unauthorized' });

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ error: 'Invalid file type. Only images allowed.' });
  }

  // Generate unique filename
  const ext = path.extname(req.file.originalname) || '.jpg';
  const filename = `images/${userId}/${Date.now()}${ext}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('uploads')
    .upload(filename, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });

  if (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Failed to upload file' });
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('uploads')
    .getPublicUrl(filename);

  res.status(201).json({
    url: urlData.publicUrl,
    path: filename,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
}));

// POST /uploads/document - Upload a document (PDF)
router.post('/uploads/document', requireAuth, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  if (!userId) return res.status(401).json({ error: 'unauthorized' });

  // Validate file type
  const allowedTypes = ['application/pdf'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ error: 'Invalid file type. Only PDF allowed.' });
  }

  // Generate unique filename
  const ext = path.extname(req.file.originalname) || '.pdf';
  const filename = `documents/${userId}/${Date.now()}${ext}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('uploads')
    .upload(filename, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });

  if (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Failed to upload file' });
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('uploads')
    .getPublicUrl(filename);

  res.status(201).json({
    url: urlData.publicUrl,
    path: filename,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
}));

// POST /uploads/video - Upload a video
router.post('/uploads/video', requireAuth, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  if (!userId) return res.status(401).json({ error: 'unauthorized' });

  // Validate file type
  const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ error: 'Invalid file type. Only MP4, WebM, MOV allowed.' });
  }

  // Generate unique filename
  const ext = path.extname(req.file.originalname) || '.mp4';
  const filename = `videos/${userId}/${Date.now()}${ext}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('uploads')
    .upload(filename, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });

  if (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Failed to upload file' });
  }

  // Create video upload record for processing
  const uploadId = require('crypto').randomUUID();
  await supabase
    .from('video_uploads')
    .insert({
      user_id: userId,
      upload_id: uploadId,
      original_path: filename,
      original_mime: req.file.mimetype,
      original_size_bytes: req.file.size,
      status: 'uploaded',
    });

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('uploads')
    .getPublicUrl(filename);

  res.status(201).json({
    url: urlData.publicUrl,
    path: filename,
    upload_id: uploadId,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
}));

// DELETE /uploads/:path - Delete a file
router.delete('/uploads/*', requireAuth, asyncHandler(async (req, res) => {
  const userId = Math.max(asInt(req.user && req.user.id, 0), 0);
  const filePath = req.params[0];

  if (!userId) return res.status(401).json({ error: 'unauthorized' });
  if (!filePath) return res.status(400).json({ error: 'No file path provided' });

  // Verify the file belongs to the user
  if (!filePath.includes(`/${userId}/`)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { error } = await supabase.storage
    .from('uploads')
    .remove([filePath]);

  if (error) {
    console.error('Delete error:', error);
    return res.status(500).json({ error: 'Failed to delete file' });
  }

  res.json({ ok: true });
}));

module.exports = {
  uploadsRouter: router,
};
