#!/usr/bin/env bash
# Restore chaindata from backup tarball. Stop Geth first.
set -euo pipefail
ARCHIVE="${1:?usage: restore-chain.sh <backup.tar.gz>}"
DEST="${2:-$(cd "$(dirname "$0")/.." && pwd)/data/validator1}"
if [[ -d "$DEST/geth/chaindata" ]]; then
  echo "Refusing to overwrite existing $DEST/geth — move it aside or use empty DEST."
  exit 1
fi
mkdir -p "$DEST"
tar -xzf "$ARCHIVE" -C "$DEST"
echo "Restored into $DEST — verify genesis matches before starting geth."
