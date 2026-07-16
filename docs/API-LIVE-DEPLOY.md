# Deploying the API live + changes after URLs are set

This doc covers running **`server/` (REST API)** on the internet and updating URLs in **explorer / dashboard** afterward.

---

## 1) Short answer — what runs in production?

| Component | Folder / process | What appears on the internet |
|--------|------------------|---------------------------|
| **REST API** | `server/` → `npm run build` then `npm start` | `https://api.ecnascan.com` — port **4000** or whatever `PORT` is set to |
| **Indexer** | `server/` → separate process `node dist/indexer.js` | No public URL — only fills the DB from the chain inside the server |
| **Chain (Geth)** | `ecnachain/` or whichever host runs RPC | `https://rpc.ecnascan.com` — this is what **`RPC_URL`** points to |
| **Explorer UI** | `apps/explorer/` build → static host | `https://explorer.ecnascan.com` — a **separate** site from the API |
| **Dashboard** | `apps/dashboard/` build | `https://dashboard.ecnascan.com` (optional) |

**Important:** API live ≠ only **`node dist/index.js`** — the **indexer must also run**, otherwise new blocks / txs will not appear in the DB.

---

## 2) Which files matter? (reference)

| File | When to edit / use |
|------|----------------|
| **`server/.env`** | **Production** settings source (DB, RPC, port, public URLs) |
| **`server/.env.example`** | Sample — copy on a new server to create `.env` |
| **`server/prisma/schema.prisma`** | DB structure — run `prisma db push` / migrate on deploy |
| **`server/package.json`** | `build`, `start`, `indexer` scripts |
| **`apps/explorer/.env`** | **Before** build — `VITE_API_URL`, `VITE_RPC_URL`, `VITE_EXPLORER_URL`, … |
| **`apps/dashboard/.env`** | Before build — chain + RPC + optional API |
| **`apps/explorer/vite.config.ts`** | **Local dev** proxy only (`/api` → `https://api.ecnascan.com`) — **production build does not depend on this** when `VITE_API_URL` is set |

CORS is currently almost open in code (`origin: true`) — meaning any site can call the API from the browser. To tighten later, you will need a code change to add a whitelist.

---

## 3) Steps to deploy the API live (on the server)

### 3.1 On the server (VPS)

1. Install **Node.js 20+**.
2. Clone / upload the repo; run `npm install` at root or in `server/` (if using workspaces, run from root).
3. Create **`server/.env`** — copy from `server/.env.example` and set the variables below (see section 4).
4. Database:
   ```bash
   cd server
   npx prisma generate
   npx prisma db push
   ```
   On live, `DATABASE_URL` must be **SQL Server** (see `server/.env.example`).
5. Build:
   ```bash
   cd server
   npm run build
   ```
6. Start the API:
   ```bash
   cd server
   npm start
   ```
   Default **`PORT=4000`**. Use a reverse proxy (Nginx) so `https://api.ecnascan.com` → `http://127.0.0.1:4000` (or your app port).
7. **Indexer** in a separate terminal / systemd service:
   ```bash
   cd server
   node dist/indexer.js
   ```
   (After build, `dist/indexer.js` is created.)

### 3.2 Verify

- Browser or `curl`: `https://api.ecnascan.com/health` → response like `{"ok":true,"database":"up",...}`.
- `https://api.ecnascan.com/api/v1/config` → check `rpcUrl`, `chainId`, `explorerUrl`.

### 3.3 Process manager (recommended)

- Use **PM2** / **systemd** so both processes auto-restart:
  - `ecna-api` → `node dist/index.js`
  - `ecna-indexer` → `node dist/indexer.js`  
  Working directory: `server/`; the env file must load from there (`load-env-deployment` / `.env`).

---

## 4) `server/.env` — live values (what to set)

