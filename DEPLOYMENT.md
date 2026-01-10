# ChadConnect - Guide de Déploiement

## 📋 Vue d'ensemble

ChadConnect est une plateforme éducative complète comprenant:
- **Backend API** (Node.js/Express)
- **Application Mobile** (Flutter)
- **Interface Admin** (Next.js)
- **Worker Vidéo** (Node.js)

## 🚀 Déploiement sur Render.com

### Prérequis

1. **Compte Render.com** (gratuit)
2. **Base de données MySQL externe** (recommandations):
   - [PlanetScale](https://planetscale.com/) - MySQL gratuit
   - [Railway](https://railway.app/) - MySQL gratuit
   - [Aiven](https://aiven.io/) - MySQL gratuit
3. **Compte Supabase** pour le stockage de fichiers
4. **Compte Firebase** pour FCM et stockage
5. **Redis externe** (recommandations):
   - [Upstash](https://upstash.com/) - Redis gratuit
   - [Redis Labs](https://redis.com/try-free/) - Redis gratuit

### Étape 1: Configuration de la Base de Données

#### Option A: PlanetScale (Recommandé)

1. Créez un compte sur [PlanetScale](https://planetscale.com/)
2. Créez une nouvelle base de données `chadconnect`
3. Récupérez les credentials de connexion
4. Importez le schéma:
   ```bash
   pscale shell chadconnect main < database/schema.sql
   ```

#### Option B: Railway

1. Créez un compte sur [Railway](https://railway.app/)
2. Créez un nouveau projet MySQL
3. Récupérez la connection string
4. Importez le schéma via phpMyAdmin ou CLI

### Étape 2: Configuration Supabase

1. Créez un projet sur [Supabase](https://supabase.com/)
2. Allez dans **Storage** → Créez un bucket `chadconnect` (public)
3. Récupérez:
   - `SUPABASE_URL` (Project URL)
   - `SUPABASE_SERVICE_ROLE_KEY` (Service Role Key - dans Project Settings > API)

### Étape 3: Configuration Firebase

1. Allez dans la [Console Firebase](https://console.firebase.google.com/)
2. Sélectionnez votre projet `chadconnect-217a8`
3. Allez dans **Project Settings** → **Service Accounts**
4. Cliquez sur **Generate New Private Key**
5. Téléchargez le fichier JSON
6. Convertissez-le en Base64:
   ```bash
   # Linux/Mac
   base64 -w 0 firebase-service-account.json
   
   # Windows PowerShell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("firebase-service-account.json"))
   ```
7. Copiez le résultat pour `FIREBASE_SERVICE_ACCOUNT_BASE64`

#### Configuration Firestore (Base de données)

Firebase Firestore n'a pas besoin de tables fixes comme MySQL. Les collections se créent automatiquement lors du premier ajout de document. Voici les collections utilisées:

- **users_fcm_tokens** - Tokens FCM des utilisateurs
- **notifications** - Historique des notifications
- **device_info** - Informations des appareils

Pas besoin de création manuelle, elles seront créées automatiquement.

### Étape 4: Configuration Redis

1. Créez un compte sur [Upstash](https://upstash.com/)
2. Créez une nouvelle base Redis
3. Récupérez la Redis URL (format: `redis://...`)

### Étape 5: Pousser sur GitHub

```bash
cd c:\Users\faycalhabibahmat\Desktop\ChadConnect

# Initialiser git (si pas déjà fait)
git init
git add .
git commit -m "Initial commit - ChadConnect configuration"

# Ajouter le remote GitHub
git remote add origin https://github.com/faycalhabibahmatalbachar/chadconnect.git

# Pousser sur GitHub
git push -u origin main
```

### Étape 6: Déployer sur Render

1. Connectez-vous sur [Render.com](https://render.com/)
2. Cliquez sur **New** → **Blueprint**
3. Connectez votre repository GitHub `chadconnect`
4. Render détectera automatiquement le fichier `render.yaml`
5. Configurez les variables d'environnement:

#### Variables pour `chadconnect-api`:

```env
MYSQL_HOST=<votre_mysql_host>
MYSQL_USER=<votre_mysql_user>
MYSQL_PASSWORD=<votre_mysql_password>
REDIS_URL=<votre_redis_url>
SUPABASE_URL=<votre_supabase_url>
SUPABASE_SERVICE_ROLE_KEY=<votre_supabase_key>
FIREBASE_SERVICE_ACCOUNT_BASE64=<votre_firebase_base64>
CORS_ORIGINS=https://chadconnect-admin.onrender.com
```

#### Variables pour `chadconnect-admin`:

```env
MYSQL_HOST=<votre_mysql_host>
MYSQL_USER=<votre_mysql_user>
MYSQL_PASSWORD=<votre_mysql_password>
```

#### Variables pour `chadconnect-video-worker`:

```env
MYSQL_HOST=<votre_mysql_host>
MYSQL_USER=<votre_mysql_user>
MYSQL_PASSWORD=<votre_mysql_password>
REDIS_URL=<votre_redis_url>
SUPABASE_URL=<votre_supabase_url>
SUPABASE_SERVICE_ROLE_KEY=<votre_supabase_key>
FIREBASE_SERVICE_ACCOUNT_BASE64=<votre_firebase_base64>
```

6. Cliquez sur **Apply** pour déployer

### Étape 7: Configuration Post-Déploiement

1. Récupérez l'URL de l'API (ex: `https://chadconnect-api.onrender.com`)
2. Mettez à jour `CORS_ORIGINS` dans la config API avec l'URL de l'admin
3. L'app mobile pointe déjà vers `https://chadconnect.onrender.com` - **mettez à jour si l'URL est différente**

### Étape 8: Build de l'Application Mobile

#### Android APK

```bash
cd c:\Users\faycalhabibahmat\Desktop\ChadConnect

# Build APK release
flutter build apk --release

# L'APK sera dans: build/app/outputs/flutter-apk/app-release.apk
```

#### Configuration de l'URL API (si nécessaire)

Si l'URL Render est différente de `https://chadconnect.onrender.com`, mettez à jour:

**Fichier: `lib/src/core/api/api_base.dart`**
```dart
return 'https://chadconnect-api.onrender.com'; // Votre URL Render
```

Puis rebuild:
```bash
flutter build apk --release
```

### Étape 9: Tester l'Application

#### Test Web Admin

1. Allez sur `https://chadconnect-admin.onrender.com/setup`
2. Configurez le mot de passe admin
3. Connectez-vous avec `username: admin`

#### Test API

```bash
curl https://chadconnect-api.onrender.com/health
# Devrait retourner: {"ok":true}
```

#### Test Mobile

1. Installez l'APK sur votre téléphone
2. Créez un compte
3. Testez les fonctionnalités:
   - Authentification
   - Publications
   - Upload de fichiers
   - Notifications

## 🔧 Troubleshooting

### L'API ne démarre pas

- Vérifiez les logs Render
- Assurez-vous que toutes les variables d'environnement sont configurées
- Testez la connexion MySQL

### Erreurs de connexion base de données

- Vérifiez que la BD est accessible depuis internet
- PlanetScale: Activez "Allow all IPs" dans les settings
- Vérifiez les credentials

### L'upload de fichiers ne fonctionne pas

- Vérifiez la configuration Supabase
- Assurez-vous que le bucket est public
- Vérifiez les credentials `SUPABASE_SERVICE_ROLE_KEY`

### Les notifications ne fonctionnent pas

- Vérifiez la configuration Firebase
- Assurez-vous que `FIREBASE_SERVICE_ACCOUNT_BASE64` est correct
- Testez l'envoi de notification depuis la console Firebase

## 📱 URLs Finales

Après déploiement, vous aurez:

- **API**: `https://chadconnect-api.onrender.com`
- **Admin**: `https://chadconnect-admin.onrender.com`
- **APK Mobile**: `build/app/outputs/flutter-apk/app-release.apk`

## 🎯 Prochaines Étapes

1. Configurez un domaine personnalisé (optionnel)
2. Activez HTTPS (automatique sur Render)
3. Configurez les sauvegardes de base de données
4. Mettez en place le monitoring

## 📞 Support

En cas de problème, vérifiez:
1. Les logs Render pour chaque service
2. La console Firebase
3. Les logs Supabase
4. La connexion base de données
