# Script pour démarrer l'émulateur Android avec DNS configuré
# Ce script résout le problème "Failed host lookup"

Write-Host "🚀 Démarrage de l'émulateur Android avec Google DNS..." -ForegroundColor Cyan

# Variables
$AVD_NAME = "Pixel_8"
$DNS_SERVERS = "8.8.8.8,8.8.4.4"

# Rechercher l'emplacement du SDK Android
$ANDROID_HOME = $env:ANDROID_HOME
if (-not $ANDROID_HOME) {
    $ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
}

$EMULATOR_PATH = "$ANDROID_HOME\emulator\emulator.exe"

# Vérifier si l'émulateur existe
if (-not (Test-Path $EMULATOR_PATH)) {
    Write-Host "❌ Émulateur non trouvé à : $EMULATOR_PATH" -ForegroundColor Red
    Write-Host "Veuillez définir la variable d'environnement ANDROID_HOME" -ForegroundColor Yellow
    exit 1
}

# Lister les AVD disponibles
Write-Host "`n📱 AVD disponibles :" -ForegroundColor Yellow
& $EMULATOR_PATH -list-avds

Write-Host "`n🔧 Démarrage de '$AVD_NAME' avec DNS : $DNS_SERVERS" -ForegroundColor Green
Write-Host "Veuillez patienter..." -ForegroundColor Gray

# Démarrer l'émulateur avec DNS
& $EMULATOR_PATH -avd $AVD_NAME -dns-server $DNS_SERVERS

Write-Host "`n✅ Émulateur démarré !" -ForegroundColor Green
Write-Host "Vous pouvez maintenant lancer : flutter run -d emulator-5554" -ForegroundColor Cyan
