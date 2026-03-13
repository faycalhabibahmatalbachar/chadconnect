# Migration ChadConnect vers Supabase

## Status: ✅ TERMINÉ

La migration est complète et fonctionnelle. L'API est opérationnelle avec Supabase PostgreSQL.

---

## Déploiement Production (Render)

### Étape 1: Configurer les Variables d'Environnement sur Render

Allez sur [Render Dashboard](https://dashboard.render.com) → Votre service API → **Environment**

Ajoutez ces variables:

```
SUPABASE_URL=https://xbrlpovbwwyjvefblmuz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhicmxwb3Zid3d5anZlZmJsbXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNDg2ODMsImV4cCI6MjA4ODkyNDY4M30.SPPTQJg9aknHd1EL6kwl1VVHh1MMLv7Qdlkp3fsfbRg
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhicmxwb3Zid3d5anZlZmJsbXV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM0ODY4MywiZXhwIjoyMDg4OTI0NjgzfQ.bpVkno_hTiuFciyM_Gj_nG-7ev1CW3HnwBv6qsZPP2c
JWT_SECRET=votre-secret-jwt-production-securise
NODE_ENV=production
```

### Étape 2: Déployer

Le serveur détecte automatiquement Supabase si `SUPABASE_URL` est présent.

```bash
# Commit et push
git add .
git commit -m "Migration to Supabase PostgreSQL"
git push origin main
```

Render déploiera automatiquement.

### Étape 3: Tester l'API en Production

```powershell
# Health check
Invoke-RestMethod -Uri https://chadconnect-api.onrender.com/health

# Inscription
$body = '{"phone":"+23512345678","display_name":"Test User","password":"password123"}'
Invoke-RestMethod -Uri https://chadconnect-api.onrender.com/api/auth/register -Method POST -Body $body -ContentType "application/json"
```

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Flutter App   │────▶│  Render API     │────▶│   Supabase      │
│  (Production)   │     │  (Node.js)      │     │  (PostgreSQL)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Fichiers Créés

### Base de données
| Fichier | Description |
|---------|-------------|
| `database/schema-supabase-v2.sql` | Schéma PostgreSQL complet |
| `database/functions-supabase-v2.sql` | Fonctions et triggers |

### Backend (server/src/)
| Fichier | Description |
|---------|-------------|
| `db-supabase.js` | Client Supabase |
| `auth-supabase.js` | Authentification |
| `social-supabase.js` | Posts, comments, reactions |
| `socialUtils-supabase.js` | Hashtags, mentions |
| `socialExtras-supabase.js` | Followers, feed, search |
| `study-supabase.js` | Module d'étude |
| `review-supabase.js` | Système SRS |
| `notifications-supabase.js` | Notifications |
| `index-supabase.js` | Serveur principal |

### Flutter (lib/src/core/supabase/)
| Fichier | Description |
|---------|-------------|
| `supabase_client.dart` | Client Supabase Flutter |
| `supabase_provider.dart` | Providers Riverpod |

---

## Tests Effectués (Local)

```powershell
# Health check
Invoke-RestMethod -Uri http://localhost:3001/health
# Résultat: {"status":"healthy","database":"connected"}

# Inscription
$body = '{"phone":"+23568663737","display_name":"Test User","password":"password1234"}'
Invoke-RestMethod -Uri http://localhost:3001/api/auth/register -Method POST -Body $body -ContentType "application/json"
# Résultat: 201 Created, utilisateur créé avec ID=1

# Login
$body = '{"phone":"+23568663737","password":"password1234"}'
Invoke-RestMethod -Uri http://localhost:3001/api/auth/login -Method POST -Body $body -ContentType "application/json"
# Résultat: Token JWT généré

# Créer un post
$body = '{"body":"Mon premier post #test"}'
Invoke-RestMethod -Uri http://localhost:3001/api/posts -Method POST -Body $body -ContentType "application/json" -Headers @{Authorization="Bearer TOKEN"}
# Résultat: 201 Created
```

---

## Points d'Attention

- **Service Role Key**: Utilisée uniquement côté serveur (jamais exposée)
- **Anon Key**: Sûre pour le client (Flutter, web)
- **Détection automatique**: Le serveur utilise Supabase si `SUPABASE_URL` est défini
- **Pas de RLS**: Le backend utilise service_role qui bypass RLS
