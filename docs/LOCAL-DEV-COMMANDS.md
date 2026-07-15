# Local dev — saari commands ek jagah (save / copy-paste)

Naye PC par ya baad mein dekhne ke liye yahi file use karo. Repo root = jahan `package.json` (workspaces) hai.

**Full operations guide (first setup, resume, server migration):** [`SETUP_NEW_LAPTOP.txt`](../SETUP_NEW_LAPTOP.txt)  
**Server migration runbook:** [`SERVER-MIGRATION.md`](./SERVER-MIGRATION.md)

---

## 0) Do flows — fresh deploy vs resume

Har jagah pehle:

```bash
cd /path/to/Blockchain   # apna path
```

### Flow A — **fresh deploy** (clean chain + deploy PETH + treasury + clean explorer index)

```bash
npm run local:fresh
```

Terminal 1 — L1 (pick one):

```bash
npm run local:node:persistent   # Anvil + disk; needs Foundry; use for "resume" later
# or
npm run local:node              # Hardhat; new chain every time you restart this process
```

Terminal 2:

```bash
npm run local:deploy
```

Copy printed addresses into `server/.env` (`PETH_TOKEN_ADDRESS`) and `apps/dashboard/.env` (`VITE_PETH_TOKEN`, etc.). Set **`ECNA_NATIVE_MINT_ADDRESS`** in `server/.env` (and optionally duplicate in `contracts/.env`) to the wallet that should receive the **native ECNA** top-up from `npm run fund:treasury` — that script prefers `ECNA_NATIVE_MINT_ADDRESS` over `TREASURY_ADDRESS`. Anvil still pre-funds its mnemonic test accounts for gas; your **designated** balance is this address after `local:deploy`.

Clear indexed blocks/transactions so the explorer matches the **new** chain. **Required** — `local:fresh` does not wipe SQL Server; run:

```bash
npm run server:clear-indexed
```

```bash
npm run local:stack
```

**Optional** — fund treasury again later from the contracts workspace:

```bash
npm run fund:treasury -w contracts
```

### Flow B — **resume** (pick up where you stopped; **no** `local:deploy`)

Use when **Anvil** state file still exists (`contracts/.persistent-chain/anvil-state.json`) and you did **not** run `local:fresh`.

Terminal 1:

```bash
npm run local:node:persistent
```

Terminal 2:

```bash
npm run local:stack
```

**Important — or chain resets to block 1:**

- **Stop Anvil with `Ctrl+C` in the Anvil terminal** and wait until the process exits (lets Anvil flush `anvil-state.json`). Closing the window with **X** only / killing the process can skip the flush.
- State is also written on a **timer** (default **30s** `ANVIL_STATE_INTERVAL_SEC` if unset). Old default was 5 minutes — stopping before that with a bad exit meant **no file on disk** → next start = genesis.

If you use **Hardhat** only: stopping Terminal 1 **always** creates a **new** chain next time → run **Flow A** again (including `local:deploy`).

### Flow C — **remote RPC + SQL DB** (no local Anvil; data already indexed or indexer catches up)

Use when your **chain** is on another host (e.g. Geth `http://…:8545`) and the **explorer DB** is SQL Server with `DATABASE_URL` in `server/.env`.

1. `server/.env`: **`RPC_URL`** = that JSON-RPC, **`DATABASE_URL`** = your DB, **`CHAIN_ID`** / **`RPC_CHAIN_ID`** match the chain.
2. Frontends: `VITE_API_URL` → your API (e.g. `http://127.0.0.1:4000`).
3. One terminal:

```bash
npm run local:stack
```

Same as **`npm run local:stack:remote`** (alias for clarity). **Do not** start `local:node:persistent` unless you need a **local** Anvil for contract work.

### Clear **multi-GB** Anvil persistent state

If `contracts/.persistent-chain/anvil-state.json` grew huge and Anvil OOMs on resume:

```bash
npm run local:chain:reset
```

Next `local:node:persistent` starts from **genesis** (you lose that local chain only — not your remote node or SQL data).

### Optional — fresh chain but **no** PETH

```bash
npm run local:fresh:native
npm run local:node:persistent
npm run server:clear-indexed   # if using SQL Server (same reason as Flow A)
npm run local:stack
```

---

## 1) Pehli baar (har naye system par)

**Windows (recommended):** repo root se `.\bootstrap-full.ps1` — `.env` copy + `npm install` + Prisma + compile.

**Har OS:**

```bash
cd /path/to/repo
npm run local:bootstrap
```

Pehle **env files** (example se copy), agar bootstrap script use na ho:

