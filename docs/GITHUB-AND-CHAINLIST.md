# GitHub account, private repos, and Chainlist listing

**Last updated:** 15 July 2026  
For secrets (password / PAT): local only → `scripts/github-credentials.local.json` and `scripts/GITHUB.local.md` (**gitignored — never commit**).

## GitHub identity (public)

| Field | Value |
|-------|--------|
| Username | [ecannablockchain](https://github.com/ecannablockchain) |
| Email (account) | `abhi.ecanna@gmail.com` |

CLI: GitHub CLI (`gh`) is used on the laptop; login via PAT stored in the gitignored credentials file.

## Product repos (private until you flip visibility)

| Repo | Visibility | URL | Contents (sanitized) |
|------|------------|-----|----------------------|
| **ecanna-mainnet** | **Public** | https://github.com/ecannablockchain/ecanna-mainnet | Mainnet chain 4111 + explorer/API apps; no `.env` / keys |
| **ecanna-testnet** | **Public** | https://github.com/ecannablockchain/ecanna-testnet | Testnet chain 4112 + faucet/explorer/API; no `.env` / keys |

**Exchange listing packs:**  
- Mainnet → [`docs/EXCHANGE-LISTING.md`](./EXCHANGE-LISTING.md)  
- Testnet → [`docs/EXCHANGE-LISTING-TESTNET.md`](./EXCHANGE-LISTING-TESTNET.md)  
(genesis + `static-nodes.json` + Geth `v1.13.15` + peer enode; public `*.ecnascan.com` URLs only — no obsolete host IPs)

**Never push:** `.env`, `miner-private.hex`, `faucet-private.hex`, `password-dev.txt`, SSH/SQL passwords, GitHub PAT, `scripts/*credentials.local*`.

Local workstation monorepo remains the full ops copy (with secrets). GitHub copies are intentionally secret-free.

## Chainlist / wallet listing (submitted 15 Jul 2026)

| Registry | PR | Status |
|----------|-----|--------|
| [chainlist.org](https://chainlist.org) (DefiLlama) | https://github.com/DefiLlama/chainlist/pull/2935 | **Merged** 15 Jul 2026 — both **4111** and **4112** in `rpcs.json` |
| ethereum-lists (many wallets) | https://github.com/ethereum-lists/chains/pull/8519 | Open — waiting on merge (CI must stay green) |

**UI tip:** Search **4111** → Mainnet only. For testnet search **4112** or **E Canna Testnet**, and keep **Include Testnets** checked.

Submission sources in this monorepo: [`docs/chainlist/`](./chainlist/).

**Keep until PRs merge** (then delete if you want):

- Fork https://github.com/ecannablockchain/chainlist  
- Fork https://github.com/ecannablockchain/chains  

### Typical timing

- Maintainer review: often **days to ~1–2 weeks** (varies).
- After merge: usually **minutes to a few hours** on chainlist.org (sometimes up to ~24h).
- Search for **E Canna**, **4111**, or **4112**.

Until live on Chainlist, users can add MetaMask manually (RPC + chain ID) — see [`docs/chainlist/README.md`](./chainlist/README.md).

### Chain IDs (do not change after listing)

| Network | Chain ID | Symbol | Public RPC |
|---------|----------|--------|------------|
| E Canna Mainnet | **4111** | ECNA | https://rpc.ecnascan.com |
| E Canna Testnet | **4112** | tECNA | https://testnetrpc.ecnascan.com |

First merged claim owns the ID permanently — never reuse or swap IDs after merge.

## Related docs

- [`AGENTS.md`](../AGENTS.md) — short briefing  
- [`docs/ADDRESSES-LIVE.md`](./ADDRESSES-LIVE.md) — live addresses  
- [`docs/KT-ECNA-MAINNET-TESTNET.md`](./KT-ECNA-MAINNET-TESTNET.md) — full KT  
- SSH deploy secrets (local): `scripts/deploy-server.credentials.local.json`
