# ECNA deployment (local + production)

## Architecture

- **Client:** Geth (official `ethereum/client-go` image).
- **Consensus:** Clique PoA — validator addresses are embedded in genesis `extraData` and must sign blocks.
- **Network ID:** Use `4111` to match `chainId` in genesis (see `docker-compose.yml` `NETWORK_ID`).

## Local (Docker)

1. Build genesis if needed: `ECNA_VALIDATORS=... ECNA_TREASURY=... node scripts/build-genesis.mjs`
2. `docker compose up -d` from `ecnachain/`
3. MetaMask: import signer key; add network from `metamask-network.json` or explorer “Add network”.

## Validator setup

1. Create secp256k1 accounts (e.g. `geth account new --datadir ./keys`).
2. Add signer addresses to `ECNA_VALIDATORS` and rebuild `genesis.json`.
3. Pre-mint treasury: set `ECNA_TREASURY` and `ECNA_TOTAL_WEI` (1 Crore × 10^18 for 18 decimals — default `10000000000000000000000000`).
4. **Never** change supply or validator set on an existing chain — deploy a **new** genesis and new `data/` directory.

Each validator node:

- Same `genesis.json`
- `--mine` and `--miner.etherbase` set to an address that appears in Clique `extraData`
- `--unlock` + password file (dev) or **Clef** / external signer (production)

## Bootnodes & extra peers

1. Start first node; obtain enode: `docker exec ecna-validator-1 geth attach --exec "admin.nodeInfo.enode" data/geth.ipc` (path may vary — use HTTP `admin` if enabled, or check logs).
2. Second node: set `BOOTNODES=enode://...@host:30303` in `docker-compose` override.
3. Open firewall **30303/tcp+udp** between peers. No domain required — IP/DNS agnostic.

## RPC endpoints

- **HTTP:** `8545` — `eth_*`, `net_*`, `web3_*`, `txpool_*`, `miner_*` (as exposed in entrypoint).
- **WS:** `8546` — subscriptions for dashboards/explorers.

Production: put **Nginx/TLS** or cloud LB in front; restrict `admin`/`debug` APIs; use JWT on `authrpc` for Engine API if post-merge stack; this PoA template uses authrpc JWT file for compatibility.

## Production hardening (summary)

- Remove `--allow-insecure-unlock`; use Clef or remote signer.
- Do not commit real keys; use secrets manager.
- Firewall: only trusted IPs on RPC; keep P2P open between validators.
- Monitor disk: archive + full sync grows quickly.

## MetaMask

See `metamask-network.json`. Custom RPC = your public RPC URL; chain ID **4111**; symbol **ECNA**.
