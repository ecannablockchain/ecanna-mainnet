# Agent / developer briefing (ECNASCAN)

**Read this first** before changing chain, deploy, faucet, RPC, or GitHub code.

This laptop folder is the **full ops monorepo** (includes secrets in gitignored files).  
Public GitHub repos are **sanitized mirrors** — never copy `.env` / `*.hex` / SSH passwords into them.

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
| EVM for Remix / Hardhat / verify | **london** (stock Geth Clique; **not** shanghai/cancun/prague) |
| Geth (live) | **v1.13.15-stable** (`ethereum/client-go:v1.13.15`) |
| Genesis hash (mainnet, post-London wipe) | `0xeac82b18632cf693d4b57d319cefece0349ebcf20bc76bdf5c04216126cb3e1b` |

Do **not** use obsolete labels: “ECNA Chain”, “ECNA Smart Chain”, “1 billion / 1B” premine, Cancun/Shanghai as default deploy EVM, or the old host IP `50.28.84.113`.

### Critical listing / sync facts (read before helping exchanges)

1. **No `shanghaiTime` in genesis** — stock Geth Clique returns `clique does not support shanghai fork` and peers drop. EVM stops at **London**.
2. **P2P enode ID is pinned** via `ecnachain/docker/nodekey` (gitignored) + mount in compose. After a wipe, **always** publish the enode from live `admin.nodeInfo.enode` into `static-nodes.json` + GitHub if the key was not pinned yet.
3. Exchange nodes must wipe old `data/`, re-init, and use the **current** `static-nodes.json` from GitHub — old enodes (`e11f51…` mainnet / `9ad0e0…` testnet) are **obsolete**.
4. `eth.syncing` with `currentBlock: 0` while `highestBlock > 0` is normal early sync — not an error. Empty `admin.peers` after `addPeer` usually means **wrong enode** or firewall.
5. Sync-only nodes: `--syncmode full`; ignore `etherbase must be explicitly specified` (non-miner).
6. Remix/Hardhat/verify: **EVM = london**. Solidity 0.8.20+ defaults to shanghai/PUSH0 unless overridden. Product UI (explorer + website) shows this banner — see [`docs/DEPLOY-CONTRACTS.md`](docs/DEPLOY-CONTRACTS.md).

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
| Dashboard | https://dashboard.ecnascan.com (mainnet UI only) | — |
| PM2 | `ecna-api`, `ecna-indexer` | `ecna-api-testnet`, `ecna-indexer-testnet` |
| Faucet | **off** | **on** (~1000 tECNA / wallet / 24h) |
| P2P host:port | `168.144.69.102:30303` | `168.144.69.102:30313` |

**Server:** `168.144.69.102` · Domain: `ecnascan.com`

### Live P2P peers (copy-paste — also in `static-nodes.json`)

**Mainnet:**
```
enode://6728dde6587af2b1ed676261d486319254cd3ad1a7721d779210e108ccced65e9b020ffc59a1f5b4ca0ce2120dcbba66488cc46b7679a7702d0e3a223e70b62e@168.144.69.102:30303
```

**Testnet:**
```
enode://f762fd2f93af7d072aa497fab66e5e54800b9de96becd13b79378d2b89b6e567c6d703cf16a977e4463205b373c1b86b241c860a1d609405139f340938b96112@168.144.69.102:30313
```

Pinned nodekey files (ops only, **gitignored**): `ecnachain/docker/nodekey`, `testnet/ecnachain/docker/nodekey` (and matching paths under `/opt/...` on server). Geth uses `--nat extip:168.144.69.102` so advertised enode has no wrong `discport`.

## Where to look (no confusion)

| Need | Open this |
|------|-----------|
| Short briefing (this file) | `AGENTS.md` |
| Live addresses + RPC harden | [`docs/ADDRESSES-LIVE.md`](docs/ADDRESSES-LIVE.md) |
| Full KT | [`docs/KT-ECNA-MAINNET-TESTNET.md`](docs/KT-ECNA-MAINNET-TESTNET.md) |
| GitHub + Chainlist + exchange links | [`docs/GITHUB-AND-CHAINLIST.md`](docs/GITHUB-AND-CHAINLIST.md) |
| Exchange pack (mainnet) | [`docs/EXCHANGE-LISTING.md`](docs/EXCHANGE-LISTING.md) |
| Exchange pack (testnet) | [`docs/EXCHANGE-LISTING-TESTNET.md`](docs/EXCHANGE-LISTING-TESTNET.md) |
| **Deploy contracts (Remix/Hardhat)** | [`docs/DEPLOY-CONTRACTS.md`](docs/DEPLOY-CONTRACTS.md) |
| Zero-to-live order (English) | [`docs/LIVE-FROM-ZERO.md`](docs/LIVE-FROM-ZERO.md) |
| Simple one-pager | [`docs/SIMPLE-GUIDE.md`](docs/SIMPLE-GUIDE.md) |
| SSH deploy secrets (local only) | `scripts/deploy-server.credentials.local.json` (**gitignored**) |
| GitHub PAT (local only) | `scripts/github-credentials.local.json` (**gitignored**) |

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

