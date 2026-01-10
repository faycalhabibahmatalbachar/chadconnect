# 🚀 Guide de Démarrage Rapide - ChadConnect

## Déploiement en 5 étapes

### Étape 1: Services Cloud (30 min)

#### A. Base de Données MySQL
1. Créez un compte sur [Railway](https://railway.app/)
2. Créez un nouveau projet → Ajoutez MySQL
3. Copiez les credentials de connexion
4. Importez le schéma:
   ```bash
   # Via MySQL Workbench ou CLI
   mysql -h railway.app -u root -p database_name < database/schema.sql
   ```

#### B. Supabase (Stockage de fichiers)
1. Créez un compte sur [Supabase](https://supabase.com/)
2. Créez un nouveau projet
3. Allez dans **Storage** → Créez un bucket `chadconnect` (cochez "Public")
4. Dans **Settings** → **API**, copiez:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

#### C. Redis (Queue vidéo)
1. Créez un compte sur [Upstash](https://upstash.com/)
2. Créez une nouvelle base Redis
3. Copiez la `REDIS_URL`

#### D. Firebase (Notifications)
1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionnez votre projet `chadconnect-217a8`
3. **Project Settings** → **Service Accounts** → **Generate New Private Key**
4. Téléchargez le fichier JSON
5. Convertissez en Base64:
   ```powershell
   # Windows PowerShell
   $content = Get-Content "firebase-service-account.json" -Raw
   $bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
   $base64 = [Convert]::ToBase64String($bytes)
   Write-Output $base64 | clip
   # Le contenu Base64 est maintenant dans votre presse-papier
   ```

### Étape 2: Push sur GitHub (5 min)

```bash
# Initialiser et pousser
git init
git add .
git commit -m "Initial deployment configuration"
git remote add origin https://github.com/faycalhabibahmatalbachar/chadconnect.git
git branch -M main
git push -u origin main
```

### Étape 3: Déployer sur Render (10 min)

1. Connectez-vous sur [Render.com](https://render.com/)
2. **New** → **Blueprint**
3. Connectez votre repo GitHub `chadconnect`
4. Render détecte `render.yaml` automatiquement
5. Configurez les variables d'environnement pour **chadconnect-api**:

```env
MYSQL_HOST=<railway_host>
MYSQL_USER=<railway_user>
MYSQL_PASSWORD=<railway_password>
MYSQL_DATABASE=chadconnect
REDIS_URL=<upstash_redis_url>
SUPABASE_URL=<supabase_url>
SUPABASE_SERVICE_ROLE_KEY=<supabase_key>
FIREBASE_SERVICE_ACCOUNT_BASE64=<firebase_base64>
CORS_ORIGINS=https://chadconnect-admin.onrender.com
```

6. Configurez les mêmes pour **chadconnect-admin** et **chadconnect-video-worker**
7. Cliquez sur **Apply** pour déployer

### Étape 4: Build APK Android (5 min)

```bash
# Vérifier que l'URL API est correcte
# lib/src/core/api/api_base.dart devrait pointer vers:
# https://chadconnect-api.onrender.com

# Build APK release
flutter build apk --release

# L'APK sera dans: build/app/outputs/flutter-apk/app-release.apk
```

### Étape 5: Test Complet (10 min)

#### A. Tester l'API
```bash
# Depuis votremachine locale
cd server
$env:API_BASE_URL="https://chadconnect-api.onrender.com"
node test_api.js
```

#### B. Tester l'Admin Web
1. Allez sur `https://chadconnect-admin.onrender.com/setup`
2. Créez le mot de passe admin
3. Connectez-vous avec `username: admin`

#### C. Tester l'App Mobile
1. Transférez l'APK sur votre téléphone
2. Installez l'APK
3. Créez un compte
4. Testez les fonctionnalités principales:
   - Connexion/Déconnexion
   - Création de post
   - Upload d'image
   - Notifications (si vous envoyez depuis Firebase Console)

## 🎯 Checklist de Déploiement

- [ ] MySQL cloud configuré et schéma importé
- [ ] Supabase bucket créé et configuré
- [ ] Redis (Upstash) configuré
- [ ] Firebase service account converti en Base64
- [ ] Code poussé sur GitHub
- [ ] Services déployés sur Render.com
- [ ] Variables d'environnement configurées
- [ ] API testée avec `test_api.js`
- [ ] Admin web accessible et configuré
- [ ] APK mobile buildé et testé
- [ ] Notifications push fonctionnelles

## 🔗 URLs Importantes

Après déploiement:
- **API**: `https://chadconnect-api.onrender.com`
- **Admin**: `https://chadconnect-admin.onrender.com`
- **GitHub**: `https://github.com/faycalhabibahmatalbachar/chadconnect`

## 🆘 Problèmes Courants

### L'API ne démarre pas sur Render
- Vérifiez les logs dans le dashboard Render
- Assurez-vous que toutes les variables d'environnement sont définies
- Testez la connexion à MySQL depuis un autre outil

### L'upload de fichiers ne fonctionne pas
- Vérifiez que le bucket Supabase est bien **public**
- Vérifiez que `SUPABASE_SERVICE_ROLE_KEY` est correct (pas la clé `anon`)

### Les notifications ne fonctionnent pas
- Vérifiez que `FIREBASE_SERVICE_ACCOUNT_BASE64` est correct
- Testez l'envoi depuis la Firebase Console d'abord
- Vérifiez que l'app mobile a les permissions de notification

### L'app mobile ne se connecte pas à l'API
- Vérifiez que l'URL dans `lib/src/core/api/api_base.dart` est correcte
- Vérifiez que Render a bien déployé l'API (pas en mode "suspended")
- Testez l'API avec `curl https://chadconnect-api.onrender.com/health`

## 📞 Support

Documentation complète: `DEPLOYMENT.md`

Bon déploiement! 🚀
