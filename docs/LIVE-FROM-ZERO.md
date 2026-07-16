# Live from zero — full order (one file)

This is a **sequence**: first the **chain**, then **deploy the token once**, then **server + indexer + explorer**.  
**Never** put private keys in Git or screenshots — keep them only in server `.env` files.

**Local PC (fresh vs resume):** see [`SETUP_NEW_LAPTOP.txt`](../SETUP_NEW_LAPTOP.txt) section **0**.

---

## 0) What the server needs

- **Docker** + **Docker Compose** (for Geth)
- **Node.js 20+** (API / explorer builds)
- **Firewall:** open **RPC** (and later API / HTTPS) as needed — public RPC should go through the hardened endpoint (`https://rpc.ecnascan.com`), not raw Geth on the internet

---

## 1) Get the code and install dependencies

```bash
git clone https://github.com/ecannablockchain/ecanna-mainnet.git
cd ecanna-mainnet
npm install
```

(Testnet: https://github.com/ecannablockchain/ecanna-testnet.git)

---

## 2) E Canna chain (Geth) — start this first

1. Folder: **`ecnachain/`**
2. Copy **`ecnachain/.env.example`** → **`.env`** (validator + treasury addresses matching your genesis).
3. **`docker/miner-private.hex`** must match the genesis Clique signer (see chain docs).
4. Start:

```bash
cd ecnachain
docker compose up -d
```

5. Check (another shell, from repo):

```bash
cd contracts
npm run check:rpc
```

**OK** = chain **4111** (mainnet) reachable.

**Live:** If browsers / remote clients need RPC, do not leave it machine-local only — use **`https://rpc.ecnascan.com`**, firewall, or reverse proxy. See `docs/API-LIVE-DEPLOY.md`.

---

## 3) Contracts — `.env` + deploy PETH **once**

1. Folder: **`contracts/`**
2. In **`contracts/.env`** confirm:
   - **`PETH_RPC_URL`** = where Geth is reachable  
     - Public: `https://rpc.ecnascan.com`  
     - Same machine (ops): `http://127.0.0.1:8545`
   - **`PETH_CHAIN_ID=4111`**
   - **`DEPLOYER_PRIVATE_KEY=0x...`** = account with **ECNA for gas** — **do not leave empty**
   - **`TREASURY_ADDRESS` / `ADMIN_ADDRESS`** = valid `0x` addresses

3. Commands:

```bash
cd contracts
npm run compile
npm run deploy:local:full
```

4. From the terminal output, copy **`PETH proxy (token address)`** — that is the official PETH contract address.

5. **Do not redeploy** unless you intentionally want a new token — a new deploy creates a new address.

---

## 4) Server (API + DB) — `.env`

1. Folder: **`server/`**
2. Copy **`server/.env.example`** → **`server/.env`** (or edit existing).

**Must set:**

| Variable | Meaning |
|----------|---------|
| **`RPC_URL`** | Geth HTTP — ops on same host: `http://127.0.0.1:8545`; public docs: `https://rpc.ecnascan.com` |
| **`RPC_CHAIN_ID` / `CHAIN_ID`** | **4111** |
| **`PETH_TOKEN_ADDRESS`** | Proxy address from step 3 |
| **`ECNA_PRIMARY_ADDRESS`** | Validator / miner (same as genesis / ecnachain `.env`) |
| **`ECNA_NATIVE_MINT_ADDRESS`** | Treasury / premine address |
| **`DATABASE_URL`** | SQL Server URL (`sqlserver://...`) |
| **`CORS_ORIGIN`** | Browser origins allowed (your domains) |
| **`EXPLORER_PUBLIC_URL`** | Public explorer URL (no trailing `/`) |

3. Database:

```bash
cd server
npm run db:generate
npm run db:push
```

Or from root: **`npm run local:prepare`**

---

## 5) Explorer — `.env` (before build)

1. Folder: **`apps/explorer/`**
2. Set **`VITE_*`** in **`apps/explorer/.env`**:

| Variable | Example |
|----------|---------|
| **`VITE_API_URL`** | `https://api.ecnascan.com` |
| **`VITE_RPC_URL`** | Public RPC for MetaMask — `https://rpc.ecnascan.com` |
| **`VITE_CHAIN_ID`** | `4111` |
| **`VITE_EXPLORER_URL`** | `https://explorer.ecnascan.com` |

**Note:** `VITE_*` values are baked at **build time** — after changes, run **`npm run build` again**.

---

## 6) Run — API + Indexer (both required)

| Process | Command (dev) |
|---------|----------------|
| API | `npm run dev -w server` or `npm run build -w server && npm run start -w server` |
| Indexer | `npm run indexer -w server` (separate terminal / PM2) |

**API alone does not fill blocks/txs in the DB** — the **indexer must also run**.

All-in-one local:

```bash
npm run local:stack
```

**Live:** PM2 / systemd — see **`docs/API-LIVE-DEPLOY.md`**

---

## 7) Explorer build (live site)

```bash
cd apps/explorer
npm run build
```

Serve the static output with Nginx / CDN. Host the API on its own subdomain.

---

## 8) Live checklist

- [ ] Geth Docker up, **`npm run check:rpc`** OK  
- [ ] **`DEPLOYER_PRIVATE_KEY`** set, PETH deployed, **`PETH_TOKEN_ADDRESS`** in server `.env`  
- [ ] **`server/.env`** `RPC_URL` reachable from the server process  
- [ ] **Indexer + API** both running  
- [ ] Explorer **`VITE_*`** correct, fresh **build**  
- [ ] MetaMask: Chain **4111**, public RPC `https://rpc.ecnascan.com`  

---

## 9) More detail

- Commands cheat sheet: **`docs/LOCAL-DEV-COMMANDS.md`**
- Domain, HTTPS, PM2: **`docs/API-LIVE-DEPLOY.md`**
- Concepts (ECNA vs PETH, Remix): **`docs/SIMPLE-GUIDE.md`**
- Exchange / peers: **`docs/EXCHANGE-LISTING.md`**

---

## 10) One-line reminder

**Chain → deploy PETH once → set `PETH_TOKEN_ADDRESS` on the server → DB → API + indexer → explorer build.**  
On code updates, **do not redeploy the token** — only update env and restart services.
