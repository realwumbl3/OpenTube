#!/usr/bin/env bash
# Install Node.js/npm on this machine when missing (Linux/apt in Docker, etc.).
set -e

log() {
  printf '[bootstrap %s] %s\n' "$(date -u +%H:%M:%S)" "$*"
}

if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
  log "Node $(node -v), npm $(npm -v) — already installed, skipping."
  exit 0
fi

log "Node.js not found; starting install (CPU may stay low while apt/npm use the network)."

if command -v apt-get >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  log "Phase 1/2: apt-get update — refreshing package lists (downloading index files)..."
  apt-get update
  log "Phase 2/2: apt-get install nodejs npm — downloading packages (this can take a few minutes)..."
  apt-get install -y nodejs npm
elif command -v apk >/dev/null 2>&1; then
  log "apk add nodejs npm — downloading packages..."
  apk add --no-cache nodejs npm
elif command -v dnf >/dev/null 2>&1; then
  log "dnf install nodejs npm — downloading packages..."
  dnf install -y nodejs npm
elif command -v brew >/dev/null 2>&1; then
  log "brew install node — downloading packages..."
  brew install node
else
  log "ERROR: No supported package manager (apt, apk, dnf, brew). Install Node.js manually." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  log "ERROR: Install finished but 'node' is still not on PATH." >&2
  exit 1
fi

log "Node install done: Node $(node -v), npm $(npm -v)"
