#!/usr/bin/env bash
# Setup local do Oficina SaaS — bash / Git Bash.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Verificando pnpm..."
if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm não encontrado. Instale com: npm install -g pnpm"
  exit 1
fi

echo "==> Copiando .env.example -> .env (se ainda não existir)..."
for env_dir in "." "backend" "frontend"; do
  if [ -f "$env_dir/.env.example" ] && [ ! -f "$env_dir/.env" ]; then
    cp "$env_dir/.env.example" "$env_dir/.env"
    echo "    criado $env_dir/.env"
  fi
done

echo "==> Instalando dependências (pnpm install)..."
pnpm install

echo "==> Subindo serviços de infraestrutura (docker compose)..."
if command -v docker >/dev/null 2>&1; then
  # --project-directory . makes Compose read ./.env (repo root, where the
  # .env above was just created) instead of docker/.env — Compose's default
  # project directory is the compose file's own folder, not the CWD.
  docker compose -f docker/docker-compose.yml --project-directory . up -d postgres redis

  echo "==> Aguardando Postgres ficar pronto..."
  ready=0
  for i in $(seq 1 15); do
    if docker compose -f docker/docker-compose.yml --project-directory . exec -T postgres pg_isready -U oficina >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 2
  done
  if [ "$ready" -ne 1 ]; then
    echo "    Postgres não ficou pronto a tempo — verifique 'docker compose logs postgres'."
    exit 1
  fi

  echo "==> Rodando migrations (Feature 2: IAM)..."
  pnpm --filter @oficina/database run migrate:deploy

  echo "==> Rodando seed (papéis fixos ADMIN/MANAGER/MECHANIC/FRONT_DESK)..."
  pnpm --filter @oficina/database run seed
else
  echo "    Docker não encontrado — pulei infra/migrations/seed. Instale o Docker Desktop para rodar o ambiente completo."
fi

echo "==> Setup concluído. Rode 'pnpm turbo run dev' para subir backend e frontend."
