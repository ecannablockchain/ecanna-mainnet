#!/bin/bash
# ECNA Testnet deploy — chain 4112 on SAME server as mainnet (isolated ports + DB).
# Does NOT touch /opt/ecnascan mainnet data.
#
# Run on server as root:
#   bash /opt/ecnascan/scripts/deploy-testnet.sh
#
# Optional env:
#   ECNA_DOMAIN=ecnascan.com
#   ECNA_TESTNET_ROOT=/opt/ecnascan-testnet
#   MAINNET_ROOT=/opt/ecnascan

set -euo pipefail

MAINNET_ROOT="${MAINNET_ROOT:-/opt/ecnascan}"
TESTNET_ROOT="${ECNA_TESTNET_ROOT:-/opt/ecnascan-testnet}"
DOMAIN="${ECNA_DOMAIN:-ecnascan.com}"
EMAIL="${ECNA_SSL_EMAIL:-admin@${DOMAIN}}"
DB_NAME="${ECNA_TESTNET_DB:-Db_ECNATestnet}"

echo "=== ECNA Testnet deploy ==="
echo "  Mainnet (unchanged): $MAINNET_ROOT"
echo "  Testnet root:        $TESTNET_ROOT"
echo "  Chain ID:            4112"
echo ""

if [[ ! -d "$MAINNET_ROOT/server/dist" ]]; then
  echo "ERROR: Build mainnet server first: cd $MAINNET_ROOT/server && npm run build"
  exit 1
fi

mkdir -p "$TESTNET_ROOT/ecnachain/docker" "$TESTNET_ROOT/ecnachain/scripts" "$TESTNET_ROOT/server"
cp -r "$MAINNET_ROOT/testnet/ecnachain/." "$TESTNET_ROOT/ecnachain/"
cp "$MAINNET_ROOT/ecnachain/docker/password-dev.txt" "$TESTNET_ROOT/ecnachain/docker/password-dev.txt"
cp "$MAINNET_ROOT/ecnachain/docker/geth-entrypoint.sh" "$TESTNET_ROOT/ecnachain/docker/geth-entrypoint.sh"
chmod +x "$TESTNET_ROOT/ecnachain/docker/geth-entrypoint.sh"
sed -i 's/\r$//' "$TESTNET_ROOT/ecnachain/docker/geth-entrypoint.sh"

