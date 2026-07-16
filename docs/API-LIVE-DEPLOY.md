# API live karna + URL ke baad kya change karein

Yeh doc **`server/` (REST API)** ko internet par chalane aur uske baad **explorer / dashboard** mein URLs update karne ke liye hai.

---

## 1) Short answer — live par kya chalega?

| Cheez | Folder / process | Internet par kya dikhega |
|--------|------------------|---------------------------|
| **REST API** | `server/` → `npm run build` phir `npm start` | `https://api.tumhari-domain.com` (example) — port **4000** ya jo `PORT` set ho |
| **Indexer** | `server/` → alag process `node dist/indexer.js` | Koi public URL nahi — sirf server ke andar chain se DB bharta hai |
| **Chain (Geth)** | `ecnachain/` ya jo bhi RPC host ho | `https://rpc.tumhari-domain.com` (example) — **`RPC_URL`** yahi hota hai |
| **Explorer UI** | `apps/explorer/` build → static host | `https://scan.tumhari-domain.com` — API se **alag** site |
| **Dashboard** | `apps/dashboard/` build | `https://app.tumhari-domain.com` (optional) |

**Important:** API live = sirf **`node dist/index.js`** nahi — **indexer bhi saath chalna zaroori hai**, warna naye blocks / txs DB mein nahi aayenge.

---

## 2) Kaun si files matter karti hain? (reference)

| File | Kab edit / use |
|------|----------------|
| **`server/.env`** | **Production** par yahi se saari settings (DB, RPC, port, public URLs) |
| **`server/.env.example`** | Sample — naye server par copy karke `.env` banao |
| **`server/prisma/schema.prisma`** | DB structure — deploy pe `prisma db push` / migrate |
| **`server/package.json`** | `build`, `start`, `indexer` scripts |
| **`apps/explorer/.env`** | Build **se pehle** — `VITE_API_URL`, `VITE_RPC_URL`, `VITE_EXPLORER_URL`, … |
| **`apps/dashboard/.env`** | Build se pehle — chain + RPC + optional API |
| **`apps/explorer/vite.config.ts`** | Sirf **local dev** proxy (`/api` → `https://api.ecnascan.com`) — **production build isse depend nahi** jab `VITE_API_URL` set ho |

Code mein abhi **CORS** almost open hai (`origin: true`) — matlab kisi bhi site se browser API call ho sakti hai. Baad mein tight karna ho to code change se whitelist lagani padegi.

---

## 3) API ko live karne ke steps (server par)

### 3.1 Server (VPS) par

1. **Node.js 20+** install karo.
2. Repo clone / upload karo, root ya `server` folder mein `npm install` (workspace ho to root se `npm install`).
3. **`server/.env`** banao — `server/.env.example` se copy karke niche wale variables set karo (section 4 dekho).
4. Database:
   ```bash
   cd server
   npx prisma generate
   npx prisma db push
   ```
   Live par `DATABASE_URL` **SQL Server** hona chahiye (see `server/.env.example`).
5. Build:
   ```bash
   cd server
   npm run build
   ```
6. API chalao:
   ```bash
   cd server
   npm start
   ```
   Default **`PORT=4000`**. Reverse proxy (Nginx) se `https://api...` → `https://api.ecnascan.com`.
7. **Indexer** alag terminal / systemd service:
   ```bash
   cd server
   node dist/indexer.js
   ```
   (Build ke baad `dist/indexer.js` banta hai.)

### 3.2 Check

- Browser ya `curl`: `https://api.tumhari-domain.com/health` → `{"ok":true,"database":"up",...}` jaisa response.
- `https://api.tumhari-domain.com/api/v1/config` → `rpcUrl`, `chainId`, `explorerUrl` dekho.

### 3.3 Process manager (recommended)

- **PM2** / **systemd** se dono processes auto-restart:
  - `ecna-api` → `node dist/index.js`
  - `ecna-indexer` → `node dist/indexer.js`  
  Working directory: `server/`, env file wahi load honi chahiye (`load-env-deployment` / `.env`).

---

## 4) `server/.env` — live values (kya kya set karna)

