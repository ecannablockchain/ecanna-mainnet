# ECNASCAN — simple guide (one page)

**Short idea:** Start the chain → deploy PETH **once** → put the token address in `server/.env` → run **API + indexer + explorer**. Changing app code does **not** mean deploying a new token — only restart services.

**Fresh deploy vs resume:** `SETUP_NEW_LAPTOP.txt` section **0**.

**More detail:** `docs/LOCAL-DEV-COMMANDS.md` (commands), `docs/API-LIVE-DEPLOY.md` (live server + domain).

### Defaults aligned for local / live E Canna

- `contracts/.env` — `PETH_RPC_URL`, `PETH_CHAIN_ID`, `RPC_URL` for **4111**; you must set **`DEPLOYER_PRIVATE_KEY`** before deploy.
- `server/.env` — RPC + chain + genesis addresses; paste **`PETH_TOKEN_ADDRESS` after deploy**.
- `apps/explorer/.env` — `VITE_*` defaults.

**Full order from scratch:** [`docs/LIVE-FROM-ZERO.md`](./LIVE-FROM-ZERO.md)

---

## 1) Native ECNA vs PETH (understand this first)

| | Native **ECNA** | **PETH** (ERC-20) |
|--|----------------|-------------------|
| What it is | Chain **gas** / premine — Geth state | **Smart contract** |
| Deploy? | No — handled by the chain | **Once** via Hardhat |
| Address | Each wallet’s balance | **One proxy address** — `PETH_TOKEN_ADDRESS` |

**Wrong:** redeploy a new token on every server code change. **Right:** deploy once, fix the address in `.env`, then only restart.

---

## 2) E Canna chain (Geth Docker)

**Folder:** `ecnachain/`

| Item | Default |
|------|---------|
| Public RPC | `https://rpc.ecnascan.com` |
| Chain ID | **4111** |
| Symbol | **ECNA** |

```bash
cd ecnachain
docker compose up -d
```

**Check (from repo):**

```bash
cd contracts
npm run check:rpc
```

**OK** = node running, chain id **4111**.

**MetaMask:** copy values from `ecnachain/metamask-network.json`.

**If down:** `docker compose ps`, `docker compose logs`; confirm RPC harden / ports; genesis/miner issues → `ecnachain` README / `reset-chain`.

---

## 3) Contracts + PETH (deploy once)

**Folder:** `contracts/`

Copy `contracts/.env.example` → **`contracts/.env`**

- `PETH_RPC_URL` = e.g. `https://rpc.ecnascan.com`
- `PETH_CHAIN_ID=4111`
- `DEPLOYER_PRIVATE_KEY` = funded account (gas)
- `TREASURY_ADDRESS`, `ADMIN_ADDRESS` = optional

```bash
cd contracts
npm run compile
npm run deploy:local:full
```

Copy the **PETH proxy (token address)** from output → `server/.env` → `PETH_TOKEN_ADDRESS=0x...`

**File:** `contracts/deployments/localhost.json` (stores proxy address)

**Rule:** do not run `deploy:local:full` again unless you want a **new token / new address**.

---

## 4) Server — API + Indexer (both required)

| Process | Role |
|---------|------|
| **API** (`npm run dev` / `npm start`) | REST API — explorer UI reads this |
| **Indexer** (`npm run indexer`) | Geth blocks/txs → **database** |

API only = explorer can look **empty** because txs come from the **indexer**.

**Folder:** `server/` — copy `server/.env.example` → **`server/.env`**

- `RPC_URL` = Geth HTTP
- `RPC_CHAIN_ID` / `CHAIN_ID` = **4111**
- `PETH_TOKEN_ADDRESS` = set **once** after deploy
- `ECNA_PRIMARY_ADDRESS` / `ECNA_NATIVE_MINT_ADDRESS` = genesis / your setup

**DB:**

```bash
cd server
npm run db:generate
npm run db:push
```

Or root: `npm run local:prepare`

**Dev — two terminals:**

```bash
npm run dev -w server
```

```bash
npm run indexer -w server
```

**Or all together:** `npm run local:stack` (API + indexer + explorer + dashboard)

**Indexer wipe (rare):** set `INDEXER_RESET_ONCE=1` once in `server/.env`, start indexer, then remove the flag.

---

## 5) Explorer (website)

**Folder:** `apps/explorer/` — `.env.example` → **`.env`**

- `VITE_API_URL` = e.g. `https://api.ecnascan.com`
- `VITE_RPC_URL` = `https://rpc.ecnascan.com`
- `VITE_CHAIN_ID=4111`
- `VITE_NATIVE_SYMBOL=ECNA`
- `VITE_EXPLORER_URL` = where the explorer is served

`VITE_*` are fixed at **build time** — set them before a production build.

```bash
npm run explorer:dev -w apps/explorer
```

Live API: `docs/API-LIVE-DEPLOY.md`

---

## 6) Deploy from Remix

This Clique Geth stack uses **london** for deploy/verify. In Remix set **EVM version → london** (never **default**). Details: `docs/DEPLOY-CONTRACTS.md` · `contracts/REMIX_LOCALHOST.txt`.

**Smoke test:** `contracts/contracts/remix/RemixSmokeTest.sol` (no imports)

**MetaMask:** Injected Provider; RPC `https://rpc.ecnascan.com`, Chain **4111**

**PETH (UUPS):** Hardhat deploy is usually simpler in production; Remix needs proxy + initialize.

More: `contracts/REMIX_LOCALHOST.txt`

---

## 7) Zero-to-live order

1. `git clone` → `npm install`
2. `cd ecnachain` → `docker compose up -d`
3. `cd contracts` → `npm run check:rpc` → OK
4. Set `contracts/.env` → `npm run compile` → `npm run deploy:local:full` → copy **proxy address**
5. Root: `npm run local:prepare` (DB)
6. `server/.env` — `RPC_URL`, `CHAIN_ID=4111`, `PETH_TOKEN_ADDRESS`, rest from `server/.env.example`
7. Set `apps/explorer/.env`
8. `npm run local:stack` (or API + indexer + explorer separately)
9. Browser: `https://explorer.ecnascan.com`

**Live:** `docs/API-LIVE-DEPLOY.md` — run API + indexer under PM2/systemd; keep public RPC behind the guard.

**Problems?** No txs → check indexer + `RPC_URL`. Remix fail → align EVM version. Accidental new token → do not keep redeploying; put the previous address back in `.env`.
