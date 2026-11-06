#!/usr/bin/env bash
# /opt/pooja/scripts/renew-hook.sh
set -euo pipefail

if [ -f /opt/pooja/.env.production ]; then
  source /opt/pooja/.env.production
fi

echo "[$(date)] Reloading Nginx certificate..."
docker exec pooja_nginx nginx -s reload

echo "[$(date)] Checking for active live streams before restarting LiveKit..."
LIVE=$(docker exec pooja_api wget -qO- --header="X-Internal-Key: ${INTERNAL_KEY}" http://localhost:4000/api/v1/internal/live-count || echo 1)

if [ "$LIVE" = "0" ]; then
  echo "[$(date)] No streams currently live. Restarting LiveKit to apply certificate..."
  docker restart pooja_livekit
  rm -f /opt/pooja/pending-livekit-restart
else
  echo "[$(date)] Stream is active ($LIVE live). Scheduling deferred restart..."
  touch /opt/pooja/pending-livekit-restart
fi
