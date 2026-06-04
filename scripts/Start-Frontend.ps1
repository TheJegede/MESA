# Start-Frontend.ps1
# Runs the MESA React/Vite frontend server.

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location "$ProjectRoot\frontend"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Starting MESA Frontend (Vite)..." -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

npm run dev
