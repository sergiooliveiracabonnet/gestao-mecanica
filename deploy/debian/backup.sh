#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/deploy/debian/.env.production"
COMPOSE_FILE="$ROOT_DIR/deploy/debian/compose.production.yml"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  sh -ec 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' |
  gzip -9 > "$BACKUP_DIR/postgres-$STAMP.sql.gz"

docker run --rm \
  -v oficina-production_service_order_uploads:/source:ro \
  -v "$BACKUP_DIR:/backup" \
  alpine:3.22 tar -czf "/backup/uploads-$STAMP.tar.gz" -C /source .

echo "Backup criado em $BACKUP_DIR"
