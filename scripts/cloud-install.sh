#!/usr/bin/env bash
# Cloud Agent install — idempotent dependency bootstrap for 5MinMindfulness.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/mobile"

# Materialize client env from Cloud Agent secrets when present.
if [[ -n "${EXPO_PUBLIC_SUPABASE_URL:-}" && -n "${EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-}" ]]; then
  cat > .env <<EOF
EXPO_PUBLIC_SUPABASE_URL=${EXPO_PUBLIC_SUPABASE_URL}
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY}
EOF
elif [[ ! -f .env && -f .env.example ]]; then
  cp .env.example .env
fi

if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi
