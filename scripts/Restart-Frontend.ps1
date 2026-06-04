# Restart-Frontend.ps1
# Stops any running frontend server on port 5173, then launches a fresh instance in a new window.

Write-Host "=========================================" -ForegroundColor Yellow
Write-Host "Restarting MESA Frontend..." -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Yellow

# Stop frontend process if running
$connections = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
if ($connections) {
    $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($pid in $pids) {
        $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "Stopping existing MESA Frontend (PID $pid)..." -ForegroundColor Yellow
            Stop-Process -Id $pid -Force
        }
    }
} else {
    Write-Host "No running frontend found on port 5173." -ForegroundColor Gray
}

# Start frontend process in a new window
Write-Host "Starting MESA Frontend (Vite)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$PSScriptRoot\Start-Frontend.ps1`""

Write-Host "Frontend restart complete." -ForegroundColor Yellow
