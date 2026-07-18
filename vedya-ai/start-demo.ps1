# VedyaAI - fast demo launcher (Windows)
# Double-click START.bat or run: .\start-demo.ps1

$ErrorActionPreference = "Continue"
$Root = $PSScriptRoot
Set-Location $Root
$PidDir = Join-Path $Root ".run"
$LogDir = Join-Path $PidDir "logs"
New-Item -ItemType Directory -Force -Path $PidDir, $LogDir | Out-Null

function Write-Step($m) { Write-Host "[VedyaAI] $m" -ForegroundColor Cyan }
function Write-Ok($m) { Write-Host "[OK] $m" -ForegroundColor Green }
function Write-Warn($m) { Write-Host "[WARN] $m" -ForegroundColor Yellow }

function Stop-Port([int]$Port) {
    Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
        ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

function Load-DotEnv([string]$Path) {
    if (-not (Test-Path $Path)) { return }
    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) { return }
        $idx = $line.IndexOf("=")
        if ($idx -lt 1) { return }
        $key = $line.Substring(0, $idx).Trim()
        $val = $line.Substring($idx + 1).Trim().Trim('"').Trim("'")
        [Environment]::SetEnvironmentVariable($key, $val, "Process")
        Set-Item -Path "Env:$key" -Value $val
    }
}

Write-Host ""
Write-Host "========================================"
Write-Host "  VedyaAI Demo Launcher"
Write-Host "========================================"
Write-Host ""

Load-DotEnv (Join-Path $Root ".env")
if (-not $env:DATABASE_URL) {
    $env:DATABASE_URL = "postgresql://vedya:vedyapass@127.0.0.1:5433/vedyaai"
}
$env:PYTHONIOENCODING = "utf-8"
if (-not $env:NEXT_PUBLIC_API_URL) {
    $env:NEXT_PUBLIC_API_URL = "http://localhost:8000"
}

Write-Step "Starting Postgres (Docker)..."
try {
    docker compose up -d postgres 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { docker-compose up -d postgres 2>$null | Out-Null }
    Write-Ok "Postgres on host port 5433"
} catch {
    Write-Warn "Docker compose issue - continuing if DB already up"
}

$py = Join-Path $Root "backend\.venv\Scripts\python.exe"
for ($i = 1; $i -le 20; $i++) {
    try {
        & $py -c "import os,psycopg2; c=psycopg2.connect(os.environ['DATABASE_URL']); c.close(); print('ok')" 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { Write-Ok "Database reachable"; break }
    } catch {}
    Start-Sleep 1
}

Write-Step "Restarting API and frontend..."
Stop-Port 8000
Stop-Port 3000
Start-Sleep 1

"NEXT_PUBLIC_API_URL=$($env:NEXT_PUBLIC_API_URL)" | Set-Content (Join-Path $Root "frontend\.env.local") -Encoding UTF8

$uvicorn = Join-Path $Root "backend\.venv\Scripts\uvicorn.exe"
$bp = Start-Process -FilePath $uvicorn -ArgumentList @("main:app", "--host", "0.0.0.0", "--port", "8000") `
    -WorkingDirectory (Join-Path $Root "backend") `
    -RedirectStandardOutput (Join-Path $LogDir "backend.log") `
    -RedirectStandardError (Join-Path $LogDir "backend.err.log") `
    -PassThru -WindowStyle Hidden
Set-Content (Join-Path $PidDir "backend.pid") $bp.Id
Write-Ok "Backend PID $($bp.Id) on http://localhost:8000"

$fp = Start-Process -FilePath "cmd.exe" -ArgumentList @("/c", "npm run dev -- --port 3000") `
    -WorkingDirectory (Join-Path $Root "frontend") `
    -RedirectStandardOutput (Join-Path $LogDir "frontend.log") `
    -RedirectStandardError (Join-Path $LogDir "frontend.err.log") `
    -PassThru -WindowStyle Hidden
Set-Content (Join-Path $PidDir "frontend.pid") $fp.Id
Write-Ok "Frontend PID $($fp.Id) on http://localhost:3000"

$apiOk = $false
for ($i = 1; $i -le 40; $i++) {
    try {
        $h = Invoke-RestMethod "http://127.0.0.1:8000/health" -TimeoutSec 2
        if ($h.db_connected) {
            Write-Ok ("API healthy - formulations=" + $h.formulation_count + " llm=" + $h.llm_enabled)
            $apiOk = $true
            break
        }
    } catch {
        Start-Sleep 1
    }
}

try {
    $v = Invoke-RestMethod "http://127.0.0.1:8000/voice/status" -TimeoutSec 2
    if ($v.configured) { Write-Ok "ElevenLabs voice configured" }
    else { Write-Warn "Voice off - set ELEVENLABS_API_KEY in .env" }
} catch {
    Write-Warn "Voice status unavailable"
}

if (-not $env:OPENAI_API_KEY) {
    Write-Warn "OPENAI_API_KEY empty - HI/GU use offline templates (still demoable)"
}

for ($i = 1; $i -le 45; $i++) {
    try {
        $r = Invoke-WebRequest "http://localhost:3000" -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -lt 500) { Write-Ok "Frontend ready"; break }
    } catch {
        Start-Sleep 1
    }
}

Write-Host ""
Write-Host "Demo ready:" -ForegroundColor Green
Write-Host "  UI     http://localhost:3000"
Write-Host "  Login  http://localhost:3000/login  (click Demo chip)"
Write-Host "  API    http://localhost:8000/docs"
Write-Host ""
Write-Host "Pitch: Language GU/HI -> Open Preset -> Listen -> What if Diabetes -> Compare"
Write-Host ""

try { Start-Process "http://localhost:3000" } catch {}

if (-not $apiOk) {
    Write-Warn "API not healthy - see .run\logs\backend.err.log"
    Get-Content (Join-Path $LogDir "backend.err.log") -Tail 15 -ErrorAction SilentlyContinue
}
