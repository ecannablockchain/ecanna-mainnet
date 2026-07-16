# Live se suru se — ek hi file (poora order)

Yeh **ek sequence** hai: pehle **chain**, phir **token deploy ek baar**, phir **server + indexer + explorer**.  
**Private keys** kabhi Git / screenshot par mat daalo — sirf server par `.env` mein.

**Local PC par sirf do terminal flow (fresh vs resume):** [`SETUP_NEW_LAPTOP.txt`](../SETUP_NEW_LAPTOP.txt) section **0**.

---

## 0) Server par kya hona chahiye

- **Docker** + **Docker Compose** (Geth ke liye)
- **Node.js 20+** (API / explorer build)
- **Firewall:** port **8545** (RPC), baad mein jo API / HTTPS use karo woh open

---

## 1) Code lao aur dependencies

```bash
git clone <tumhara-repo-url> EtherScanBlockchain
cd EtherScanBlockchain
npm install
```

---

## 2) ECNA chain (Geth) — pehle yeh chale

1. Folder: **`ecnachain/`**
2. **`ecnachain/.env.example`** dekh kar **`.env`** banao (validator + treasury addresses tumhari genesis ke hisaab se).
3. **`docker/miner-private.hex`** genesis signer se match hona chahiye (repo docs).
4. Chalao:

```bash
cd ecnachain
docker compose up -d
```

5. Check (dusri shell, repo se):

```bash
cd contracts
npm run check:rpc
```

**OK** = chain **4111**, RPC reachable.

**Live:** Agar RPC ko browser / remote clients se chahiye to sirf machine-local par mat rakho — **public host** `rpc.ecnascan.com` / server IP, firewall, ya reverse proxy setup ke liye `docs/API-LIVE-DEPLOY.md` dekho.

---

## 3) Contracts — `.env` + PETH **ek baar** deploy

1. Folder: **`contracts/`**
2. **`contracts/.env`** mein confirm karo:
   - **`PETH_RPC_URL`** = jahan Geth hai  
     - Same machine: `https://rpc.ecnascan.com`  
     - Remote: `http://<server-ip>:8545` (firewall open)
   - **`PETH_CHAIN_ID=4111`**
   - **`DEPLOYER_PRIVATE_KEY=0x...`** = jis account par **ECNA (gas)** ho (miner key file se) — **yeh khali mat chhodo**
   - **`TREASURY_ADDRESS` / `ADMIN_ADDRESS`** = PETH treasury / admin (valid `0x` addresses)

3. Commands:

```bash
cd contracts
npm run compile
npm run deploy:local:full
```

4. Terminal output se **`PETH proxy (token address)`** copy karo — **yahi** official PETH contract address hai.

5. **Dubara deploy mat chalana** jab tak naya token chahiye ho — warna naya address ban jayega.

---

## 4) Server (API + DB) — `.env`

1. Folder: **`server/`**
2. **`server/.env.example`** → **`server/.env`** (ya existing edit karo).

**Zaroor set karo:**

| Variable | Matlab |
|----------|--------|
| **`RPC_URL`** | Wahi Geth HTTP — local: `https://rpc.ecnascan.com` |
| **`RPC_CHAIN_ID` / `CHAIN_ID`** | **4111** |
| **`PETH_TOKEN_ADDRESS`** | Step 3 ka **proxy address** paste |
| **`ECNA_PRIMARY_ADDRESS`** | Validator / miner (genesis / ecnachain `.env` jaisa) |
| **`ECNA_NATIVE_MINT_ADDRESS`** | Treasury / premine address (genesis jaisa) |
| **`DATABASE_URL`** | Local + live: SQL Server URL (`sqlserver://...`) |
| **`CORS_ORIGIN`** | Jahan se explorer/browser call karega — apne domain |
| **`EXPLORER_PUBLIC_URL`** | Public explorer URL (bina trailing `/`) |

3. Database:

```bash
cd server
npm run db:generate
npm run db:push
```

Ya root: **`npm run local:prepare`**

---

## 5) Explorer — `.env` (build se pehle)

1. Folder: **`apps/explorer/`**
2. **`apps/explorer/.env`** — **`VITE_*`** values:

| Variable | Example |
|----------|---------|
| **`VITE_API_URL`** | `https://api.tumhari-domain.com` (live) ya `https://api.ecnascan.com` |
| **`VITE_RPC_URL`** | Jo wallet MetaMask mein use karega — public RPC URL |
| **`VITE_CHAIN_ID`** | `4111` |
| **`VITE_EXPLORER_URL`** | Explorer ka public URL |

**Note:** `VITE_*` **build time** par bake hote hain — **change ke baad `npm run build` dubara.**

---

## 6) Chalana — API + Indexer (dono zaroori)

| Process | Command (dev) |
|---------|----------------|
| API | `npm run dev -w server` ya `npm run build -w server && npm run start -w server` |
| Indexer | `npm run indexer -w server` (alag terminal / PM2) |

**Sirf API = blocks/tx DB mein nahi aayenge** — **indexer bhi chalna chahiye.**

Ek saath local dev:

```bash
npm run local:stack
```

**Live:** PM2 / systemd — detail **`docs/API-LIVE-DEPLOY.md`**

---

## 7) Explorer build (live website)

```bash
cd apps/explorer
npm run build
```

Output static files ko Nginx / CDN par serve karo. API alag subdomain par.

---

## 8) Checklist (live)

- [ ] Geth Docker up, **`npm run check:rpc`** OK  
- [ ] **`DEPLOYER_PRIVATE_KEY`** set, PETH deploy ho gaya, **`PETH_TOKEN_ADDRESS`** server `.env` mein  
- [ ] **`server/.env`** RPC = reachable from server process  
- [ ] **Indexer + API** dono running  
- [ ] Explorer **`VITE_*`** sahi, **build** fresh  
- [ ] MetaMask network: Chain **4111**, RPC jo tumne public kiya  

---

## 9) Aur detail

- Commands cheat sheet: **`docs/LOCAL-DEV-COMMANDS.md`**
- Domain, HTTPS, PM2: **`docs/API-LIVE-DEPLOY.md`**
- Concept (ECNA vs PETH, Remix paris): **`docs/SIMPLE-GUIDE.md`**

---

## 10) Ek line yaad rakho

**Chain → ek baar PETH deploy → `PETH_TOKEN_ADDRESS` server mein → DB → API + indexer → explorer build.**  
Code update se **token dubara deploy mat karo** — sirf env + restart.
