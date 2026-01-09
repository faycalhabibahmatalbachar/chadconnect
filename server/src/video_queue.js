const { Queue } = require('bullmq');

const { createRedis } = require('./redis');

const connection = createRedis();

const videoQueue = new Queue('video-transcode', {
  connection,
});

module.exports = {
  videoQueue,
};
