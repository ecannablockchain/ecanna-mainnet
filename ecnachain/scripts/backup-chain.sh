#!/usr/bin/env bash
# Backs up full node chaindata (LevelDB under geth/chaindata).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:-$ROOT/data/validator1}"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUT="${BACKUP_DIR:-$ROOT/backups}/ecna-chaindata-$STAMP.tar.gz"
mkdir -p "$(dirname "$OUT")"
if [[ ! -d "$SRC/geth" ]]; then
  echo "No geth datadir at $SRC — start the node once first."
  exit 1
fi
tar -czf "$OUT" -C "$SRC" geth
echo "Wrote $OUT"
