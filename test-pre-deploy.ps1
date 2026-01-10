# Test Pre-Deployment Script for ChadConnect
# Verifies everything is ready for deployment

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ChadConnect - Pre-Deployment Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = "c:\Users\faycalhabibahmat\Desktop\ChadConnect"
Set-Location $projectRoot

$errors = 0
$warnings = 0

function Test-FileExists {
    param([string]$path, [string]$description)
    
    if (Test-Path $path) {
        Write-Host "  [OK] $description" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  [ERROR] $description (missing)" -ForegroundColor Red
        $script:errors++
        return $false
    }
}

# 1. Essential files
Write-Host "1. Checking essential files..." -ForegroundColor Yellow
Test-FileExists "server\package.json" "Backend package.json"
Test-FileExists "server\src\index.js" "Backend index.js"
Test-FileExists "server\.env.example" "Backend .env.example"
Test-FileExists "admin_web\package.json" "Admin Web package.json"
Test-FileExists "pubspec.yaml" "Flutter pubspec.yaml"
Test-FileExists "database\schema.sql" "Database schema"
Test-FileExists "android\google-services.json" "Google Services (Firebase)"
Test-FileExists "render.yaml" "Render configuration"
Test-FileExists "DEPLOYMENT.md" "Deployment guide"
Test-FileExists "README.md" "README"

# 2. Firebase configuration
Write-Host ""
Write-Host "2. Checking Firebase..." -ForegroundColor Yellow
if (Test-Path "android\google-services.json") {
    $googleServices = Get-Content "android\google-services.json" | ConvertFrom-Json
    $projectId = $googleServices.project_info.project_id
    Write-Host "  [OK] Project ID: $projectId" -ForegroundColor Green
    
    if (-not (Test-Path "server\secret\firebase-service-account.json")) {
        Write-Host "  [WARN] firebase-service-account.json missing in server/secret/" -ForegroundColor Yellow
        Write-Host "         You will need to convert it to Base64 and add to Render" -ForegroundColor Yellow
        $script:warnings++
    } else {
        Write-Host "  [OK] Service account present" -ForegroundColor Green
    }
}

# 3. Node.js and npm
Write-Host ""
Write-Host "3. Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "  [OK] Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Node.js not installed" -ForegroundColor Red
    $script:errors++
}

try {
    $npmVersion = npm --version
    Write-Host "  [OK] npm installed: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] npm not installed" -ForegroundColor Red
    $script:errors++
}

# 4. Flutter
Write-Host ""
Write-Host "4. Checking Flutter..." -ForegroundColor Yellow
try {
    $flutterOutput = flutter --version 2>&1 | Select-String "Flutter" | Select-Object -First 1
    Write-Host "  [OK] Flutter installed: $flutterOutput" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Flutter not installed" -ForegroundColor Red
    $script:errors++
}

# 5. Git
Write-Host ""
Write-Host "5. Checking Git..." -ForegroundColor Yellow
try {
    $gitVersion = git --version
    Write-Host "  [OK] Git installed: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Git not installed" -ForegroundColor Red
    $script:errors++
}

# 6. Node.js dependencies
Write-Host ""
Write-Host "6. Checking Node.js dependencies..." -ForegroundColor Yellow

Set-Location "$projectRoot\server"
if (Test-Path "node_modules") {
    Write-Host "  [OK] Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Backend dependencies not installed" -ForegroundColor Yellow
    Write-Host "         Run: cd server && npm install" -ForegroundColor Yellow
    $script:warnings++
}

Set-Location "$projectRoot\admin_web"
if (Test-Path "node_modules") {
    Write-Host "  [OK] Admin web dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Admin web dependencies not installed" -ForegroundColor Yellow
    Write-Host "         Run: cd admin_web && npm install" -ForegroundColor Yellow
    $script:warnings++
}

# 7. Mobile API configuration
Write-Host ""
Write-Host "7. Checking mobile API configuration..." -ForegroundColor Yellow
Set-Location $projectRoot

$apiBaseFile = "lib\src\core\api\api_base.dart"
if (Test-Path $apiBaseFile) {
    $apiContent = Get-Content $apiBaseFile -Raw
    if ($apiContent -match "chadconnect\.onrender\.com") {
        Write-Host "  [OK] API URL configured for Render.com" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] API URL not configured for production" -ForegroundColor Yellow
        $script:warnings++
    }
}

# 8. .gitignore
Write-Host ""
Write-Host "8. Checking .gitignore..." -ForegroundColor Yellow
if (Test-Path ".gitignore") {
    Write-Host "  [OK] .gitignore exists" -ForegroundColor Green
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($errors -eq 0 -and $warnings -eq 0) {
    Write-Host ""
    Write-Host "[SUCCESS] All tests passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your project is ready for deployment!" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Run: .\deploy-setup.ps1" -ForegroundColor White
    Write-Host "  2. Configure cloud services (MySQL, Supabase, Redis)" -ForegroundColor White
    Write-Host "  3. Deploy to Render.com" -ForegroundColor White
    Write-Host "  4. Test with: node server\test_api.js" -ForegroundColor White
} elseif ($errors -eq 0) {
    Write-Host ""
    Write-Host "[WARNING] Tests passed with $warnings warnings" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "You can continue, but check the warnings above" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "[ERROR] $errors errors found" -ForegroundColor Red
    if ($warnings -gt 0) {
        Write-Host "[WARNING] $warnings warnings" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "Fix the errors before deploying" -ForegroundColor Red
}

Write-Host ""
Write-Host "Complete guide: DEPLOYMENT.md" -ForegroundColor Cyan
Write-Host ""

Set-Location $projectRoot
