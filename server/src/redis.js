const Redis = require('ioredis');

function requiredEnv(name, fallback) {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === null || v === '') {
    throw new Error(`Missing env: ${name}`);
  }
  return v;
}

function createRedis() {
  const url = process.env.REDIS_URL;
  if (url && String(url).trim().length > 0) {
    return new Redis(String(url));
  }

  const host = requiredEnv('REDIS_HOST', '127.0.0.1');
  const port = Number(requiredEnv('REDIS_PORT', '6379'));
  const password = process.env.REDIS_PASSWORD;

  return new Redis({
    host,
    port,
    password: password && String(password).trim().length > 0 ? String(password) : undefined,
    maxRetriesPerRequest: null,
  });
}

module.exports = {
  createRedis,
};
