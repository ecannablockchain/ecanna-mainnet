# E Canna — Live production addresses (post client go-live)

**Last updated:** 20 July 2026  
**Server:** `168.144.69.102` (`ecnascan.com`)  
**Status:** London EVM / Clique (no `shanghaiTime`) + RPC harden + **pinned P2P nodekeys**. Token logos from Info profile show on verified-contracts, token-transfers, and tx details. See root [`AGENTS.md`](../AGENTS.md).

> **Do not put private keys or `nodekey` in public git.** Miner / faucet / nodekey live only in server + local gitignored files.

---

## Native token

| Field | Mainnet | Testnet |
|-------|---------|---------|
| Full name | E Canna | E Canna Testnet |
| Symbol | **ECNA** | **tECNA** |
| Chain ID | **4111** | **4112** |
| Decimals | 18 | 18 |
| Genesis supply | **1 Crore** = 10,000,000 ECNA | Treasury **100M** tECNA + faucet **100M** tECNA |
| Premine wei (treasury) | `10000000000000000000000000` | `100000000000000000000000000` |
| EVM for deploy/verify | **london** (stock Geth Clique) | **london** |
| Genesis hash (block 0) | `0xeac82b18632cf693d4b57d319cefece0349ebcf20bc76bdf5c04216126cb3e1b` | `0x75a3446929625d15d01857be62f5ab10abde0ad01311a37664d4ccc27fbde3a6` |
| Geth | **v1.13.15-stable** | **v1.13.15-stable** |

---

## P2P peers (exchanges / full nodes)

Always take the live enode from GitHub `static-nodes.json` (or `admin.nodeInfo.enode` on the validator). Do **not** reuse obsolete IDs from old chats.

| Network | Port | Current enode |
|---------|------|----------------|
| Mainnet | **30303** TCP+UDP | `enode://6728dde6587af2b1ed676261d486319254cd3ad1a7721d779210e108ccced65e9b020ffc59a1f5b4ca0ce2120dcbba66488cc46b7679a7702d0e3a223e70b62e@168.144.69.102:30303` |
| Testnet | **30313** TCP+UDP | `enode://f762fd2f93af7d072aa497fab66e5e54800b9de96becd13b79378d2b89b6e567c6d703cf16a977e4463205b373c1b86b241c860a1d609405139f340938b96112@168.144.69.102:30313` |

**Pinned nodekey (ops):**

| Network | Laptop (gitignored) | Server |
|---------|---------------------|--------|
| Mainnet | `ecnachain/docker/nodekey` | `/opt/ecnascan/ecnachain/docker/nodekey` |
| Testnet | `testnet/ecnachain/docker/nodekey` | `/opt/ecnascan-testnet/ecnachain/docker/nodekey` |

Entrypoint copies `/secrets/nodekey` → datadir and starts with `--nat extip:168.144.69.102`. After any wipe: confirm enode still matches `static-nodes.json`; if not, update JSON + GitHub + this doc + `AGENTS.md`.

**Obsolete enodes (do not share):** mainnet `e11f51…`, testnet `9ad0e0…`.

---

## Mainnet addresses (chain 4111)

| Role | Address | Purpose |
|------|---------|---------|
| **Clique miner (live signer)** | `0x9F926a69ba55c2F436A51108f8eb96E21fC5a329` | Only address in genesis `extraData` that seals blocks on this DO node. Key: `/opt/ecnascan/ecnachain/docker/miner-private.hex` |
| **Treasury (genesis premine)** | `0x34c7288B86E10A7096523FB1d6eC12948af95897` | Receives full **1 Crore** ECNA at genesis. Client holds spend key. Env: `ECNA_NATIVE_MINT_ADDRESS` |

**Reserved for later multi-validator (NOT in live genesis yet):**

- `0xfb89AF98E9A466417bBc1D2F2B1ff3657Bb5366D`
- `0xFe82A6c11C4A994CDd174981E10F6d7BeEbC7e30`
- `0xd1d9a90EbF2bc4B6517b1C91787e72d5CdBFB059`
- `0x16736b1B2b8A90e979191d58ADb21929f839a6f5`

Adding them requires new genesis + chain wipe (must have their private keys / peer nodes online).

**Faucet:** disabled on mainnet (`FAUCET_ENABLED=0`).

---

## Testnet addresses (chain 4112)

| Role | Address | Purpose |
|------|---------|---------|
| **Clique miner (live signer)** | `0x9F926a69ba55c2F436A51108f8eb96E21fC5a329` | Same key as mainnet miner (different chain). Key: `/opt/ecnascan-testnet/ecnachain/docker/miner-private.hex` |
| **Treasury (genesis premine)** | `0x2509e87b12DAD407DC3521Dd15A95B3F74EF41D3` | Testnet treasury premine. Env: `ECNA_NATIVE_MINT_ADDRESS` |
| **Faucet wallet** | `0x93994c8B2557B74Ae988640444268CD3473D6f68` | Funded in genesis; API sends tECNA to users. Env: `FAUCET_PRIVATE_KEY` + `ECNA_FAUCET_ADDRESS`. Hex: `testnet/ecnachain/docker/faucet-private.hex` |

