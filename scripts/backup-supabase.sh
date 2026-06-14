#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-backup}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR/database" "$BACKUP_DIR/storage/event-images"

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "SUPABASE_DB_URL is required."
  exit 1
fi

pg_dump "$SUPABASE_DB_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file "$BACKUP_DIR/database/herenow-$TIMESTAMP.dump"

if [[ -n "${SUPABASE_S3_ENDPOINT:-}" ]] && command -v aws >/dev/null 2>&1; then
  aws s3 sync \
    "s3://event-images" \
    "$BACKUP_DIR/storage/event-images" \
    --endpoint-url "$SUPABASE_S3_ENDPOINT"
fi

echo "Backup completed in $BACKUP_DIR"
