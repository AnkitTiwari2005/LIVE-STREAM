#!/usr/bin/env bash
set -eo pipefail
umask 077

# Restores an age-encrypted dump INTO THE LIVE DATABASE. Dumps made by scripts/backup-db.sh include
# --clean --if-exists, so existing tables are dropped first. Requires explicit confirmation.
if [ "$#" -ne 1 ]; then
  echo "Usage: CONFIRM_RESTORE=yes $0 /path/to/backup.sql.gz.age"
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

if [ "${CONFIRM_RESTORE:-}" != "yes" ]; then
  echo "Refusing to overwrite database '${POSTGRES_DB:-unknown}': re-run with CONFIRM_RESTORE=yes to proceed." >&2
  exit 1
fi

TMP_SQL="$(mktemp /tmp/restore_dump.XXXXXX.sql)"
trap 'rm -f "$TMP_SQL"' EXIT

echo "[$(date)] Decrypting backup file with age private key..."
age -d -i "${BACKUP_PRIVATE_KEY_PATH:-/root/.age/key.txt}" "$BACKUP_FILE" | gunzip > "$TMP_SQL"

echo "[$(date)] Restoring to database ${POSTGRES_DB}..."
docker exec -i pooja_postgres psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" < "$TMP_SQL"

echo "[$(date)] Database restoration completed successfully."
