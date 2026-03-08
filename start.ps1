# start.ps1 — Launch both servers
# Usage: .\start.ps1

$root = $PSScriptRoot

Write-Host "`n=== Starting QuizSpark ===" -ForegroundColor Cyan

# Start Backend
Write-Host "`n[1/2] Starting Backend (port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; Write-Host 'BACKEND' -ForegroundColor Cyan; npm run dev"

Start-Sleep -Seconds 2

# Start Frontend
Write-Host "[2/2] Starting Frontend (port 4200)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; Write-Host 'FRONTEND' -ForegroundColor Green; npx ng serve --port 4200"

Write-Host "`n=== Both servers starting ===" -ForegroundColor Green
Write-Host "  Backend  -> http://localhost:3000/health" -ForegroundColor Cyan
Write-Host "  Frontend -> http://localhost:4200" -ForegroundColor Green
Write-Host "`nNOTE: Make sure PostgreSQL is running and DATABASE_URL in backend\.env is correct." -ForegroundColor DarkYellow
