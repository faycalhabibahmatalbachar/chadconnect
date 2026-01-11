# 🚀 Démarrer le Serveur Local - GUIDE COMPLET

## ❌ Problème Actuel

**Erreur 503** : Le serveur Node.js ne peut pas se connecter à la base de données MySQL.

```
DioException [bad response]: status code 503
Server error - the server failed to fulfil an apparently valid request
```

**Cause** : MySQL (XAMPP) n'est **pas démarré** !

---

## ✅ SOLUTION - Démarrer MySQL avec XAMPP

### Étape 1 : Démarrer XAMPP 🎯

1. **Ouvrez XAMPP Control Panel**
   - Cherchez "XAMPP" dans le menu Démarrer
   - Ou allez dans `C:\xampp\xampp-control.exe`

2. **Démarrez MySQL**
   - Cliquez sur le bouton **"Start"** à côté de **MySQL**
   - Attendez que le statut devienne **vert**
   - Le module doit afficher le port : `Port(s): 3306`

3. **(Optionnel) Démarrez Apache**
   - Cliquez sur **"Start"** à côté d'**Apache**
   - Cela permet d'accéder à phpMyAdmin pour gérer la base de données

---

### Étape 2 : Créer/Importer la Base de Données 📊

#### Option A : Avec phpMyAdmin (RECOMMANDÉ)

1. **Ouvrez votre navigateur** et allez sur :
   ```
   http://localhost/phpmyadmin
   ```

2. **Créez la base de données** :
   - Cliquez sur **"New"** (Nouvelle base de données)
   - Nom : `chadconnect`
   - Collation : `utf8mb4_unicode_ci`
   - Cliquez sur **"Create"**

3. **Importez le schéma** :
   - Sélectionnez la base `chadconnect` dans la liste de gauche
   - Allez dans l'onglet **"Import"**
   - Cliquez sur **"Choose File"**
   - Sélectionnez : `C:\Users\faycalhabibahmat\Desktop\ChadConnect\database\schema.sql`
   - Cliquez sur **"Go"**

4. **Importez les données de test** (optionnel) :
   - Toujours dans l'onglet **"Import"**
   - Importez : `database\seed.sql` (si le fichier existe)

#### Option B : Ligne de commande

```powershell
# Dans un nouveau terminal PowerShell
cd C:\xampp\mysql\bin

# Créer la base de données
.\mysql.exe -u root -p -e "CREATE DATABASE IF NOT EXISTS chadconnect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Importer le schéma
.\mysql.exe -u root chadconnect < "C:\Users\faycalhabibahmat\Desktop\ChadConnect\database\schema.sql"
```

---

### Étape 3 : Créer le fichier .env 📝

Le serveur a besoin d'un fichier `.env` pour la configuration.

**Créez** : `C:\Users\faycalhabibahmat\Desktop\ChadConnect\server\.env`

**Contenu minimal** :

```env
# Base de données MySQL (XAMPP)
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=chadconnect

# Port du serveur API
PORT=3000

# JWT Secret (changez pour un secret aléatoire en production)
JWT_SECRET=votre-secret-super-securise-changez-moi

# JWT Expires In (durée de validité du token)
JWT_EXPIRES_IN=7d

# CORS (autorise toutes les origines en développement)
CORS_ORIGINS=

# Firebase (optionnel pour les notifications push)
# FIREBASE_PROJECT_ID=votre-projet-id
# FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
# FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@votre-projet.iam.gserviceaccount.com

# Redis (optionnel, pour le traitement vidéo)
# REDIS_HOST=127.0.0.1
# REDIS_PORT=6379
```

---

### Étape 4 : Redémarrer le Serveur Node.js 🔄

Dans le terminal **server** :

```powershell
# Arrêtez le serveur avec Ctrl+C
# Puis redémarrez :
npm start
```

Vous devriez voir :
```
ChadConnect API listening on port 3000
```

---

### Étape 5 : Tester le Serveur ✅

Dans un nouveau terminal PowerShell :

```powershell
# Test de santé du serveur
curl http://localhost:3000/health
```

**Résultat attendu** :
```json
{"ok":true}
```

Si vous voyez `{"ok":true}`, **le serveur est opérationnel !** 🎉

---

### Étape 6 : Tester l'Inscription 📱

1. Dans le terminal Flutter, appuyez sur **`R`** (Hot Restart)

2. Dans l'application mobile :
   - Nom : `faycal`
   - Téléphone : `91912191`
   - Mot de passe : `12345678`
   - Cliquez "Créer le compte"

3. **Ça devrait marcher !** ✅

---

## 🔍 Vérifications

### MySQL est-il démarré ?
```powershell
netstat -an | findstr 3306
```
Devrait afficher : `TCP  0.0.0.0:3306  LISTENING`

### Le serveur Node.js fonctionne-t-il ?
```powershell
netstat -an | findstr 3000
```
Devrait afficher : `TCP  0.0.0.0:3000  LISTENING`

### La base de données existe-t-elle ?
```powershell
cd C:\xampp\mysql\bin
.\mysql.exe -u root -e "SHOW DATABASES;"
```
Devrait lister `chadconnect`

---

## 🆘 Résolution de Problèmes

### Problème 1 : Port 3306 déjà utilisé
- Un autre MySQL est peut-être déjà en cours d'exécution
- Solution : Arrêtez l'autre service MySQL ou changez le port dans XAMPP

### Problème 2 : Port 3000 déjà utilisé
- Un autre processus utilise le port 3000
- Solution : Changez `PORT=3001` dans le fichier `.env`
- Et dans `api_base.dart` : `return 'http://10.0.2.2:3001';`

### Problème 3 : Erreur "Access denied for user 'root'"
- Le mot de passe MySQL n'est pas vide
- Solution : Trouvez le mot de passe dans XAMPP et mettez-le dans `.env` :
  ```env
  MYSQL_PASSWORD=votre_mot_de_passe
  ```

---

## 📋 Checklist Complète

- [ ] XAMPP est installé
- [ ] MySQL est démarré dans XAMPP (vert)
- [ ] Base de données `chadconnect` créée
- [ ] Schéma `schema.sql` importé
- [ ] Fichier `.env` créé dans `server/`
- [ ] Serveur Node.js redémarré
- [ ] `curl http://localhost:3000/health` retourne `{"ok":true}`
- [ ] `USE_LOCAL = true` dans `api_base.dart`
- [ ] Hot Restart (`R`) dans Flutter
- [ ] Test d'inscription réussi ! 🎉

---

**Une fois que tout fonctionne en local, vous pourrez basculer vers le serveur Render !**
