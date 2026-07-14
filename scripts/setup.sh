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
  docker compose -f docker/docker-compose.yml up -d postgres redis
else
  echo "    Docker não encontrado — pulei esta etapa. Instale o Docker Desktop para rodar o ambiente completo."
fi

echo "==> Setup concluído. Rode 'pnpm turbo run dev' para subir backend e frontend."
