<#
.SYNOPSIS
Docker deployment script para Arari-PRO (10 instancias)
Automatiza: verificar Docker, construir imágenes, levantar contenedores

.USAGE
PowerShell -ExecutionPolicy Bypass -File docker-deploy.ps1
#>

param(
    [switch]$SkipBuild = $false,
    [switch]$Force = $false,
    [int]$FrontendBasePort = 3000,
    [int]$BackendBasePort = 8000,
    [int]$Instances = 10
)

$ErrorActionPreference = "Stop"

Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "  Arari-PRO Docker Deployment (10 Instances)" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# =====================================
# 0. Ejecutar pre-check (opcional)
# =====================================
Write-Host "[0/4] Ejecutando pre-deployment checker..." -ForegroundColor Yellow
Write-Host "      (para verificar puertos libres, ejecuta primero: docker-check.ps1)" -ForegroundColor Yellow
Write-Host ""

# =====================================
# 1. Verificar Docker
# =====================================
Write-Host "[1/4] Verificando Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "[OK] Docker disponible: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker no está instalado o no está en PATH" -ForegroundColor Red
    Write-Host "        Instala Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor Red
    exit 1
}

try {
    $composeVersion = docker compose version 2>$null
    Write-Host "[OK] docker compose disponible" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] docker compose no disponible, intentando con docker-compose..." -ForegroundColor Yellow
}
Write-Host ""

# =====================================
# 2. Construir imágenes (opcional)
# =====================================
if (-not $SkipBuild) {
    Write-Host "[2/4] Construyendo imágenes Docker..." -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "--- Backend (Python/FastAPI) ---" -ForegroundColor Cyan
    try {
        docker build -t arari-pro-backend:latest -f .\arari-app\Dockerfile.backend .\arari-app
        Write-Host "[OK] arari-pro-backend:latest construida" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Falló la construcción de arari-pro-backend" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
    
    Write-Host "--- Frontend (Next.js) ---" -ForegroundColor Cyan
    try {
        docker build -t arari-pro-frontend:latest -f .\arari-app\Dockerfile.frontend .\arari-app
        Write-Host "[OK] arari-pro-frontend:latest construida" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Falló la construcción de arari-pro-frontend" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
} else {
    Write-Host "[2/4] Saltando construcción de imágenes (--SkipBuild)" -ForegroundColor Yellow
    Write-Host ""
}

# =====================================
# 3. Verificar conflictos de puertos
# =====================================
Write-Host "[3/4] Verificando puertos disponibles..." -ForegroundColor Yellow
$occupiedPorts = @()
for ($port = 3000; $port -le 3009; $port++) {
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conn) { $occupiedPorts += $port }
}
for ($port = 8000; $port -le 8009; $port++) {
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conn) { $occupiedPorts += $port }
}

if ($occupiedPorts.Count -gt 0) {
    Write-Host "[WARNING] Puertos ocupados: $($occupiedPorts -join ', ')" -ForegroundColor Yellow
    if (-not $Force) {
        Write-Host "           Usa -Force para continuar de todas formas" -ForegroundColor Yellow
        Write-Host ""
        $ans = Read-Host "¿Continuar? (s/n)"
        if ($ans -ne 's' -and $ans -ne 'S') {
            Write-Host "[ABORTED]" -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host "[OK] Todos los puertos disponibles (3000-3009, 8000-8009)" -ForegroundColor Green
}
Write-Host ""

# =====================================
# 4. Levantar docker-compose
# =====================================
Write-Host "[4/4] Levantando 10 instancias (frontend + backend)..." -ForegroundColor Yellow
Write-Host ""
try {
    docker compose -f docker-compose.generated.yml up -d
    Write-Host "[OK] Contenedores levantados" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Falló docker compose up" -ForegroundColor Red
    exit 1
}
Write-Host ""

# =====================================
# 5. Resumen final
# =====================================
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "  Resumen de Deployment" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

Write-Host "Frontend (Next.js):" -ForegroundColor Green
Write-Host "  - Instance 00: http://localhost:3000"
Write-Host "  - Instance 01: http://localhost:3001"
Write-Host "  - Instance 02: http://localhost:3002"
Write-Host "  ... (instancias 03-09 en puertos 3003-3009)"
Write-Host ""

Write-Host "Backend (FastAPI):" -ForegroundColor Green
Write-Host "  - Instance 00: http://localhost:8000"
Write-Host "  - Instance 01: http://localhost:8001"
Write-Host "  - Instance 02: http://localhost:8002"
Write-Host "  ... (instancias 03-09 en puertos 8001-8009)"
Write-Host ""

Write-Host "Archivos de configuración:" -ForegroundColor Green
Write-Host "  - docker-compose.generated.yml  (configuración de servicios)"
Write-Host "  - .env.instance00 ... .env.instance09  (variables por instancia)"
Write-Host "  - compose_generation_report.json  (resumen de mapeo de puertos)"
Write-Host ""

Write-Host "Contenedores en ejecución:" -ForegroundColor Green
docker ps
Write-Host ""

Write-Host "Comandos útiles:" -ForegroundColor Cyan
Write-Host "  Ver logs:"
Write-Host "    docker compose -f docker-compose.generated.yml logs -f"
Write-Host ""
Write-Host "  Parar contenedores:"
Write-Host "    docker compose -f docker-compose.generated.yml down"
Write-Host ""
Write-Host "  Limpiar volúmenes:"
Write-Host "    docker compose -f docker-compose.generated.yml down -v"
Write-Host ""

Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "  ¡Deployment completado!" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan
