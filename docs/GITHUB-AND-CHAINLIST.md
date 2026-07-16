# GitHub, Chainlist, and exchange sharing

**Last updated:** 16 July 2026  

**Secrets stay local only:** `scripts/github-credentials.local.json`, `scripts/GITHUB.local.md`, `scripts/deploy-server.credentials.local.json` (**gitignored — never commit**).

## Two places for code (do not confuse them)

| Location | What it is |
|----------|------------|
| **This laptop monorepo** (`Desktop/Blockchain`) | Full ops copy: chain + apps + **real** `.env` / `*.hex` (gitignored) |
| **GitHub public repos** | Secret-free mirrors for partners / exchanges / open source |

Pushing to GitHub must **never** include private keys, SSH passwords, SQL passwords, or live `SITE_AUTH_SECRET`.

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
| Testnet | [EXCHANGE-LISTING-TESTNET.md](https://github.com/ecannablockchain/ecanna-testnet/blob/main/docs/EXCHANGE-LISTING-TESTNET.md) | [genesis.json](https://github.com/ecannablockchain/ecanna-testnet/blob/main/ecnachain/genesis.json) | [static-nodes.json](https://github.com/ecannablockchain/ecanna-testnet/blob/main/ecnachain/static-nodes.json) |

Geth client: Docker `ethereum/client-go:v1.13.15` (live **1.13.15-stable**).  
Public URLs only (`*.ecnascan.com`) — **not** obsolete `50.28.84.113`.

### Credential audit (16 Jul 2026)

Confirmed **absent** from public Git: SSH password, GitHub PAT, miner/faucet `.hex`, live SQL password, live `SITE_AUTH_SECRET`.  
Templates use placeholders only (`YOUR_…`, `CHANGE_ME…`).  
Public by design: wallet addresses, RPC URLs, peer enodes.

## Chainlist / wallet listing

| Registry | PR | Status |
|----------|-----|--------|
| [chainlist.org](https://chainlist.org) | https://github.com/DefiLlama/chainlist/pull/2935 | **Merged** — 4111 + 4112 live |
| ethereum-lists | https://github.com/ethereum-lists/chains/pull/8519 | Still open |

**UI tip:** Search **4111** → mainnet. Search **4112** + **Include Testnets** → testnet.

Local submission sources: [`docs/chainlist/`](./chainlist/).

Forks (optional cleanup after ethereum-lists merges): `ecannablockchain/chainlist`, `ecannablockchain/chains`.

### Chain IDs (permanent after listing)

| Network | Chain ID | Symbol | Public RPC |
|---------|----------|--------|------------|
| E Canna Mainnet | **4111** | ECNA | https://rpc.ecnascan.com |
| E Canna Testnet | **4112** | tECNA | https://testnetrpc.ecnascan.com |

## Related docs

- [`AGENTS.md`](../AGENTS.md) — start here  
- [`docs/ADDRESSES-LIVE.md`](./ADDRESSES-LIVE.md) — live addresses + RPC harden  
- [`docs/KT-ECNA-MAINNET-TESTNET.md`](./KT-ECNA-MAINNET-TESTNET.md) — full KT  
- [`docs/LIVE-FROM-ZERO.md`](./LIVE-FROM-ZERO.md) — English bootstrap order  
