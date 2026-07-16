# ECNASCAN — simple guide (sab ek page)

**Short idea:** Chain chalao → PETH **ek baar** deploy → `server/.env` mein token address likho → **API + indexer + explorer** chalao. Code badalne se **naya token mat banao** — sirf service restart.

**Fresh deploy vs resume (terminal):** `SETUP_NEW_LAPTOP.txt` section **0** — do hi flow (naya deploy / wahi se chalu).

**Aur detail:** `docs/LOCAL-DEV-COMMANDS.md` (commands), `docs/API-LIVE-DEPLOY.md` (live server + domain).

### Repo mein kya set / align kar diya (default local ECNA)

- `contracts/.env` — `PETH_RPC_URL`, `PETH_CHAIN_ID`, `RPC_URL` = **8545 / 4111**; **`DEPLOYER_PRIVATE_KEY` tum bharte ho** (khali mat chhodo deploy se pehle).
- `server/.env` — RPC + chain + genesis addresses; **`PETH_TOKEN_ADDRESS` deploy ke baad tum paste karte ho**.
- `apps/explorer/.env` — `VITE_*` local defaults.

**Live se suru se (ek file, order):** [`docs/LIVE-FROM-ZERO.md`](./LIVE-FROM-ZERO.md)

---

## 1) Native ECNA vs PETH (pehle yeh samjho)

| | Native **ECNA** | **PETH** (ERC-20) |
|--|----------------|-------------------|
| Kya hai | Chain ka **gas** / premine — Geth state | **Smart contract** |
| Deploy? | Nahi — chain handle karti hai | **Ek baar** Hardhat deploy |
| Address | Har wallet ka balance | **Ek proxy address** — `PETH_TOKEN_ADDRESS` |

**Galat:** har server code change par naya token deploy. **Sahi:** ek baar deploy, address `.env` mein fix; phir sirf restart.

---

## 2) ECNA chain (Geth Docker)

**Folder:** `ecnachain/`

| Cheez | Default |
|-------|---------|
| Host RPC | `https://rpc.ecnascan.com` |
| Chain ID | **4111** |
| Symbol | **ECNA** |

```bash
cd ecnachain
docker compose up -d
```

**Check (repo root):**

```bash
cd contracts
npm run check:rpc
```

**OK** = node chal raha hai, chain id **4111**.

**MetaMask:** `ecnachain/metamask-network.json` se values copy karo.

**Agar band ho:** `docker compose ps`, `docker compose logs`; port **8545** open; genesis/miner issue → `ecnachain` README / `reset-chain`.

---

## 3) Contracts + PETH (ek baar deploy)

**Folder:** `contracts/`

`contracts/.env.example` → **`contracts/.env`**

- `PETH_RPC_URL` = e.g. `https://rpc.ecnascan.com`
- `PETH_CHAIN_ID=4111`
- `DEPLOYER_PRIVATE_KEY` = funded account (miner / gas)
- `TREASURY_ADDRESS`, `ADMIN_ADDRESS` = optional

```bash
cd contracts
npm run compile
npm run deploy:local:full
```

Output ka **PETH proxy (token address)** copy karo → `server/.env` → `PETH_TOKEN_ADDRESS=0x...`

**File:** `contracts/deployments/localhost.json` (proxy address save)

**Rule:** dubara `deploy:local:full` mat chalao warna **naya token / naya address**.

---

## 4) Server — API + Indexer (dono zaroori)

| Process | Kaam |
|---------|------|
| **API** (`npm run dev` / `npm start`) | REST API — explorer UI is data se |
| **Indexer** (`npm run indexer`) | Geth se blocks/txs → **database** |

Sirf API = explorer **khali** lag sakta hai kyunki txs **indexer** se aate hain.

**Folder:** `server/` — `server/.env.example` → **`server/.env`**

- `RPC_URL` = wahi Geth (`http://...:8545`)
- `RPC_CHAIN_ID` / `CHAIN_ID` = **4111**
- `PETH_TOKEN_ADDRESS` = deploy ke baad **ek baar**
- `ECNA_PRIMARY_ADDRESS` / `ECNA_NATIVE_MINT_ADDRESS` = genesis / tumhari setup

**DB:**

```bash
cd server
npm run db:generate
npm run db:push
```

Ya root: `npm run local:prepare`

**Dev — do terminals:**

```bash
npm run dev -w server
```

```bash
npm run indexer -w server
```

**Ya ek saath:** `npm run local:stack` (API + indexer + explorer + dashboard)

**Indexer reset (kabhi):** `INDEXER_RESET_ONCE=1` ek baar `server/.env` mein, phir hata do.

---

## 5) Explorer (website)

**Folder:** `apps/explorer/` — `.env.example` → **`.env`**

- `VITE_API_URL` = e.g. `https://api.ecnascan.com`
- `VITE_RPC_URL` = `https://rpc.ecnascan.com`
- `VITE_CHAIN_ID=4111`
- `VITE_NATIVE_SYMBOL=ECNA`
- `VITE_EXPLORER_URL` = jahan explorer khulega

`VITE_*` **build time** par fix — production build se pehle set karo.

```bash
npm run explorer:dev -w apps/explorer
```

Live API ke liye: `docs/API-LIVE-DEPLOY.md`

---

## 6) Remix se deploy

ECNA chain **PUSH0 (Shanghai)** opcode support nahi karti. Remix **default** EVM = bytecode mein **PUSH0** → **Gas estimation failed**.

**Fix:** Remix → Solidity Compiler → Advanced → **EVM version = paris** (ya **london**) → compile dubara → deploy.

**Test:** `contracts/contracts/remix/RemixSmokeTest.sol` (no imports)

**MetaMask:** Injected Provider; RPC **8545**, Chain **4111**

**PETH (UUPS):** production mein Hardhat deploy zyada seedha; Remix par proxy + initialize chahiye.

Zyada: `contracts/REMIX_LOCALHOST.txt`

---

## 7) Zero se live — order (steps)

1. `git clone` → `cd EtherScanBlockchain` → `npm install`
2. `cd ecnachain` → `docker compose up -d`
3. `cd contracts` → `npm run check:rpc` → OK
4. `contracts/.env` set → `npm run compile` → `npm run deploy:local:full` → **proxy address** copy
5. Root: `npm run local:prepare` (DB)
6. `server/.env` — `RPC_URL`, `CHAIN_ID=4111`, `PETH_TOKEN_ADDRESS`, baaki `server/.env.example` jaisa
7. `apps/explorer/.env` set
8. `npm run local:stack` (ya API + indexer + explorer alag)
9. Browser: explorer mostly `https://explorer.ecnascan.com` (console dekho)

**Live:** `docs/API-LIVE-DEPLOY.md` — API + indexer dono PM2/systemd; **Geth RPC** firewall se reachable.

**Problem?** Tx nahi → indexer + `RPC_URL` check. Remix fail → `EVM paris`. Naya token ban gaya → dubara deploy mat karo; purana address `.env` mein wapas lo.
