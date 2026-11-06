#!/usr/bin/env bash
# /opt/pooja/scripts/refresh-cloudflare.sh
set -euo pipefail

NGINX_CONF_DIR="/opt/pooja/nginx/conf.d"
REALIP_CONF="${NGINX_CONF_DIR}/cloudflare-realip.conf"
ALLOW_CONF="${NGINX_CONF_DIR}/cloudflare-allow.conf"
TMP_REALIP=$(mktemp)
TMP_ALLOW=$(mktemp)

echo "# Auto-generated Cloudflare Real-IP rules" > "$TMP_REALIP"
echo "# Auto-generated Cloudflare Allow rules" > "$TMP_ALLOW"

# Fetch IPv4
IPV4_LIST=$(curl -s -m 15 https://www.cloudflare.com/ips-v4)
for ip in $IPV4_LIST; do
  echo "set_real_ip_from $ip;" >> "$TMP_REALIP"
  echo "allow $ip;" >> "$TMP_ALLOW"
done

# Fetch IPv6
IPV6_LIST=$(curl -s -m 15 https://www.cloudflare.com/ips-v6)
for ip in $IPV6_LIST; do
  echo "set_real_ip_from $ip;" >> "$TMP_REALIP"
  echo "allow $ip;" >> "$TMP_ALLOW"
done

echo "" >> "$TMP_REALIP"
echo "real_ip_header CF-Connecting-IP;" >> "$TMP_REALIP"

echo "" >> "$TMP_ALLOW"
echo "allow 127.0.0.1;" >> "$TMP_ALLOW"
echo "allow 10.0.0.0/8;" >> "$TMP_ALLOW"
echo "allow 172.16.0.0/12;" >> "$TMP_ALLOW"
echo "allow 192.168.0.0/16;" >> "$TMP_ALLOW"
echo "deny all;" >> "$TMP_ALLOW"

# Validate and atomic move
if [ -s "$TMP_REALIP" ] && [ -s "$TMP_ALLOW" ]; then
  mv "$TMP_REALIP" "$REALIP_CONF"
  mv "$TMP_ALLOW" "$ALLOW_CONF"
  echo "[$(date)] Cloudflare IP lists successfully refreshed."
  docker exec pooja_nginx nginx -s reload || true
else
  echo "[$(date)] Failed to fetch Cloudflare IP lists."
  rm -f "$TMP_REALIP" "$TMP_ALLOW"
  exit 1
fi
