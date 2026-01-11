# 🚨 ACTION IMMÉDIATE - Problème DNS Résolu !

## ✅ J'ai corrigé 3 choses :

### 1. **Script start_emulator.ps1**
- ✅ Corrigé le nom AVD : `Pixel_8` (au lieu de sdk_gphone64_x86_64)

### 2. **api_base.dart** 
- ✅ Ajouté un switch `USE_LOCAL` pour basculer facilement entre serveur local et Render

### 3. **Documentation**
- ✅ Créé `FIX_DNS_RAPIDE.md` avec 3 solutions

---

## 🎯 SOLUTION LA PLUS RAPIDE (2 minutes)

### **Configurer le DNS dans l'émulateur actuel** :

Puisque votre émulateur est **déjà lancé**, configurez le DNS dedans :

#### Dans l'émulateur Android 📱 :

1. **Settings** (⚙️) → **Network & Internet** → **Internet**
2. Appuyez sur **⚙️** à côté de **AndroidWifi**
3. **Modify network**
4. Cochez **Advanced options**
5. **IP settings** : `DHCP` → **`Static`**
6. **Remplissez** :
   ```
   IP address: 10.0.2.15
   Gateway: 10.0.2.2
   Network prefix length: 24
   DNS 1: 8.8.8.8
   DNS 2: 8.8.4.4
   ```
7. **SAVE**

#### Testez le DNS :
- Ouvrez **Chrome** dans l'émulateur
- Allez sur `https://google.com` → ✅ Devrait marcher
- Allez sur `https://chadconnect.onrender.com` → ✅ Devrait marcher

#### Dans le terminal Flutter :
```
R   (Hot Restart - majuscule R)
```

**TESTEZ L'INSCRIPTION !** 🎉

---

## 🔄 ALTERNATIVE : Tester avec serveur local

Si vous voulez tester **localement** :

### 1. Démarrez le serveur local :
```powershell
cd server
npm start
```

### 2. Modifiez `lib/src/core/api/api_base.dart` ligne 7 :
```dart
const bool USE_LOCAL = true;  // Changez false → true
```

### 3. Hot Restart :
```
R   (dans le terminal Flutter)
```

### 4. Testez l'inscription !

⚠️ **N'oubliez pas de remettre `USE_LOCAL = false` avant de déployer !**

---

## 🔁 OU : Redémarrer l'émulateur avec DNS

Si vous préférez tout redémarrer :

```powershell
# 1. Quittez Flutter (appuyez sur 'q')
# 2. Fermez l'émulateur
# 3. Exécutez :
.\start_emulator.ps1

# 4. Attendez le démarrage
# 5. Relancez :
flutter run -d emulator-5554
```

---

## ✨ Après correction

**Testez l'inscription** :
- Nom : `faycal`
- Téléphone : `91912191`
- Mot de passe : `12345678`
- **Cliquez** sur "Créer le compte"
- ⏳ **Attendez 30-50 secondes** (première requête = cold start Render)
- ✅ **Succès !**

---

**Quelle solution choisissez-vous ?**  
👉 **Je recommande : Configurer DNS dans l'émulateur actuel** (2 min, pas besoin de redémarrer)
