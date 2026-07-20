# Hot-deploy server + explorer to mainnet and testnet (no chain wipe)
param(
    [string]$ServerIp = "",
    [string]$Password = "",
    [string]$ProjectRoot = "C:\Users\Administrator\Desktop\Blockchain"
)

$ErrorActionPreference = "Stop"
Import-Module Posh-SSH

$credFile = Join-Path $PSScriptRoot "deploy-server.credentials.local.json"
if (Test-Path $credFile) {
    $cfg = Get-Content $credFile -Raw | ConvertFrom-Json
    if (-not $ServerIp) { $ServerIp = $cfg.host }
    if (-not $Password) { $Password = $cfg.password }
    if ($cfg.projectRoot) { $ProjectRoot = $cfg.projectRoot }
}

if (-not $ServerIp) { $ServerIp = "168.144.69.102" }
if (-not $Password) {
    throw "SSH password missing. Set scripts/deploy-server.credentials.local.json or pass -Password."
}

$TempDir = Join-Path $env:TEMP "ecna-hotfix-$(Get-Date -Format 'yyyyMMddHHmmss')"
New-Item -ItemType Directory -Path $TempDir | Out-Null

Push-Location $ProjectRoot
tar --exclude=server/node_modules --exclude=server/dist --exclude=server/.env -czf "$TempDir\server.tgz" server
tar --exclude=node_modules --exclude=dist -czf "$TempDir\explorer.tgz" apps/explorer
Pop-Location

$cred = New-Object System.Management.Automation.PSCredential("root", (ConvertTo-SecureString $Password -AsPlainText -Force))
$session = New-SSHSession -ComputerName $ServerIp -Credential $cred -AcceptKey -Force

function Invoke-Remote($cmd) {
    $r = Invoke-SSHCommand -SessionId $session.SessionId -Command $cmd -TimeOut 900
    Write-Host ($r.Output -join "`n")
    if ($r.Error) { Write-Host $r.Error }
    if ($r.ExitStatus -ne 0) { throw "Remote command failed ($($r.ExitStatus))" }
}

Set-SCPItem -ComputerName $ServerIp -Credential $cred -Path "$TempDir\server.tgz" -Destination "/root/" -AcceptKey -Force
Set-SCPItem -ComputerName $ServerIp -Credential $cred -Path "$TempDir\explorer.tgz" -Destination "/root/" -AcceptKey -Force

$deployScript = (@'
set -euo pipefail
MAINNET=/opt/ecnascan
TESTNET=/opt/ecnascan-testnet
DOMAIN=ecnascan.com

deploy_api() {
  local ROOT="$1"
  local PM2_API="$2"
  local PM2_IDX="$3"
  echo "=== API $ROOT ==="
  cd "$ROOT"
  tar -xzf /root/server.tgz
  cd server
  if [ "$ROOT" = "$MAINNET" ]; then
    npm install --no-workspaces --legacy-peer-deps
    npx prisma generate
    npx prisma db push
    npm run build
  else
    npm install --no-workspaces --legacy-peer-deps
    "$MAINNET/node_modules/.bin/prisma" generate
    "$MAINNET/node_modules/.bin/prisma" db push
    rm -rf dist
    cp -r "$MAINNET/server/dist" dist
  fi
  pm2 restart "$PM2_API" "$PM2_IDX" 2>/dev/null || true
}

deploy_api "$MAINNET" ecna-api ecna-indexer
deploy_api "$TESTNET" ecna-api-testnet ecna-indexer-testnet

echo "=== Explorer mainnet ==="
cd "$MAINNET"
tar -xzf /root/explorer.tgz
cat > apps/explorer/.env << EOF
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
npm run build -w apps/explorer
mkdir -p /var/www/explorer
cp -r apps/explorer/dist/* /var/www/explorer/

echo "=== Explorer testnet ==="
cat > apps/explorer/.env << EOF
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
npm run build -w apps/explorer
mkdir -p /var/www/testnetexplorer
cp -r apps/explorer/dist/* /var/www/testnetexplorer/

pm2 save
curl -sf http://127.0.0.1:4000/health | head -c 200; echo " mainnet"
curl -sf http://127.0.0.1:4001/health | head -c 200; echo " testnet"
'@) -replace "`r`n","`n"

Invoke-Remote $deployScript
Remove-SSHSession -SessionId $session.SessionId | Out-Null
Remove-Item -Recurse -Force $TempDir
Write-Host "Hot deploy complete."
