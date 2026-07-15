#!/bin/bash
# Rebuild mainnet website + explorer with dual-network / peer links (after testnet deploy).
set -euo pipefail

ROOT="${MAINNET_ROOT:-/opt/ecnascan}"
DOMAIN="${ECNA_DOMAIN:-ecnascan.com}"

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
VITE_TESTNET_FAUCET_URL=https://testnetapi.${DOMAIN}/api/v1/faucet
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

cd "$ROOT"
npm run build -w apps/website
npm run build -w apps/explorer
mkdir -p /var/www/website /var/www/explorer
cp -r apps/website/dist/* /var/www/website/
cp -r apps/explorer/dist/* /var/www/explorer/

echo "Mainnet website + explorer rebuilt with testnet cross-links."
