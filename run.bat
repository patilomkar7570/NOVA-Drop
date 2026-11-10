@echo off
setlocal enabledelayedexpansion
title NOVA Drop - PC Web Edition

echo ========================================================
echo   NOVA Drop - PC Web Edition
echo   "Your files. Your devices. Your network."
echo ========================================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not found in your PATH!
    echo Please install Node.js (version 18+ or 20+) from https://nodejs.org
    pause
    exit /b 1
)

echo [*] Checking dependencies...
if not exist "node_modules" (
    echo [*] Installing dependencies for NOVA Drop...
    call npm.cmd install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
)

echo [*] Checking build assets...
if not exist "server\public\index.html" (
    echo [*] Building NOVA Drop frontend and backend...
    call npm.cmd run build
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Build failed.
        pause
        exit /b 1
    )
)

if not exist "server\dist\server.js" (
    echo [*] Compiling backend server...
    call npm.cmd --prefix server run build
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Server build failed.
        pause
        exit /b 1
    )
)

echo.
echo [*] Launching NOVA Drop local server...
echo [*] Address: http://127.0.0.1:3000
echo.

REM Open default browser to NOVA Drop
start "" "http://127.0.0.1:3000"

REM Run server
call node server\dist\server.js

pause
