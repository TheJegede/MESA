# Restart-All.ps1
# Stops both backend and frontend servers, then starts them both fresh in new windows.

Write-Host "=========================================" -ForegroundColor Yellow
Write-Host "Restarting MESA Development Stack..." -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Yellow

# Call Stop-All
& "$PSScriptRoot\Stop-All.ps1"

# Add a tiny delay to ensure ports are fully freed
Start-Sleep -Seconds 1

# Call Start-All
& "$PSScriptRoot\Start-All.ps1"
