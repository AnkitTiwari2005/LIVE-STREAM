#!/usr/bin/env bash
set -euo pipefail
umask 077

# Free-tier-friendly encrypted backup script for Neon / PostgreSQL.
# Uses DIRECT_URL (preferred, unpooled) or DATABASE_URL — no Docker container required.
# Recommended: run nightly at ~03:00 IST from a trusted private runner or cron and upload to Cloudflare R2 / Google Drive.

DB_URL="${DIRECT_URL:-${DATABASE_URL:-}}"
if [ -z "${DB_URL}" ]; then
  echo "Error: DIRECT_URL or DATABASE_URL must be set." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "Error: pg_dump is not installed on this machine." >&2
  exit 1
fi

ALLOW_PLAINTEXT="false"
if [ "${1:-}" = "--allow-plaintext" ]; then
  ALLOW_PLAINTEXT="true"
fi

BACKUP_DIR="${BACKUP_DIR:-./backups/neon}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%SZ")
mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

TMP_GZ=$(mktemp "${BACKUP_DIR}/.tmp_db_${TIMESTAMP}_XXXXXX.sql.gz")
cleanup() {
  rm -f "${TMP_GZ}"
}
trap cleanup EXIT

# Strip channel_binding param if older local libpq clients reject it.
CLEAN_URL=$(printf '%s' "${DB_URL}" | sed -E 's/([?&])channel_binding=[^&]*&?/\1/g; s/[?&]$//')

echo "[$(date -u)] Dumping Neon database (compressed)..."
pg_dump "${CLEAN_URL}" --no-owner --no-privileges --clean --if-exists | gzip -9 > "${TMP_GZ}"

if [ -n "${BACKUP_PUBLIC_KEY:-}" ]; then
  if ! command -v age >/dev/null 2>&1; then
    echo "Error: BACKUP_PUBLIC_KEY is set but 'age' is not installed." >&2
    exit 1
  fi
  OUT_FILE="${BACKUP_DIR}/neon_${TIMESTAMP}.sql.gz.age"
  age -r "${BACKUP_PUBLIC_KEY}" -o "${OUT_FILE}" "${TMP_GZ}"
elif [ -n "${BACKUP_PASSPHRASE:-}" ]; then
  OUT_FILE="${BACKUP_DIR}/neon_${TIMESTAMP}.sql.gz.enc"
  openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000 -pass env:BACKUP_PASSPHRASE -in "${TMP_GZ}" -out "${OUT_FILE}"
elif [ "${ALLOW_PLAINTEXT}" = "true" ]; then
  OUT_FILE="${BACKUP_DIR}/neon_${TIMESTAMP}.sql.gz"
  mv "${TMP_GZ}" "${OUT_FILE}"
else
  echo "Error: Set BACKUP_PUBLIC_KEY (age) or BACKUP_PASSPHRASE (AES-256), or pass --allow-plaintext." >&2
  exit 1
fi

if [ -n "${RCLONE_TARGET:-}" ]; then
  if ! command -v rclone >/dev/null 2>&1; then
    echo "Error: RCLONE_TARGET is set but 'rclone' is not installed." >&2
    exit 1
  fi
  echo "[$(date -u)] Uploading $(basename "${OUT_FILE}") to ${RCLONE_TARGET}..."
  rclone copy "${OUT_FILE}" "${RCLONE_TARGET}"
fi

echo "[$(date -u)] Pruning local backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -maxdepth 1 -type f \( -name "neon_*.sql.gz.age" -o -name "neon_*.sql.gz.enc" -o -name "neon_*.sql.gz" \) -mtime +"${RETENTION_DAYS}" -delete

if [ -n "${HEALTHCHECK_BACKUP_URL:-}" ]; then
  curl -fsS -m 10 "${HEALTHCHECK_BACKUP_URL}" >/dev/null || true
fi

echo "[$(date -u)] Backup complete: ${OUT_FILE}"
