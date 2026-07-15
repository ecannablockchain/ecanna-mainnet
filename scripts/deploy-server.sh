#!/bin/bash
# ECNA production deploy on Ubuntu — Geth + API + frontends + Nginx
# Run as root on server after deploy-upload.ps1:
#   bash /opt/ecnascan/scripts/deploy-server.sh

set -euo pipefail

ROOT="/opt/ecnascan"
DOMAIN="${ECNA_DOMAIN:-ecnascan.com}"
EMAIL="${ECNA_SSL_EMAIL:-admin@${DOMAIN}}"

echo "=== [1/8] System packages ==="
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git nginx docker.io docker-compose-plugin ufw certbot python3-certbot-nginx

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi

systemctl enable docker nginx
systemctl start docker

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 30303/tcp
ufw --force enable

echo "=== [2/8] npm install ==="
cd "$ROOT"
npm install

echo "=== [3/8] Geth chain (genesis premine) ==="
cd "$ROOT/ecnachain"
cp -n .env.example .env 2>/dev/null || true

export ECNA_VALIDATORS="${ECNA_VALIDATORS:-0x3e90435d3B3DEF3eFAEb9Fe136AF867470447788}"
export ECNA_TREASURY="${ECNA_TREASURY:-0xF4B6C206f7a6C4b59Ebe129C43Ea9592a03dc0cC}"
node scripts/build-genesis.mjs

if [[ ! -f docker/miner-private.hex ]]; then
  echo "ERROR: docker/miner-private.hex missing. Upload it before continuing."
  exit 1
fi

docker compose down 2>/dev/null || true
rm -rf data/validator1/geth data/validator1/.genesis.sha256 data/validator1/keystore
docker compose up -d

echo "Waiting for Geth RPC..."
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:8545 -X POST -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | grep -q result; then
  echo "Geth OK"
  break
  fi
  sleep 2
done

echo "=== [4/8] API (server/.env required) ==="
if [[ ! -f "$ROOT/server/.env" ]]; then
  echo "ERROR: $ROOT/server/.env missing."
  echo "Copy from laptop: scp server/.env root@SERVER:/opt/ecnascan/server/.env"
  echo "Required: DATABASE_URL, SITE_AUTH_SECRET, NODE_ENV=production"
  exit 1
fi

cd "$ROOT/server"
npx prisma generate
npx prisma db push
npm run db:apply-scale 2>/dev/null || true
npm run build

echo "=== [5/8] Build frontends ==="
cat > "$ROOT/apps/website/.env" << EOF
VITE_API_URL=https://api.${DOMAIN}
VITE_RPC_URL=https://rpc.${DOMAIN}
VITE_CHAIN_ID=4111
VITE_CHAIN_NAME=E Canna Mainnet
VITE_NATIVE_SYMBOL=ECNA
VITE_NATIVE_NAME=E Canna
VITE_EXPLORER_URL=https://explorer.${DOMAIN}
VITE_DASHBOARD_URL=https://dashboard.${DOMAIN}
VITE_WEBSITE_URL=https://${DOMAIN}
VITE_TESTNET_RPC_URL=https://testnetrpc.${DOMAIN}
VITE_TESTNET_API_URL=https://testnetapi.${DOMAIN}
VITE_TESTNET_EXPLORER_URL=https://testnetexplorer.${DOMAIN}
VITE_TESTNET_CHAIN_ID=4112
VITE_TESTNET_CHAIN_NAME=E Canna Testnet
VITE_TESTNET_NATIVE_SYMBOL=tECNA
VITE_TESTNET_NATIVE_NAME=E Canna Testnet
EOF

cat > "$ROOT/apps/explorer/.env" << EOF
VITE_API_URL=https://api.${DOMAIN}
VITE_RPC_URL=https://rpc.${DOMAIN}
VITE_CHAIN_ID=4111
VITE_CHAIN_NAME=E Canna Mainnet
VITE_NATIVE_SYMBOL=ECNA
VITE_NATIVE_NAME=E Canna
VITE_EXPLORER_URL=https://explorer.${DOMAIN}
VITE_PEER_EXPLORER_URL=https://testnetexplorer.${DOMAIN}
VITE_PEER_NETWORK_LABEL=Testnet
VITE_NETWORK_KIND=mainnet
EOF

cat > "$ROOT/apps/dashboard/.env" << EOF
VITE_API_URL=https://api.${DOMAIN}
VITE_RPC_URL=https://rpc.${DOMAIN}
VITE_CHAIN_ID=4111
VITE_EXPLORER_URL=https://explorer.${DOMAIN}
EOF

cd "$ROOT"
npm run build -w apps/website
npm run build -w apps/explorer
npm run build -w apps/dashboard

mkdir -p /var/www/{website,explorer,dashboard}
cp -r apps/website/dist/*   /var/www/website/
cp -r apps/explorer/dist/*  /var/www/explorer/
cp -r apps/dashboard/dist/* /var/www/dashboard/

echo "=== [6/8] PM2 API + indexer ==="
npm install -g pm2
cd "$ROOT"
pm2 delete ecna-api ecna-indexer 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo "=== [7/8] Nginx ==="
cat > /etc/nginx/sites-available/ecnascan << NGINX
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    root /var/www/website;
    index index.html;
    location / { try_files \$uri \$uri/ /index.html; }
}
server {
    listen 80;
    server_name explorer.${DOMAIN};
    root /var/www/explorer;
    index index.html;
    location / { try_files \$uri \$uri/ /index.html; }
}
server {
    listen 80;
    server_name dashboard.${DOMAIN};
    root /var/www/dashboard;
    index index.html;
    location / { try_files \$uri \$uri/ /index.html; }
}
server {
    listen 80;
    server_name api.${DOMAIN};
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
server {
    listen 80;
    server_name rpc.${DOMAIN};
    location / {
        proxy_pass http://127.0.0.1:8545;
        proxy_set_header Host \$host;
        proxy_set_header Content-Type application/json;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/ecnascan /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "=== [8/8] SSL (optional) ==="
if certbot --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" -d "explorer.${DOMAIN}" \
  -d "dashboard.${DOMAIN}" -d "api.${DOMAIN}" -d "rpc.${DOMAIN}" \
  --non-interactive --agree-tos -m "${EMAIL}" 2>/dev/null; then
  echo "SSL installed."
else
  echo "SSL skipped or failed — run certbot manually when DNS is ready."
fi

echo ""
echo "=== DONE ==="
echo "  https://${DOMAIN}           — website"
echo "  https://explorer.${DOMAIN}  — explorer"
echo "  https://dashboard.${DOMAIN} — dashboard"
echo "  https://api.${DOMAIN}/health — API"
echo "  https://rpc.${DOMAIN}       — MetaMask RPC"
curl -sf "http://127.0.0.1:4000/health" || echo "(API health check failed — check server/.env and pm2 logs)"
