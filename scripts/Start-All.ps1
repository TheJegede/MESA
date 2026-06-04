# Start-All.ps1
# Launches both backend and frontend development servers in separate powershell windows.

Write-Host "=========================================" -ForegroundColor Yellow
Write-Host "Launching MESA Development Stack..." -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Yellow

# Launch Backend
Write-Host "Launching Backend on Port 8010..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$PSScriptRoot\Start-Backend.ps1`""

# Launch Frontend
Write-Host "Launching Frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$PSScriptRoot\Start-Frontend.ps1`""

Write-Host "Done! Both servers have been launched in separate terminal windows." -ForegroundColor Yellow
