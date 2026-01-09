require('dotenv').config();

const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

const { Worker } = require('bullmq');
const { v4: uuidv4 } = require('uuid');

const { pool } = require('./db');
const { createRedis } = require('./redis');
const {
  publicObjectUrl,
  downloadToFile,
  uploadFile,
} = require('./supabase_storage');

function defaultFfmpegPath() {
  try {
    const p = require('ffmpeg-static');
    if (p && String(p).trim()) return String(p);
  } catch (_) {
  }
  return 'ffmpeg';
}

function defaultFfprobePath() {
  try {
    const mod = require('ffprobe-static');
    const p = mod && (mod.path || mod);
    if (p && String(p).trim()) return String(p);
  } catch (_) {
  }
  return 'ffprobe';
}

function requiredEnv(name, fallback) {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === null || v === '') {
    throw new Error(`Missing env: ${name}`);
  }
  return v;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function safeRm(p) {
  try {
    fs.rmSync(p, { recursive: true, force: true });
  } catch (_) {
  }
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) return resolve({ stdout, stderr });
      const err = new Error(`Command failed: ${cmd} ${args.join(' ')} (code=${code})`);
      err.stdout = stdout;
      err.stderr = stderr;
      reject(err);
    });
  });
}

function safeInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function contentTypeForName(name) {
  const lower = String(name ?? '').toLowerCase();
  if (lower.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl';
  if (lower.endsWith('.ts')) return 'video/MP2T';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

function rewritePlaylistFile(filePath, urlByName) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const out = lines.map((line) => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return line;
    if (t.startsWith('http://') || t.startsWith('https://')) return line;
    const u = urlByName[t];
    return u ? u : line;
  }).join('\n');
  fs.writeFileSync(filePath, out, 'utf8');
}

async function uploadDirToSupabase({ outDir, objectDir }) {
  const entries = fs.readdirSync(outDir, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile()).map((e) => e.name);

  for (const name of files) {
    const localPath = path.join(outDir, name);
    const objectPath = `${objectDir}/${name}`;

    await uploadFile({
      objectPath,
      filePath: localPath,
      contentType: contentTypeForName(name),
      upsert: true,
    });
  }

  return { files };
}

async function probeVideo(inputPath) {
  const ffprobe = requiredEnv('FFPROBE_PATH', defaultFfprobePath());

  const { stdout } = await run(ffprobe, [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,duration',
    '-of', 'json',
    inputPath,
  ]);

  const json = JSON.parse(stdout);
  const stream = json && Array.isArray(json.streams) ? json.streams[0] : null;
  const width = safeInt(stream?.width);
  const height = safeInt(stream?.height);
  const durationSec = stream?.duration != null ? Number(stream.duration) : null;

  const durationMs = durationSec != null && Number.isFinite(durationSec) ? Math.trunc(durationSec * 1000) : null;
  return { width, height, durationMs };
}

async function transcodeToHls({ inputPath, outDir, prefix }) {
  const ffmpeg = requiredEnv('FFMPEG_PATH', defaultFfmpegPath());

  ensureDir(outDir);

  const thumbPath = path.join(outDir, `${prefix}_thumb.jpg`);
  await run(ffmpeg, [
    '-y',
    '-i', inputPath,
    '-ss', '00:00:01.000',
    '-vframes', '1',
    '-vf', 'scale=1280:-2',
    '-q:v', '3',
    thumbPath,
  ]);

  const masterPath = path.join(outDir, `${prefix}_master.m3u8`);
  const v0 = path.join(outDir, `${prefix}_360p.m3u8`);
  const v1 = path.join(outDir, `${prefix}_480p.m3u8`);
  const v2 = path.join(outDir, `${prefix}_720p.m3u8`);

  await run(ffmpeg, [
    '-y',
    '-i', inputPath,

    '-filter_complex',
    '[0:v]split=3[v360][v480][v720];'
    + '[v360]scale=w=640:h=-2:force_original_aspect_ratio=decrease[v360out];'
    + '[v480]scale=w=854:h=-2:force_original_aspect_ratio=decrease[v480out];'
    + '[v720]scale=w=1280:h=-2:force_original_aspect_ratio=decrease[v720out]',

    // Map
    '-map', '[v360out]', '-map', '0:a:0?',
    '-map', '[v480out]', '-map', '0:a:0?',
    '-map', '[v720out]', '-map', '0:a:0?',

    // Video settings (H.264)
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-profile:v', 'main',
    '-crf', '22',
    '-g', '48',
    '-keyint_min', '48',
    '-sc_threshold', '0',

    // Audio settings
    '-c:a', 'aac',
    '-b:a', '128k',

    // Per-variant bitrate targets
    '-b:v:0', '800k', '-maxrate:v:0', '1000k', '-bufsize:v:0', '1600k',
    '-b:v:1', '1400k', '-maxrate:v:1', '1800k', '-bufsize:v:1', '2800k',
    '-b:v:2', '2800k', '-maxrate:v:2', '3600k', '-bufsize:v:2', '5600k',

    // HLS packaging
    '-f', 'hls',
    '-hls_time', '6',
    '-hls_playlist_type', 'vod',
    '-hls_flags', 'independent_segments',
    '-hls_segment_type', 'mpegts',
    '-hls_segment_filename', path.join(outDir, `${prefix}_v%v_%03d.ts`),
    '-master_pl_name', path.basename(masterPath),
    '-var_stream_map', 'v:0,a:0 v:1,a:1 v:2,a:2',

    // Output playlists per variant
    v0,
    v1,
    v2,
  ]);

  return {
    thumbPath,
    masterPath,
    variantPlaylists: [v0, v1, v2],
  };
}

