#!/usr/bin/env bash
# Renders livekit/livekit.yaml from livekit/livekit.yaml.template atomically
# after validating DOMAIN, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.
# Usage: scripts/render-livekit-config.sh [.env.production]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TEMPLATE_FILE="${TEMPLATE_FILE:-${REPO_ROOT}/livekit/livekit.yaml.template}"
OUTPUT_FILE="${OUTPUT_FILE:-${REPO_ROOT}/livekit/livekit.yaml}"

ENV_FILE="${1:-}"

fail() {
  echo "ERROR: $1" >&2
  exit 1
}

strip_quotes() {
  local v="$1"
  v="${v%$'\r'}"
  if [[ "$v" == \"*\" && "$v" == *\" && ${#v} -ge 2 ]]; then
    v="${v:1:${#v}-2}"
  elif [[ "$v" == \'*\' && "$v" == *\' && ${#v} -ge 2 ]]; then
    v="${v:1:${#v}-2}"
  fi
  printf '%s' "$v"
}

if [[ -n "$ENV_FILE" ]]; then
  [[ -f "$ENV_FILE" ]] || fail "Environment file not found: $ENV_FILE"
  while IFS= read -r raw_line || [[ -n "$raw_line" ]]; do
    line="${raw_line%$'\r'}"
    # Skip blank lines and comments
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    # Strip optional leading 'export '
    line="${line#export }"
    if [[ "$line" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      val="$(strip_quotes "${BASH_REMATCH[2]}")"
      case "$key" in
        DOMAIN|LIVEKIT_API_KEY|LIVEKIT_API_SECRET)
          printf -v "$key" '%s' "$val"
          ;;
      esac
    fi
  done < "$ENV_FILE"
fi

DOMAIN_VAL="${DOMAIN:-}"
KEY_VAL="${LIVEKIT_API_KEY:-}"
SECRET_VAL="${LIVEKIT_API_SECRET:-}"

[[ -f "$TEMPLATE_FILE" ]] || fail "Template not found: $TEMPLATE_FILE"

# 1. Validate DOMAIN
[[ -n "$DOMAIN_VAL" ]] || fail "DOMAIN must be set and non-empty."
domain_lower="$(printf '%s' "$DOMAIN_VAL" | tr '[:upper:]' '[:lower:]')"

if [[ "$domain_lower" == *"://"* || "$domain_lower" == *"/"* || "$domain_lower" == *":"* ]]; then
  fail "DOMAIN must be a bare hostname without scheme, port, or path (got: $DOMAIN_VAL)."
fi
if [[ "$DOMAIN_VAL" =~ [[:space:]] ]]; then
  fail "DOMAIN must not contain whitespace."
fi
if [[ "$domain_lower" == "localhost" || "$domain_lower" == *"platform-domain.com"* || "$domain_lower" == *"example.com"* || "$domain_lower" == *"replace_with"* || "$domain_lower" == *"replace-with"* || "$domain_lower" == your_* || "$domain_lower" == *"change_me"* || "$domain_lower" == *".invalid" ]]; then
  fail "DOMAIN cannot use a placeholder or local domain (got: $DOMAIN_VAL)."
fi
if [[ ! "$DOMAIN_VAL" =~ ^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$ ]]; then
  fail "DOMAIN is not a valid hostname (got: $DOMAIN_VAL)."
fi

# 2. Validate LIVEKIT_API_KEY
[[ -n "$KEY_VAL" ]] || fail "LIVEKIT_API_KEY must be set and non-empty."
key_lower="$(printf '%s' "$KEY_VAL" | tr '[:upper:]' '[:lower:]')"
case "$key_lower" in
  pooja|devkey|change_me|changeme|api2rcswowptwzy)
    fail "LIVEKIT_API_KEY cannot use a known/default key ($KEY_VAL)."
    ;;
esac
if [[ "$key_lower" == replace_* || "$key_lower" == replace-* || "$key_lower" == your_* || "$key_lower" == *"insecure"* ]]; then
  fail "LIVEKIT_API_KEY cannot use a placeholder value."
fi
if [[ "$KEY_VAL" =~ [[:space:]:\#\'\"/] ]]; then
  fail "LIVEKIT_API_KEY contains disallowed characters (whitespace, ':', '#', quotes, or '/')."
fi

# 3. Validate LIVEKIT_API_SECRET
[[ -n "$SECRET_VAL" ]] || fail "LIVEKIT_API_SECRET must be set and non-empty."
secret_lower="$(printf '%s' "$SECRET_VAL" | tr '[:upper:]' '[:lower:]')"
if (( ${#SECRET_VAL} < 32 )); then
  fail "LIVEKIT_API_SECRET must be at least 32 characters (got ${#SECRET_VAL})."
fi
case "$secret_lower" in
  secret|secretkey|change_me|changeme|rxe7jpbwbnoolgrddpllyntvbq9xeoyeqtikqxtp5e7b)
    fail "LIVEKIT_API_SECRET cannot use a known/default secret."
    ;;
esac
if [[ "$secret_lower" == replace_* || "$secret_lower" == replace-* || "$secret_lower" == your_* || "$secret_lower" == *"insecure"* ]]; then
  fail "LIVEKIT_API_SECRET cannot use a placeholder value."
fi
if [[ "$SECRET_VAL" =~ [[:space:]:\#\'\"] ]]; then
  fail "LIVEKIT_API_SECRET must not contain ':', '#', quotes, or whitespace (would corrupt LIVEKIT_KEYS)."
fi

# 4. Atomic write via staging temp file
mkdir -p "$(dirname "$OUTPUT_FILE")"
tmp_file="$(mktemp "${OUTPUT_FILE}.tmp.XXXXXX")"
cleanup() {
  rm -f "$tmp_file"
}
trap cleanup EXIT

while IFS= read -r tpl_line || [[ -n "$tpl_line" ]]; do
  tpl_line="${tpl_line%$'\r'}"
  tpl_line="${tpl_line//__DOMAIN__/$DOMAIN_VAL}"
  tpl_line="${tpl_line//__LIVEKIT_API_KEY__/$KEY_VAL}"
  printf '%s\n' "$tpl_line" >> "$tmp_file"
done < "$TEMPLATE_FILE"

chmod 0644 "$tmp_file"
mv -f "$tmp_file" "$OUTPUT_FILE"
trap - EXIT

echo "Rendered ${OUTPUT_FILE} for domain ${DOMAIN_VAL} (webhook key verified)."
