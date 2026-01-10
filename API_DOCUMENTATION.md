# 📘 GUIDE COMPLET DES API - ChadConnect

**Date:** 10 Janvier 2026  
**Base URL:** `http://localhost:3001` (local) ou `https://chadconnect-api.onrender.com` (production)

---

## 🔐 AUTHENTICATION

### 1. Register (Inscription)
```http
POST /api/auth/register
Content-Type: application/json

{
  "phone": "+23566123456",      // REQUIS Format international
  "password": "SecurePass123",   // REQUIS Min 6 caractères 
  "display_name": "Jean Dupont"  // Optionnel
}
```

**Réponse 201:**
```json
{
  "user": {
    "id": 1,
    "phone": "+23566123456",
    "display_name": "Jean Dupont",
    "role": "student",
    "status": "active"
  },
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### 2. Login (Connexion)
```http
POST /api/auth/login
Content-Type: application/json

{
  "phone": "+23566123456",
  "password": "SecurePass123"
}
```

**Réponse 200:** (même format que register)

### 3. Get Profile (Mon Profil)
```http
GET /api/auth/me
Authorization: Bearer eyJhbGc...
```

**Réponse 200:**
```json
{
  "user": {
    "id": 1,
    "phone": "+23566123456",
    "display_name": "Jean Dupont",
    "role": "student",
    "status": "active"
  }
}
```

### 4. Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGc..."
}
```

### 5. Logout
```http
POST /api/auth/logout
Authorization: Bearer eyJhbGc...
```

---

## 📚 INSTITUTIONS

### 1. Liste des Institutions
```http
GET /api/institutions
Authorization: Bearer eyJhbGc...
```

**Réponse 200:**
```json
[
  {
    "id": 1,
    "name": "Lycée de N'Djamena",
    "city": "N'Djamena",
    "country": "Tchad",
    "status": "approved",
    "created_at": "2026-01-10T12:00:00.000Z"
  }
]
```

### 2. Créer une Institution
```http
POST /api/institutions
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "name": "Lycée de Moundou",
  "city": "Moundou",
  "country": "Tchad"
}
```

### 3. Obtenir les Classes d'une Institution
```http
GET /api/institutions/:institutionId/classes
Authorization: Bearer eyJhbGc...
```

---

## 📱 SOCIAL / POSTS

### 1. Liste des Posts (Feed)
```http
GET /api/posts?limit=20&offset=0
Authorization: Bearer eyJhbGc... (Optionnel, pour likes/bookmarks)
```

**Réponse 200:**
```json
{
  "items": [
    {
      "id": 1,
      "user_id": 5,
      "user_display_name": "Jean",
      "body": "Premier post!",
      "media_url": null,
      "media_kind": null,
      "likes_count": 3,
      "comments_count": 2,
      "liked_by_me": true,
      "bookmarked_by_me": false,
      "my_reaction": "love",
      "created_at": "2026-01-10T12:00:00.000Z"
    }
  ],
  "limit": 20,
  "offset": 0
}
```

### 2. Créer un Post
```http
POST /api/posts
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "body": "Contenu du post",
  "media_url": "https://...",         // Optionnel
  "media_kind": "image|pdf|video",    // Optionnel
  "media_mime": "image/jpeg",         // Optionnel
  "media_name": "photo.jpg",          // Optionnel
  "media_size_bytes": 12345,          // Optionnel
  "institution_id": 1,                // Optionnel
  "class_id": 1                       // Optionnel
}
```

**Réponse 201:** Retourne le post créé

### 3. Like un Post
```http
POST /api/posts/:postId/like
Authorization: Bearer eyJhbGc...
```

### 4. Unlike un Post
```http
DELETE /api/posts/:postId/like
Authorization: Bearer eyJhbGc...
```

### 5. Bookmark un Post
```http
POST /api/posts/:postId/bookmark
Authorization: Bearer eyJhbGc...
```

### 6. Unbookmark un Post
```http
DELETE /api/posts/:postId/bookmark
Authorization: Bearer eyJhbGc...
```

### 7. Supprimer un Post
```http
DELETE /api/posts/:postId
Authorization: Bearer eyJhbGc...
```

### 8. Modifier un Post
```http
PUT /api/posts/:postId
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "body": "Nouveau contenu"
}
```

---

## 💬 COMMENTAIRES

### 1. Liste des Commentaires d'un Post
```http
GET /api/posts/:postId/comments?limit=50&offset=0
```

**Réponse 200:**
```json
{
  "items": [
    {
      "id": 1,
      "post_id": 1,
      "user_id": 2,
      "user_display_name": "Marie",
      "body": "Super post!",
      "parent_comment_id": null,
      "is_post_author": false,
      "likes_count": 1,
      "liked_by_me": false,
      "created_at": "2026-01-10T12:05:00.000Z"
    }
  ]
}
```

### 2. Ajouter un Commentaire
```http
POST /api/posts/:postId/comments
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "body": "Mon commentaire",
  "parent_comment_id": 5          // Optionnel, pour répondre à un commentaire
}
```

### 3. Supprimer un Commentaire
```http
DELETE /api/comments/:commentId
Authorization: Bearer eyJhbGc...
```

### 4. Like un Commentaire
```http
POST /api/comments/:commentId/like
Authorization: Bearer eyJhbGc...
```

