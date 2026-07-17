# ECNA Stack — Knowledge Transfer (KT)

**Audience:** Developers / DevOps joining the ECNASCAN project  
**Scope:** Mainnet + Testnet (production on DigitalOcean)  
**Last updated:** 17 July 2026 (London genesis wipe + pinned P2P nodekeys + exchange listing fixes)  
**Domain:** `ecnascan.com`  
**Production server IP:** `168.144.69.102`

### Native token (live)

| Field | Value |
|-------|--------|
| **Full Name** | E Canna |
| **Short Name** | ECNA |
| **Total Supply (mainnet genesis)** | **1 Crore** (10,000,000 ECNA) |
| Decimals | 18 |
| Genesis wei (mainnet treasury) | `10000000000000000000000000` (`10_000_000 * 10^18`) |
| **EVM** | **london** (no `shanghaiTime`) |
| **Geth** | **v1.13.15-stable** |
| Mainnet genesis hash | `0xeac82b18632cf693d4b57d319cefece0349ebcf20bc76bdf5c04216126cb3e1b` |

Testnet native symbol: **tECNA** (E Canna Testnet).

**Canonical address table (ops / agents / new developers):** [`docs/ADDRESSES-LIVE.md`](./ADDRESSES-LIVE.md).  
**Short briefing for humans + AI:** [`AGENTS.md`](../AGENTS.md).  
**GitHub + Chainlist + exchange:** [`docs/GITHUB-AND-CHAINLIST.md`](./GITHUB-AND-CHAINLIST.md).  
**Exchange listing packs:** [`docs/EXCHANGE-LISTING.md`](./EXCHANGE-LISTING.md) · [`docs/EXCHANGE-LISTING-TESTNET.md`](./EXCHANGE-LISTING-TESTNET.md).

> **Timeline:** Client go-live wipe 15 July 2026 (RPC harden). **17 July 2026:** removed `shanghaiTime` (stock Geth Clique cannot sync Shanghai) and re-genesis’d both nets; pinned `docker/nodekey` so enode IDs stay stable; updated GitHub `static-nodes.json`. Miner `0x9F926a69ba55c2F436A51108f8eb96E21fC5a329`. Public RPC must stay behind `rpc-public-guard`.

---

## Table of contents

