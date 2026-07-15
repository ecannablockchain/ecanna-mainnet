#!/usr/bin/env bash
# Print bootnode enode URL for ecna-validator-1 (run after: docker compose up -d).
set -euo pipefail
CONTAINER="${1:-ecna-validator-1}"
IPC="${2:-/data/geth.ipc}"
docker exec "$CONTAINER" geth attach "$IPC" --exec 'admin.nodeInfo.enode'
