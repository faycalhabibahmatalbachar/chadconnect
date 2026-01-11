# 🎯 ACTION IMMÉDIATE - Erreur 503 Résolue

## ❌ Problème
```
DioException [bad response]: status code 503
Server error - the server failed to fulfil an apparently valid request
```

## ✅ Cause Identifiée
Le serveur Node.js **fonctionne**, mais **MySQL n'est pas démarré** !

---

## 🚀 SOLUTION RAPIDE (3 minutes)

### Méthode 1 : Script Automatique (RECOMMANDÉ) ⚡

```powershell
# Exécutez ce script qui fait tout automatiquement :
.\setup_local.ps1
```

Le script va :
- ✅ Vérifier XAMPP
- ✅ Vérifier si MySQL tourne
- ✅ Créer le fichier `.env`
- ✅ Créer la base de données `chadconnect`
- ✅ Importer le schéma SQL
- ✅ Installer les dépendances

**Suivez simplement les instructions à l'écran !**

---

### Méthode 2 : Manuel (5 minutes) 🔧

#### Étape 1 : Démarrer MySQL dans XAMPP

1. **Ouvrez XAMPP Control Panel**
   - Cherchez "XAMPP" dans le menu Démarrer
   - Ou : `C:\xampp\xampp-control.exe`

2. **Démarrez MySQL**
   - Cliquez sur **"Start"** à côté de **MySQL**
   - Attendez que le fond devienne **VERT**
   - Vérifiez le port : `3306`

#### Étape 2 : Créer la Base de Données

**Option A - phpMyAdmin (Simple)** :

1. Dans XAMPP, cliquez sur **"Admin"** à côté de MySQL
2. Ou allez sur : `http://localhost/phpmyadmin`
3. Cliquez sur **"New"** (Nouvelle base de données)
4. Nom : `chadconnect`
5. Cliquez sur **"Create"**
6. Allez dans l'onglet **"Import"**
7. Sélectionnez : `C:\Users\faycalhabibahmat\Desktop\ChadConnect\database\schema.sql`
8. Cliquez sur **"Go"**

**Option B - Ligne de commande** :

```powershell
# Dans PowerShell
cd C:\xampp\mysql\bin

# Créer la base de données
.\mysql.exe -u root -e "CREATE DATABASE chadconnect CHARACTER SET utf8mb4;"

# Importer le schéma
Get-Content "C:\Users\faycalhabibahmat\Desktop\ChadConnect\database\schema.sql" | .\mysql.exe -u root chadconnect
```

#### Étape 3 : Créer le fichier .env

```powershell
# Copiez le fichier d'exemple
cd C:\Users\faycalhabibahmat\Desktop\ChadConnect\server
Copy-Item .env.example .env
```

#### Étape 4 : Redémarrer le serveur Node.js

Dans le terminal **npm start** :
```
Ctrl+C   (arrêter le serveur)
npm start   (redémarrer)
```

Vous devriez voir :
```
ChadConnect API listening on port 3000
```

#### Étape 5 : Tester

```powershell
curl http://localhost:3000/health
```

**Résultat attendu** : `{"ok":true}` ✅

#### Étape 6 : Flutter Hot Restart

Dans le terminal Flutter :
```
R   (majuscule R)
```

#### Étape 7 : Tester l'inscription ! 🎉

Dans l'app mobile :
- Nom : `faycal`
- Téléphone : `91912191`
- Mot de passe : `12345678`
- **Créer le compte**

**Ça devrait marcher !** ✅

---

## 🔍 Vérifications Rapides

### MySQL tourne-t-il ?
```powershell
netstat -an | findstr 3306
```
✅ Devrait afficher : `TCP  0.0.0.0:3306  LISTENING`

### Le serveur Node.js est-il OK ?
```powershell
curl http://localhost:3000/health
```
✅ Devrait retourner : `{"ok":true}`

### La base de données existe-t-elle ?
```powershell
cd C:\xampp\mysql\bin
.\mysql.exe -u root -e "SHOW DATABASES;"
```
✅ Devrait lister : `chadconnect`

---

## 📋 Checklist

- [ ] XAMPP est installé
- [ ] MySQL démarré dans XAMPP (fond vert)
- [ ] Base de données `chadconnect` créée  
- [ ] Schéma `schema.sql` importé
- [ ] Fichier `.env` existe dans `server/`
- [ ] Serveur Node.js redémarré
- [ ] `curl http://localhost:3000/health` → `{"ok":true}`
- [ ] Hot Restart Flutter (`R`)
- [ ] Test inscription → ✅ Succès !

---

## 🆘 Problèmes Courants

### "MySQL ne démarre pas dans XAMPP"
- Port 3306 déjà utilisé
- Solution : Arrêtez les autres services MySQL ou changez le port

### "Access denied for user 'root'"
- MySQL a un mot de passe
- Solution : Ajoutez le mot de passe dans `.env` :
  ```env
  MYSQL_PASSWORD=votre_mot_de_passe
  ```

### "Cannot find module 'express'"
- Dépendances non installées
- Solution :
  ```powershell
  cd server
  npm install
  ```

---

## 📚 Documentation Complète

Pour plus de détails, consultez :
- 📄 `DEMARRER_SERVEUR_LOCAL.md` - Guide complet
- 📄 `database\README_XAMPP.md` - Guide base de données
- 📄 `.env.example` - Configuration exemple

---

**Quelle méthode choisissez-vous ?**

👉 **Recommandé** : Méthode 1 (Script automatique)