| Variable | Local example | Live par kya likho |
|----------|---------------|---------------------|
| **`DATABASE_URL`** | `sqlserver://host:1433;database=Db_ECNAChain;...` | SQL Server connection string (same format as `server/.env.example`) |
| **`PORT`** | `4000` | Jo port app sune (Nginx ke peeche 4000 theek) |
| **`RPC_URL`** | `https://rpc.ecnascan.com` | **Wahi URL jahan se Geth reachable hai** — same machine ho to internal IP; public ho to `https://rpc...` |
| **`RPC_CHAIN_ID`** | `2` | Geth / genesis jaisa hi |
| **`CHAIN_ID`** | `2` | Usually `RPC_CHAIN_ID` jaisa |
| **`NATIVE_SYMBOL` / `NATIVE_NAME`** | `ECNA` | Tumhari chain token name |
| **`PETH_TOKEN_ADDRESS`** | empty ya address | Agar featured token ho to lowercase `0x...` |
| **`EXPLORER_PUBLIC_URL`** | `https://explorer.ecnascan.com` | **Public explorer site** — `https://scan.tumhari-domain.com` (trailing `/` mat) — `/api/v1/config` response mein `explorerUrl` aata hai |
| **`CORS_ORIGIN`** | local URLs | Abhi code isse use nahi karta; future / notes ke liye rakh sakte ho |

Optional indexer flags: `INDEXER_POLL_MS`, `INDEXER_START_AT_HEAD`, `INDEXER_MIN_BLOCK` — `ecnachain` / server README dekho.

---

## 5) API live hone **ke baad** kya change karna hai?

Jab tumhare paas final URLs hon:

- API: `https://api.tumhari-domain.com`
- Explorer: `https://scan.tumhari-domain.com`
- RPC (public): `https://rpc.tumhari-domain.com` (jo users / MetaMask ko doge)

### 5.1 `apps/explorer/.env` — phir se **build**

Yeh values **build time** par bundle mein jaati hain — `.env` badalne ke baad **`npm run build` dubara** zaroori.

| Variable | Empty / local | Live par |
|----------|----------------|----------|
| **`VITE_API_URL`** | khali → browser same-origin `/api` use karta hai (sirf jab explorer aur API **ek hi origin** par hon) | `https://api.tumhari-domain.com` (no trailing slash) |
| **`VITE_RPC_URL`** | local Geth | **Public RPC** jo MetaMask / UI dikhaye |
| **`VITE_CHAIN_ID`** | `4111` ya `31337` | Tumhari chain ID |
| **`VITE_EXPLORER_URL`** | `https://explorer.ecnascan.com` | `https://scan.tumhari-domain.com` — verify success “new tab” / links ke liye |
| **`VITE_CHAIN_NAME`**, **`VITE_NATIVE_*`** | jo bhi brand ho | Wahi rakho |

Phir:

```bash
cd apps/explorer
npm run build
```

`dist/` ko apni hosting par deploy karo.

### 5.2 `apps/dashboard/.env` (agar dashboard use ho)

Same idea: `VITE_RPC_URL`, `VITE_CHAIN_ID`, wagaira **public** values; agar dashboard API call kare to `VITE_API_URL` bhi set karo. Build dubara.

### 5.3 `server/.env` dubara check

- **`EXPLORER_PUBLIC_URL`** = deployed explorer ka **https** URL (taaki config API sahi link de).

### 5.4 Chain / MetaMask

- Users ko **public RPC** + **chain ID** do — `ecnachain/metamask-network.json` jaisa template update karke share karo.

---

## 6) Ek page pe sab (same domain) optional

Agar tum **Nginx** se aisa karo:

- `https://scan.tumhari-domain.com` → static explorer `dist/`
- `https://scan.tumhari-domain.com/api` → proxy to `https://api.ecnascan.com`

To explorer ke `.env` mein **`VITE_API_URL` khali** chhod kar bhi kaam ho sakta hai (same origin). Phir bhi **`VITE_EXPLORER_URL`** ko `https://scan.tumhari-domain.com` set karo taaki verify / links galat na hon.

---

## 7) Quick checklist (copy)

- [ ] Geth / RPC server se reachable (`RPC_URL`)
- [ ] `server/.env` production values + `EXPLORER_PUBLIC_URL`
- [ ] `prisma generate` + `db push` (ya migrate)
- [ ] `npm run build` in `server/`
- [ ] `npm start` (API) + `node dist/indexer.js` (indexer) — dono running
- [ ] `/health` OK
- [ ] Explorer `.env` → `VITE_API_URL` / `VITE_RPC_URL` / `VITE_EXPLORER_URL` / `VITE_CHAIN_ID`
- [ ] Explorer **rebuild** + deploy `dist/`

---

## 8) Aur docs

- Local commands: [`LOCAL-DEV-COMMANDS.md`](./LOCAL-DEV-COMMANDS.md)
- Geth / chain deploy: [`../ecnachain/docs/DEPLOYMENT.md`](../ecnachain/docs/DEPLOYMENT.md)
- Repo overview: [`../README.md`](../README.md)
