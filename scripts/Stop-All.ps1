# Stop-All.ps1
# Finds and stops processes running on ports 8010 (backend) and 5173 (frontend).

function Stop-PortProcess {
    param (
        [int]$Port,
        [string]$Name
    )
    
    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($connections) {
        $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($pid in $pids) {
            $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "Stopping $Name on PID $pid..." -ForegroundColor Yellow
                Stop-Process -Id $pid -Force
                Write-Host "Successfully stopped $Name." -ForegroundColor Green
            }
        }
    } else {
        Write-Host "No process found running on port $Port ($Name)." -ForegroundColor Gray
    }
}

Write-Host "=========================================" -ForegroundColor Yellow
Write-Host "Stopping MESA Development Stack..." -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Yellow

Stop-PortProcess -Port 8010 -Name "MESA Backend (Uvicorn)"
Stop-PortProcess -Port 5173 -Name "MESA Frontend (Vite)"

Write-Host "Stack shutdown complete." -ForegroundColor Yellow
