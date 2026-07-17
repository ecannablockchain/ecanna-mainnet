# GitHub, Chainlist, and exchange sharing

**Last updated:** 17 July 2026  

**Secrets stay local only:** `scripts/github-credentials.local.json`, `scripts/GITHUB.local.md`, `scripts/deploy-server.credentials.local.json`, `**/docker/nodekey`, `*.hex` (**gitignored — never commit**).

## Two places for code (do not confuse them)

| Location | What it is |
|----------|------------|
| **This laptop monorepo** (`Desktop/Blockchain`) | Full ops copy: chain + apps + **real** `.env` / `*.hex` / `nodekey` (gitignored) |
| **GitHub public repos** | Secret-free mirrors for partners / exchanges / open source |

Pushing to GitHub must **never** include private keys, `nodekey`, SSH passwords, SQL passwords, or live `SITE_AUTH_SECRET`.

## GitHub identity

| Field | Value |
|-------|--------|
| Username | [ecannablockchain](https://github.com/ecannablockchain) |
| Email | `abhi.ecanna@gmail.com` |

## Product repos (both public)

| Repo | URL | Share for |
|------|-----|-----------|
| **ecanna-mainnet** | https://github.com/ecannablockchain/ecanna-mainnet | Mainnet 4111 / ECNA |
| **ecanna-testnet** | https://github.com/ecannablockchain/ecanna-testnet | Testnet 4112 / tECNA |

### Exchange / node-operator links

| Network | Listing pack | genesis | static-nodes |
|---------|--------------|---------|----------------|
| Mainnet | [EXCHANGE-LISTING.md](https://github.com/ecannablockchain/ecanna-mainnet/blob/main/docs/EXCHANGE-LISTING.md) | [genesis.json](https://github.com/ecannablockchain/ecanna-mainnet/blob/main/ecnachain/genesis.json) | [static-nodes.json](https://github.com/ecannablockchain/ecanna-mainnet/blob/main/ecnachain/static-nodes.json) |
| Testnet | [EXCHANGE-LISTING.md](https://github.com/ecannablockchain/ecanna-testnet/blob/main/docs/EXCHANGE-LISTING.md) | [genesis.json](https://github.com/ecannablockchain/ecanna-testnet/blob/main/ecnachain/genesis.json) | [static-nodes.json](https://github.com/ecannablockchain/ecanna-testnet/blob/main/ecnachain/static-nodes.json) |

| Item | Value |
|------|--------|
| Geth | Docker `ethereum/client-go:v1.13.15` (live **1.13.15-stable**) |
| OS | Ubuntu **24.04 LTS** (also OK: 22.04 + Docker) |
| EVM / genesis | **London only** — **no** `shanghaiTime` (Clique + Shanghai breaks stock Geth sync) |
| Mainnet peer | `enode://6728dde…@168.144.69.102:30303` — see `static-nodes.json` |
| Testnet peer | `enode://f762fd2…@168.144.69.102:30313` — see `static-nodes.json` |
| Public URLs | `*.ecnascan.com` only — **not** obsolete `50.28.84.113` |

**After every dual genesis wipe:** verify live enode → update `static-nodes.json` in laptop + both GitHub repos + listing docs (nodekey is pinned under `docker/nodekey` so ID should stay stable).

### Credential audit

Confirmed **absent** from public Git: SSH password, GitHub PAT, miner/faucet `.hex`, `nodekey`, live SQL password, live `SITE_AUTH_SECRET`.  
Templates use placeholders only (`YOUR_…`, `CHANGE_ME…`, `nodekey.example`).  
Public by design: wallet addresses, RPC URLs, peer enodes, London genesis.

## Chainlist / wallet listing

| Registry | PR | Status |
|----------|-----|--------|
| [chainlist.org](https://chainlist.org) | https://github.com/DefiLlama/chainlist/pull/2935 | **Merged** — 4111 + 4112 live |
| ethereum-lists | https://github.com/ethereum-lists/chains/pull/8519 | Still open |

**UI tip:** Search **4111** → mainnet. Search **4112** + **Include Testnets** → testnet.

Local submission sources: [`docs/chainlist/`](./chainlist/).

### Chain IDs (permanent after listing)

| Network | Chain ID | Symbol | Public RPC | EVM |
|---------|----------|--------|------------|-----|
| E Canna Mainnet | **4111** | ECNA | https://rpc.ecnascan.com | **london** |
| E Canna Testnet | **4112** | tECNA | https://testnetrpc.ecnascan.com | **london** |

## Related docs

- [`AGENTS.md`](../AGENTS.md) — start here (enode + listing pitfalls)  
- [`docs/ADDRESSES-LIVE.md`](./ADDRESSES-LIVE.md) — live addresses, P2P, RPC harden  
- [`docs/EXCHANGE-LISTING.md`](./EXCHANGE-LISTING.md) / [`EXCHANGE-LISTING-TESTNET.md`](./EXCHANGE-LISTING-TESTNET.md)  
- [`docs/KT-ECNA-MAINNET-TESTNET.md`](./KT-ECNA-MAINNET-TESTNET.md) — full KT  
- [`docs/LIVE-FROM-ZERO.md`](./LIVE-FROM-ZERO.md) — English bootstrap order  