| File | Kaam |
|------|------|
| `server/.env.example` → `server/.env` | API, RPC, chain id, indexer |
| `contracts/.env.example` → `contracts/.env` | deploy / treasury |
| `apps/explorer/.env.example` → `apps/explorer/.env` | `VITE_CHAIN_ID`, `VITE_RPC_URL` |
| `apps/dashboard/.env.example` → `apps/dashboard/.env` | same |

Local defaults: **`http://50.28.84.113:8545`**, chain **4111** (`server/.env` + `hardhat.config.cjs`).

**Database schema** `local:bootstrap` ke andar hai; alag se:

```bash
npm run server:db:push
```

---

## 2) Hardhat local chain (Terminal 1)

```bash
npm run local:node
```

RPC `http://50.28.84.113:8545`, chain **4111**. Empty blocks ~**3s** par bhi mine hote hain (explorer chain head); txs **turant** mine.

Sirf tx par block: `npm run node:instant -w contracts`.

`server/.env`: `RPC_URL`, `RPC_CHAIN_ID=4111`, `CHAIN_ID=4111`.

---

## 3) API + indexer + explorer + dashboard (Terminal 2)

Repo root:

```bash
npm run local:stack
```

- API: `http://50.28.84.113:4000`
- Explorer: `http://50.28.84.113:5174`
- Dashboard: `http://50.28.84.113:5173`

---

## 4) PETH deploy (optional)

```bash
npm run deploy:local:full -w contracts
```

---

## 5) Treasury ko native ECNA (100 crore = visible tx)

`contracts/.env` mein:

- `TREASURY_ADDRESS=0x...` (jis address par chahiye)
- `FUND_ECNA=1000000000` (whole units)

Phir (**Hardhat node chal raha ho**):

```bash
npm run fund:treasury -w contracts
```

- Default: **on-chain transfer** → Latest transactions mein dikhega.
- Sirf balance, tx nahi: `FUND_SILENT=1` (contracts/.env).

---

## 6) Explorer DB saaf (purane blocks/txs hatao, chain same)

```bash
npm run server:clear-indexed
```

Phir **indexer + API restart**.  
`INDEXER_START_AT_HEAD=1` ho to naye blocks ke baad hi naya data dikhega.

---

## 7) Windows PowerShell note

`&&` kabhi-kabhi issue ho to alag lines:

```powershell
Set-Location C:\path\to\Deepak
npm install
npm run server:db:push
```

---

## 8) Jis address par native chahiye — code change nahi

Bas **dono** jagah same address:

- `contracts/.env` → `TREASURY_ADDRESS`
- `server/.env` → `TREASURY_ADDRESS`

Amount: `FUND_ECNA=...`

---

## 9) Useful env (server/.env)

| Variable | Meaning |
|----------|---------|
| `INDEXER_START_AT_HEAD=1` | Purani chain backfill mat karo; home jab tak khali jab tak naye block na aayein |
| `INDEXER_RESET_ONCE=1` | **Ek baar** indexer start par saari indexed tables wipe (phir .env se hata do) |

---

## 9b) Continue vs fresh (short)

Same as **§0**. Summary:

- **Anvil persistent** + same SQL Server DB → **Flow B** to resume.
- **Hardhat** → new chain on every L1 restart → **Flow A** again.
- **Wipe everything for new deploy:** `npm run local:fresh` then Flow A from Terminal 1.

---

## 10) Geth **ecnachain** (Docker) — alag path

```bash
npm run ecnachain:docker
```

Chain **4111**, details: `ecnachain/README.md`.  
`server/.env`: `CHAIN_ID=4111`, `RPC_CHAIN_ID=4111`, same RPC jo compose deta hai.

---

## Quick copy — minimum (see **§0** for fresh vs resume)

```text
# First time on machine:
npm run local:bootstrap

# Fresh full stack (PETH):
npm run local:fresh
Terminal 1: npm run local:node:persistent   # or: npm run local:node
Terminal 2: npm run local:deploy
(edit .env from output)
Terminal 2: npm run server:clear-indexed
Terminal 2: npm run local:stack

# Extra fund (optional):
# npm run fund:treasury -w contracts

# Resume (Anvil persistent only):
Terminal 1: npm run local:node:persistent
Terminal 2: npm run local:stack
```

Is file ka path: **`docs/LOCAL-DEV-COMMANDS.md`** — Git mein commit karo taake har machine / teammate ke paas same commands rahein.

---

## API live + URLs (production)

Poora step-by-step: **[`docs/API-LIVE-DEPLOY.md`](./API-LIVE-DEPLOY.md)** — kaun si file, kya env, API + indexer dono, live ke baad `VITE_*` changes.
