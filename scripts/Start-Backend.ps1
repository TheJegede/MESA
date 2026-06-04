# Start-Backend.ps1
# Runs the MESA FastAPI backend server from the project root.

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "=========================================" -ForegroundColor Green
Write-Host "Starting MESA Backend on port 8010..." -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

uvicorn backend.main:app --reload --port 8010
