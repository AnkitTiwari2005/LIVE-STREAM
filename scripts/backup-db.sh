#!/usr/bin/env bash
set -eo pipefail

# Trap exit code properly before any cleanup command runs
trap 'EXIT_CODE=$?; rm -f /tmp/db_dump_*.sql.gz /tmp/storage_dump_*.tar.gz; if [ $EXIT_CODE -ne 0 ]; then curl -s -m 10 -X POST "${ALERT_WEBHOOK_URL}" -d "Backup Failure: exit code ${EXIT_CODE} on host $(hostname)"; fi' EXIT

# Load production environment variables
if [ -f /opt/pooja/.env.production ]; then
  source /opt/pooja/.env.production
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/opt/pooja/backups"
SQL_GZ="/tmp/db_dump_${TIMESTAMP}.sql.gz"
ENCRYPTED_FILE="${BACKUP_DIR}/db_${TIMESTAMP}.sql.gz.age"
STORAGE_TAR_GZ="/tmp/storage_dump_${TIMESTAMP}.tar.gz"
STORAGE_ENCRYPTED_FILE="${BACKUP_DIR}/storage_${TIMESTAMP}.tar.gz.age"
RETENTION_DAYS=7

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting PostgreSQL database backup dump..."
docker exec pooja_postgres pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" | gzip -9 > "${SQL_GZ}"

echo "[$(date)] Encrypting database archive using age..."
age -r "${BACKUP_PUBLIC_KEY}" -o "${ENCRYPTED_FILE}" "${SQL_GZ}"

echo "[$(date)] Uploading encrypted database archive to Cloudflare R2 bucket..."
rclone copy "${ENCRYPTED_FILE}" r2:pooja-backups/daily/

echo "[$(date)] Starting storage and KYC documents backup archive..."
docker exec pooja_api tar -czf - -C /app public/uploads storage/kyc 2>/dev/null > "${STORAGE_TAR_GZ}" || true
if [ -s "${STORAGE_TAR_GZ}" ]; then
  echo "[$(date)] Encrypting storage archive using age..."
  age -r "${BACKUP_PUBLIC_KEY}" -o "${STORAGE_ENCRYPTED_FILE}" "${STORAGE_TAR_GZ}"
  echo "[$(date)] Uploading encrypted storage archive to Cloudflare R2 bucket..."
  rclone copy "${STORAGE_ENCRYPTED_FILE}" r2:pooja-backups/daily/
fi

echo "[$(date)] Pruning local backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f -name "*.age" -mtime +${RETENTION_DAYS} -delete

# Ping healthcheck heartbeat
if [ -n "${HEALTHCHECK_BACKUP_URL:-}" ]; then
  curl -s -m 10 "${HEALTHCHECK_BACKUP_URL}" > /dev/null
fi

echo "[$(date)] Database backup completed successfully: ${ENCRYPTED_FILE}"
