# ChadConnect Admin Web - Configuration (XAMPP / MySQL)

## 1) Base de données (XAMPP)
- Démarrer **MySQL** (XAMPP)
- Importer:
  - `../database/schema.sql`
  - `../database/seed.sql`

## 2) Variables d'environnement
Créer un fichier `admin_web/.env.local` (il est ignoré par git) :

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=chadconnect

ADMIN_COOKIE_NAME=cc_admin_session
ADMIN_SESSION_DAYS=7
```

## 3) Premier démarrage
- Ouvrir `http://localhost:3000/setup`
- Définir le mot de passe admin (le seed crée `username=admin` sans password)

## 4) Lancer le serveur
Dans `admin_web/`:

```bash
npm install
npm run dev
```
