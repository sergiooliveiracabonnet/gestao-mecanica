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
    # --project-directory . makes Compose read ./.env (repo root, where the
    # .env above was just created) instead of docker/.env - Compose's
    # default project directory is the compose file's own folder, not the CWD.
    docker compose -f docker/docker-compose.yml --project-directory . up -d postgres redis

    Write-Host "==> Aguardando Postgres ficar pronto..."
    $ready = $false
    for ($i = 0; $i -lt 15; $i++) {
        docker compose -f docker/docker-compose.yml --project-directory . exec -T postgres pg_isready -U oficina 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Start-Sleep -Seconds 2
    }
    if (-not $ready) {
        Write-Host "    Postgres não ficou pronto a tempo — verifique 'docker compose logs postgres'."
        exit 1
    }

    Write-Host "==> Rodando migrations (Feature 2: IAM)..."
    pnpm --filter @oficina/database run migrate:deploy

    Write-Host "==> Rodando seed (papéis fixos ADMIN/MANAGER/MECHANIC/FRONT_DESK)..."
    pnpm --filter @oficina/database run seed
} else {
    Write-Host "    Docker não encontrado - pulei infra/migrations/seed. Instale o Docker Desktop para rodar o ambiente completo."
}

Write-Host "==> Setup concluído. Rode 'pnpm turbo run dev' para subir backend e frontend."
