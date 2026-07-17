#!/bin/sh
set -e
GENESIS="${GENESIS_PATH:-/genesis.json}"
DATA_DIR="${GETH_DATADIR:-/data}"
MINING_ENABLED="${ENABLE_MINING:-1}"
MINER_GASPRICE_WEI="${MINER_GASPRICE_WEI:-100000000}"
GENESIS_STAMP="$DATA_DIR/.genesis.sha256"

HTTP_ADDR="${HTTP_ADDR:-0.0.0.0}"
HTTP_PORT="${HTTP_PORT:-8545}"
WS_ADDR="${WS_ADDR:-0.0.0.0}"
WS_PORT="${WS_PORT:-8546}"
P2P_PORT="${P2P_PORT:-30303}"
# Keep API surface minimal. Public traffic must not hit unlocked accounts:
# bind docker RPC to 127.0.0.1 and put nginx behind scripts/rpc-public-guard.mjs
HTTP_API="${HTTP_API:-eth,net,web3,txpool}"
FULLNODE_HTTP_API="${FULLNODE_HTTP_API:-eth,net,web3,txpool}"
HTTP_CORS_DOMAIN="${HTTP_CORS_DOMAIN:-*}"
HTTP_VHOSTS="${HTTP_VHOSTS:-localhost,127.0.0.1}"
WS_ORIGINS="${WS_ORIGINS:-*}"
# Public IP for P2P advertisement (Docker --nat any often picks a wrong discport)
EXTERNAL_IP="${EXTERNAL_IP:-168.144.69.102}"
NAT_FLAG="--nat extip:${EXTERNAL_IP}"

# Pin P2P identity across chain wipes (enode stays stable for exchanges)
install_nodekey() {
  if [ -f /secrets/nodekey ]; then
    mkdir -p "$DATA_DIR/geth"
    cp /secrets/nodekey "$DATA_DIR/geth/nodekey"
    chmod 600 "$DATA_DIR/geth/nodekey"
    echo "[geth] installed pinned nodekey from /secrets/nodekey"
  fi
}

genesis_sha256() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$GENESIS" | awk '{print $1}'
  else
    openssl dgst -sha256 "$GENESIS" | awk '{print $2}'
  fi
}

if [ -d "$DATA_DIR/geth/chaindata" ] && [ -f "$GENESIS_STAMP" ]; then
  CURRENT_SHA="$(genesis_sha256)"
  STORED_SHA="$(tr -d '\r\n' < "$GENESIS_STAMP")"
  if [ "$CURRENT_SHA" != "$STORED_SHA" ]; then
    echo "[geth] genesis file changed — removing chain state under $DATA_DIR/geth (keystore kept)"
    rm -rf "$DATA_DIR/geth"
  fi
fi

if [ ! -d "$DATA_DIR/geth/chaindata" ]; then
  echo "[geth] initializing datadir from genesis..."
  geth init --datadir "$DATA_DIR" "$GENESIS"
  genesis_sha256 > "$GENESIS_STAMP"
  install_nodekey
elif [ ! -f "$GENESIS_STAMP" ]; then
  echo "[geth] no genesis stamp — re-init from $GENESIS (keystore kept)"
  rm -rf "$DATA_DIR/geth"
  geth init --datadir "$DATA_DIR" "$GENESIS"
  genesis_sha256 > "$GENESIS_STAMP"
  install_nodekey
else
  install_nodekey
fi

if [ "$MINING_ENABLED" = "1" ] && [ -f /secrets/miner-private.hex ]; then
  if [ ! -d "$DATA_DIR/keystore" ] || [ -z "$(ls -A "$DATA_DIR/keystore" 2>/dev/null)" ]; then
    echo "[geth] importing signer from /secrets/miner-private.hex..."
    HEX_TRIM="$(tr -d ' \r\n\t' < /secrets/miner-private.hex)"
    printf '%s\n' "$HEX_TRIM" > /tmp/miner-private.import.hex
    geth account import --datadir "$DATA_DIR" --password "${PASSWORD_FILE:-/secrets/password.txt}" /tmp/miner-private.import.hex
    rm -f /tmp/miner-private.import.hex
  fi
fi

if [ "$MINING_ENABLED" = "1" ]; then
  : "${MINER_ETHERBASE:?MINER_ETHERBASE required when ENABLE_MINING=1}"
  : "${UNLOCK_ACCOUNT:?UNLOCK_ACCOUNT required when ENABLE_MINING=1}"
  UNLOCK_FLAGS=""
  if [ "${ALLOW_INSECURE_UNLOCK:-1}" = "1" ]; then
    UNLOCK_FLAGS="--unlock ${UNLOCK_ACCOUNT} --password ${PASSWORD_FILE:-/secrets/password.txt} --allow-insecure-unlock"
  fi
  exec geth \
    --datadir "$DATA_DIR" \
    --networkid "${NETWORK_ID:-4111}" \
    --syncmode full \
    --gcmode archive \
    --http \
    --http.addr "$HTTP_ADDR" \
    --http.port "$HTTP_PORT" \
    --http.api "$HTTP_API" \
    --http.corsdomain "$HTTP_CORS_DOMAIN" \
    --http.vhosts "$HTTP_VHOSTS" \
    --ws \
    --ws.addr "$WS_ADDR" \
    --ws.port "$WS_PORT" \
    --ws.api eth,net,web3 \
    --ws.origins "$WS_ORIGINS" \
    --port "$P2P_PORT" \
    --discovery.port "$P2P_PORT" \
    $NAT_FLAG \
    ${BOOTNODES:+--bootnodes "$BOOTNODES"} \
    --mine \
    --miner.gasprice "${MINER_GASPRICE_WEI}" \
    --miner.etherbase "${MINER_ETHERBASE}" \
    $UNLOCK_FLAGS \
    "$@"
else
  echo "[geth] sync-only full node (ENABLE_MINING=0)"
  exec geth \
    --datadir "$DATA_DIR" \
    --networkid "${NETWORK_ID:-4111}" \
    --syncmode full \
    --gcmode archive \
    --http \
    --http.addr "$HTTP_ADDR" \
    --http.port "$HTTP_PORT" \
    --http.api "$FULLNODE_HTTP_API" \
    --http.corsdomain "$HTTP_CORS_DOMAIN" \
    --http.vhosts "$HTTP_VHOSTS" \
    --ws \
    --ws.addr "$WS_ADDR" \
    --ws.port "$WS_PORT" \
    --ws.api eth,net,web3 \
    --ws.origins "$WS_ORIGINS" \
    --port "$P2P_PORT" \
    --discovery.port "$P2P_PORT" \
    $NAT_FLAG \
    ${BOOTNODES:+--bootnodes "$BOOTNODES"} \
    "$@"
fi
