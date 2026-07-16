# Stops Geth, wipes chain state + keystore so next start uses current genesis.json + miner-private.hex
# Run from ecnachain folder: .\reset-chain.ps1

Set-Location $PSScriptRoot

Write-Host "Stopping container..."
docker compose down 2>&1 | Out-Null

$data = Join-Path $PSScriptRoot "data\validator1"
if (Test-Path $data) {
  Write-Host "Removing chain + stamp + keystore under data\validator1 ..."
  Remove-Item -Recurse -Force (Join-Path $data "geth") -ErrorAction SilentlyContinue
  Remove-Item -Force (Join-Path $data ".genesis.sha256") -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force (Join-Path $data "keystore") -ErrorAction SilentlyContinue
}

Write-Host "Starting fresh..."
docker compose up -d 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { docker compose up -d }
Write-Host "Done. Wait ~10s then check: block 0 extraData should match genesis.json (your signer)."
Write-Host 'RPC test: Invoke-RestMethod -Uri https://rpc.ecnascan.com -Method Post -ContentType application/json -Body ''{"jsonrpc":"2.0","method":"eth_getBlockByNumber","params":["0x0",false],"id":1}'''