| Variable | Local example | What to set on live |
|----------|---------------|---------------------|
| **`DATABASE_URL`** | `sqlserver://host:1433;database=Db_ECNAChain;...` | SQL Server connection string (same format as `server/.env.example`) |
| **`PORT`** | `4000` | Port the app listens on (4000 behind Nginx is fine) |
| **`RPC_URL`** | `https://rpc.ecnascan.com` | **The URL where Geth is reachable** — same machine: internal IP; public: `https://rpc.ecnascan.com` |
| **`RPC_CHAIN_ID`** | `2` | Same as Geth / genesis |
| **`CHAIN_ID`** | `2` | Usually same as `RPC_CHAIN_ID` |
| **`NATIVE_SYMBOL` / `NATIVE_NAME`** | `ECNA` | Your chain token name |
| **`PETH_TOKEN_ADDRESS`** | empty or address | If you have a featured token, lowercase `0x...` |
| **`EXPLORER_PUBLIC_URL`** | `https://explorer.ecnascan.com` | **Public explorer site** — no trailing `/` — returned as `explorerUrl` in `/api/v1/config` |
| **`CORS_ORIGIN`** | local URLs | Code does not use this yet; keep for future / notes |

Optional indexer flags: `INDEXER_POLL_MS`, `INDEXER_START_AT_HEAD`, `INDEXER_MIN_BLOCK` — see `ecnachain` / server README.

---

## 5) What to change **after** the API is live?

When you have final URLs:

- API: `https://api.ecnascan.com`
- Explorer: `https://explorer.ecnascan.com`
- RPC (public): `https://rpc.ecnascan.com` (what you give users / MetaMask)

### 5.1 `apps/explorer/.env` — then **rebuild**

These values are baked in at **build time** — after changing `.env`, you **must run `npm run build` again**.

| Variable | Empty / local | Live |
|----------|----------------|----------|
| **`VITE_API_URL`** | empty → browser uses same-origin `/api` (only when explorer and API are on **the same origin**) | `https://api.ecnascan.com` (no trailing slash) |
| **`VITE_RPC_URL`** | local Geth | **Public RPC** shown in MetaMask / UI |
| **`VITE_CHAIN_ID`** | `4111` or `31337` | Your chain ID |
| **`VITE_EXPLORER_URL`** | `https://explorer.ecnascan.com` | `https://explorer.ecnascan.com` — for verify success “new tab” / links |
| **`VITE_CHAIN_NAME`**, **`VITE_NATIVE_*`** | your brand values | Keep as-is |

Then:

```bash
cd apps/explorer
npm run build
```

Deploy `dist/` to your hosting.

### 5.2 `apps/dashboard/.env` (if using dashboard)

Same idea: `VITE_RPC_URL`, `VITE_CHAIN_ID`, etc. use **public** values; if the dashboard calls the API, set `VITE_API_URL` too. Rebuild.

### 5.3 Re-check `server/.env`

- **`EXPLORER_PUBLIC_URL`** = deployed explorer **https** URL (so the config API returns the correct link).

### 5.4 Chain / MetaMask

- Give users **public RPC** + **chain ID** — update and share a template like `ecnachain/metamask-network.json`.

---

## 6) Everything on one page (same domain) — optional

If you configure **Nginx** like this:

- `https://explorer.ecnascan.com` → static explorer `dist/`
- `https://explorer.ecnascan.com/api` → proxy to `http://127.0.0.1:4000` (API)

Then the explorer `.env` can leave **`VITE_API_URL` empty** (same origin). Still set **`VITE_EXPLORER_URL`** to `https://explorer.ecnascan.com` so verify / links are correct.

---

## 7) Quick checklist (copy)

- [ ] Geth / RPC reachable from server (`RPC_URL`)
- [ ] `server/.env` production values + `EXPLORER_PUBLIC_URL`
- [ ] `prisma generate` + `db push` (or migrate)
- [ ] `npm run build` in `server/`
- [ ] `npm start` (API) + `node dist/indexer.js` (indexer) — both running
- [ ] `/health` OK
- [ ] Explorer `.env` → `VITE_API_URL` / `VITE_RPC_URL` / `VITE_EXPLORER_URL` / `VITE_CHAIN_ID`
- [ ] Explorer **rebuild** + deploy `dist/`

---

## 8) Related docs

- Local commands: [`LOCAL-DEV-COMMANDS.md`](./LOCAL-DEV-COMMANDS.md)
- Geth / chain deploy: [`../ecnachain/docs/DEPLOYMENT.md`](../ecnachain/docs/DEPLOYMENT.md)
- Repo overview: [`../README.md`](../README.md)
