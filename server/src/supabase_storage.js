function requiredEnv(name) {
  const v = process.env[name];
  if (v === undefined || v === null || String(v).trim() === '') {
    throw new Error(`Missing env: ${name}`);
  }
  return String(v);
}

function normalizeBaseUrl(u) {
  const s = String(u ?? '').trim();
  return s.endsWith('/') ? s.slice(0, -1) : s;
}

function encodePath(p) {
  return String(p)
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

function storageBaseUrl() {
  return `${normalizeBaseUrl(requiredEnv('SUPABASE_URL'))}/storage/v1`;
}

function serviceRoleKey() {
  return requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
}

function bucketName() {
  return process.env.SUPABASE_STORAGE_BUCKET || 'chadconnect';
}

function publicObjectUrl(objectPath) {
  const b = bucketName();
  const base = normalizeBaseUrl(requiredEnv('SUPABASE_URL'));
  return `${base}/storage/v1/object/public/${encodeURIComponent(b)}/${encodePath(objectPath)}`;
}

async function supabaseRequest(path, { method, headers, body } = {}) {
  const base = storageBaseUrl();
  const key = serviceRoleKey();

  const opts = arguments.length > 1 && arguments[1] ? arguments[1] : {};
  const extra = { ...opts };
  delete extra.method;
  delete extra.headers;
  delete extra.body;

  const needsDuplex = body && typeof body.pipe === 'function' && extra.duplex === undefined;

  const res = await fetch(`${base}${path}`, {
    method: method || 'GET',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(headers || {}),
    },
    body,
    ...(needsDuplex ? { duplex: 'half' } : {}),
    ...extra,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`Supabase Storage ${method || 'GET'} ${path} failed: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }

  return res;
}

async function uploadBuffer({ objectPath, buffer, contentType, upsert = false }) {
  const b = bucketName();
  const res = await supabaseRequest(`/object/${encodeURIComponent(b)}/${encodePath(objectPath)}`, {
    method: 'POST',
    headers: {
      'Content-Type': contentType || 'application/octet-stream',
      ...(upsert ? { 'x-upsert': 'true' } : {}),
    },
    body: buffer,
  });

  const json = await res.json().catch(() => null);
  return {
    key: json && (json.Key || json.key) ? (json.Key || json.key) : objectPath,
    url: publicObjectUrl(objectPath),
  };
}

async function getObjectResponse({ objectPath, mode = 'authenticated' }) {
  const b = bucketName();
  const safeMode = mode === 'public' ? 'public' : 'authenticated';
  return supabaseRequest(`/object/${safeMode}/${encodeURIComponent(b)}/${encodePath(objectPath)}`, {
    method: 'GET',
  });
}

async function uploadFile({ objectPath, filePath, contentType, upsert = false }) {
  const fs = require('fs');
  const stream = fs.createReadStream(filePath);
  const b = bucketName();

  const res = await supabaseRequest(`/object/${encodeURIComponent(b)}/${encodePath(objectPath)}`, {
    method: 'POST',
    headers: {
      'Content-Type': contentType || 'application/octet-stream',
      ...(upsert ? { 'x-upsert': 'true' } : {}),
    },
    body: stream,
  });

  const json = await res.json().catch(() => null);
  return {
    key: json && (json.Key || json.key) ? (json.Key || json.key) : objectPath,
    url: publicObjectUrl(objectPath),
  };
}

async function downloadToFile({ objectPath, destination, mode = 'authenticated' }) {
  const fs = require('fs');
  const { Readable } = require('stream');

  const b = bucketName();
  const safeMode = mode === 'public' ? 'public' : 'authenticated';

  const res = await supabaseRequest(`/object/${safeMode}/${encodeURIComponent(b)}/${encodePath(objectPath)}`, {
    method: 'GET',
  });

  await new Promise((resolve, reject) => {
    const out = fs.createWriteStream(destination);
    out.on('error', reject);
    out.on('finish', resolve);

    const body = res.body;
    if (!body) {
      out.end();
      return resolve();
    }

    Readable.fromWeb(body).pipe(out);
  });
}

async function listObjects({ prefix, limit = 1000, offset = 0 }) {
  const b = bucketName();
  const res = await supabaseRequest(`/object/list/${encodeURIComponent(b)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix: String(prefix || ''), limit, offset }),
  });

  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

async function listAllObjects({ prefix }) {
  const out = [];
  let offset = 0;
  const limit = 1000;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const batch = await listObjects({ prefix, limit, offset });
    out.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
  }

  return out;
}

async function removeObjects(objectPaths) {
  const b = bucketName();
  const prefixes = (Array.isArray(objectPaths) ? objectPaths : [])
    .map((p) => String(p || '').trim())
    .filter(Boolean);

  if (prefixes.length === 0) return [];

  const res = await supabaseRequest(`/object/${encodeURIComponent(b)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes }),
  });

  const json = await res.json().catch(() => null);
  return Array.isArray(json) ? json : [];
}

async function removeByPrefix(prefix) {
  const all = await listAllObjects({ prefix });
  const names = all.map((o) => String(o.name || '').trim()).filter(Boolean);

  for (let i = 0; i < names.length; i += 1000) {
    // eslint-disable-next-line no-await-in-loop
    await removeObjects(names.slice(i, i + 1000));
  }
}

module.exports = {
  bucketName,
  publicObjectUrl,
  uploadBuffer,
  uploadFile,
  getObjectResponse,
  downloadToFile,
  listObjects,
  listAllObjects,
  removeObjects,
  removeByPrefix,
};
