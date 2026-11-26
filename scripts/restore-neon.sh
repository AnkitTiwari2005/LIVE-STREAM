#!/usr/bin/env bash
set -euo pipefail
umask 077

# Safe restore / drill helper for backups created by scripts/backup-neon.sh.
# Defaults to RESTORE_TARGET_URL so production DATABASE_URL is never overwritten accidentally.

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <backup-file(.age|.enc|.sql.gz)> [--confirm-production-overwrite]" >&2
  exit 1
fi

BACKUP_FILE="$1"
CONFIRM_PROD="${2:-}"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: Backup file '${BACKUP_FILE}' not found." >&2
  exit 1
fi

TARGET_URL="${RESTORE_TARGET_URL:-}"
if [ -z "${TARGET_URL}" ]; then
  if [ "${CONFIRM_PROD}" = "--confirm-production-overwrite" ] && [ -n "${DIRECT_URL:-${DATABASE_URL:-}}" ]; then
    TARGET_URL="${DIRECT_URL:-${DATABASE_URL:-}}"
  else
    echo "Error: Set RESTORE_TARGET_URL to a Neon test/child branch connection string first." >&2
    echo "To overwrite production intentionally, pass --confirm-production-overwrite with DATABASE_URL set." >&2
    exit 1
  fi
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "Error: psql is not installed on this machine." >&2
  exit 1
fi

CLEAN_URL=$(printf '%s' "${TARGET_URL}" | sed -E 's/([?&])channel_binding=[^&]*&?/\1/g; s/[?&]$//')
TMP_SQL=$(mktemp ".tmp_restore_XXXXXX.sql")
cleanup() {
  rm -f "${TMP_SQL}"
}
trap cleanup EXIT

case "${BACKUP_FILE}" in
  *.age)
    age -d -i "${BACKUP_PRIVATE_KEY_PATH:-${HOME}/.age/key.txt}" "${BACKUP_FILE}" | gunzip > "${TMP_SQL}"
    ;;
  *.enc)
    if [ -z "${BACKUP_PASSPHRASE:-}" ]; then
      echo "Error: BACKUP_PASSPHRASE must be set to decrypt .enc backup." >&2
      exit 1
    fi
    openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_PASSPHRASE -in "${BACKUP_FILE}" | gunzip > "${TMP_SQL}"
    ;;
  *.gz)
    gunzip -c "${BACKUP_FILE}" > "${TMP_SQL}"
    ;;
  *)
    cp "${BACKUP_FILE}" "${TMP_SQL}"
    ;;
esac

echo "[$(date -u)] Restoring $(basename "${BACKUP_FILE}") into target branch..."
psql "${CLEAN_URL}" -v ON_ERROR_STOP=1 < "${TMP_SQL}"
echo "[$(date -u)] Restore drill completed cleanly."
