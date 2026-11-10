#!/usr/bin/env bash
# Rebuilds the static Next.js frontend, verifies every referenced asset and
# self-hosted font is present in out/, and atomically swaps backend/public/client.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
FRONTEND_DIR="${REPO_ROOT}/frontend"
OUT_DIR="${FRONTEND_DIR}/out"
TARGET_DIR="${REPO_ROOT}/backend/public/client"
PARENT_DIR="$(dirname "$TARGET_DIR")"

cd "$FRONTEND_DIR"

echo "1/4 Installing clean frontend dependencies (npm ci)..."
npm ci

echo "2/4 Building static Next.js export..."
rm -rf .next out
unset BUILD_STANDALONE || true
export NEXT_PUBLIC_BOOKINGS_ENABLED="${NEXT_PUBLIC_BOOKINGS_ENABLED:-false}"
export NEXT_TELEMETRY_DISABLED=1
npm run build

echo "3/4 Verifying static output integrity (pages, /_next/static assets, self-hosted fonts)..."
node - "out" <<'EOF'
const fs = require('fs');
const path = require('path');

const outDir = path.resolve(process.argv[2]);
if (!fs.existsSync(outDir)) {
  console.error(`ERROR: Output directory missing: ${outDir}`);
  process.exit(1);
}

const requiredPages = [
  'index.html',
  'login/index.html',
  'account/index.html',
  'admin/index.html',
];
for (const rel of requiredPages) {
  const full = path.join(outDir, rel);
  if (!fs.existsSync(full) || fs.statSync(full).size === 0) {
    console.error(`ERROR: Required page missing or empty: ${rel}`);
    process.exit(1);
  }
}

function walkHtml(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(p, acc);
    else if (entry.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

const htmlFiles = walkHtml(outDir);
const assetRefRegex = /\/_next\/static\/[^\s"'<>()\\]+/g;
const checkedAssets = new Set();
const missingAssets = [];

for (const htmlPath of htmlFiles) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const matches = html.match(assetRefRegex) || [];
  for (const rawRef of matches) {
    const cleanRef = rawRef.split(/[?#]/)[0];
    if (checkedAssets.has(cleanRef)) continue;
    checkedAssets.add(cleanRef);
    let decodedRef = cleanRef;
    try {
      decodedRef = decodeURIComponent(cleanRef);
    } catch {
      decodedRef = cleanRef;
    }
    const assetDiskPath = path.join(outDir, decodedRef.replace(/^\/+/, ''));
    if (!fs.existsSync(assetDiskPath)) {
      missingAssets.push({ ref: cleanRef, page: path.relative(outDir, htmlPath) });
    }
  }
}

if (checkedAssets.size === 0) {
  console.error('ERROR: No /_next/static/ references found in built HTML.');
  process.exit(1);
}
if (missingAssets.length > 0) {
  console.error('ERROR: Broken /_next/static references detected:');
  for (const m of missingAssets.slice(0, 20)) {
    console.error(`  - ${m.ref} (referenced by ${m.page})`);
  }
  process.exit(1);
}

const mediaDir = path.join(outDir, '_next', 'static', 'media');
const fontFiles = fs.existsSync(mediaDir)
  ? fs.readdirSync(mediaDir).filter((f) => f.endsWith('.woff2'))
  : [];

if (fontFiles.length === 0) {
  console.error('ERROR: No self-hosted .woff2 fonts found in _next/static/media (offline/mocked font build rejected).');
  process.exit(1);
}

let emptyFontCount = 0;
for (const f of fontFiles) {
  const st = fs.statSync(path.join(mediaDir, f));
  if (st.size < 1024) emptyFontCount++;
}
if (emptyFontCount > 0) {
  console.error(`ERROR: ${emptyFontCount} font file(s) are unexpectedly small (<1 KB).`);
  process.exit(1);
}

console.log(`Verified ${htmlFiles.length} HTML files, ${checkedAssets.size} static asset references, and ${fontFiles.length} .woff2 font files.`);
EOF

echo "4/4 Atomically syncing ${OUT_DIR} -> ${TARGET_DIR}..."
mkdir -p "$PARENT_DIR"
STAGING_DIR="${PARENT_DIR}/.client.staging.$$"
OLD_DIR="${PARENT_DIR}/.client.old.$$"

cleanup() {
  rm -rf "$STAGING_DIR"
}
trap cleanup EXIT

rm -rf "$STAGING_DIR" "$OLD_DIR"
mkdir -p "$STAGING_DIR"
cp -R "${OUT_DIR}/." "${STAGING_DIR}/"

if [[ -d "$TARGET_DIR" ]]; then
  mv "$TARGET_DIR" "$OLD_DIR"
fi
mv "$STAGING_DIR" "$TARGET_DIR"
rm -rf "$OLD_DIR"
trap - EXIT

echo "Synced clean client build to ${TARGET_DIR}."
