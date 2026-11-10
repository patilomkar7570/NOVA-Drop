# NOVA Drop - Windows PowerShell Launcher
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  NOVA Drop - PC Web Edition" -ForegroundColor Cyan
Write-Host "  'Your files. Your devices. Your network.'" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Verify Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Node.js (v18+) from https://nodejs.org" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "[*] Installing dependencies..." -ForegroundColor Yellow
    cmd /c npm install
}

# Build if needed
if (-not (Test-Path "server\public\index.html") -or -not (Test-Path "server\dist\server.js")) {
    Write-Host "[*] Building application..." -ForegroundColor Yellow
    cmd /c npm run build
}

Write-Host "[*] Launching NOVA Drop at http://127.0.0.1:3000" -ForegroundColor Green
Start-Process "http://127.0.0.1:3000"
node server\dist\server.js
