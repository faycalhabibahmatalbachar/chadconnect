const path = require('path');
const fs = require('fs');

const admin = require('firebase-admin');

let initialized = false;

function initFirebaseAdmin() {
  if (initialized) return admin;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    ?? path.join(__dirname, '..', 'secret', 'firebase-service-account.json');

  let serviceAccount;

  if (serviceAccountJson) {
    serviceAccount = JSON.parse(serviceAccountJson);
  } else if (serviceAccountBase64) {
    serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf8'));
  } else {
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(`Firebase service account JSON not found at: ${serviceAccountPath}`);
    }

    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  }

  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET
    ?? 'chadconnect-217a8.firebasestorage.app';

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket,
  });

  initialized = true;
  return admin;
}

function getMessaging() {
  initFirebaseAdmin();
  return admin.messaging();
}

function getBucket() {
  initFirebaseAdmin();
  return admin.storage().bucket();
}

module.exports = {
  initFirebaseAdmin,
  getMessaging,
  getBucket,
};
