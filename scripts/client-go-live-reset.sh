#!/bin/bash
# Client go-live: new treasury + validator → fresh genesis, wipe Geth chaindata, clear SQL index.
#
# Prerequisites (on server):
#   - New addresses from client (validator = Clique signer, treasury = genesis premine)
#   - docker/miner-private.hex = 64-char hex private key for VALIDATOR (no 0x prefix)
#   - Treasury private key handed to client securely (you cannot spend premine without it)
#
# Usage:
#   export ECNA_VALIDATORS=0xYourValidatorAddress
#   export ECNA_TREASURY=0xYourTreasuryAddress
#   # optional: export ECNA_CHAIN_ID=4111   (keep 4111 or use new id for a distinct chain)
#   bash /opt/ecnascan/scripts/client-go-live-reset.sh
#
# Run as root on production server. Downtime ~2–5 minutes.
set -eu

ROOT="${ECNA_ROOT:-/opt/ecnascan}"
CHAIN_DIR="$ROOT/ecnachain"
SERVER_DIR="$ROOT/server"

VALIDATOR="${ECNA_VALIDATORS:-}"
TREASURY="${ECNA_TREASURY:-}"
CHAIN_ID="${ECNA_CHAIN_ID:-4111}"

if [[ -z "$VALIDATOR" || -z "$TREASURY" ]]; then
  echo "ERROR: Set ECNA_VALIDATORS and ECNA_TREASURY before running."
  echo "  export ECNA_VALIDATORS=0x..."
  echo "  export ECNA_TREASURY=0x..."
  exit 1
fi

if [[ ! -f "$CHAIN_DIR/docker/miner-private.hex" ]]; then
  echo "ERROR: Missing $CHAIN_DIR/docker/miner-private.hex (validator private key)."
  exit 1
fi

echo "=== [1/8] Update env files ==="
grep -q '^ECNA_PRIMARY_ADDRESS=' "$CHAIN_DIR/.env" 2>/dev/null && \
  sed -i "s|^ECNA_PRIMARY_ADDRESS=.*|ECNA_PRIMARY_ADDRESS=$VALIDATOR|" "$CHAIN_DIR/.env" || \
  echo "ECNA_PRIMARY_ADDRESS=$VALIDATOR" >> "$CHAIN_DIR/.env"

grep -q '^ECNA_NATIVE_MINT_ADDRESS=' "$CHAIN_DIR/.env" 2>/dev/null && \
  sed -i "s|^ECNA_NATIVE_MINT_ADDRESS=.*|ECNA_NATIVE_MINT_ADDRESS=$TREASURY|" "$CHAIN_DIR/.env" || \
  echo "ECNA_NATIVE_MINT_ADDRESS=$TREASURY" >> "$CHAIN_DIR/.env"

grep -q '^ECNA_PRIMARY_ADDRESS=' "$SERVER_DIR/.env" 2>/dev/null && \
  sed -i "s|^ECNA_PRIMARY_ADDRESS=.*|ECNA_PRIMARY_ADDRESS=$VALIDATOR|" "$SERVER_DIR/.env" || \
  echo "ECNA_PRIMARY_ADDRESS=$VALIDATOR" >> "$SERVER_DIR/.env"

grep -q '^ECNA_NATIVE_MINT_ADDRESS=' "$SERVER_DIR/.env" 2>/dev/null && \
  sed -i "s|^ECNA_NATIVE_MINT_ADDRESS=.*|ECNA_NATIVE_MINT_ADDRESS=$TREASURY|" "$SERVER_DIR/.env" || \
  echo "ECNA_NATIVE_MINT_ADDRESS=$TREASURY" >> "$SERVER_DIR/.env"

if [[ -f "$ROOT/apps/dashboard/.env" ]]; then
  grep -q '^VITE_TREASURY_ADDRESS=' "$ROOT/apps/dashboard/.env" 2>/dev/null && \
    sed -i "s|^VITE_TREASURY_ADDRESS=.*|VITE_TREASURY_ADDRESS=$TREASURY|" "$ROOT/apps/dashboard/.env" || \
    echo "VITE_TREASURY_ADDRESS=$TREASURY" >> "$ROOT/apps/dashboard/.env"
fi

echo "=== [2/8] Build genesis.json (1 Crore ECNA premine → treasury) ==="
cd "$CHAIN_DIR"
export ECNA_VALIDATORS="$VALIDATOR"
export ECNA_TREASURY="$TREASURY"
export ECNA_CHAIN_ID="$CHAIN_ID"
node scripts/build-genesis.mjs

echo "=== [3/8] Stop API + indexer ==="
pm2 stop ecna-api ecna-indexer 2>/dev/null || pm2 stop all 2>/dev/null || true

echo "=== [4/8] Stop Geth + wipe chain data ==="
docker compose down
rm -rf "$CHAIN_DIR/data/validator1/geth" \
       "$CHAIN_DIR/data/validator1/.genesis.sha256" \
       "$CHAIN_DIR/data/validator1/keystore"

echo "=== [5/8] Start Geth (fresh chain from new genesis) ==="
docker compose up -d
echo "Waiting for RPC..."
for i in $(seq 1 40); do
  if curl -sf http://127.0.0.1:8545 -X POST -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | grep -q result; then
    echo "Geth OK"
    break
  fi
  sleep 2
done

echo "=== [6/8] Clear SQL explorer index (blocks, txs, verifications) ==="
cd "$SERVER_DIR"
npx tsx scripts/clear-all-indexed.ts

# Optional: wipe website test accounts (uncomment for full clean slate)
# npx tsx -e "import './src/load-env-deployment.js'; import { prisma } from './src/lib/prisma.js'; await prisma.siteUser.deleteMany(); await prisma.\$disconnect();"

echo "=== [7/8] Restart API + indexer ==="
cd "$ROOT"
pm2 restart all --update-env

echo "=== [8/8] Verify ==="
sleep 8
curl -sf http://127.0.0.1:4000/api/v1/health && echo ""
curl -sf http://127.0.0.1:4000/api/v1/config && echo ""
curl -sf -X POST http://127.0.0.1:8545 -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBalance\",\"params\":[\"$TREASURY\",\"latest\"],\"id\":1}" && echo ""

echo ""
echo "=== GO-LIVE RESET DONE ==="
echo "  Validator (signer): $VALIDATOR"
echo "  Treasury (1 Crore premine): $TREASURY"
echo "  Chain ID: $CHAIN_ID"
echo ""
echo "Hand client securely:"
echo "  - Treasury private key (to spend premine)"
echo "  - Validator key only if they operate the node"
echo "  - MetaMask: https://rpc.ecnascan.com | Chain ID $CHAIN_ID | Symbol ECNA"
echo ""
echo "Rebuild dashboard if VITE_TREASURY_ADDRESS changed:"
echo "  cd $ROOT/apps/dashboard && npm run build && cp -r dist/* /var/www/dashboard/"
