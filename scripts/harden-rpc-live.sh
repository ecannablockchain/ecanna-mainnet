#!/bin/bash
# Harden public RPC for mainnet + testnet (idempotent).
# - Geth RPC/WS on 127.0.0.1 only
# - PM2 rpc-public-guard for nginx (blocks eth_sendTransaction / eth_sign / personal_*)
# - UFW: allow SSH/HTTP/HTTPS/P2P only
#
# Run on server: bash /opt/ecnascan/scripts/harden-rpc-live.sh
set -euo pipefail

MAIN=/opt/ecnascan
TEST=/opt/ecnascan-testnet

echo "=== [1/5] Ensure docker-compose localhost RPC ==="
sed -i 's|"8545:8545"|"127.0.0.1:8545:8545"|g; s|"8546:8546"|"127.0.0.1:8546:8546"|g' "$MAIN/ecnachain/docker-compose.yml" || true
sed -i 's|"18545:8545"|"127.0.0.1:18545:8545"|g; s|"18546:8546"|"127.0.0.1:18546:8546"|g' "$TEST/ecnachain/docker-compose.yml" || true
if grep -q 'MINER_ETHERBASE: \${ECNA_ETHERBASE}' "$MAIN/ecnachain/docker-compose.yml" 2>/dev/null; then
  sed -i 's|MINER_ETHERBASE: ${ECNA_ETHERBASE}|MINER_ETHERBASE: ${ECNA_PRIMARY_ADDRESS}|g' "$MAIN/ecnachain/docker-compose.yml"
fi
if grep -q 'MINER_ETHERBASE: \${ECNA_ETHERBASE}' "$TEST/ecnachain/docker-compose.yml" 2>/dev/null; then
  sed -i 's|MINER_ETHERBASE: ${ECNA_ETHERBASE}|MINER_ETHERBASE: ${ECNA_PRIMARY_ADDRESS}|g' "$TEST/ecnachain/docker-compose.yml"
fi

if [ -f "$MAIN/ecnachain/docker/geth-entrypoint.sh" ]; then
  cp "$MAIN/ecnachain/docker/geth-entrypoint.sh" "$TEST/ecnachain/docker/geth-entrypoint.sh"
  chmod +x "$TEST/ecnachain/docker/geth-entrypoint.sh"
  sed -i 's/\r$//' "$TEST/ecnachain/docker/geth-entrypoint.sh"
fi

echo "=== [2/5] Recreate Geth containers ==="
cd "$MAIN/ecnachain"
docker compose up -d --force-recreate
cd "$TEST/ecnachain"
docker compose -p ecna-testnet up -d --force-recreate

ok=0
for i in $(seq 1 40); do
  if curl -sf -X POST http://127.0.0.1:8545 -H 'Content-Type: application/json' -H 'Host: localhost' \
      -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' | grep -q 0x100f \
    && curl -sf -X POST http://127.0.0.1:18545 -H 'Content-Type: application/json' -H 'Host: localhost' \
      -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' | grep -q 0x1010; then
    ok=1
    break
  fi
  sleep 2
done
if [ "$ok" != "1" ]; then
  echo "ERROR: Geth not ready"
  docker ps -a | head -20
  docker logs --tail 30 ecna-validator-1 2>&1 || true
  docker logs --tail 30 ecna-testnet-validator 2>&1 || true
  exit 1
fi
echo "Geth localhost RPC OK"

echo "=== [3/5] Start PM2 RPC guards ==="
cd "$MAIN"
test -f "$MAIN/scripts/rpc-public-guard.mjs"
test -f "$MAIN/ecosystem.rpc-guard.config.cjs"
pm2 delete ecna-rpc-guard ecna-rpc-guard-testnet 2>/dev/null || true
pm2 start ecosystem.rpc-guard.config.cjs
pm2 save
sleep 2
curl -sf -X POST http://127.0.0.1:28545 -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' >/dev/null
curl -sf -X POST http://127.0.0.1:28546 -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' >/dev/null
echo "Guards OK"

echo "=== [4/5] Point nginx public RPC at guards ==="
sed -i 's|proxy_pass http://127.0.0.1:8545;|proxy_pass http://127.0.0.1:28545;|g' /etc/nginx/sites-enabled/ecnascan || true
sed -i 's|proxy_pass http://127.0.0.1:8545;|proxy_pass http://127.0.0.1:28545;|g' /etc/nginx/sites-available/ecnascan 2>/dev/null || true
sed -i 's|proxy_pass http://127.0.0.1:18545;|proxy_pass http://127.0.0.1:28546;|g' /etc/nginx/sites-enabled/ecnascan-testnet || true
sed -i 's|proxy_pass http://127.0.0.1:18545;|proxy_pass http://127.0.0.1:28546;|g' /etc/nginx/sites-available/ecnascan-testnet 2>/dev/null || true
nginx -t
systemctl reload nginx

echo "=== [5/5] Firewall (UFW) ==="
if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH >/dev/null 2>&1 || ufw allow 22/tcp >/dev/null 2>&1 || true
  ufw allow 80/tcp >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
  ufw allow 30303/tcp >/dev/null 2>&1 || true
  ufw allow 30303/udp >/dev/null 2>&1 || true
  ufw allow 30313/tcp >/dev/null 2>&1 || true
  ufw allow 30313/udp >/dev/null 2>&1 || true
  ufw deny 8545/tcp >/dev/null 2>&1 || true
  ufw deny 8546/tcp >/dev/null 2>&1 || true
  ufw deny 18545/tcp >/dev/null 2>&1 || true
  ufw deny 18546/tcp >/dev/null 2>&1 || true
  ufw --force enable >/dev/null 2>&1 || true
  ufw status | head -25 || true
else
  echo "ufw not installed — skip"
fi

echo "=== Verify public RPC ==="
for URL in https://rpc.ecnascan.com https://testnetrpc.ecnascan.com; do
  echo -n "$URL sendTransaction => "
  curl -s -X POST "$URL/" -H 'Content-Type: application/json' \
    -d '{"jsonrpc":"2.0","method":"eth_sendTransaction","params":[{"from":"0x9F926a69ba55c2F436A51108f8eb96E21fC5a329","to":"0x9F926a69ba55c2F436A51108f8eb96E21fC5a329","value":"0x1"}],"id":1}'
  echo
  echo -n "$URL eth_blockNumber => "
  curl -s -X POST "$URL/" -H 'Content-Type: application/json' \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
  echo
done
ss -lntp | grep -E '8545|18545|28545|28546' || true
echo "=== RPC harden complete ==="