### 5. Unlike un Commentaire
```http
DELETE /api/comments/:commentId/like
Authorization: Bearer eyJhbGc...
```

---

## 🚨 SIGNALEMENTS (REPORTS)

### Signaler du Contenu
```http
POST /api/reports
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "target_type": "post|comment|user",  // REQUIS
  "target_id": 123,                     // REQUIS
  "reason": "Contenu inapproprié",      // REQUIS
  "details": "Détails supplémentaires"  // Optionnel
}
```

---

## 📅 PLANNING (Objectifs Hebdomadaires)

### 1. Obtenir les Objectifs
```http
GET /api/planning/goals
Authorization: Bearer eyJhbGc...
```

### 2. Créer un Objectif
```http
POST /api/planning/goals
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "title": "Réviser Math Chapitre 3",
  "subject_id": 1,              // Optionnel
  "chapter_id": 5               // Optionnel
}
```

### 3. Mettre à Jour un Objectif
```http
PUT /api/planning/goals/:goalId
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "title": "Nouveau titre",
  "completed": true
}
```

### 4. Supprimer un Objectif
```http
DELETE /api/planning/goals/:goalId
Authorization: Bearer eyJhbGc...
```

---

## 📖 CONTENU ÉDUCATIF (STUDY)

### 1. Liste des Matières
```http
GET /api/subjects
Authorization: Bearer eyJhbGc...
```

**Réponse 200:**
```json
[
  {
    "id": 1,
    "name": "Mathématiques",
    "code": "MATH",
    "level_id": 1,
    "created_at": "2026-01-10T12:00:00.000Z"
  }
]
```

### 2. Chapitres d'une Matière
```http
GET /api/subjects/:subjectId/chapters
Authorization: Bearer eyJhbGc...
```

### 3. Leçons d'un Chapitre
```http
GET /api/chapters/:chapterId/lessons
Authorization: Bearer eyJhbGc...
```

---

## 🔔 PUSH NOTIFICATIONS

### 1. Enregistrer un Token FCM
```http
POST /api/push/register
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "token": "fcm_token_here",
  "platform": "android|ios"
}
```

### 2. Supprimer un Token FCM
```http
DELETE /api/push/unregister
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "token": "fcm_token_here"
}
```

---

## 📤 UPLOADS (Fichiers & Vidéos)

### 1. Upload Fichier Simple
```http
POST /api/uploads
Authorization: Bearer eyJhbGc...
Content-Type: multipart/form-data

file: [binary data]
```

**Réponse 201:**
```json
{
  "url": "https://...",
  "mime": "image/jpeg",
  "size": 12345
}
```

### 2. Initialiser Upload Vidéo
```http
POST /api/uploads/video/init
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "user_id": 1,
  "filename": "cours.mp4",
  "mime": "video/mp4",
  "size_bytes": 50000000
}
```

**Réponse 200:**
```json
{
  "upload_id": "uuid",
  "total_parts": 10
}
```

### 3. Upload Chunk Vidéo
```http
PUT /api/uploads/video/chunk?upload_id=uuid&part=1
Authorization: Bearer eyJhbGc...
Content-Type: application/octet-stream

[binary chunk data]
```

### 4. Finaliser Upload Vidéo
```http
POST /api/uploads/video/complete
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "user_id": 1,
  "upload_id": "uuid",
  "total_parts": 10,
  "body": "Description de la vidéo"
}
```

### 5. Status Upload Vidéo
```http
GET /api/uploads/video/status?upload_id=uuid
Authorization: Bearer eyJhbGc...
```

---

## ⚠️ CODES D'ERREUR

| Code | Signification | Action |
|------|---------------|--------|
| 200 | OK | Succès |
| 201 | Created | Ressource créée |
| 400 | Bad Request | Données invalides |
| 401 | Unauthorized | Token manquant/invalide |
| 403 | Forbidden | Pas les permissions |
| 404 | Not Found | Ressource introuvable |
| 500 | Server Error | Erreur serveur |
| 503 | Service Unavailable | Service temporairement indisponible |

---

## 🔑 AUTHENTIFICATION

Toutes les routes protégées nécessitent un header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Le token est obtenu lors du login ou register et expire après 1 heure.

---

## 📊 PAGINATION

Les listes supportent la pagination:
```
?limit=20&offset=0
```

- `limit`: Nombre d'éléments (max 100)
- `offset`: Position de départ

---

## 🧪 TESTER L'API

### Avec curl:
```bash
# Health check
curl http://localhost:3001/health

# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phone":"+23566123456","password":"Test123","display_name":"Test User"}'

# Login 
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+23566123456","password":"Test123"}'

# Get posts (avec token)
curl http://localhost:3001/api/posts \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Avec le script de test:
```powershell
cd server
$env:API_BASE_URL="http://localhost:3001"
node test_api.js
```

---

## 📝 NOTES IMPORTANTES

1. **Tous les timestamps** sont en UTC ISO 8601
2. **Les téléphones** doivent être au format international (+235...)
3. **Les posts** peuvent contenir du texte, images, PDFs ou vidéos
4. **Les vidéos** sont traitées de manière asynchrone (HLS transcoding)
5. **Les réactions** actuellement supportées: "love" uniquement
6. **Les institutions** doivent être approuvées par un admin

---

**Documentation générée le:** 10/01/2026  
**Version API:** 1.0.0  
**Contact:** iamfaycalhabib@gmail.com
