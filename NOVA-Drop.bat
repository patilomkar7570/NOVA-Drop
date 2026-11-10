@echo off
setlocal
title NOVA Drop
cd /d "%~dp0"

echo Starting NOVA Drop...
if not exist "server\dist\server.js" (
    echo Building NOVA Drop...
    call npm.cmd run build
)

start "" "http://127.0.0.1:3000"
node server\dist\server.js