echo "=== [1/7] Testnet keys (new — not mainnet) ==="
cd "$MAINNET_ROOT"
KEYS_JSON=$(node scripts/generate-testnet-keys.mjs 2>/dev/null)
VALIDATOR=$(echo "$KEYS_JSON" | node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(j.validator)")
FAUCET=$(echo "$KEYS_JSON" | node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(j.faucet)")
FAUCET_PK=$(echo "$KEYS_JSON" | node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(j.faucetPrivateKey)")

cp "$MAINNET_ROOT/testnet/ecnachain/docker/miner-private.hex" "$TESTNET_ROOT/ecnachain/docker/miner-private.hex" 2>/dev/null || \
  cp "$MAINNET_ROOT/testnet/ecnachain/docker/miner-private.hex" "$TESTNET_ROOT/ecnachain/docker/"
chmod 600 "$TESTNET_ROOT/ecnachain/docker/miner-private.hex"

cat > "$TESTNET_ROOT/ecnachain/.env" << EOF
ECNA_PRIMARY_ADDRESS=$VALIDATOR
ECNA_NATIVE_MINT_ADDRESS=$FAUCET
EOF

echo "=== [2/7] Genesis chain 4112 ==="
cd "$TESTNET_ROOT/ecnachain"
export ECNA_CHAIN_ID=4112
export ECNA_VALIDATORS="$VALIDATOR"
export ECNA_TREASURY="$FAUCET"
export ECNA_TOTAL_WEI="100000000000000000000000000"
node scripts/build-genesis.mjs

if [[ ! -d "$TESTNET_ROOT/ecnachain/data/validator1/geth/chaindata" ]]; then
  echo "Initializing fresh testnet chain data..."
  docker compose down 2>/dev/null || true
  rm -rf "$TESTNET_ROOT/ecnachain/data/validator1/geth" "$TESTNET_ROOT/ecnachain/data/validator1/.genesis.sha256"
fi

cd "$TESTNET_ROOT/ecnachain"
docker compose -p ecna-testnet up -d

echo "Waiting for testnet Geth (18545)..."
for i in $(seq 1 40); do
  if curl -sf http://127.0.0.1:18545 -X POST -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' | grep -q 0x1010; then
    echo "Testnet Geth OK (chainId 4112)"
    break
  fi
  sleep 2
done

echo "=== [3/7] SQL database $DB_NAME ==="
SA_PASSWORD=""
if [[ -f "$MAINNET_ROOT/server/docker/.env.mssql" ]]; then
  # shellcheck disable=SC1090
  source "$MAINNET_ROOT/server/docker/.env.mssql"
  SA_PASSWORD="${MSSQL_SA_PASSWORD:-}"
fi
if [[ -z "$SA_PASSWORD" ]]; then
  echo "ERROR: Mainnet SQL not configured. Run setup-local-sqlserver.sh on mainnet first."
  exit 1
fi

docker exec ecna-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$SA_PASSWORD" -C -Q \
  "IF DB_ID('$DB_NAME') IS NULL CREATE DATABASE [$DB_NAME];" || true

ENC_PASS=$(printf '%s' "$SA_PASSWORD" | sed 's/}/}}/g')
DATABASE_URL="sqlserver://127.0.0.1:1433;database=${DB_NAME};user=sa;password={${ENC_PASS}};encrypt=true;trustServerCertificate=true"

echo "=== [4/7] Testnet server .env ==="
cat > "$TESTNET_ROOT/server/.env" << EOF
NODE_ENV=production
NETWORK_KIND=testnet
PORT=4001
DATABASE_URL="${DATABASE_URL}"
RPC_URL=http://127.0.0.1:18545
RPC_PUBLIC_URL=https://testnetrpc.${DOMAIN}
RPC_CHAIN_ID=4112
CHAIN_ID=4112
NATIVE_SYMBOL=tECNA
NATIVE_NAME=E Canna Testnet
CHAIN_DISPLAY_NAME=E Canna Testnet
ECNA_PRIMARY_ADDRESS=$VALIDATOR
ECNA_NATIVE_MINT_ADDRESS=$FAUCET
EXPLORER_PUBLIC_URL=https://testnetexplorer.${DOMAIN}
DASHBOARD_PUBLIC_URL=https://dashboard.${DOMAIN}
PEER_EXPLORER_URL=https://explorer.${DOMAIN}
PEER_NETWORK_LABEL=Mainnet
CORS_ORIGIN=https://${DOMAIN},https://www.${DOMAIN},https://testnetexplorer.${DOMAIN},https://testnetapi.${DOMAIN},https://explorer.${DOMAIN}
SITE_AUTH_SECRET=ecna-testnet-auth-$(openssl rand -hex 12)
SITE_AUTH_COOKIE_SECURE=1
RATE_LIMIT_MAX=300
INDEXER_POLL_MS=2000
INDEXER_BATCH_SIZE=500
FAUCET_ENABLED=1
FAUCET_PRIVATE_KEY=$FAUCET_PK
FAUCET_AMOUNT_WEI=1000000000000000000000
FAUCET_COOLDOWN_MS=86400000
FAUCET_MAX_PER_IP_PER_DAY=10
LOG_LEVEL=info
EOF
chmod 600 "$TESTNET_ROOT/server/.env"

echo "=== [5/7] Prisma DB + PM2 testnet ==="
cd "$MAINNET_ROOT/server"
DATABASE_URL="$DATABASE_URL" npx prisma db push
DATABASE_URL="$DATABASE_URL" npm run db:apply-scale 2>/dev/null || true

cd "$MAINNET_ROOT"
pm2 delete ecna-api-testnet ecna-indexer-testnet 2>/dev/null || true
SERVER_ENV_FILE_TESTNET="$TESTNET_ROOT/server/.env" pm2 start ecosystem.testnet.config.cjs
pm2 save

echo "=== [6/7] Build testnet explorer ==="
cat > "$MAINNET_ROOT/apps/explorer/.env.testnet" << EOF
VITE_API_URL=https://testnetapi.${DOMAIN}
VITE_RPC_URL=https://testnetrpc.${DOMAIN}
VITE_CHAIN_ID=4112
VITE_CHAIN_NAME=E Canna Testnet
VITE_NATIVE_SYMBOL=tECNA
VITE_NATIVE_NAME=E Canna Testnet
VITE_EXPLORER_URL=https://testnetexplorer.${DOMAIN}
VITE_PEER_EXPLORER_URL=https://explorer.${DOMAIN}
VITE_PEER_NETWORK_LABEL=Mainnet
VITE_NETWORK_KIND=testnet
EOF

cd "$MAINNET_ROOT/apps/explorer"
cp .env.testnet .env
npm run build
mkdir -p /var/www/testnetexplorer
cp -r dist/* /var/www/testnetexplorer/

echo "=== [7/7] Nginx testnet vhosts ==="
NGINX_TESTNET="/etc/nginx/sites-available/ecnascan-testnet"
cat > "$NGINX_TESTNET" << NGINX
server {
    listen 80;
    server_name testnetexplorer.${DOMAIN};
    root /var/www/testnetexplorer;
    index index.html;
    location / { try_files \$uri \$uri/ /index.html; }
}
server {
    listen 80;
    server_name testnetapi.${DOMAIN};
    location / {
        proxy_pass http://127.0.0.1:4001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
server {
    listen 80;
    server_name testnetrpc.${DOMAIN};
    location / {
        proxy_pass http://127.0.0.1:18545;
        proxy_set_header Host \$host;
        proxy_set_header Content-Type application/json;
    }
}
NGINX

ln -sf "$NGINX_TESTNET" /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

certbot --nginx -d "testnetexplorer.${DOMAIN}" -d "testnetapi.${DOMAIN}" -d "testnetrpc.${DOMAIN}" \
  --non-interactive --agree-tos -m "${EMAIL}" --expand 2>/dev/null || \
  echo "SSL: add testnet subdomains to certbot manually when DNS is ready."

echo ""
echo "=== TESTNET DONE ==="
echo "  Explorer:  https://testnetexplorer.${DOMAIN}"
echo "  API:       https://testnetapi.${DOMAIN}/health"
echo "  RPC:       https://testnetrpc.${DOMAIN}"
echo "  Faucet:    POST https://testnetapi.${DOMAIN}/api/v1/faucet  {\"address\":\"0x...\"}"
echo "  Chain ID:  4112"
echo "  Faucet wallet: $FAUCET (100M tECNA premine)"
echo ""
echo "Rebuild MAINNET website + explorer for dual-network links:"
echo "  bash $MAINNET_ROOT/scripts/deploy-mainnet-frontend.sh"
