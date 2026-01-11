# Fix Émulateur Android - Problème DNS

## Problème
L'émulateur Android ne peut pas résoudre `chadconnect.onrender.com`

## Solutions

### Solution 1 : Redémarrer l'émulateur avec un DNS personnalisé (RECOMMANDÉ)

1. **Arrêter l'application Flutter** :
   - Dans le terminal, appuyez sur `q` pour quitter

2. **Fermer l'émulateur** :
   - Fermez completement l'émulateur Android

3. **Redémarrer l'émulateur avec Google DNS** :
   ```powershell
   emulator -avd sdk_gphone64_x86_64 -dns-server 8.8.8.8,8.8.4.4
   ```

4. **Relancer Flutter** :
   ```powershell
   flutter run -d emulator-5554
   ```

### Solution 2 : Configurer DNS dans l'émulateur (SI Solution 1 ne marche pas)

1. Dans l'émulateur, ouvrez **Settings** (Paramètres)
2. Allez dans **Network & Internet** > **Internet** > **Wi-Fi**
3. Appuyez longuement sur **AndroidWifi**
4. Sélectionnez **Modify network**
5. Cochez **Advanced options**
6. Dans **IP settings**, sélectionnez **Static**
7. Remplissez :
   - **DNS 1** : `8.8.8.8`
   - **DNS 2** : `8.8.4.4`
8. Sauvegardez

### Solution 3 : Test avec serveur local (TEMPORAIRE)

Si vous voulez tester localement :

1. Démarrez le serveur local sur votre PC
2. Modifiez `lib/src/core/api/api_base.dart` :
   ```dart
   return 'http://10.0.2.2:3000'; // 10.0.2.2 = localhost depuis l'émulateur
   ```

## Vérification

Après avoir appliqué une solution, testez dans l'émulateur :

1. Ouvrez Chrome dans l'émulateur
2. Allez sur `https://chadconnect.onrender.com`
3. Si ça charge, le DNS fonctionne !
