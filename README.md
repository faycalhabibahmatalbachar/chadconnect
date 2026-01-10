# 🎓 ChadConnect

Une plateforme éducative complète pour le Tchad, permettant aux étudiants et enseignants de collaborer, partager du contenu et organiser leur apprentissage.

## 🌟 Fonctionnalités

### Pour les Étudiants
- 📚 Accès aux cours et résumés par matière
- 📱 Réseau social éducatif (posts, commentaires, likes)
- 📅 Planification hebdomadaire des objectifs
- 🏫 Rejoindre des institutions et des classes
- 🔔 Notifications push
- 📖 Suivi de progression d'apprentissage
- ⭐ Favoris de chapitres

### Pour les Enseignants
- 👥 Gestion de classes
- 📝 Publication de contenu éducatif
- 💬 Interaction avec les étudiants
- 📊 Modération du contenu

### Pour les Administrateurs
- 🛡️ Interface d'administration web
- 👥 Gestion des utilisateurs
- 🏢 Validation des institutions
- 📊 Modération des posts et rapports
- 💬 Gestion de la queue SMS

## 🏗️ Architecture

```
ChadConnect/
├── server/                 # Backend API (Node.js/Express)
│   ├── src/
│   │   ├── auth.js        # Authentification JWT
│   │   ├── social.js      # Posts, commentaires, likes
│   │   ├── institutions.js # Gestion des institutions
│   │   ├── planning.js    # Objectifs hebdomadaires
│   │   ├── study.js       # Contenu éducatif
│   │   ├── push.js        # Notifications FCM
│   │   ├── uploads.js     # Upload de fichiers
│   │   ├── firebase.js    # Firebase Admin SDK
│   │   └── supabase_storage.js # Stockage Supabase
│   └── package.json
│
├── admin_web/             # Interface Admin (Next.js)
│   ├── src/
│   │   ├── app/           # Pages Next.js
│   │   └── lib/           # Utilitaires et data
│   └── package.json
│
├── lib/                   # Application Mobile (Flutter)
│   └── src/
│       ├── core/          # API, auth, thème
│       └── features/      # Fonctionnalités
│
├── database/              # Schémas MySQL
│   └── schema.sql
│
└── android/               # Configuration Android
    └── google-services.json
```

## 🚀 Stack Technique

### Backend
- **Node.js** + **Express.js** - API REST
- **MySQL** - Base de données relationnelle
- **Redis** + **BullMQ** - Queue pour traitement vidéo
- **Firebase Admin** - FCM (notifications) + Storage
- **Supabase** - Stockage de fichiers
- **JWT** - Authentification
- **FFmpeg** - Traitement vidéo

### Mobile
- **Flutter** - Framework cross-platform
- **Riverpod** - State management
- **Dio** - Client HTTP
- **Firebase Messaging** - Notifications push

### Admin Web
- **Next.js 15** - Framework React
- **TypeScript** - Typage statique
- **Tailwind CSS** - Styling
- **MySQL2** - Client base de données

## 📦 Installation Locale

### Prérequis
- Node.js 18+
- Flutter 3.0+
- MySQL (XAMPP recommandé)
- Redis (optionnel, pour traitement vidéo)

### 1. Base de Données

```bash
# Démarrer MySQL (XAMPP)
# Importer le schéma
mysql -u root -p < database/schema.sql

# Optionnel: Importer les données de test
mysql -u root -p < database/seed.sql
```

### 2. Backend API

```bash
cd server

# Installer les dépendances
npm install

# Copier et configurer l'environnement
copy .env.example .env
# Éditer .env avec vos configurations

# Démarrer le serveur
npm run dev
```

L'API sera disponible sur `http://localhost:3001`

### 3. Admin Web

```bash
cd admin_web

# Installer les dépendances
npm install

# Créer .env.local
echo "MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=chadconnect
ADMIN_COOKIE_NAME=cc_admin_session
ADMIN_SESSION_DAYS=7" > .env.local

# Démarrer le serveur de dev
npm run dev
```

L'interface admin sera disponible sur `http://localhost:3000`

**Important:** Lors du premier accès, allez sur `http://localhost:3000/setup` pour configurer le compte admin.

### 4. Application Mobile

```bash
# Installer les dépendances
flutter pub get

# Lancer sur émulateur/appareil
flutter run
```

## 🌐 Déploiement en Production

Pour déployer ChadConnect en ligne sur **Render.com** avec toutes les fonctionnalités:

📖 **Consultez le guide complet:** [DEPLOYMENT.md](./DEPLOYMENT.md)

Le guide couvre:
- Configuration MySQL cloud (PlanetScale/Railway/Aiven)
- Configuration Supabase pour le stockage
- Configuration Firebase pour FCM
- Configuration Redis (Upstash)
- Déploiement sur Render.com
- Build de l'APK Android
- Tests complets

### URLs de Production

Après déploiement sur Render.com:
- **API:** `https://chadconnect-api.onrender.com`
- **Admin:** `https://chadconnect-admin.onrender.com`

## 🧪 Tests

### Tester l'API

```bash
cd server
node test_api.js
```

Ce script teste:
- Health check
- Enregistrement utilisateur
- Connexion
- Profil utilisateur
- Institutions
- Posts sociaux
- Planning
- Contenu éducatif
- Notifications push

### Tester l'Admin Web

```bash
cd admin_web
node test_web.js
```

## 📱 Build Mobile

### Android APK

```bash
# APK de développement
flutter build apk

# APK de production (release)
flutter build apk --release

# APK sera dans: build/app/outputs/flutter-apk/
```

### Android App Bundle (pour Google Play)

```bash
flutter build appbundle --release
```

## 🔐 Configuration Firebase

1. Créez un projet sur [Firebase Console](https://console.firebase.google.com/)
2. Ajoutez une app Android avec le package `com.chadconnect.chadconnect`
3. Téléchargez `google-services.json` dans `android/app/`
4. Activez **Cloud Messaging** pour les notifications
5. Créez un **Service Account** pour l'admin SDK

## 📊 Base de Données

Le schéma inclut:
- **users** - Utilisateurs (étudiants, enseignants, admins)
- **institutions** - Établissements scolaires
- **classes** - Classes au sein des institutions
- **posts** - Publications sociales
- **comments** - Commentaires sur les posts
- **subjects** - Matières
- **chapters** - Chapitres par matière
- **lessons** - Cours et résumés
- **planning_goals** - Objectifs hebdomadaires
- **notifications** - Historique des notifications
- **user_push_tokens** - Tokens FCM des utilisateurs

## 🤝 Contribution

1. Fork le projet
2. Créez une branche (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📄 Licence

Ce projet est sous licence propriétaire. Tous droits réservés.

## 📞 Support

Pour toute question ou problème:
- GitHub Issues: [chadconnect/issues](https://github.com/faycalhabibahmatalbachar/chadconnect/issues)
- Email: support@chadconnect.com

## 🙏 Remerciements

- Firebase pour l'infrastructure cloud
- Supabase pour le stockage
- Render.com pour l'hébergement
- La communauté Flutter et Node.js

---

**Fait avec ❤️ pour l'éducation au Tchad** 🇹🇩

