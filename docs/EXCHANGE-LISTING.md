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

## How to sync a full node (short)

1. Install/run Geth **v1.13.15** (or use Docker image above).  
2. `geth init --datadir ./data genesis.json` using the raw genesis link.  
3. Copy `static-nodes.json` into `./data/geth/static-nodes.json`.  
4. Start Geth with networkid **4111**, P2P **30303** open to this peer.  
5. Optional HTTP RPC for the exchange’s indexer only — do **not** expose unlocked accounts.

Compose reference: `ecnachain/docker-compose.yml` + `ecnachain/docker-compose.fullnode.yml`.

## Testnet (optional)

Private companion repo: https://github.com/ecannablockchain/ecanna-testnet (chain ID **4112** / tECNA).  
Make public only if the exchange also needs testnet.

## Do not send exchanges

Private keys, miner hex, faucet keys, SSH passwords, SQL credentials, or server `.env` files.
