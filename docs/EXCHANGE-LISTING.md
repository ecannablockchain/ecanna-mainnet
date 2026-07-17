# Exchange / partner listing pack — E Canna Mainnet

**Network:** E Canna Mainnet · **Chain ID:** `4111` · **Symbol:** `ECNA`  
**GitHub (public source):** https://github.com/ecannablockchain/ecanna-mainnet  

Use these links when an exchange asks for source, genesis, peers, and Geth build.

| What they ask | Link / value |
|---------------|----------------|
| **GitHub source** | https://github.com/ecannablockchain/ecanna-mainnet |
| **genesis.json** | https://github.com/ecannablockchain/ecanna-mainnet/blob/main/ecnachain/genesis.json |
| **static-nodes.json** (peer nodes) | https://github.com/ecannablockchain/ecanna-mainnet/blob/main/ecnachain/static-nodes.json |
| **Raw genesis** | https://raw.githubusercontent.com/ecannablockchain/ecanna-mainnet/main/ecnachain/genesis.json |
| **Raw static-nodes** | https://raw.githubusercontent.com/ecannablockchain/ecanna-mainnet/main/ecnachain/static-nodes.json |
| **Docker / Geth image (compiled client)** | `ethereum/client-go:v1.13.15` — see [docker-compose.yml](../ecnachain/docker-compose.yml) |
| **Geth version (live)** | `1.13.15-stable` (commit `c5ba367e…`) |
| **Ubuntu (live production)** | **24.04 LTS** (also tested with **22.04 LTS** + Docker) |
| **Public RPC** | https://rpc.ecnascan.com |
| **Explorer** | https://explorer.ecnascan.com |
| **Website** | https://ecnascan.com |
| **Chainlist** | https://chainlist.org/?search=4111 |

## Peer / bootnode (copy-paste)

```
enode://e11f51bdb2bafcd774fe1a9a79860995892535792386319928c9a83a6f775c61cc57ca0a2682adab3e55201a5d787b1158958e7d0451c1d7c37aea50443e9d4b@168.144.69.102:30303
```

- **P2P port:** `30303` TCP + UDP  
- **Host:** `168.144.69.102`  
- Place `static-nodes.json` under the node’s datadir `geth/` folder (Geth standard), or pass via bootnodes.

## Node OS & client requirements

| Item | Value |
|------|--------|
| **OS** | **Ubuntu 24.04 LTS** (live); **Ubuntu 22.04 LTS** also works |
| **Architecture** | `amd64` / `x86_64` |
| **Docker (optional)** | Docker Engine + Compose v2 |
| **Geth client** | **v1.13.15-stable** — Docker image `ethereum/client-go:v1.13.15` or [release binary](https://github.com/ethereum/go-ethereum/releases/tag/v1.13.15) |
| **Consensus** | Clique Proof-of-Authority (PoA) |
| **EVM** | **london** (no `shanghaiTime` — stock Geth Clique cannot enable Shanghai) |
| **Sync mode** | `full` + `gcmode archive` (matches live validator) |

**Minimum hardware (exchange sync node):** 2 vCPU, 4 GB RAM, 50+ GB SSD (archive grows over time).

> **Why not Shanghai?** Upstream Geth returns `clique does not support shanghai fork` when a peer syncs a Clique chain that sets `shanghaiTime`. Genesis therefore stops at **London** so exchange nodes on stock `geth v1.13.15` can sync.

## Geth start command (sync-only full node)

After `geth init` and copying `static-nodes.json`, use this for an **exchange-owned read node** (no mining, no unlocked keys):

```bash
geth \
  --datadir ./data \
  --networkid 4111 \
  --syncmode full \
  --gcmode archive \
  --http \
  --http.addr "127.0.0.1" \
  --http.port "8545" \
  --http.api "eth,net,web3,txpool" \
  --ws \
  --ws.addr "127.0.0.1" \
  --ws.port "8546" \
  --ws.api "eth,net,web3" \
  --port 30303 \
  --discovery.port 30303 \
  --nat any
```

- Bind `--http.addr` to your **internal** IP (or `0.0.0.0` only behind a firewall) if the exchange indexer runs on another host — **never** expose `debug`, `admin`, or `db` APIs on the internet.
- **Public RPC for wallets / deposits:** use **https://rpc.ecnascan.com** — you do **not** need to run a public `0.0.0.0` Geth HTTP endpoint.
- Live operator stack uses the same flags via `ecnachain/docker/geth-entrypoint.sh`; validator RPC is bound to **127.0.0.1** and filtered by `rpc-public-guard` before nginx.

**Docker (recommended):** `ecnachain/docker-compose.yml` + `ecnachain/docker-compose.fullnode.yml` with `ENABLE_MINING=0`.

## How to sync a full node (short)

1. Install/run Geth **v1.13.15** on **Ubuntu 22.04/24.04** (or use Docker image above).  
2. `geth init --datadir ./data genesis.json` using the raw genesis link.  
3. Copy `static-nodes.json` into `./data/geth/static-nodes.json`.  
4. Start Geth with networkid **4111**, P2P **30303** open to the peer above.  
5. Optional HTTP RPC on **localhost** or private network for the exchange indexer — do **not** expose unlocked accounts or `admin`/`debug` APIs.

Compose reference: `ecnachain/docker-compose.yml` + `ecnachain/docker-compose.fullnode.yml`.

## Testnet (optional)

Private companion repo: https://github.com/ecannablockchain/ecanna-testnet (chain ID **4112** / tECNA).  
Make public only if the exchange also needs testnet.

## Do not send exchanges

Private keys, miner hex, faucet keys, SSH passwords, SQL credentials, or server `.env` files.
