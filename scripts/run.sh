#!/usr/bin/env bash
# Ensure Node exists, dependencies are installed, then run dev / server (or any npm script).
set -e

log() {
  printf '[bootstrap %s] %s\n' "$(date -u +%H:%M:%S)" "$*"
}

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

log "Checking Node.js..."
bash "$ROOT/scripts/ensure-node.sh"

if [ ! -d node_modules ] || [ ! -x node_modules/.bin/vite ]; then
  log "Installing npm dependencies (network-heavy; progress below)..."
  npm install --loglevel=info
  log "npm dependencies installed."
else
  log "node_modules present — skipping npm install."
fi

CMD="${1:-dev}"
shift || true

log "Starting app: $CMD"

case "$CMD" in
  dev)
    exec npx concurrently "npm run server:exec" "vite"
    ;;
  server)
    exec node server/index.js
    ;;
  *)
    exec npm run "$CMD" -- "$@"
    ;;
esac
