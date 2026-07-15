# ECNA Testnet (chain ID 4112)

Testnet runs **on the same server** as mainnet with **isolated ports, database, and keys**. Mainnet (`/opt/ecnascan`) is not modified except shared SQL container and nginx.

**Live addresses:** see [`docs/ADDRESSES-LIVE.md`](./ADDRESSES-LIVE.md) (go-live 15 July 2026).

## URLs (production)

| Service | URL |
|---------|-----|
| Explorer | https://testnetexplorer.ecnascan.com |
| API | https://testnetapi.ecnascan.com |
| RPC | https://testnetrpc.ecnascan.com |
| Faucet | POST https://testnetapi.ecnascan.com/api/v1/faucet `{"address":"0x..."}` |
| Website | https://ecnascan.com (shows **both** mainnet + testnet) |

## Chain

| | Mainnet (live) | Testnet |
|--|----------------|---------|
| Chain ID | 4111 | **4112** |
| Native symbol | **ECNA** | **tECNA** |
| Full name | **E Canna** | **E Canna Testnet** |
| Display name | E Canna Mainnet | E Canna Testnet |
| Genesis | **1 Crore** → treasury `0x34c7288B…` | Treasury `0x2509e87b…` **100M** + faucet `0x93994c8B…` **100M** |
| Live miner | `0x9F926a69ba55c2F436A51108f8eb96E21fC5a329` | same address (separate datadir/key file) |
| RPC | rpc.ecnascan.com | testnetrpc.ecnascan.com |
| Geth port (internal) | 8545 | **18545** |
| API port | 4000 | **4001** |
| SQL database | Db_ECNAChain | **Db_ECNATestnet** |
| Data path | `/opt/ecnascan/ecnachain` | `/opt/ecnascan-testnet/ecnachain` |

## DNS (add in GoDaddy)

```
testnetrpc.ecnascan.com     → 168.144.69.102
testnetapi.ecnascan.com     → 168.144.69.102
testnetexplorer.ecnascan.com → 168.144.69.102
```

## Deploy / republish

**Code-only (no chain wipe):**

```powershell
.\scripts\deploy-hotfix.ps1
```

**Fresh genesis + wipe mainnet AND testnet + SQL clear + frontends:**

```powershell
.\scripts\deploy-fresh-golive.ps1
```

Older testnet-only bootstrap (generates random keys if missing):

```bash
bash /opt/ecnascan/scripts/deploy-testnet.sh
```

Prefer `deploy-fresh-golive.ps1` when client addresses are already fixed in repo genesis/env.

## Faucet

| Item | Value |
|------|--------|
| Wallet | `0x93994c8B2557B74Ae988640444268CD3473D6f68` |
| Amount | **1000 tECNA** / wallet / 24h |
| Genesis balance | **100M tECNA** |
| User provides | **Address only** (never a private key) |
| Config | `/opt/ecnascan-testnet/server/.env` → `FAUCET_ENABLED=1`, `FAUCET_PRIVATE_KEY` |
| UI | Testnet explorer → **Faucet** |

## MetaMask (testnet)

| Field | Value |
|-------|--------|
| Network name | E Canna Testnet |
| RPC | https://testnetrpc.ecnascan.com |
| Chain ID | 4112 |
| Symbol | tECNA |
| Explorer | https://testnetexplorer.ecnascan.com |

## Safety

- Testnet miner + faucet keys under `/opt/ecnascan-testnet/ecnachain/docker/`
- Mainnet `ecnachain/data/` is **never** wiped by `deploy-testnet.sh` alone
- Dual wipe only via explicit go-live (`deploy-fresh-golive.ps1` / ops approval)
- PM2: `ecna-api-testnet`, `ecna-indexer-testnet`
