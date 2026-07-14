# Setup local do Oficina SaaS — PowerShell.
$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location $RootDir

Write-Host "==> Verificando pnpm..."
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "pnpm não encontrado. Instale com: npm install -g pnpm"
    exit 1
}

Write-Host "==> Copiando .env.example -> .env (se ainda não existir)..."
foreach ($envDir in @(".", "backend", "frontend")) {
    $example = Join-Path $envDir ".env.example"
    $target = Join-Path $envDir ".env"
    if ((Test-Path $example) -and (-not (Test-Path $target))) {
        Copy-Item $example $target
        Write-Host "    criado $target"
    }
}

Write-Host "==> Instalando dependências (pnpm install)..."
pnpm install

Write-Host "==> Subindo serviços de infraestrutura (docker compose)..."
if (Get-Command docker -ErrorAction SilentlyContinue) {
    docker compose -f docker/docker-compose.yml up -d postgres redis
} else {
    Write-Host "    Docker não encontrado - pulei esta etapa. Instale o Docker Desktop para rodar o ambiente completo."
}

Write-Host "==> Setup concluído. Rode 'pnpm turbo run dev' para subir backend e frontend."