Scripts: `scripts/rpc-public-guard.mjs`, `scripts/harden-rpc-live.sh`, `ecosystem.rpc-guard.config.cjs`  
Re-apply: `bash /opt/ecnascan/scripts/harden-rpc-live.sh`

## Deploy commands (from laptop repo root)

| Goal | Command |
|------|---------|
| Code / API / explorer (no chain wipe) | `.\scripts\deploy-hotfix.ps1` |
| Frontends only | `.\scripts\deploy-frontends.ps1` |
| **Wipe both chains + SQL + genesis + harden + publish** | `.\scripts\deploy-fresh-golive.ps1` |

## Repo map (this laptop monorepo)

| Path | Role |
|------|------|
| `ecnachain/` | Mainnet genesis + Geth Docker + `static-nodes.json` |
| `testnet/ecnachain/` | Testnet genesis + Geth Docker + `static-nodes.json` |
| `server/` | API + indexer (shared build; two env files on server) |
| `apps/explorer` | Explorer UI |
| `apps/website` | Marketing site |
| `apps/dashboard` | Wallet dashboard |
| `contracts/` | Hardhat / PETH |
| `docs/` | KT, addresses, runbooks (English) |

## GitHub (public, secret-free) + Chainlist

| Item | Value |
|------|--------|
| GitHub user | **ecannablockchain** |
| Mainnet repo | https://github.com/ecannablockchain/ecanna-mainnet (**public**) |
| Testnet repo | https://github.com/ecannablockchain/ecanna-testnet (**public**) |
| Chainlist.org | https://github.com/DefiLlama/chainlist/pull/2935 (**merged** — 4111 + 4112 live) |
| ethereum-lists | https://github.com/ethereum-lists/chains/pull/8519 (still open) |

On https://chainlist.org: search **4111** = mainnet; search **4112** + **Include Testnets** = testnet.  
Details: `docs/GITHUB-AND-CHAINLIST.md`.

**Audited:** public Git has no SSH passwords, miner/faucet keys, GitHub PAT, or live SQL secrets. Only public URLs, addresses, example placeholders, and peer enodes.

## Faucet behaviour (testnet)

- User provides **wallet address only** (no private key).
- API signs with `FAUCET_PRIVATE_KEY` (faucet wallet), amount `FAUCET_AMOUNT_WEI` (default 1000 tECNA).
- Faucet wallet is funded in **testnet genesis** (separate from treasury).

## Do not

- Publish Shanghai/Cancun/Prague as chain EVM for this Clique Geth stack (stock Geth: `clique does not support shanghai fork`)
- Put `shanghaiTime` back into `genesis.json`
- Share obsolete enodes (`e11f51…` mainnet / `9ad0e0…` testnet) — use current `static-nodes.json`
- Wipe chaindata **without** keeping/restoring pinned `docker/nodekey` (enode rotates; exchanges break)
- Commit `docker/nodekey`, `.env`, `miner-private.hex`, `faucet-private.hex`, `password-dev.txt`, or `*.local.json` / `DEPLOY-SERVER.local.md`
- Expose Geth `8545`/`18545` on `0.0.0.0`
- Point nginx public RPC straight at Geth (bypass guard)
- Wipe only one network’s SQL while leaving the other inconsistent after a dual genesis reset
- Use obsolete host `50.28.84.113` in docs or examples — use `*.ecnascan.com`
- Leave `%TEMP%\ecna-*` or `.tmp-github/` clones after GitHub work

## Naming / PR checklist

- UI / env defaults: **E Canna** / **ECNA** / **E Canna Testnet** / **tECNA**
- Chain display: **E Canna Mainnet** / **E Canna Testnet**
- Supply copy: **1 Crore (10,000,000)** not 1B
- EVM copy: **london** (never shanghai/cancun as chain default)
- After enode/nodekey change: update `static-nodes.json` + GitHub + `docs/EXCHANGE-LISTING*.md` + this file
- Docs in **English**
- Addresses → `docs/ADDRESSES-LIVE.md`
- After any agent temp files: delete them; never leave `*.log` / `*.tgz` / `*.zip` in the repo root
