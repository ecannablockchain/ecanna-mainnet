# Agent / developer briefing (ECNASCAN)

Read this first before changing chain, deploy, faucet, or RPC code.

## Product naming (use these exact strings)

| Concept | Value |
|---------|--------|
| Brand / explorer product | **ECNASCAN** |
| Native full name | **E Canna** |
| Native symbol (mainnet) | **ECNA** |
| Native full name (testnet) | **E Canna Testnet** |
| Native symbol (testnet) | **tECNA** |
| Mainnet display | **E Canna Mainnet** |
| Testnet display | **E Canna Testnet** |
| Mainnet supply (genesis) | **1 Crore** = **10,000,000** ECNA |
| EVM for Remix / Hardhat / verify | **shanghai** (PUSH0 OK; **not** cancun/prague) |

Do **not** use obsolete labels: “ECNA Chain”, “ECNA Smart Chain”, “1 billion / 1B” premine, Cancun as default deploy EVM.

## Live networks (same DO server)

| | Mainnet | Testnet |
|--|---------|---------|
| Chain ID | **4111** | **4112** |
| Server root | `/opt/ecnascan` | `/opt/ecnascan-testnet` |
| SQL DB | `Db_ECNAChain` | `Db_ECNATestnet` |
| Geth RPC (internal) | `127.0.0.1:8545` | `127.0.0.1:18545` |
| Public RPC | https://rpc.ecnascan.com | https://testnetrpc.ecnascan.com |
| API | https://api.ecnascan.com `:4000` | https://testnetapi.ecnascan.com `:4001` |
| Explorer | https://explorer.ecnascan.com | https://testnetexplorer.ecnascan.com |
| PM2 | `ecna-api`, `ecna-indexer` | `ecna-api-testnet`, `ecna-indexer-testnet` |
| Faucet | **off** | **on** (~1000 tECNA / wallet / 24h) |

**Server:** `168.144.69.102` · Domain: `ecnascan.com`

## Canonical address book

→ **[`docs/ADDRESSES-LIVE.md`](docs/ADDRESSES-LIVE.md)** (treasuries, miner, faucet, key file paths).

→ Full KT: **[`docs/KT-ECNA-MAINNET-TESTNET.md`](docs/KT-ECNA-MAINNET-TESTNET.md)**

### Quick live addresses

| Role | Mainnet | Testnet |
|------|---------|---------|
| Clique miner | `0x9F926a69ba55c2F436A51108f8eb96E21fC5a329` | same |
| Treasury | `0x34c7288B86E10A7096523FB1d6eC12948af95897` | `0x2509e87b12DAD407DC3521Dd15A95B3F74EF41D3` |
| Faucet | — | `0x93994c8B2557B74Ae988640444268CD3473D6f68` |

Private keys: **gitignored** (`*.hex`, `server/.env`, `testnet/server/.env`). Never commit them.

## Public RPC security (critical)

Clique unlocks the miner inside Geth. That account must **not** accept public `eth_sendTransaction`.

Live protection:

1. Docker binds RPC/WS to **127.0.0.1 only**
2. PM2 `ecna-rpc-guard` / `ecna-rpc-guard-testnet` → ports `28545` / `28546`
3. Nginx public RPC → those guards
4. UFW denies raw `8545` / `18545` from internet

Allowed publicly: `eth_sendRawTransaction` (MetaMask, faucet).  
Blocked publicly: `eth_sendTransaction`, `eth_sign`, `personal_*`, `miner_*`, …

Scripts:

- `scripts/rpc-public-guard.mjs`
- `scripts/harden-rpc-live.sh`
- `ecosystem.rpc-guard.config.cjs`

Re-apply harden on server: `bash /opt/ecnascan/scripts/harden-rpc-live.sh`

## Deploy commands (from laptop repo root)

| Goal | Command |
|------|---------|
| Code / API / explorer (no chain wipe) | `.\scripts\deploy-hotfix.ps1` |
| Frontends only | `.\scripts\deploy-frontends.ps1` |
| **Wipe both chains + SQL + genesis + harden + publish** | `.\scripts\deploy-fresh-golive.ps1` |

SSH credentials (local only, gitignored): `scripts/deploy-server.credentials.local.json`, `scripts/DEPLOY-SERVER.local.md`

## Repo map

| Path | Role |
|------|------|
| `ecnachain/` | Mainnet genesis + Geth Docker |
| `testnet/ecnachain/` | Testnet genesis + Geth Docker |
| `server/` | API + indexer (shared build; two env files) |
| `apps/explorer` | Explorer UI |
| `apps/website` | Marketing site |
| `apps/dashboard` | Wallet dashboard |
| `contracts/` | Hardhat / PETH |
| `docs/` | KT, addresses, runbooks |

## Faucet behaviour (testnet)

- User provides **wallet address only** (no private key).
- API signs with `FAUCET_PRIVATE_KEY` (faucet wallet), amount `FAUCET_AMOUNT_WEI` (default 1000 tECNA).
- Faucet wallet is funded in **testnet genesis** (separate from treasury).

## Do not

- Publish Cancun/Prague as chain EVM for this Clique Geth stack
- Expose Geth `8545`/`18545` on `0.0.0.0`
- Point nginx public RPC straight at Geth (bypass guard)
- Wipe only one network’s SQL while leaving the other inconsistent after a dual genesis reset
- Commit `.env`, `miner-private.hex`, `faucet-private.hex`, or `DEPLOY-SERVER.local.md`

## Naming convention checklist (PRs / agent edits)

- UI / env defaults: **E Canna** / **ECNA** / **E Canna Testnet** / **tECNA**
- Chain display: **E Canna Mainnet** / **E Canna Testnet**
- Supply copy: **1 Crore (10,000,000)** not 1B
- Docs point to `docs/ADDRESSES-LIVE.md` for addresses
- New temp files under `%TEMP%\ecna-*` for deploys — delete after use; **never** leave `*.log` / `*.tgz` in the repo root
