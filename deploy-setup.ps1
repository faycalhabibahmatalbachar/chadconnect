# ChadConnect - Deployment Setup Script
# Configures Git and pushes to GitHub

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ChadConnect - Deployment Configuration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = "c:\Users\faycalhabibahmat\Desktop\ChadConnect"
Set-Location $projectRoot

# 1. Check Git
Write-Host "1. Checking Git..." -ForegroundColor Yellow
try {
    $gitVersion = git --version
    Write-Host "  [OK] Git installed: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Git is not installed!" -ForegroundColor Red
    Write-Host "  Install Git from: https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

# 2. Initialize Git repository
Write-Host ""
Write-Host "2. Initializing Git repository..." -ForegroundColor Yellow

if (Test-Path ".git") {
    Write-Host "  [OK] Git repository already initialized" -ForegroundColor Green
} else {
    git init
    Write-Host "  [OK] Git repository initialized" -ForegroundColor Green
}

# 3. Configure remote
Write-Host ""
Write-Host "3. Configuring GitHub remote..." -ForegroundColor Yellow
$remoteUrl = "https://github.com/faycalhabibahmatalbachar/chadconnect.git"

try {
    $currentRemote = git remote get-url origin 2>$null
    if ($currentRemote) {
        Write-Host "  [INFO] Remote already configured: $currentRemote" -ForegroundColor Cyan
        $changeRemote = Read-Host "  Do you want to change it? (y/n)"
        if ($changeRemote -eq "y") {
            git remote remove origin
            git remote add origin $remoteUrl
            Write-Host "  [OK] Remote updated" -ForegroundColor Green
        }
    } else {
        git remote add origin $remoteUrl
        Write-Host "  [OK] Remote added: $remoteUrl" -ForegroundColor Green
    }
} catch {
    git remote add origin $remoteUrl
    Write-Host "  [OK] Remote added: $remoteUrl" -ForegroundColor Green
}

# 4. Check files to commit
Write-Host ""
Write-Host "4. Checking files..." -ForegroundColor Yellow
git add .
$stagedFiles = git diff --cached --name-only
$fileCount = ($stagedFiles | Measure-Object).Count

Write-Host "  [OK] $fileCount files ready to commit" -ForegroundColor Green

# 5. Create commit
Write-Host ""
Write-Host "5. Creating commit..." -ForegroundColor Yellow
$commitMessage = "feat: Configuration deployment Render.com

- Add render.yaml for deployment
- Complete documentation (README, DEPLOYMENT, QUICKSTART)
- Configure .env.example with instructions
- Add API and Admin Web test scripts
- Configure for cloud MySQL, Supabase, Firebase
- Support for external Redis (Upstash)
- Ready for production deployment"

git commit -m $commitMessage
Write-Host "  [OK] Commit created" -ForegroundColor Green

# 6. Push to GitHub
Write-Host ""
Write-Host "6. Pushing to GitHub..." -ForegroundColor Yellow
Write-Host "  [WARNING] Make sure you configured GitHub authentication" -ForegroundColor Yellow
Write-Host "  (Personal token or GitHub CLI)" -ForegroundColor Yellow

$doPush = Read-Host "`n  Do you want to push to GitHub now? (y/n)"

if ($doPush -eq "y") {
    try {
        git branch -M main
        git push -u origin main
        
        Write-Host ""
        Write-Host "  [SUCCESS] Push completed!" -ForegroundColor Green
        Write-Host ""
        Write-Host "  Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Go to https://render.com" -ForegroundColor White
        Write-Host "  2. Create a new Blueprint" -ForegroundColor White
        Write-Host "  3. Connect your GitHub repo" -ForegroundColor White
        Write-Host "  4. Configure environment variables" -ForegroundColor White
        Write-Host "  5. Deploy!" -ForegroundColor White
        
    } catch {
        Write-Host ""
        Write-Host "  [ERROR] Push failed:" -ForegroundColor Red
        Write-Host "  $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "  Try manually:" -ForegroundColor Yellow
        Write-Host "  git push -u origin main" -ForegroundColor Cyan
    }
} else {
    Write-Host ""
    Write-Host "  [INFO] Push cancelled. To push later:" -ForegroundColor Yellow
    Write-Host "  git push -u origin main" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configuration completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "See DEPLOYMENT.md for complete deployment guide" -ForegroundColor Yellow
Write-Host ""
