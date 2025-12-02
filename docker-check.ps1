<#
.SYNOPSIS
Pre-deployment checker para Arari-PRO
Detecta puertos ocupados y genera configuración sin conflictos

.USAGE
PowerShell -ExecutionPolicy Bypass -File .\docker-check.ps1
#>

param(
    [int]$FrontendBasePort = 3000,
    [int]$BackendBasePort = 8000,
    [int]$Instances = 10
)

$ErrorActionPreference = "SilentlyContinue"

Write-Host ""
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "  Arari-PRO Docker - Pre-Deployment Checker" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""

# =====================================
# 1. Verificar Docker
# =====================================
Write-Host "[1/3] Verificando Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Docker disponible: $dockerVersion" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Docker no está disponible" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[ERROR] No se pudo ejecutar Docker" -ForegroundColor Red
    exit 1
}
Write-Host ""

# =====================================
# 2. Listar contenedores en ejecución
# =====================================
Write-Host "[2/3] Listando contenedores y puertos en uso..." -ForegroundColor Yellow
Write-Host ""

$runningContainers = docker ps --format "{{.Names}}`t{{.Ports}}" 2>$null
if ($runningContainers) {
    Write-Host "Contenedores en ejecución:" -ForegroundColor Cyan
    $runningContainers | ForEach-Object {
        Write-Host "  $_" -ForegroundColor White
    }
} else {
    Write-Host "No hay contenedores en ejecución" -ForegroundColor Green
}
Write-Host ""

# =====================================
# 3. Detectar puertos ocupados
# =====================================
Write-Host "[3/3] Detectando puertos ocupados..." -ForegroundColor Yellow
Write-Host ""

$occupiedPorts = @()
$proposedFrontendPorts = @()
$proposedBackendPorts = @()

# Verificar puertos propuestos
for ($i = 0; $i -lt $Instances; $i++) {
    $fport = $FrontendBasePort + $i
    $bport = $BackendBasePort + $i
    
    $fconn = Get-NetTCPConnection -LocalPort $fport -ErrorAction SilentlyContinue
    $bconn = Get-NetTCPConnection -LocalPort $bport -ErrorAction SilentlyContinue
    
    if ($fconn) { $occupiedPorts += $fport }
    if ($bconn) { $occupiedPorts += $bport }
}

# Mostrar puertos propuestos vs disponibles
Write-Host "Puertos propuestos:" -ForegroundColor Cyan
Write-Host "  Frontend: $FrontendBasePort..$($FrontendBasePort + $Instances - 1)" -ForegroundColor White
Write-Host "  Backend:  $BackendBasePort..$($BackendBasePort + $Instances - 1)" -ForegroundColor White
Write-Host ""

if ($occupiedPorts.Count -gt 0) {
    Write-Host "⚠️  PUERTOS OCUPADOS DETECTADOS:" -ForegroundColor Yellow
    $occupiedPorts | Sort-Object | Get-Unique | ForEach-Object {
        Write-Host "  - Puerto $_" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Opciones:" -ForegroundColor Yellow
    Write-Host "  1) Detener otros contenedores que usan esos puertos" -ForegroundColor White
    Write-Host "  2) Cambiar el rango de puertos base (usa -FrontendBasePort y -BackendBasePort)" -ForegroundColor White
    Write-Host "  3) Generar configuración con puertos alternativos automáticamente" -ForegroundColor White
    Write-Host ""
    Write-Host "Ejemplo para opción 2:" -ForegroundColor Cyan
    Write-Host "  powershell -ExecutionPolicy Bypass -File .\docker-check.ps1 -FrontendBasePort 4000 -BackendBasePort 9000" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "✓ Todos los puertos disponibles (sin conflictos)" -ForegroundColor Green
    Write-Host ""
}

# =====================================
# 4. Resumen y recomendaciones
# =====================================
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "  RESUMEN" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""

Write-Host "Configuración propuesta:" -ForegroundColor Yellow
Write-Host "  Instancias: $Instances" -ForegroundColor White
Write-Host "  Puertos Frontend: $FrontendBasePort..$($FrontendBasePort + $Instances - 1)" -ForegroundColor White
Write-Host "  Puertos Backend:  $BackendBasePort..$($BackendBasePort + $Instances - 1)" -ForegroundColor White
Write-Host ""

if ($occupiedPorts.Count -eq 0) {
    Write-Host "✓ Estado: LISTO PARA DEPLOYMENT" -ForegroundColor Green
    Write-Host ""
    Write-Host "Próximo paso:" -ForegroundColor Cyan
    Write-Host "  powershell -ExecutionPolicy Bypass -File .\docker-deploy.ps1" -ForegroundColor White
} else {
    Write-Host "✗ Estado: CONFLICTOS DETECTADOS (ver arriba)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Próximo paso:" -ForegroundColor Cyan
    Write-Host "  - Resuelve los puertos ocupados (ver opciones arriba)" -ForegroundColor White
    Write-Host "  - Luego ejecuta: powershell -ExecutionPolicy Bypass -File .\docker-deploy.ps1" -ForegroundColor White
}

Write-Host ""
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""
