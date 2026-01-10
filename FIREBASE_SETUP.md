# Firebase Firestore Configuration for ChadConnect

## Collections Overview

Firebase Firestore is a NoSQL database, so collections are created automatically when you add the first document. However, here's the structure used by ChadConnect:

### 1. **users_fcm_tokens**
Stores FCM tokens for push notifications.

**Document structure:**
```json
{
  "userId": "12345",
  "token": "fcm_token_here",
  "platform": "android",
  "createdAt": "2026-01-10T15:30:00Z",
  "lastUsedAt": "2026-01-10T15:30:00Z"
}
```

**Index needed:**
- `userId` (ascending)
- `token` (ascending)

### 2. **notifications_history**
Optional: Stores notification history for analytics.

**Document structure:**
```json
{
  "userId": "12345",
  "title": "New Post",
  "body": "Someone posted...",
  "sentAt": "2026-01-10T15:30:00Z",
  "status": "sent",
  "platform": "android"
}
```

**Index needed:**
- `userId` + `sentAt` (composite index)

### 3. **device_info**
Optional: Stores device information for better targeting.

**Document structure:**
```json
{
  "userId": "12345",
  "deviceId": "unique_device_id",
  "model": "Samsung Galaxy",
  "osVersion": "Android 13",
  "appVersion": "1.0.0",
  "lastSeen": "2026-01-10T15:30:00Z"
}
```

## Setup Instructions

### Automatic Creation (Recommended)
No manual setup needed! Collections will be created automatically when your app:
1. Registers an FCM token
2. Sends a notification
3. Logs device info

### Manual Setup (Optional for indexes)

If you want to create indexes manually:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project `chadconnect-217a8`
3. Navigate to **Firestore Database**
4. Click on **Indexes** tab
5. Create composite indexes:

**For notifications_history:**
- Collection: `notifications_history`
- Fields: `userId` (Ascending), `sentAt` (Descending)

**For users_fcm_tokens:**
- Collection: `users_fcm_tokens`
- Fields: `userId` (Ascending), `lastUsedAt` (Descending)

## Security Rules

Set up Firestore security rules to protect your data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users FCM Tokens - only backend can write
    match /users_fcm_tokens/{tokenId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow write: if false; // Only backend via Admin SDK
    }
    
    // Notification History - users can only read their own
    match /notifications_history/{notificationId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow write: if false; // Only backend via Admin SDK
    }
    
    // Device Info - users can read and update their own
    match /device_info/{deviceId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create, update: if request.auth != null && request.auth.uid == request.resource.data.userId;
      allow delete: if false;
    }
  }
}
```

To apply these rules:
1. Go to **Firestore Database** → **Rules**
2. Paste the above rules
3. Click **Publish**

## Testing Firestore

### Via Firebase Console
1. Go to **Firestore Database**
2. Click **+ Start collection**
3. Enter collection name: `users_fcm_tokens`
4. Add test document with the structure above
5. Delete the test document after verification

### Via Backend
Your Node.js backend automatically uses Firestore via Firebase Admin SDK. No additional code needed!

## Firebase Storage Setup

For file uploads (images, videos, PDFs):

1. Go to **Storage** in Firebase Console
2. Click **Get Started**
3. Choose production mode
4. Set up default rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Posts media
    match /posts/{userId}/{fileName} {
      allow read: if true; // Public read
      allow write: if false; // Only backend
    }
    
    // User avatars
    match /avatars/{userId}/{fileName} {
      allow read: if true; // Public read
      allow write: if false; // Only backend
    }
    
    // Videos
    match /videos/{videoId}/{fileName} {
      allow read: if true; // Public read
      allow write: if false; // Only backend
    }
  }
}
```

**Note:** Most file storage is handled by Supabase in this project. Firebase Storage is optional and can be used as a backup or for specific features.

## Cloud Messaging Setup

For Push Notifications:

1. Go to **Cloud Messaging** in Firebase Console
2. Click on **Send test message**
3. Enter your FCM token (get it from the app after registration)
4. Send a test notification to verify it works

## Summary

✅ **Firestore:** Collections created automatically, no manual setup required  
✅ **Security Rules:** Apply the rules above for data protection  
✅ **Indexes:** Created automatically, or add manually for better performance  
✅ **Storage:** Optional, mostly using Supabase  
✅ **Cloud Messaging:** Already configured via `google-services.json`

Everything is ready! Your backend will handle all Firestore operations automatically through the Firebase Admin SDK.
