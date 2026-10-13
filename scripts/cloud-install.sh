#!/usr/bin/env bash
# Cloud Agent install — idempotent dependency bootstrap for 5MinMindfulness.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# The setup docs call `supabase` directly. Install the Linux CLI when it is missing.
install_supabase_cli() {
  if command -v supabase >/dev/null 2>&1; then
    return 0
  fi
  local version="2.120.0"
  local tmp
  tmp="$(mktemp -d)"
  curl -fsSL -o "$tmp/supabase.tar.gz" \
    "https://github.com/supabase/cli/releases/download/v${version}/supabase_linux_amd64.tar.gz"
  tar -xzf "$tmp/supabase.tar.gz" -C "$tmp" supabase
  if [[ -w /usr/local/bin ]]; then
    install -m 755 "$tmp/supabase" /usr/local/bin/supabase
  elif sudo -n true 2>/dev/null; then
    sudo install -m 755 "$tmp/supabase" /usr/local/bin/supabase
  else
    mkdir -p "$HOME/.local/bin"
    install -m 755 "$tmp/supabase" "$HOME/.local/bin/supabase"
  fi
  rm -rf "$tmp"
}

install_supabase_cli

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
