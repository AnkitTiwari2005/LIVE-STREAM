#!/usr/bin/env bash
set -eo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 /path/to/backup.sql.gz.age"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file $BACKUP_FILE does not exist."
  exit 1
fi

if [ -f /opt/pooja/.env.production ]; then
  source /opt/pooja/.env.production
fi

TMP_SQL="/tmp/restore_dump.sql"

echo "[$(date)] Decrypting backup file with age private key..."
age -d -i "${BACKUP_PRIVATE_KEY_PATH:-/root/.age/key.txt}" "$BACKUP_FILE" | gunzip > "$TMP_SQL"

echo "[$(date)] Restoring to database ${POSTGRES_DB}..."
docker exec -i pooja_postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" < "$TMP_SQL"

rm -f "$TMP_SQL"
echo "[$(date)] Database restoration completed successfully."
