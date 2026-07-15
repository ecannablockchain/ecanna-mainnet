# Specification → implementation map (ECNA / ECNASCAN)

This document maps your core requirements to concrete artifacts in **this repository**.

| # | Requirement | Implementation |
|---|-------------|----------------|
| **1** | Geth/BSC-class EVM client; PoA or PoS; chain ID **4111**; ~**3s** blocks; P2P independent of domain | **Geth** `ethereum/client-go` in `ecnachain/docker-compose*.yml`. **Clique PoA** in `ecnachain/genesis.json` (`clique.period: 3`). **Chain ID 4111** in genesis `config.chainId`. Peers use **enode** URLs (IP/DNS agnostic). **PoS** is not bundled here; see [POS-ALTERNATIVES.md](POS-ALTERNATIVES.md). |
| **2** | Native token **E Canna (ECNA)**; **1 Crore (10,000,000)** × 10¹⁸ wei pre-mint; one treasury; no native mint after genesis | Genesis `alloc` in `genesis.json` + `scripts/build-genesis.mjs` (`ECNA_TOTAL_WEI`). Native balance is protocol state (not an ERC-20). New supply ⇒ **new genesis** (new `ECNA_CHAIN_ID` + new alloc). |
| **3** | Validators in genesis; full supply in genesis; changes ⇒ new chain | Clique **signers** in `extraData` (see builder script). Documented in `README.md` / `docs/DEPLOYMENT.md`. |
| **4** | Signed txs; balance/nonce/signature checks; no double-spend; only validators produce blocks | **Geth** consensus + tx pool (standard Ethereum rules). **Clique** restricts block authors to genesis signers. |
| **5** | Immutability; LevelDB/RocksDB; portable chaindata | Geth persists **LevelDB** under `geth/chaindata` (default). **RocksDB**: optional in newer Geth builds via flags — ops choice, not committed here. No domain coupling: state is local DB + P2P. |
| **6** | Full node storage; automated backup; recovery; multi-node sync | **Archive** sync in entrypoint. **Backup/restore:** `scripts/backup-chain.sh|.ps1`, `restore-chain.sh|.ps1`. **Schedule:** `scripts/crontab-backup.example`. **Multinode:** `docker-compose.fullnode.yml`, `docker-compose.validator2.yml` + `BOOTNODES` / `ECNA_V1_ENODE`. |
| **7** | Public txs; transparency; sync | All txs in canonical blocks are visible via RPC; **ECNASCAN Explorer** (`apps/explorer`) + indexer API index them into **SQL Server** for UI. |
| **8** | **ECNASCAN Explorer**; txs, balances, transfers, blocks, contracts | **React explorer** in repo (**ECNASCAN**). Contract **read/write + verify** in explorer UI. API + indexer in `server/`. |
| **9** | No central domain DB for chain; bootnodes | Chain state = **Geth** + P2P. **Bootnodes** via `--bootnodes` / `BOOTNODES` env in compose overrides. |
| **10** | genesis.json; node/validator setup; RPC; Docker | `ecnachain/genesis.json`, `docker-compose.yml`, `docs/DEPLOYMENT.md`, `docker/geth-entrypoint.sh`. |
| **11** | MetaMask; chain ID 4111 | `metamask-network.json`, explorer **Add ECNA network**, dashboard `wagmi.ts` default chain **4111**. |
| **12** | New chain = new name/supply via new genesis | `build-genesis.mjs`: `ECNA_CHAIN_ID`, `ECNA_TOTAL_WEI`, new validators/treasury → new `genesis.json` + fresh `data/`. |
| **13** | Fake txs, replay, double-spend, resets; validator control | **Signatures + EIP-155** (chainId 4111). **Clique** signer set. Ops: **SECURITY.md** (no insecure unlock in prod, firewall RPC). |

## Monorepo wiring

| Component | Path |
|-----------|------|
| L1 node(s) | `ecnachain/` |
| Indexer + REST API | `server/` |
| ECNASCAN Explorer UI | `apps/explorer/` |
| Wallet dashboard | `apps/dashboard/` |
| ERC-20 (optional, separate from native ECNA) | `contracts/` (Hardhat) |

Root **`README.md`** describes end-to-end: **ECNA Geth** + **API/indexer** + **ECNASCAN**.
