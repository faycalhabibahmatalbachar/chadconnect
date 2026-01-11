const { Queue } = require('bullmq');

const { createRedis } = require('./redis');

function hasRedisConfig() {
  return Boolean(
    (process.env.REDIS_URL && String(process.env.REDIS_URL).trim())
      || process.env.REDIS_HOST
      || process.env.REDIS_PORT
      || process.env.REDIS_PASSWORD,
  );
}

function createDisabledQueue() {
  return {
    add: async () => {
      const err = new Error('Video queue disabled (Redis not configured)');
      err.code = 'VIDEO_QUEUE_DISABLED';
      throw err;
    },
  };
}

let videoQueue;

if (hasRedisConfig()) {
  const connection = createRedis();
  // Prevent unhandled error events from crashing the process.
  if (connection && typeof connection.on === 'function') {
    connection.on('error', () => {});
  }

  videoQueue = new Queue('video-transcode', {
    connection,
  });
} else {
  videoQueue = createDisabledQueue();
}

module.exports = {
  videoQueue,
};
