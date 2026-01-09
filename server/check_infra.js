const mysql = require('mysql2/promise');

function envInt(name, fallback) {
  const n = Number(process.env[name]);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

async function checkDb() {
  const host = process.env.MYSQL_HOST || '127.0.0.1';
  const port = envInt('MYSQL_PORT', 3306);
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQL_DATABASE || 'chadconnect';

  const conn = await mysql.createConnection({ host, port, user, password, database, multipleStatements: true });

  const [t1] = await conn.query("SHOW TABLES LIKE 'user_push_tokens'");
  const [t2] = await conn.query("SHOW TABLES LIKE 'video_uploads'");
  const [t3] = await conn.query("SHOW TABLES LIKE 'posts'");
  const [cnt] = await conn.query(
    "SELECT COUNT(1) AS cnt FROM information_schema.tables WHERE table_schema = ?",
    [database],
  );

  console.log('db_host=', host);
  console.log('db_port=', port);
  console.log('db_name=', database);
  console.log('tables_in_schema=', cnt && cnt[0] ? cnt[0].cnt : null);
  console.log('posts_exists=', Array.isArray(t3) && t3.length > 0);
  console.log('user_push_tokens_exists=', Array.isArray(t1) && t1.length > 0);
  console.log('video_uploads_exists=', Array.isArray(t2) && t2.length > 0);

  await conn.end();
}

async function checkBucket() {
  const admin = require('firebase-admin');
  const fs = require('fs');
  const path = require('path');

  const saPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, 'secret', 'firebase-service-account.json');
  const raw = fs.readFileSync(saPath, 'utf8');
  const serviceAccount = JSON.parse(raw);

  const candidates = [];
  if (process.env.FIREBASE_STORAGE_BUCKET) candidates.push(process.env.FIREBASE_STORAGE_BUCKET);
  candidates.push(`${serviceAccount.project_id}.appspot.com`);
  candidates.push(`${serviceAccount.project_id}.firebasestorage.app`);

  const seen = new Set();

  for (const bucketName of candidates) {
    const name = String(bucketName || '').trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);

    const app = admin.initializeApp(
      {
        credential: admin.credential.cert(serviceAccount),
        storageBucket: name,
      },
      `check-${name}`,
    );

    const bucket = app.storage().bucket();
    const [exists] = await bucket.exists();
    console.log('bucket=', name, 'exists=', exists);

    await app.delete();
  }
}

(async () => {
  const args = new Set(process.argv.slice(2));
  await checkDb();

  if (args.has('--check-bucket')) {
    await checkBucket();
  }
})().catch((e) => {
  console.error(e && e.stack ? e.stack : e);
  process.exitCode = 1;
});