1. [What is this project?](#1-what-is-this-project)
2. [Architecture overview](#2-architecture-overview)
3. [Mainnet vs Testnet](#3-mainnet-vs-testnet)
3b. [Live addresses (go-live)](#3b-live-addresses-go-live)
4. [Repository layout](#4-repository-layout)
5. [Production server](#5-production-server)
6. [Environment variables](#6-environment-variables)
7. [Deploy & publish code](#7-deploy--publish-code)
8. [Chain (Geth / Clique PoA)](#8-chain-geth--clique-poa)
8b. [P2P peers, nodekey, exchange sync](#8b-p2p-peers-nodekey-exchange-sync)
9. [Database (SQL Server)](#9-database-sql-server)
10. [API & indexer (PM2)](#10-api--indexer-pm2)
11. [Frontends (explorer, website, dashboard)](#11-frontends-explorer-website-dashboard)
12. [Contract deploy from Remix / Hardhat](#12-contract-deploy-from-remix--hardhat)
13. [Contract verification (explorer)](#13-contract-verification-explorer)
14. [Token branding (logo, social links)](#14-token-branding-logo-social-links)
15. [Validators (multiple signers)](#15-validators-multiple-signers)
16. [Testnet faucet](#16-testnet-faucet)
17. [Local development](#17-local-development)
18. [Common tasks cheat sheet](#18-common-tasks-cheat-sheet)
19. [Troubleshooting](#19-troubleshooting)
20. [Security & credentials](#20-security--credentials)
21. [Related docs](#21-related-docs)

---

## 1. What is this project?

**ECNASCAN** is a BscScan-style block explorer + API stack for a private **EVM-compatible L1** branded **E Canna** (ticker **ECNA**).

| Layer | Technology |
|-------|------------|
| Blockchain | Geth, Clique Proof-of-Authority (PoA) |
| Indexer + REST API | Node.js, Express, Prisma, ethers.js |
| Database | Microsoft SQL Server (Docker on server) |
| Frontends | React + Vite (explorer, website, dashboard) |
| Smart contracts | Solidity 0.8.x, Hardhat, OpenZeppelin |
| Process manager | PM2 |
| Reverse proxy | Nginx + Certbot (HTTPS) |

**Two live networks** run on the **same physical server**, fully isolated:

- **Mainnet** — **E Canna (ECNA)**, chain ID **4111**, genesis supply **1 Crore**
- **Testnet** — **E Canna Testnet (tECNA)**, chain ID **4112**, includes a **faucet**

---

## 2. Architecture overview

```
                    ┌─────────────────────────────────────────┐
                    │         Server 168.144.69.102           │
                    │                                         │
  Users / MetaMask  │  Nginx (HTTPS)                          │
        │           │    ├─ explorer.ecnascan.com              │
        ▼           │    ├─ testnetexplorer.ecnascan.com       │
                    │    ├─ api.ecnascan.com  ──► PM2 :4000    │
                    │    ├─ testnetapi...     ──► PM2 :4001    │
                    │    ├─ rpc.ecnascan.com  ──► Geth :8545    │
                    │    └─ testnetrpc...     ──► Geth :18545  │
                    │                                         │
                    │  SQL Server (Docker ecna-mssql :1433)     │
                    │    ├─ Db_ECNAChain      (mainnet index) │
                    │    └─ Db_ECNATestnet    (testnet index)   │
                    └─────────────────────────────────────────┘
```

**Data flow:**

1. Geth produces blocks (validator signs with Clique key).
2. **Indexer** (`server/dist/indexer.js`) polls RPC, writes blocks/txs/logs to SQL.
3. **API** (`server/dist/index.js`) serves explorer UI + public JSON endpoints.
4. Explorer static files served from `/var/www/explorer` (mainnet) and `/var/www/testnetexplorer` (testnet).

**Important:** The database is an **index**, not the source of truth. Chain truth = Geth RPC. If DB and chain diverge, re-sync indexer from RPC (do not “fix” chain from DB).

---

## 3. Mainnet vs Testnet

| Item | Mainnet | Testnet |
|------|---------|---------|
| Chain ID | **4111** | **4112** |
| Native full name | **E Canna** | **E Canna Testnet** |
| Native symbol | **ECNA** | **tECNA** |
| Display name | E Canna Mainnet | E Canna Testnet |
| Genesis supply (live) | **1 Crore (10,000,000)** to treasury | Treasury **100M** + faucet **100M** tECNA |
| Live miner (Clique) | `0x9F926a69ba55c2F436A51108f8eb96E21fC5a329` | same miner address (separate chain/key file) |
| Live treasury | `0x34c7288B86E10A7096523FB1d6eC12948af95897` | `0x2509e87b12DAD407DC3521Dd15A95B3F74EF41D3` |
| Faucet wallet | — (disabled) | `0x93994c8B2557B74Ae988640444268CD3473D6f68` |
| Explorer | https://explorer.ecnascan.com | https://testnetexplorer.ecnascan.com |
| API | https://api.ecnascan.com | https://testnetapi.ecnascan.com |
| RPC (public) | https://rpc.ecnascan.com → guard `:28545` | https://testnetrpc.ecnascan.com → guard `:28546` |
| Website | https://ecnascan.com (shows both networks) | — |
| Geth HTTP (internal only) | `127.0.0.1:8545` (not public) | `127.0.0.1:18545` (not public) |
| API port (internal) | **4000** | **4001** |
| SQL database | `Db_ECNAChain` | `Db_ECNATestnet` |
| App root on server | `/opt/ecnascan` | `/opt/ecnascan-testnet` |
| Geth data | `/opt/ecnascan/ecnachain/data` | `/opt/ecnascan-testnet/ecnachain/data` |
| PM2 API | `ecna-api` | `ecna-api-testnet` |
| PM2 indexer | `ecna-indexer` | `ecna-indexer-testnet` |
| Faucet | No | Yes (1000 tECNA / wallet / 24h) |
| Validator keys | `ecnachain/docker/miner-private.hex` | `testnet/ecnachain/docker/` (separate keys) |

**Rule:** Testnet scripts must **never** wipe mainnet `ecnachain/data/`. They use separate paths, DB, ports, and PM2 processes.

---

## 3b. Live addresses (go-live)

Full detail: [`docs/ADDRESSES-LIVE.md`](./ADDRESSES-LIVE.md).

| Role | Mainnet | Testnet |
|------|---------|---------|
| Miner (seals blocks) | `0x9F926a69ba55c2F436A51108f8eb96E21fC5a329` | `0x9F926a69ba55c2F436A51108f8eb96E21fC5a329` |
| Treasury (premine) | `0x34c7288B86E10A7096523FB1d6eC12948af95897` | `0x2509e87b12DAD407DC3521Dd15A95B3F74EF41D3` |
| Faucet (auto-sends) | n/a | `0x93994c8B2557B74Ae988640444268CD3473D6f68` |

**Ops keys (server only, not in git):**

- Mainnet miner → `/opt/ecnascan/ecnachain/docker/miner-private.hex`
- Testnet miner → `/opt/ecnascan-testnet/ecnachain/docker/miner-private.hex`
- Testnet faucet → `/opt/ecnascan-testnet/server/.env` (`FAUCET_PRIVATE_KEY`) + `docker/faucet-private.hex`

**Fresh dual-network wipe + republish:**

```powershell
.\scripts\deploy-fresh-golive.ps1
```

This stops PM2, wipes Geth data for both nets, installs genesis, clears SQL (`Db_ECNAChain` + `Db_ECNATestnet`), restarts, publishes website/dashboard/explorers.

**Public RPC harden** (after go-live / if spam txs from miner appear):

```bash
bash /opt/ecnascan/scripts/harden-rpc-live.sh
```

Blocks public `eth_sendTransaction` (unlocked-miner drain). MetaMask / faucet use `eth_sendRawTransaction`. See `docs/ADDRESSES-LIVE.md` § Public RPC hardening.

---

## 4. Repository layout

```
Blockchain/                          # Monorepo root
├── ecnachain/                       # Mainnet Geth + genesis + Docker
├── testnet/ecnachain/               # Testnet Geth templates (copied to /opt/ecnascan-testnet)
├── server/                          # API + indexer + Prisma schema
├── apps/
│   ├── explorer/                    # Block explorer UI
│   ├── website/                     # Marketing / landing site
│   └── dashboard/                   # Dashboard UI
├── contracts/                       # Hardhat smart contracts
├── scripts/                         # Deploy scripts (see below)
├── docs/                            # Documentation (this file, TESTNET.md, etc.)
├── ecosystem.config.cjs             # PM2 mainnet
└── ecosystem.testnet.config.cjs     # PM2 testnet
```

### Key scripts

| Script | Purpose |
|--------|---------|
| `scripts/deploy-hotfix.ps1` | **Routine publish** — server + explorer to mainnet & testnet (from Windows laptop) |
| `scripts/deploy-upload.ps1` | Full project upload to server (first time / major) |
| `scripts/deploy-server.sh` | Full server setup (Geth, API, nginx, SSL) — run **on server** |
| `scripts/deploy-testnet.sh` | Deploy testnet chain + DB + PM2 — run **on server** |
| `scripts/deploy-mainnet-frontend.sh` | Rebuild mainnet website + explorer with cross-network links |
| `scripts/DEPLOY-SERVER.local.md` | **Local only** — SSH + publish quick reference (gitignored) |
| `scripts/deploy-server.credentials.local.json` | **Local only** — SSH credentials for scripts (gitignored) |

---

## 5. Production server

| Item | Value |
|------|--------|
| Provider | DigitalOcean |
| IP | `168.144.69.102` |
| SSH user | `root` |
| SSH password | See `scripts/DEPLOY-SERVER.local.md` (not in git) |

### SSH login

```powershell
ssh root@168.144.69.102
```

### Important paths on server

| Path | Contents |
|------|----------|
| `/opt/ecnascan` | Mainnet codebase |
| `/opt/ecnascan-testnet` | Testnet server + chain (explorer built from mainnet repo) |
| `/opt/ecnascan/server/.env` | Mainnet API/indexer config (**do not overwrite from laptop**) |
| `/opt/ecnascan-testnet/server/.env` | Testnet API/indexer config |
| `/var/www/explorer` | Mainnet explorer static build |
| `/var/www/testnetexplorer` | Testnet explorer static build |
| `/var/www/website` | Website static build |
| Docker `ecna-mssql` | SQL Server on `127.0.0.1:1433` |

---

## 6. Environment variables

### Server (`server/.env`)

Each network has its **own** `.env` on the server. Laptop `.env` files are for local dev only.

| Variable | Mainnet example | Testnet example |
|----------|-----------------|-----------------|
| `DATABASE_URL` | `...Db_ECNAChain...` | `...Db_ECNATestnet...` |
| `PORT` | `4000` | `4001` |
| `NETWORK_KIND` | `mainnet` | `testnet` |
| `RPC_URL` | `http://127.0.0.1:8545` | `http://127.0.0.1:18545` |
| `CHAIN_ID` | `4111` | `4112` |
| `NATIVE_SYMBOL` | `ECNA` | `tECNA` |
| `NATIVE_NAME` | `E Canna` | `E Canna Testnet` |
| `ECNA_PRIMARY_ADDRESS` / `ECNA_VALIDATORS` | `0x9F926a69ba55c2F436A51108f8eb96E21fC5a329` | same miner |
| `ECNA_NATIVE_MINT_ADDRESS` | `0x34c7288B86E10A7096523FB1d6eC12948af95897` | `0x2509e87b12DAD407DC3521Dd15A95B3F74EF41D3` |
| `FAUCET_ENABLED` | `0` | `1` |
| `FAUCET_PRIVATE_KEY` / `ECNA_FAUCET_ADDRESS` | unset | faucet `0x93994c8B…` |
| `EXPLORER_PUBLIC_URL` | `https://explorer.ecnascan.com` | `https://testnetexplorer.ecnascan.com` |

**Critical:** On server, `DATABASE_URL` must use `127.0.0.1:1433` (not laptop tunnel port `14333`).

Testnet PM2 loads env via `SERVER_ENV_FILE=/opt/ecnascan-testnet/server/.env` (see `ecosystem.testnet.config.cjs`).

### Explorer build (`apps/explorer/.env`)

Set at **build time** (Vite). Different `.env` for mainnet vs testnet builds on server.

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | API base URL |
| `VITE_RPC_URL` | Public RPC for wallet connect |
| `VITE_CHAIN_ID` | 4111 or 4112 |
| `VITE_NETWORK_KIND` | `mainnet` or `testnet` |
| `VITE_PEER_EXPLORER_URL` | Link to other network’s explorer |

### Contracts (`contracts/.env`)

| Variable | Purpose |
|----------|---------|
| `PETH_RPC_URL` / `RPC_URL` | Target chain RPC |
| `PETH_CHAIN_ID` | 4111 or 4112 |
| `DEPLOYER_PRIVATE_KEY` | Wallet that deploys contracts |

### Chain genesis (`ecnachain/.env`)

| Variable | Purpose |
|----------|---------|
| `ECNA_VALIDATORS` | Comma-separated Clique signer addresses |
| `ECNA_TREASURY` / `ECNA_NATIVE_MINT_ADDRESS` | Genesis premine recipient |
| `ECNA_CHAIN_ID` | 4111 or 4112 |

---

## 7. Deploy & publish code

### Routine code update (most common)

From laptop, project root:

```powershell
.\scripts\deploy-hotfix.ps1
```

This script:

1. Reads SSH from `scripts/deploy-server.credentials.local.json`
2. Uploads `server/` and `apps/explorer/` (excludes `server/.env`)
3. Runs `prisma db push` on both databases
4. Builds server + both explorer variants
5. Restarts all four PM2 processes

**Never** include laptop `server/.env` in uploads — it will break production DB connection.

### Full first-time deploy

```powershell
.\scripts\deploy-upload.ps1 -ServerIp 168.144.69.102
```

Then on server:

```bash
bash /opt/ecnascan/scripts/deploy-server.sh
```

### Deploy testnet only (chain + API, does not touch mainnet data)

```bash
bash /opt/ecnascan/scripts/deploy-testnet.sh
```

### Verify deploy

```bash
pm2 status
curl -s http://127.0.0.1:4000/health   # mainnet
curl -s http://127.0.0.1:4001/health   # testnet
```

---

## 8. Chain (Geth / Clique PoA)

- **Consensus:** Clique — only addresses in genesis `extraData` signers can produce blocks.
- **Block time:** ~3 seconds.
- **EVM:** **London** only on mainnet & testnet. Stock Geth rejects Clique + Shanghai (`clique does not support shanghai fork`) — genesis must **not** set `shanghaiTime`. Remix/Hardhat: **EVM = london** (not shanghai/cancun/prague).
- **Genesis:** Built with `ecnachain/scripts/build-genesis.mjs`.

### Regenerate genesis (new chain only — wipes history)

```bash
cd ecnachain
export ECNA_VALIDATORS="0xSigner1,0xSigner2"
export ECNA_TREASURY="0xTreasury..."
export ECNA_CHAIN_ID=4111
node scripts/build-genesis.mjs
# Remove old data/, re-init geth, restart docker
```

### Mainnet Geth (Docker)

```bash
cd /opt/ecnascan/ecnachain
docker compose -p ecna-mainnet ps
docker compose -p ecna-mainnet logs -f validator1
```

### Testnet Geth

```bash
cd /opt/ecnascan-testnet/ecnachain
docker compose -p ecna-testnet ps
```

### MetaMask network

| Field | Mainnet | Testnet |
|-------|---------|---------|
| RPC | https://rpc.ecnascan.com | https://testnetrpc.ecnascan.com |
| Chain ID | 4111 | 4112 |
| Symbol | ECNA | tECNA |
| Currency / EVM | ECNA / **london** | tECNA / **london** |

---

## 8b. P2P peers, nodekey, exchange sync

### Why exchanges failed (July 2026 lessons)

| Symptom | Cause | Fix |
|---------|--------|-----|
| `clique does not support shanghai fork` | Genesis had `shanghaiTime` | London-only genesis (no Shanghai); wipe + re-init |
| `admin.addPeer` → `true` but `admin.peers` = `[]` | Wrong/obsolete enode after wipe | Use current `static-nodes.json` from GitHub |
| `eth.syncing` shows `currentBlock: 0`, `highestBlock > 0` | Sync starting | Wait; not an error |
| `etherbase must be explicitly specified` | Sync-only node (no miner) | Ignore |

### Current peers (also in `static-nodes.json` + GitHub)

**Mainnet (30303):**
```
enode://6728dde6587af2b1ed676261d486319254cd3ad1a7721d779210e108ccced65e9b020ffc59a1f5b4ca0ce2120dcbba66488cc46b7679a7702d0e3a223e70b62e@168.144.69.102:30303
```

**Testnet (30313):**
```
enode://f762fd2f93af7d072aa497fab66e5e54800b9de96becd13b79378d2b89b6e567c6d703cf16a977e4463205b373c1b86b241c860a1d609405139f340938b96112@168.144.69.102:30313
```

**Obsolete (never share):** mainnet `e11f51…`, testnet `9ad0e0…`.

### Pinning enode across wipes

| Item | Path |
|------|------|
| Mainnet nodekey (gitignored) | `ecnachain/docker/nodekey` → `/opt/ecnascan/ecnachain/docker/nodekey` |
| Testnet nodekey (gitignored) | `testnet/ecnachain/docker/nodekey` → `/opt/ecnascan-testnet/ecnachain/docker/nodekey` |
| Entrypoint | Copies `/secrets/nodekey` into datadir; starts with `--nat extip:168.144.69.102` |
| Public file | `ecnachain/static-nodes.json` (committed / GitHub) |

After `deploy-fresh-golive.ps1`: confirm `docker exec … geth attach --exec admin.nodeInfo.enode` matches `static-nodes.json`. If not, update laptop + GitHub + `AGENTS.md` + this KT.

### Exchange checklist (tell partners)

1. Ubuntu 22.04/24.04, Geth **v1.13.15**, `--syncmode full`
2. Wipe old datadir; `geth init` with **current** GitHub genesis
3. Copy **current** `static-nodes.json` (or `admin.addPeer` with enode above)
4. Outbound TCP+UDP to `168.144.69.102:30303` (mainnet) or `:30313` (testnet)
5. Expect `admin.peers` length ≥ 1, then rising `eth.blockNumber`
6. Optional: use public RPC `https://rpc.ecnascan.com` without running a node

Full packs: [`docs/EXCHANGE-LISTING.md`](./EXCHANGE-LISTING.md), [`docs/EXCHANGE-LISTING-TESTNET.md`](./EXCHANGE-LISTING-TESTNET.md).

---

## 9. Database (SQL Server)

| Database | Network | Purpose |
|----------|---------|---------|
| `Db_ECNAChain` | Mainnet | Indexed blocks, txs, verifications, token profiles |
| `Db_ECNATestnet` | Testnet | Same schema, separate data |

**Schema:** `server/prisma/schema.prisma`

Important models:

| Model | Purpose |
|-------|---------|
| `Block`, `Transaction`, `TokenTransfer` | Indexer data |
| `ContractVerification` | Verified source + ABI (immutable after create) |
| `ContractTokenProfile` | Token logo, website, social links |
| `SiteUser` | Website register/login |

### Apply schema changes

On server (mainnet):

```bash
cd /opt/ecnascan/server
npx prisma db push
npm run build
pm2 restart ecna-api ecna-indexer
```

Testnet (use mainnet’s prisma binary):

```bash
cd /opt/ecnascan-testnet/server
/opt/ecnascan/node_modules/.bin/prisma db push
cp -r /opt/ecnascan/server/dist dist
pm2 restart ecna-api-testnet ecna-indexer-testnet
```

---

## 10. API & indexer (PM2)

| Process | Script | Env file |
|---------|--------|----------|
| `ecna-api` | `server/dist/index.js` | `/opt/ecnascan/server/.env` |
| `ecna-indexer` | `server/dist/indexer.js` | same |
| `ecna-api-testnet` | same build | `/opt/ecnascan-testnet/server/.env` |
| `ecna-indexer-testnet` | same build | same |

```bash
pm2 logs ecna-api --lines 100
pm2 restart ecna-api ecna-indexer
pm2 restart ecna-api-testnet ecna-indexer-testnet
pm2 save
```

### Useful API endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | API + DB status |
| `GET /api/v1/config` | RPC URL, chain ID, validators, faucet flag |
| `GET /api/v1/contract/:addr/verified` | Verified source + ABI |
| `POST /api/verify/etherscan` | Submit verification |
| `GET /api/v1/contract/:addr/token-profile` | Token branding |
| `PUT /api/v1/contract/:addr/token-profile` | Update branding (signed) |
| `POST /api/v1/faucet` | Testnet only — request tECNA |

---

## 11. Frontends (explorer, website, dashboard)

| App | Folder | Production path |
|-----|--------|-----------------|
| Explorer | `apps/explorer` | `/var/www/explorer` or `/var/www/testnetexplorer` |
| Website | `apps/website` | `/var/www/website` |
| Dashboard | `apps/dashboard` | `/var/www/dashboard` |

Build (example mainnet explorer):

```bash
cd /opt/ecnascan
# set apps/explorer/.env first
npm run build -w apps/explorer
cp -r apps/explorer/dist/* /var/www/explorer/
```

Dual-network links: website and explorer read peer URLs from `VITE_*` env vars (see `apps/website/src/lib/networks.ts`).

---

## 12. Contract deploy from Remix / Hardhat

### ECNA EVM (Remix / Hardhat)

ECNA uses **London** on mainnet and testnet. Upstream Geth Clique **cannot** enable Shanghai — exchange sync nodes fail with `clique does not support shanghai fork` if `shanghaiTime` is in genesis.

| Setting | Allowed | Notes |
|---------|---------|-------|
| Solidity version | 0.8.x | For 0.8.20+, explicitly set EVM **london** |
| EVM target | **london**, paris, berlin | Remix: set **london** |
| Shanghai / Cancun / Prague | Not supported | Stock Geth Clique rejects Shanghai+; Cancun breaks mining |

### Remix checklist

1. Compile → Advanced → **EVM Version = london**
2. Deploy & run → Environment: **Injected Provider** (MetaMask)
3. MetaMask on correct network (4111 or 4112)
4. Deploy contract
5. Copy **contract address** and **deployment tx input data**

### Hardhat

`contracts/hardhat.config.cjs` sets:

```js
evmVersion: "london"
```

Deploy to mainnet:

```bash
cd contracts
npm run deploy   # or network-specific script in package.json
```

---

## 13. Contract verification (explorer)

**URL:** Explorer → **Verify & Publish** (`/verify`)

### Rules (strict)

1. **Bytecode must match** on-chain code (creation bytecode + tx input, or deployed bytecode).
2. **Once verified — locked.** No update, no re-verify.
3. **Shanghai/Cancun/Prague EVM rejected** at API level (use **london**).
4. Default EVM on verify form: **london**.
5. Bytecode must match on-chain (strict). Once verified — locked.

### What to paste

| Field | Source |
|-------|--------|
| Source code | Remix or `.sol` file |
| ABI | Compiler output / artifact JSON |
| Compiler version | Must match compile (e.g. `v0.8.24+commit...`) |
| EVM version | `london` (or paris — must match compile) |
| Compiler bytecode | Artifact `bytecode` / `bytecode.object` |
| Creation tx input | Full hex from deployment transaction |
| Deployed bytecode | Artifact `deployedBytecode` (optional if creation match provided) |

Auto-fill: Step 2 loads bytecode and creation tx from API when indexer has the deployment tx.

### API

```http
POST /api/verify/etherscan
Content-Type: application/json

{
  "address": "0x...",
  "contractName": "MyToken",
  "sourceCode": "...",
  "abi": "[...]",
  "compilerVersion": "v0.8.24+commit.e11b9ed9",
  "evmVersion": "london",
  "compilerCreationBytecode": "0x...",
  "creationTxInput": "0x...",
  "optimizationUsed": "1",
  "runs": "200"
}
```

---

## 14. Token branding (logo, social links)

After deploying a token contract, the **deployer wallet** can add metadata on the token page.

| Field | Example |
|-------|---------|
| Logo URL | `https://.../logo.png` |
| Website | `https://myproject.com` |
| Twitter / X | Profile URL |
| Discord, Telegram | Invite / channel URLs |
| Description | Short text |

**How:**

1. Open token page on explorer → **Info** tab
2. **Connect deployer wallet** (same address that sent the deploy transaction)
3. Fill fields → **Save profile** → sign message in wallet

**API:** `PUT /api/v1/contract/:addr/token-profile` with `signature`, `signerAddress`, `timestamp`.

Deployer is resolved from indexed deployment transaction (`Transaction.from` where `deployedContractAddress` matches).

---

## 15. Validators (multiple signers)

Clique allows multiple signers listed in genesis.

### Configure

In `ecnachain/.env` or server `.env`:

```env
ECNA_VALIDATORS=0x9F926a69ba55c2F436A51108f8eb96E21fC5a329
# Multi-signer later: comma-separate more addresses (needs genesis rebuild + their keys online)
```

Rebuild genesis:

```bash
node ecnachain/scripts/build-genesis.mjs
```

**Warning:** Changing validators on a **live** chain requires new genesis → **new chain** (all history lost). Plan validator set before mainnet launch.

`/api/v1/config` returns `validators: [...]` for explorer display.

Second validator node: see `ecnachain/docker-compose.validator2.yml` and `ecnachain/docs/DEPLOYMENT.md`.

---

## 16. Testnet faucet

| Item | Value |
|------|--------|
| URL | `POST https://testnetapi.ecnascan.com/api/v1/faucet` |
| Body | `{"address":"0xYourWallet"}` |
| Limit | 1000 tECNA per address per 24 hours |
| Explorer UI | Testnet explorer → **Faucet** page |

Requires `FAUCET_ENABLED=1` in `/opt/ecnascan-testnet/server/.env`, `FAUCET_PRIVATE_KEY` for
`0x93994c8B2557B74Ae988640444268CD3473D6f68`, and faucet balance from genesis (currently 100M tECNA).

---

## 17. Local development

From repo root:

```bash
npm install
npm run local:bootstrap          # prisma + compile contracts
npm run ecnachain:docker         # local Geth (or use remote RPC)
npm run local:stack              # API + indexer + explorer + dashboard
```

| Service | Local URL |
|---------|-----------|
| API | http://localhost:4000 |
| Explorer | http://localhost:5174 |
| Geth RPC | http://localhost:8545 |

See also:

- `docs/SIMPLE-GUIDE.md` — quick overview
- `docs/LOCAL-DEV-COMMANDS.md` — command reference
- `docs/LIVE-FROM-ZERO.md` — production from scratch

---

## 18. Common tasks cheat sheet

| Task | Command / action |
|------|------------------|
| Publish code changes | `.\scripts\deploy-hotfix.ps1` |
| SSH to server | `ssh root@168.144.69.102` |
| Check services | `pm2 status` |
| Mainnet API logs | `pm2 logs ecna-api` |
| Restart mainnet API | `pm2 restart ecna-api ecna-indexer` |
| Restart testnet API | `pm2 restart ecna-api-testnet ecna-indexer-testnet` |
| DB schema update | `npx prisma db push` in `server/` |
| Rebuild mainnet explorer | `npm run build -w apps/explorer` + copy to `/var/www/explorer` |
| Verify contract | Explorer → Verify & Publish (EVM london + bytecode proof) |
| Add token logo | Token page → Info → connect deployer wallet |
| Request testnet coins | Testnet explorer faucet or POST `/api/v1/faucet` |
| Add validator | `ECNA_VALIDATORS=0x...,0x...` + rebuild genesis (new chain) |

---

## 19. Troubleshooting

| Problem | Likely cause | Fix |
|---------|--------------|-----|
| Remix deploy fails / invalid opcode | EVM set to shanghai/cancun/prague | Set Remix EVM to **london** |
| Higher solc deploy fails | Wrong EVM version (PUSH0) | Advanced → EVM Version → **london** |
| Exchange: `clique does not support shanghai fork` | Old genesis with `shanghaiTime` | Re-download London genesis; wipe their `data/` |
| Exchange: `addPeer` true, `peers` empty | Obsolete enode after our wipe | Give current enode from `static-nodes.json` / AGENTS.md |
| Exchange: sync stays at 0 forever | Firewall or wrong networkid | Open outbound 30303/30313; `--networkid 4111` / `4112`; `--syncmode full` |
| Verify rejected “bytecode mismatch” | Wrong optimizer / compiler / EVM | Recompile with exact same settings; paste correct bytecode |
| Verify “already verified” | Address was verified before | Cannot re-verify (by design) |
| API “database down” | Wrong `DATABASE_URL` in server `.env` | Use `127.0.0.1:1433` on server; check `docker ps` for `ecna-mssql` |
| Explorer shows old UI | Static files not updated | Rebuild explorer + `cp` to `/var/www/...` |
| Indexer behind chain head | Normal catch-up or stuck | `pm2 logs ecna-indexer`; check RPC; increase `INDEXER_BATCH_SIZE` |
| Token profile “not deployer” | Wrong wallet connected | Use wallet that sent deploy tx |
| Testnet works, mainnet broken | Separate `.env` files | Fix `/opt/ecnascan/server/.env` only — don’t mix with testnet |
| Higher solc works locally but not after deploy | Compiled with shanghai/PUSH0 | Recompile with EVM **london**; Geth logs must not list Shanghai |
| Enode changed after wipe | `nodekey` not pinned / not restored | Keep `docker/nodekey`; update `static-nodes.json` + GitHub |

---

## 20. Security & credentials

| Secret | Where stored |
|--------|--------------|
| SSH password | `scripts/DEPLOY-SERVER.local.md` + `deploy-server.credentials.local.json` (**gitignored**) |
| SQL password | Server `server/.env` only |
| Validator private keys | `ecnachain/docker/miner-private.hex` (mainnet), `testnet/ecnachain/docker/miner-private.hex` |
| Faucet private key | `testnet/server/.env` → `FAUCET_PRIVATE_KEY` + `testnet/ecnachain/docker/faucet-private.hex` |
| Deployer keys | `contracts/.env` — never commit |

**Do not commit:**

- `**/.env` (except `.env.example`)
- `scripts/DEPLOY-SERVER.local.md`
- `scripts/deploy-server.credentials.local.json`

Rotate SSH and DB passwords if shared externally. Prefer SSH keys for production access.

---

## 21. Related docs

| Document | Topic |
|----------|--------|
| `AGENTS.md` | Short briefing for humans + AI agents |
| `docs/ADDRESSES-LIVE.md` | **Live** miner / treasury / faucet addresses after go-live |
| `docs/GITHUB-AND-CHAINLIST.md` | Private GitHub repos + Chainlist / ethereum-lists PR status |
| `docs/chainlist/` | Chainlist submission JSON/JS + howto |
| `docs/TESTNET.md` | Testnet URLs, deploy, faucet |
| `docs/SIMPLE-GUIDE.md` | Short ECNA + PETH overview |
| `docs/LIVE-FROM-ZERO.md` | Production setup from scratch |
| `docs/API-LIVE-DEPLOY.md` | API + domain deployment |
| `docs/LOCAL-DEV-COMMANDS.md` | Local dev commands |
| `ecnachain/docs/DEPLOYMENT.md` | Validators, bootnodes, hardening |
| `ecnachain/docs/BACKUP-RECOVERY.md` | Chain backup |
| `scripts/DEPLOY-SERVER.local.md` | SSH + publish quick reference (local) |

---

## Quick reference card

```
MAINNET                          TESTNET
─────────────────────────────────────────────────────────
Full name   E Canna              E Canna Testnet
Symbol      ECNA                 tECNA
Supply      1 Crore → treasury   100M treasury + 100M faucet
Miner       0x9F926a69…5a329     0x9F926a69…5a329
Treasury    0x34c7288B…af95897   0x2509e87b…4EF41D3
Faucet      (off)                0x93994c8B…3D6f68
Chain ID    4111                 4112
Explorer    explorer.ecnascan.com testnetexplorer.ecnascan.com
API         api.ecnascan.com     testnetapi.ecnascan.com
RPC         rpc.ecnascan.com     testnetrpc.ecnascan.com
Server path /opt/ecnascan        /opt/ecnascan-testnet
DB          Db_ECNAChain         Db_ECNATestnet
PM2         ecna-api             ecna-api-testnet
EVM deploy  london               london
P2P         :30303 (enode 6728…) :30313 (enode f762…)
Genesis     no shanghaiTime      no shanghaiTime
Geth        v1.13.15             v1.13.15
Code pub    .\scripts\deploy-hotfix.ps1
Chain wipe  .\scripts\deploy-fresh-golive.ps1
Addresses   docs/ADDRESSES-LIVE.md
Exchange    docs/EXCHANGE-LISTING.md (+ TESTNET)
Agents      AGENTS.md
```

---

*For questions about this KT doc, update `docs/KT-ECNA-MAINNET-TESTNET.md` when architecture, enodes, or URLs change.*
