# Server migration & operations runbook

Step-by-step guide for **first-time setup**, **resume after stop**, and **migrating to a new server** without accidentally creating a new chain or re-minting native ECNA.

**Quick reference (plain text):** [`SETUP_NEW_LAPTOP.txt`](../SETUP_NEW_LAPTOP.txt)

---

## Table of contents

1. [What is preserved vs reset](#1-what-is-preserved-vs-reset)
2. [First time on any machine](#2-first-time-on-any-machine)
3. [Resume after stop](#3-resume-after-stop)
4. [Migrate to a new server](#4-migrate-to-a-new-server)
5. [Upgrade existing server (same host)](#5-upgrade-existing-server-same-host)
6. [Split deployment (chain + API on different hosts)](#6-split-deployment)
7. [Verification checklist](#7-verification-checklist)
8. [Rollback](#8-rollback)

---

## 1. What is preserved vs reset

| Action | Chain history | Native ECNA supply | PETH contract | Explorer DB |
|--------|---------------|--------------------|---------------|-------------|
| Restart Geth Docker | ✅ Continues | ✅ Same (genesis) | ✅ Same address | ✅ Indexer resumes |
| Restart Anvil persistent (`Ctrl+C` then start) | ✅ Continues | ✅ Same state | ✅ Same address | ✅ Indexer resumes |
| Restart API / indexer / UI | ✅ Unchanged | ✅ Unchanged | ✅ Unchanged | ✅ Cursor kept |
| Restart **Hardhat** (`local:node`) | ❌ **New chain** | ❌ New dev accounts | ❌ Need redeploy | ⚠️ Auto-resync or clear |
| `npm run local:fresh` | ❌ New dev DB | Depends on chain | ⚠️ Redeploy needed | ❌ Wiped |
| `npm run local:chain:reset` | ❌ Anvil genesis | ❌ New Anvil state | ⚠️ Redeploy needed | ⚠️ May mismatch |
| `npm run local:deploy` again | Same chain | Unchanged | ❌ **New token address** | N/A |
| New `genesis.json` + `geth init` | ❌ **New chain** | ❌ New genesis alloc | ❌ Redeploy | ❌ Resync |

**Native ECNA** on production Geth is allocated **once in genesis** (local/go-live default: **1 Crore / 10,000,000**). It is never re-generated on resume or restart.

**Indexer** stores `lastBlock` in the database and continues from `lastBlock + 1` on restart. It does not create tokens; it only reads RPC.

---

## 2. First time on any machine

### Prerequisites

| Tool | Version | Required for |
|------|---------|--------------|
| Node.js | 20+ | API, explorer, Hardhat |
| Docker Compose | latest | Production Geth (`ecnachain/`) |
| Foundry (Anvil) | latest | Optional persistent local chain |
| Git | any | Clone / updates |

### Bootstrap (once per machine)

**Windows:**

```powershell
cd C:\path\to\Blockchain
.\bootstrap-full.ps1
```

**Linux / macOS:**

```bash
cd /path/to/Blockchain
npm run local:bootstrap
```

### Environment files

Copy examples if missing:

```bash
cp server/.env.example server/.env
cp apps/explorer/.env.example apps/explorer/.env
cp apps/dashboard/.env.example apps/dashboard/.env
cp contracts/.env.example contracts/.env
```

Set at minimum:

```env
# server/.env
RPC_URL=http://127.0.0.1:8545
RPC_CHAIN_ID=4111
CHAIN_ID=4111
NATIVE_SYMBOL=ECNA
DATABASE_URL=...
```

> **RPC tip:** If the chain process binds to `127.0.0.1` only (Hardhat), set `RPC_URL=http://127.0.0.1:8545` even when the public IP is different. Geth Docker with `0.0.0.0:8545` can use the public IP.

### Production path (Geth)

```bash
cd ecnachain
cp .env.example .env
# Edit ECNA_PRIMARY_ADDRESS, treasury, etc.
docker compose up -d
cd ..
npm run check:rpc -w contracts
```

### Deploy PETH once (optional)

```bash
# Terminal 1: chain running (Geth or Anvil)
# Terminal 2:
npm run local:deploy
```

Paste `PETH_TOKEN_ADDRESS` into `server/.env` and `VITE_PETH_TOKEN` into `apps/dashboard/.env`.

### Clear indexer (SQL Server + new chain)

```bash
npm run server:clear-indexed
```

### Start stack

```bash
npm run local:stack
```

### Verify

```bash
curl http://localhost:4000/health
curl http://localhost:4000/api/v1/config
```

Open explorer: `http://localhost:5174`

---

## 3. Resume after stop

### Geth (production)

```bash
cd ecnachain
docker compose up -d
cd ..
npm run local:stack
```

**Do not run:** `local:fresh`, `local:deploy`, `geth init`, or replace `data/validator1/geth`.

### Anvil persistent

**Before stopping:** use `Ctrl+C` in the Anvil terminal and wait for exit (flushes `anvil-state.json`).

```bash
# Terminal 1
npm run local:node:persistent

# Terminal 2
npm run local:stack
```

**Do not run:** `local:fresh`, `local:chain:reset`, or `local:deploy`.

### Hardhat — not resumable

Stopping `npm run local:node` destroys the chain. Run [Flow A in SETUP_NEW_LAPTOP.txt](../SETUP_NEW_LAPTOP.txt) again.

### Remote RPC only

```bash
# server/.env already has RPC_URL + DATABASE_URL
npm run local:stack
```

---

## 4. Migrate to a new server

### Phase A — Backup on old server

1. **Stop gracefully**

```bash
cd ecnachain && docker compose down
# Stop API + indexer (PM2/systemd or Ctrl+C on local:stack)
```

2. **Backup chain data**

```powershell
# Windows
cd ecnachain
.\scripts\backup-chain.ps1
```

```bash
# Linux
cd ecnachain
./scripts/backup-chain.sh ./data/validator1
```

3. **Backup database**

- **SQL Server:** full backup of `Db_ECNAChain` (or your DB name)

4. **Export secrets** (encrypted storage, not git)

- `server/.env`
- `ecnachain/.env`
- `ecnachain/docker/miner-private.hex`
- `contracts/.env` (if `DEPLOYER_PRIVATE_KEY` is set)

### Phase B — Restore on new server

1. Install Node 20+, Docker, clone repo
2. `npm run local:bootstrap`
3. Restore `.env` files; **update all hostnames/IPs:**

| Variable | Update to |
|----------|-----------|
| `RPC_URL` | New chain RPC URL |
| `DATABASE_URL` | New DB connection |
| `EXPLORER_PUBLIC_URL` | `https://scan.yourdomain.com` |
| `CORS_ORIGIN` | Explorer + dashboard origins |
| `VITE_API_URL` | New API URL (rebuild frontends) |
| `VITE_RPC_URL` | Public RPC for MetaMask |
| `VITE_EXPLORER_URL` | New explorer URL |

4. **Restore Geth**

```bash
cd ecnachain
docker compose down
./scripts/restore-chain.sh backups/ecna-chaindata-XXXX.tar.gz ./data/validator1
docker compose up -d
```

5. **Restore database** to new SQL Server instance

6. **Apply schema**

```bash
cd server
npx prisma generate
npx prisma db push
```

7. **Production processes**

```bash
cd server
npm run build
npm start              # API
node dist/indexer.js   # Indexer (separate PM2/systemd unit)
```

8. **Rebuild frontends**

```bash
npm run build -w apps/explorer
npm run build -w apps/dashboard
```

9. Run [verification checklist](#7-verification-checklist)

> **Do not** run `local:fresh` or `local:deploy` after migration unless you intentionally want a new chain.

---

## 5. Upgrade existing server (same host)

```bash
git pull
npm install
npm run server:db:push
npm run build -w server
npm run build -w apps/explorer
npm run build -w apps/dashboard
# Restart API, indexer, nginx
cd ecnachain && docker compose pull && docker compose up -d
```

Chain data and DB are unchanged.

---

## 6. Split deployment

| Server | Runs | Firewall |
|--------|------|----------|
| **A** (chain) | `ecnachain/docker compose up -d` | 8545 RPC, 30303 P2P |
| **B** (apps) | API + indexer + static explorer | 4000, 443 |

`server/.env` on B:

```env
RPC_URL=http://SERVER_A_IP:8545
DATABASE_URL=...
```

Users' browsers need `VITE_RPC_URL` pointing to a **publicly reachable** RPC (A or reverse proxy).

---

## 7. Verification checklist

```bash
# RPC + chain ID
npm run check:rpc -w contracts

# API
curl -s http://YOUR_HOST:4000/health | jq .
curl -s http://YOUR_HOST:4000/api/v1/config | jq .

# Block height advancing
curl -s -X POST http://YOUR_HOST:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

Manual:

- [ ] Explorer shows latest blocks
- [ ] Indexer log shows indexing past previous `lastBlock`
- [ ] MetaMask connects with chain ID `4111`
- [ ] Known treasury balance unchanged after migration

---

## 8. Rollback

If migration fails on new server:

1. Keep old server **stopped** but data intact until verified
2. Point DNS / firewall back to old server
3. Start old stack: `docker compose up -d` + API + indexer
4. Investigate restore logs before decommissioning old host

---

## Related docs

- [`SETUP_NEW_LAPTOP.txt`](../SETUP_NEW_LAPTOP.txt) — copy-paste flows
- [`LOCAL-DEV-COMMANDS.md`](./LOCAL-DEV-COMMANDS.md) — dev cheat sheet
- [`LIVE-FROM-ZERO.md`](./LIVE-FROM-ZERO.md) — production order
- [`API-LIVE-DEPLOY.md`](./API-LIVE-DEPLOY.md) — API + URLs
- [`ecnachain/docs/BACKUP-RECOVERY.md`](../ecnachain/docs/BACKUP-RECOVERY.md) — Geth backup detail
