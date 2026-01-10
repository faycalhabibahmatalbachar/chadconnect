# 🚀 Configuration GitHub - 2 Minutes

## Étape 1: Créer le Repository (1 min)

1. Allez sur: https://github.com/new
2. Remplissez:
   - **Repository name**: `chadconnect`
   - **Description**: `Plateforme educative pour le Tchad`
   - **Visibility**: ✅ Public (ou Private si vous préférez)
   - **NE COCHEZ RIEN** (pas de README, pas de .gitignore, pas de license)
3. Cliquez sur **Create repository**

## Étape 2: Push le Code (1 min)

Le code est déjà prêt et commité. Exécutez simplement:

```powershell
git push -u origin main
```

C'est tout! Le code sera sur GitHub en quelques secondes.

## Vérification

Après le push, allez sur:
https://github.com/faycalhabibahmatalbachar/chadconnect

Vous devriez voir tous les fichiers du projet.

## En cas d'erreur d'authentification

### Option 1: Personal Access Token (Recommandé)

1. Allez sur: https://github.com/settings/tokens
2. Cliquez sur **Generate new token** → **Generate new token (classic)**
3. Donnez un nom: `chadconnect-deploy`
4. Cochez: `repo` (Full control of private repositories)
5. Cliquez sur **Generate token**
6. **COPIEZ LE TOKEN** (vous ne pourrez plus le voir après!)

Puis lors du push, utilisez:
- Username: `faycalhabibahmatalbachar`
- Password: `<collez_votre_token>`

### Option 2: GitHub CLI (Plus simple)

```powershell
# Installer GitHub CLI
winget install GitHub.CLI

# S'authentifier
gh auth login

# Puis push
git push -u origin main
```

## URLs Importantes

- **Créer le repo**: https://github.com/new
- **Voir vos repos**: https://github.com/faycalhabibahmatalbachar
- **Settings tokens**: https://github.com/settings/tokens

---

**Une fois sur GitHub, passez à DEPLOYMENT.md pour déployer sur Render.com!**
