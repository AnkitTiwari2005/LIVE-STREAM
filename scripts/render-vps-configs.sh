#!/usr/bin/env bash
# Renders both livekit/livekit.yaml and nginx/conf.d/app.conf from their
# checked-in templates after validating DOMAIN, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.
# Usage: scripts/render-vps-configs.sh [.env.production]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${1:-}"
NGINX_TEMPLATE="${NGINX_TEMPLATE:-${REPO_ROOT}/nginx/conf.d/app.conf.template}"
NGINX_OUTPUT="${NGINX_OUTPUT:-${REPO_ROOT}/nginx/conf.d/app.conf}"

# 1. Validate inputs and render livekit/livekit.yaml via render-livekit-config.sh
if [[ -n "$ENV_FILE" ]]; then
  bash "${SCRIPT_DIR}/render-livekit-config.sh" "$ENV_FILE"
else
  bash "${SCRIPT_DIR}/render-livekit-config.sh"
fi

# 2. Extract validated DOMAIN for nginx/conf.d/app.conf
DOMAIN_VAL="${DOMAIN:-}"
if [[ -n "$ENV_FILE" && -f "$ENV_FILE" ]]; then
  while IFS= read -r raw_line || [[ -n "$raw_line" ]]; do
    line="${raw_line%$'\r'}"
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    line="${line#export }"
    if [[ "$line" =~ ^[[:space:]]*DOMAIN=(.*)$ ]]; then
      v="${BASH_REMATCH[1]}"
      v="${v%$'\r'}"
      if [[ "$v" == \"*\" && "$v" == *\" && ${#v} -ge 2 ]]; then
        v="${v:1:${#v}-2}"
      elif [[ "$v" == \'*\' && "$v" == *\' && ${#v} -ge 2 ]]; then
        v="${v:1:${#v}-2}"
      fi
      DOMAIN_VAL="$v"
    fi
  done < "$ENV_FILE"
fi

[[ -f "$NGINX_TEMPLATE" ]] || { echo "ERROR: Nginx template not found: $NGINX_TEMPLATE" >&2; exit 1; }
[[ -n "$DOMAIN_VAL" ]] || { echo "ERROR: DOMAIN must be set." >&2; exit 1; }

tmp_nginx="$(mktemp "${NGINX_OUTPUT}.tmp.XXXXXX")"
trap 'rm -f "$tmp_nginx"' EXIT

while IFS= read -r tpl_line || [[ -n "$tpl_line" ]]; do
  tpl_line="${tpl_line%$'\r'}"
  tpl_line="${tpl_line//__DOMAIN__/$DOMAIN_VAL}"
  printf '%s\n' "$tpl_line" >> "$tmp_nginx"
done < "$NGINX_TEMPLATE"

chmod 0644 "$tmp_nginx"
mv -f "$tmp_nginx" "$NGINX_OUTPUT"
trap - EXIT

echo "Rendered ${NGINX_OUTPUT} for domain ${DOMAIN_VAL}."
