# ECNA Chain (ECNASCAN stack)

EVM-compatible **Proof-of-Authority (Clique)** network using **go-ethereum (Geth)** — same family as Ethereum/BSC-style execution clients.

| Item | Value |
|------|--------|
| Chain ID | `4111` (EIP-155 replay domain) |
| Block time | ~3s (`clique.period` in genesis) |
| Native asset | **E Canna (ECNA)** (18 decimals); **1 Crore (10,000,000)** pre-allocated in genesis |
| Consensus | Clique PoA (only listed signers produce blocks) |
| Live miner | `0x9F926a69ba55c2F436A51108f8eb96E21fC5a329` |
| Live treasury | `0x34c7288B86E10A7096523FB1d6eC12948af95897` |
| Storage | LevelDB under `geth/chaindata` (Geth default) |

**Immutability:** Confirmed blocks are content-addressed in the chain; clients do not “edit” history. Changing total supply or token branding requires a **new genesis** → **new chain** (see `scripts/build-genesis.mjs`).

**Live address book:** `docs/ADDRESSES-LIVE.md` (mainnet + testnet).

**Security (execution layer):** Unsigned txs are rejected; balances, nonces, and signatures are validated by Geth; double-spend prevented by state transition rules; EIP-155 uses chain ID `4111`.

## Repository layout

- `genesis.json` — **live mainnet genesis** (treasury + Clique miner).
- `scripts/build-genesis.mjs` — regenerate genesis from `ECNA_VALIDATORS`, `ECNA_TREASURY`, optional `ECNA_CHAIN_ID`, `ECNA_TOTAL_WEI`.
- `docker/miner-private.hex` — Clique signer private key (**gitignored**, must match `ECNA_PRIMARY_ADDRESS`).
- `docker-compose.yml` — validator-1 (signer + RPC).
- `docker-compose.fullnode.yml` — optional **sync-only** full node (`ENABLE_MINING=0`); set `ECNA_BOOTNODES`.
- `docker-compose.validator2.yml` — optional **second signer**; set `ECNA_V1_ENODE` from `scripts/print-enode.*`.
- `metamask-network.json` — EIP-3085 style hints for wallets.
- `docs/` — deployment, backup, security, **requirements traceability**, PoS notes.

## Quick start (Docker)

```bash
cd ecnachain
docker compose up -d
```

- Production RPC: `https://rpc.ecnascan.com` (nginx → `127.0.0.1:8545` on DO)
- Local HTTP RPC: `http://127.0.0.1:8545`

Miner key must match genesis signer (`docker/miner-private.hex`).

## Regenerate genesis (production)

```bash
export ECNA_VALIDATORS="0x9F926a69ba55c2F436A51108f8eb96E21fC5a329"
export ECNA_TREASURY="0x34c7288B86E10A7096523FB1d6eC12948af95897"
export ECNA_CHAIN_ID=4111
# optional: export ECNA_TOTAL_WEI=10000000000000000000000000
# (default = 1 Crore ECNA = 10,000,000 × 10^18 wei)
node scripts/build-genesis.mjs
```

Remove old `data/` before `geth init` with a new genesis.

## Monorepo explorer (ECNASCAN UI)

From repo root, point the API at this RPC and chain **4111** (see `server/.env.example` and `apps/explorer` `VITE_*` vars), then run `npm run local:stack` or explorer only.

## Multinode / bootnode

1. Start validator-1: `docker compose up -d`
2. Enode: `./scripts/print-enode.sh` or `pwsh ./scripts/print-enode.ps1`
3. Full node: put enode in `.env` as `ECNA_BOOTNODES=...` then `npm run docker:fullnode` from `ecnachain/`
4. Second signer: import key into `data/validator2`, set `ECNA_V1_ENODE`, then `npm run docker:validators`

## Further reading

- [docs/REQUIREMENTS-TRACEABILITY.md](docs/REQUIREMENTS-TRACEABILITY.md) — **full spec → code map**.
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — validators, bootnodes, production hardening.
- [docs/POS-ALTERNATIVES.md](docs/POS-ALTERNATIVES.md) — PoS vs Clique PoA.
- [docs/BACKUP-RECOVERY.md](docs/BACKUP-RECOVERY.md) — chaindata backup & restore + `scripts/crontab-backup.example`.
- [docs/SECURITY.md](docs/SECURITY.md) — threats and mitigations.
