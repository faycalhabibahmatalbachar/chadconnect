# Script de configuration rapide du serveur local ChadConnect
# Ce script vérifie et configure automatiquement l'environnement local

Write-Host "Configuration du serveur local ChadConnect..." -ForegroundColor Cyan
Write-Host ""

# Variables
$PROJECT_ROOT = $PSScriptRoot
$SERVER_DIR = Join-Path $PROJECT_ROOT "server"
$ENV_FILE = Join-Path $SERVER_DIR ".env"
$ENV_EXAMPLE = Join-Path $SERVER_DIR ".env.example"
$XAMPP_PATH = "C:\xampp"
$MYSQL_BIN = Join-Path $XAMPP_PATH "mysql\bin\mysql.exe"

# Étape 1 : Vérifier XAMPP
Write-Host "Etape 1/5 : Verification de XAMPP..." -ForegroundColor Yellow

if (-not (Test-Path $XAMPP_PATH)) {
    Write-Host "[ERREUR] XAMPP n'est pas installe dans $XAMPP_PATH" -ForegroundColor Red
    Write-Host "Telechargez XAMPP depuis : https://www.apachefriends.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] XAMPP trouve dans $XAMPP_PATH" -ForegroundColor Green

# Étape 2 : Vérifier MySQL
Write-Host "`nEtape 2/5 : Verification de MySQL..." -ForegroundColor Yellow

$mysqlRunning = Get-Process -Name "mysqld" -ErrorAction SilentlyContinue

if (-not $mysqlRunning) {
    Write-Host "[ATTENTION] MySQL n'est pas demarre" -ForegroundColor Yellow
    Write-Host "Veuillez demarrer MySQL dans XAMPP Control Panel" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Etapes :" -ForegroundColor White
    Write-Host "1. Ouvrez XAMPP Control Panel" -ForegroundColor White
    Write-Host "2. Cliquez sur 'Start' a cote de MySQL" -ForegroundColor White
    Write-Host ""
    Write-Host "Appuyez sur Entree une fois MySQL demarre..." -ForegroundColor Cyan
    Read-Host
} else {
    Write-Host "[OK] MySQL est en cours d'execution (PID: $($mysqlRunning.Id))" -ForegroundColor Green
}

# Étape 3 : Créer le fichier .env
Write-Host "`nEtape 3/5 : Configuration du fichier .env..." -ForegroundColor Yellow

if (-not (Test-Path $ENV_FILE)) {
    if (Test-Path $ENV_EXAMPLE) {
        Copy-Item $ENV_EXAMPLE $ENV_FILE
        Write-Host "[OK] Fichier .env cree depuis .env.example" -ForegroundColor Green
    } else {
        Write-Host "[ERREUR] Fichier .env.example introuvable" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[OK] Fichier .env existe deja" -ForegroundColor Green
}

# Étape 4 : Vérifier la base de données
Write-Host "`nEtape 4/5 : Verification de la base de donnees..." -ForegroundColor Yellow

if (Test-Path $MYSQL_BIN) {
    $dbExists = & $MYSQL_BIN -u root -e "SHOW DATABASES LIKE 'chadconnect';" 2>$null
    
    if ($dbExists -match "chadconnect") {
        Write-Host "[OK] Base de donnees 'chadconnect' existe" -ForegroundColor Green
    } else {
        Write-Host "[ATTENTION] Base de donnees 'chadconnect' n'existe pas" -ForegroundColor Yellow
        Write-Host "Creation de la base de donnees..." -ForegroundColor Cyan
        
        & $MYSQL_BIN -u root -e "CREATE DATABASE IF NOT EXISTS chadconnect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Base de donnees creee avec succes" -ForegroundColor Green
            
            # Importer le schéma si disponible
            $schemaFile = Join-Path $PROJECT_ROOT "database\schema.sql"
            if (Test-Path $schemaFile) {
                Write-Host "Importation du schema..." -ForegroundColor Cyan
                Get-Content $schemaFile | & $MYSQL_BIN -u root chadconnect 2>$null
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "[OK] Schema importe avec succes" -ForegroundColor Green
                } else {
                    Write-Host "[ATTENTION] Erreur lors de l'importation du schema" -ForegroundColor Yellow
                }
            }
        } else {
            Write-Host "[ERREUR] Erreur lors de la creation de la base de donnees" -ForegroundColor Red
        }
    }
} else {
    Write-Host "[ATTENTION] mysql.exe introuvable, impossible de verifier la base de donnees" -ForegroundColor Yellow
}

# Étape 5 : Vérifier les dépendances Node.js
Write-Host "`nEtape 5/5 : Verification des dependances Node.js..." -ForegroundColor Yellow

$nodeModules = Join-Path $SERVER_DIR "node_modules"

if (-not (Test-Path $nodeModules)) {
    Write-Host "[ATTENTION] node_modules n'existe pas" -ForegroundColor Yellow
    Write-Host "Installation des dependances..." -ForegroundColor Cyan
    
    Push-Location $SERVER_DIR
    npm install
    Pop-Location
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Dependances installees" -ForegroundColor Green
    } else {
        Write-Host "[ERREUR] Erreur lors de l'installation des dependances" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[OK] Dependances Node.js installees" -ForegroundColor Green
}

# Résumé
Write-Host "`n" -NoNewline
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Configuration terminee !" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Prochaines etapes :" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Demarrez le serveur :" -ForegroundColor White
Write-Host "   cd server" -ForegroundColor Cyan
Write-Host "   npm start" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Testez le serveur :" -ForegroundColor White
Write-Host "   curl http://localhost:3000/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Dans Flutter, appuyez sur 'R' pour Hot Restart" -ForegroundColor White
Write-Host ""
Write-Host "4. Testez l'inscription dans l'app mobile !" -ForegroundColor White
Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