**Reserved for later multi-validator (NOT in live genesis yet):**

- `0xD0e241f8416725f7B711f5Fbd3b4dbdD17eB81E8`
- `0xA38732032570E22567Ffc95a17ACf45f8f1d1487`
- `0x3cA594B2a18d7c9fDdd35F216EF79B6C53989F70`
- `0x46e7bDf8d9674b14e0FFC544323AEA883A27F360`

---

## How faucet works (testnet)

1. User posts **only their wallet address** (explorer Faucet page or `POST /api/v1/faucet`).
2. API loads `FAUCET_PRIVATE_KEY` → wallet `0x93994c8B…` signs a native send (~1000 tECNA).
3. User never provides a private key.

---

## Key file map (ops)

| Network | File | What |
|---------|------|------|
| Mainnet | `/opt/ecnascan/ecnachain/docker/miner-private.hex` | Miner key (64 hex, no `0x`) |
| Mainnet | `/opt/ecnascan/ecnachain/docker/nodekey` | Pinned P2P identity (enode) |
| Mainnet | `/opt/ecnascan/ecnachain/.env` | `ECNA_PRIMARY_ADDRESS`, `ECNA_VALIDATORS`, `ECNA_NATIVE_MINT_ADDRESS` |
| Mainnet | `/opt/ecnascan/server/.env` | API/indexer env (DB, RPC, validators, treasury) |
| Testnet | `/opt/ecnascan-testnet/ecnachain/docker/miner-private.hex` | Miner key |
| Testnet | `/opt/ecnascan-testnet/ecnachain/docker/nodekey` | Pinned P2P identity (enode) |
| Testnet | `/opt/ecnascan-testnet/ecnachain/docker/faucet-private.hex` | Faucet key |
| Testnet | `/opt/ecnascan-testnet/server/.env` | Includes `FAUCET_PRIVATE_KEY` |

Repo mirrors (local laptop): `ecnachain/`, `testnet/ecnachain/`, `server/.env`, `testnet/server/.env` — do not commit secrets.

---

## Fresh go-live script

```powershell
.\scripts\deploy-fresh-golive.ps1
```

Wipes Geth data + SQL index for **both** networks, installs genesis, restarts Geth/PM2, publishes frontends.

Older single-network helper: `scripts/client-go-live-reset.sh` (mainnet only).

---

## Public URLs

| | Mainnet | Testnet |
|--|---------|---------|
| Explorer | https://explorer.ecnascan.com | https://testnetexplorer.ecnascan.com |
| API | https://api.ecnascan.com | https://testnetapi.ecnascan.com |
| RPC | https://rpc.ecnascan.com | https://testnetrpc.ecnascan.com |
| Website | https://ecnascan.com | (same site shows both) |
| Dashboard | https://dashboard.ecnascan.com | (mainnet wallet UI only — no testnet dashboard host) |
| Faucet | — | https://testnetexplorer.ecnascan.com/faucet |
| Exchange listing pack | [`docs/EXCHANGE-LISTING.md`](./EXCHANGE-LISTING.md) | [`docs/EXCHANGE-LISTING-TESTNET.md`](./EXCHANGE-LISTING-TESTNET.md) |

Config check: `GET /api/v1/config` on each API.

**Chainlist / GitHub recall:** [`docs/GITHUB-AND-CHAINLIST.md`](./GITHUB-AND-CHAINLIST.md) (PRs, private repos, timing).

---

## Public RPC hardening (required)

Clique mining unlocks the miner account inside Geth. That must **never** be reachable from the public internet via `eth_sendTransaction`.

**Live setup (15 July 2026 — wipe + harden):**

1. Docker RPC/WS bound to **`127.0.0.1` only** (`8545` / `18545`) — not `0.0.0.0`.
2. PM2 **`ecna-rpc-guard`** / **`ecna-rpc-guard-testnet`** (`scripts/rpc-public-guard.mjs`) filter public methods.
3. Nginx `rpc.ecnascan.com` / `testnetrpc.ecnascan.com` → guards (`28545` / `28546`).
4. **UFW** allows only `22/80/443` + P2P `30303/30313`; denies `8545/8546/18545/18546`.
5. Fresh go-live always ends with `harden-rpc-live.sh` so this cannot be skipped.

| Public method | Allowed? |
|---------------|----------|
| `eth_sendRawTransaction` (MetaMask / faucet signed txs) | Yes |
| `eth_sendTransaction` / `eth_sign` / `personal_*` / `miner_*` | **No** |

Re-apply on server: `bash /opt/ecnascan/scripts/harden-rpc-live.sh`  
Full wipe + harden: `.\scripts\deploy-fresh-golive.ps1`
