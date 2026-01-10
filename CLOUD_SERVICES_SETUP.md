# ☁️ GUIDE CONFIGURATION SERVICES CLOUD

## Vue d'ensemble

Vous avez besoin de 4 services cloud (3 gratuits + 1 optionnel):

1. ✅ **MySQL** - Base de données (Railway - GRATUIT)
2. ✅ **Supabase** - Stockage fichiers (GRATUIT)
3. ✅ **Firebase** - Notifications FCM (GRATUIT)
4. ⚠️ **Redis** - Queue vidéo (Optionnel - Upstash GRATUIT)

**Temps total: 30-45 minutes**

---

## 1. MySQL Database - Railway.app (10 min)

### Pourquoi Railway?
- ✅ 100% Gratuit pour commencer
- ✅ 500h de compute gratuit/mois
- ✅ Simple à configurer
- ✅ Backups automatiques

### Configuration

#### Étape A: Créer le compte (2 min)
1. Allez sur: https://railway.app/
2. Cliquez sur **Start a New Project**
3. Connectez-vous avec GitHub

#### Étape B: Créer MySQL (3 min)
1. Cliquez sur **+ New**
2. Sélectionnez **Database** → **MySQL**
3. Railway créé automatiquement la base

#### Étape C: Récupérer les credentials (1 min)
1. Cliquez sur la base MySQL créée
2. Allez dans **Connect**
3. Copiez les informations:
   ```
   MYSQL_HOST: <hostname>
   MYSQL_PORT: 3306
   MYSQL_USER: root
   MYSQL_PASSWORD: <password>
   MYSQL_DATABASE: railway
   ```

#### Étape D: Importer le schéma (4 min)

**Option 1: Via MySQL Workbench**
1. Téléchargez MySQL Workbench: https://dev.mysql.com/downloads/workbench/
2. Créez une nouvelle connexion avec les credentials Railway
3. File → Run SQL Script → Sélectionnez `database/schema.sql`
4. Exécutez

**Option 2: Via ligne de commande**
```powershell
# Installer MySQL client si pas déjà fait
# winget install Oracle.MySQL

# Importer le schéma
mysql -h <MYSQL_HOST> -u root -p<MYSQL_PASSWORD> railway < database/schema.sql
```

**Option 3: Via phpMyAdmin Web**
1. Dans Railway, ajoutez **phpMyAdmin**: New → Template → phpMyAdmin
2. Connectez phpMyAdmin à votre MySQL
3. Import → Choisir `database/schema.sql` → Go

✅ **Credentials à sauvegarder pour Render:**
```
MYSQL_HOST=<railway_host>
MYSQL_USER=root
MYSQL_PASSWORD=<railway_password>
MYSQL_DATABASE=railway
```

---

## 2. Supabase - Stockage de Fichiers (10 min)

### Pourquoi Supabase?
- ✅ 1 GB de stockage gratuit
- ✅ 2 GB de transfert/mois
- ✅ API REST simple
- ✅ CDN mondial

### Configuration

#### Étape A: Créer le compte (2 min)
1. Allez sur: https://supabase.com/
2. Cliquez sur **Start your project**
3. Connectez-vous avec GitHub

#### Étape B: Créer le projet (3 min)
1. Cliquez sur **New Project**
2. Remplissez:
   - **Name**: `chadconnect`
   - **Database Password**: Générez-en un (GARDEZ-LE!)
   - **Region**: Choisissez le plus proche (ex: Frankfurt)
3. Cliquez sur **Create new project**
4. Attendez ~2 minutes que le projet se crée

#### Étape C: Créer le bucket (2 min)
1. Dans le menu gauche, cliquez sur **Storage**
2. Cliquez sur **Create a new bucket**
3. Remplissez:
   - **Name**: `chadconnect`
   - **Public bucket**: ✅ **COCHEZ CETTE CASE** (Important!)
4. Cliquez sur **Create bucket**

#### Étape D: Récupérer les credentials (3 min)
1. Allez dans **Project Settings** (icône engrenage en bas à gauche)
2. Cliquez sur **API** dans le menu

Copiez:
```
SUPABASE_URL: https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY: eyJhbGc... (la clé "service_role" PAS "anon"!)
```

⚠️ **IMPORTANT:** Utilisez bien la clé **service_role**, pas la clé **anon**!

✅ **Credentials à sauvegarder pour Render:**
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_STORAGE_BUCKET=chadconnect
```

---

## 3. Firebase - Notifications Push (10 min)

### Pourquoi Firebase?
- ✅ 100% Gratuit pour FCM
- ✅ Illimité de notifications
- ✅ Déjà configuré dans votre app Android

### Configuration

Votre projet Firebase existe déjà: `chadconnect-217a8`

#### Étape A: Service Account JSON (5 min)
1. Allez sur: https://console.firebase.google.com/
2. Sélectionnez votre projet **chadconnect-217a8**
3. Cliquez sur l'icône **⚙️** → **Project Settings**
4. Allez dans l'onglet **Service Accounts**
5. Cliquez sur **Generate New Private Key**
6. Confirmez et téléchargez le fichier JSON
7. Sauvegardez-le dans un endroit sûr!

#### Étape B: Convertir en Base64 (5 min)

**Méthode PowerShell (Recommandée):**
```powershell
# Naviguez où est le fichier téléchargé
cd Downloads

