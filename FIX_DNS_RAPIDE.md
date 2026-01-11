# 🔧 SOLUTION RAPIDE - Fix DNS Émulateur

## ⚠️ PROBLÈME ACTUEL

L'émulateur Android ne peut pas résoudre `chadconnect.onrender.com`

**Erreur** : `Failed host lookup: 'chadconnect.onrender.com'`

---

## ✅ SOLUTION 1 : Configurer DNS dans l'émulateur (RECOMMANDÉ)

### Étapes dans l'émulateur Android :

1. **Ouvrez l'application Settings** (⚙️ Paramètres)

2. **Network & Internet** → **Internet**

3. Appuyez sur **⚙️** (icône engrenage) à côté de **AndroidWifi**

4. Sélectionnez **Modify network**

5. Cochez **Advanced options** (Options avancées)

6. **IP settings** : Changez de **DHCP** → **Static**

7. **Remplissez les champs** :
   ```
   IP address: 10.0.2.15
   Gateway: 10.0.2.2
   Network prefix length: 24
   DNS 1: 8.8.8.8
   DNS 2: 8.8.4.4
   ```

8. **Appuyez sur SAVE**

9. **Vérifiez** : Ouvrez Chrome dans l'émulateur et allez sur `https://google.com`

10. **Hot Restart** : Dans le terminal Flutter, appuyez sur **`R`**

11. **Testez l'inscription** !

---

## ✅ SOLUTION 2 : Utiliser le serveur local (TEMPORAIRE)

### Si vous avez le serveur qui tourne en local :

1. **Démarrez le serveur local** :
   ```powershell
   cd server
   npm start
   ```

2. **Modifiez temporairement l'API URL** :
   
   Éditez `lib/src/core/api/api_base.dart` ligne 8 :
   ```dart
   // return 'https://chadconnect.onrender.com';
   return 'http://10.0.2.2:3000'; // localhost depuis l'émulateur
   ```

3. **Hot Restart** : Dans le terminal, appuyez sur **`R`**

4. **Testez l'inscription** !

⚠️ **N'oubliez pas de remettre l'URL Render avant de déployer !**

---

## ✅ SOLUTION 3 : Redémarrer l'émulateur avec le bon nom AVD

Votre AVD s'appelle **`Pixel_8`** et non `sdk_gphone64_x86_64`

1. **Quittez Flutter** : Appuyez sur `q` dans le terminal

2. **Fermez l'émulateur**

3. **Redémarrez avec DNS** :
   ```powershell
   & "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd Pixel_8 -dns-server 8.8.8.8,8.8.4.4
   ```

4. **Attendez le démarrage complet**

5. **Relancez Flutter** :
   ```powershell
   flutter run -d emulator-5554
   ```

---

## 🧪 Tester la connexion DNS

Dans l'émulateur, ouvrez Chrome et testez :
- `https://google.com` ✅
- `https://chadconnect.onrender.com` ✅

Si les deux fonctionnent, le DNS est configuré !

---

## 📝 Après correction

1. **Hot Restart** : Appuyez sur `R` (majuscule)
2. **Testez l'inscription** avec :
   - Nom : faycal
   - Téléphone : 91912191
   - Mot de passe : 12345678
3. ⏳ **Attendez 30-50 secondes** (cold start de Render)
4. ✅ Ça devrait fonctionner !

---

## 🔄 Mise à jour du script start_emulator.ps1

J'ai créé un script corrigé avec le bon nom AVD : **`Pixel_8`**
