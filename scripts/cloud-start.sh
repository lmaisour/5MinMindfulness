#!/usr/bin/env bash
# Cloud Agent start — Expo web dev server for 5MinMindfulness.
# Idempotent: if Metro is already answering, leave it running.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/mobile"

if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8081/status; then
  exit 0
fi

export BROWSER=none
export EXPO_NO_TELEMETRY=1
exec npx expo start --web --host lan --port 8081