# Convertir en Base64 et copier dans le presse-papier
$content = Get-Content "chadconnect-217a8-firebase-adminsdk-xxxxx.json" -Raw
$bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
$base64 = [Convert]::ToBase64String($bytes)
$base64 | Set-Clipboard
Write-Host "Base64 copié dans le presse-papier!" -ForegroundColor Green
Write-Host "Collez-le dans un fichier texte pour Render" -ForegroundColor Yellow
```

**Méthode en ligne (Alternative):**
1. Allez sur: https://www.base64encode.org/
2. Cliquez sur **Browse** et sélectionnez le JSON
3. Cliquez sur **Encode**
4. Copiez le résultat

✅ **Credentials à sauvegarder pour Render:**
```
FIREBASE_SERVICE_ACCOUNT_BASE64=<votre_base64_très_long>
FIREBASE_STORAGE_BUCKET=chadconnect-217a8.firebasestorage.app
```

---

## 4. Redis - Queue Vidéo (OPTIONNEL - 5 min)

### Pourquoi Redis?
- ✅ Nécessaire pour traitement vidéo asynchrone
- ⚠️ Optionnel si vous n'utilisez pas les vidéos
- ✅ Upstash offre 10,000 commandes/jour gratuitement

### Configuration Upstash

#### Étape A: Créer le compte (2 min)
1. Allez sur: https://upstash.com/
2. Cliquez sur **Sign Up**
3. Connectez-vous avec GitHub

#### Étape B: Créer Redis (3 min)
1. Cliquez sur **Create Database**
2. Remplissez:
   - **Name**: `chadconnect-queue`
   - **Type**: Redis
   - **Region**: Choisissez le plus proche
   - **Plan**: Free (10K commands/day)
3. Cliquez sur **Create**

#### Étape C: Récupérer la connexion
1. Cliquez sur la base créée
2. Copiez **UPSTASH_REDIS_REST_URL** ou **Redis URL**

✅ **Credentials à sauvegarder pour Render:**
```
REDIS_URL=redis://default:xxxxx@xxxxx.upstash.io:6379
```

---

## 📋 RÉCAPITULATIF - Toutes vos Credentials

Créez un fichier texte sécurisé avec TOUTES ces informations:

```env
# ========================================
# MYSQL (Railway)
# ========================================
MYSQL_HOST=containers-us-west-xxx.railway.app
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=xxxxxxxxxxxxxx
MYSQL_DATABASE=railway

# ========================================
# SUPABASE (Stockage)
# ========================================
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_STORAGE_BUCKET=chadconnect

# ========================================
# FIREBASE (FCM)
# ========================================
FIREBASE_SERVICE_ACCOUNT_BASE64=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
FIREBASE_STORAGE_BUCKET=chadconnect-217a8.firebasestorage.app

# ========================================
# REDIS (Optionnel - Upstash)
# ========================================
REDIS_URL=redis://default:xxxxx@xxxxx.upstash.io:6379

# ========================================
# AUTRES
# ========================================
CORS_ORIGINS=https://chadconnect-admin.onrender.com
JWT_SECRET=<générez_un_secret_fort>
```

Pour générer JWT_SECRET:
```powershell
# PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

---

## ✅ CHECKLIST FINALE

Avant de passer au déploiement Render, vérifiez que vous avez:

- [ ] Railway MySQL créé et schéma importé
- [ ] Supabase projet créé et bucket `chadconnect` PUBLIC
- [ ] Firebase service account téléchargé et converti en Base64
- [ ] Redis Upstash créé (optionnel)
- [ ] Toutes les credentials sauvegardées dans un fichier sécurisé
- [ ] JWT_SECRET généré

---

## 🚀 PROCHAINE ÉTAPE

Maintenant que tous les services cloud sont prêts:

1. **GitHub**: Suivez `GITHUB_SETUP.md` pour créer le repo et push le code
2. **Render**: Suivez `DEPLOYMENT.md` pour déployer sur Render.com

---

## 🆘 Problèmes Courants

### MySQL Railway ne se connecte pas
- Vérifiez que vous utilisez le bon hostname (pas localhost)
- Le port est bien 3306
- Le mot de passe est correct (pas d'espaces)

### Supabase upload ne fonctionne pas
- Vérifiez que le bucket est bien **PUBLIC**
- Utilisez la clé **service_role**, pas **anon**
- Vérifiez l'URL (avec https://)

### Firebase Base64 trop long
- C'est normal! Le Base64 fait ~2000 caractères
- Copiez-le entièrement sans espaces ni retours à la ligne
- Vérifiez qu'il commence bien par `{` une fois décodé

### Redis connection refused
- Vérifiez que l'URL commence par `redis://`
- Vérifiez le port (généralement 6379)
- Le Redis Upstash est bien démarré

---

**Temps total: ~40 minutes pour tout configurer!**
