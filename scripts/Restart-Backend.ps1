# Restart-Backend.ps1
# Stops any running backend server on port 8010, then launches a fresh instance in a new window.

Write-Host "=========================================" -ForegroundColor Yellow
Write-Host "Restarting MESA Backend..." -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Yellow

# Stop backend process if running
$connections = Get-NetTCPConnection -LocalPort 8010 -State Listen -ErrorAction SilentlyContinue
if ($connections) {
    $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($pid in $pids) {
        $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "Stopping existing MESA Backend (PID $pid)..." -ForegroundColor Yellow
            Stop-Process -Id $pid -Force
        }
    }
} else {
    Write-Host "No running backend found on port 8010." -ForegroundColor Gray
}

# Start backend process in a new window
Write-Host "Starting MESA Backend on Port 8010..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$PSScriptRoot\Start-Backend.ps1`""

Write-Host "Backend restart complete." -ForegroundColor Yellow