const tmpRootDir = path.join(os.tmpdir(), 'chadconnect');
ensureDir(tmpRootDir);

const connection = createRedis();

const worker = new Worker(
  'video-transcode',
  async (job) => {
    const { postId, uploadId, originalObjectPath } = job.data;

    if (!postId || !uploadId || !originalObjectPath) {
      throw new Error('Missing job data (postId, uploadId, originalObjectPath)');
    }

    const jobTmpDir = path.join(tmpRootDir, `video_${postId}_${uuidv4()}`);
    const ext = path.extname(String(originalObjectPath)) || '.mp4';
    const inputPath = path.join(jobTmpDir, `input${ext}`);
    const outDir = path.join(jobTmpDir, 'hls');

    ensureDir(jobTmpDir);
    ensureDir(outDir);

    try {
      await downloadToFile({ objectPath: String(originalObjectPath), destination: inputPath, mode: 'authenticated' });

      await pool.query(
        'UPDATE posts SET video_status = ? WHERE id = ? LIMIT 1',
        ['processing', postId],
      );

      const probe = await probeVideo(inputPath);

      const prefix = 'video';
      const { thumbPath, masterPath } = await transcodeToHls({ inputPath, outDir, prefix });
      const objectDir = `videos/hls/${postId}`;

      const entries = fs.readdirSync(outDir, { withFileTypes: true });
      const localFiles = entries.filter((e) => e.isFile()).map((e) => e.name);

      const urlByName = Object.fromEntries(
        localFiles.map((name) => {
          const objectPath = `${objectDir}/${name}`;
          return [name, publicObjectUrl(objectPath)];
        }),
      );

      rewritePlaylistFile(masterPath, urlByName);
      for (const name of localFiles) {
        if (name === path.basename(masterPath)) continue;
        if (!name.toLowerCase().endsWith('.m3u8')) continue;
        rewritePlaylistFile(path.join(outDir, name), urlByName);
      }

      await uploadDirToSupabase({ outDir, objectDir });

      const thumbUrl = publicObjectUrl(`${objectDir}/${path.basename(thumbPath)}`);
      const hlsUrl = publicObjectUrl(`${objectDir}/${path.basename(masterPath)}`);

      await pool.query(
        'UPDATE posts SET video_status = ?, video_duration_ms = ?, video_width = ?, video_height = ?, video_thumb_url = ?, video_hls_url = ? WHERE id = ? LIMIT 1',
        ['ready', probe.durationMs, probe.width, probe.height, thumbUrl, hlsUrl, postId],
      );

      await pool.query(
        'UPDATE video_uploads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE upload_id = ? LIMIT 1',
        ['ready', String(uploadId)],
      );

      return { ok: true, postId, thumbUrl, hlsUrl };
    } finally {
      safeRm(jobTmpDir);
    }
  },
  { connection, concurrency: 1 },
);

// eslint-disable-next-line no-console
worker.on('failed', async (job, err) => {
  try {
    if (job && job.data && job.data.postId) {
      await pool.query(
        'UPDATE posts SET video_status = ? WHERE id = ? LIMIT 1',
        ['failed', job.data.postId],
      );
    }
    if (job && job.data && job.data.uploadId) {
      await pool.query(
        'UPDATE video_uploads SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE upload_id = ? LIMIT 1',
        ['failed', String(err?.message ?? err), String(job.data.uploadId)],
      );
    }
  } catch (_) {
  }
  console.error('Video job failed', err);
});

worker.on('ready', () => {
  console.log('Video worker ready');
});
