# Exchange / partner listing pack — E Canna Testnet

**Network:** E Canna Testnet · **Chain ID:** `4112` · **Symbol:** `tECNA`  
**GitHub (public source):** https://github.com/ecannablockchain/ecanna-testnet  

Use these links when an exchange or partner asks for testnet source, genesis, peers, and Geth build.

| What they ask | Link / value |
|---------------|----------------|
| **GitHub source** | https://github.com/ecannablockchain/ecanna-testnet |
| **genesis.json** | https://github.com/ecannablockchain/ecanna-testnet/blob/main/ecnachain/genesis.json |
| **static-nodes.json** (peer nodes) | https://github.com/ecannablockchain/ecanna-testnet/blob/main/ecnachain/static-nodes.json |
| **Raw genesis** | https://raw.githubusercontent.com/ecannablockchain/ecanna-testnet/main/ecnachain/genesis.json |
| **Raw static-nodes** | https://raw.githubusercontent.com/ecannablockchain/ecanna-testnet/main/ecnachain/static-nodes.json |
| **Docker / Geth image (compiled client)** | `ethereum/client-go:v1.13.15` — see `ecnachain/docker-compose.yml` |
| **Geth version (live)** | `1.13.15-stable` (commit `c5ba367e…`) |
| **Public RPC** | https://testnetrpc.ecnascan.com |
| **Explorer** | https://testnetexplorer.ecnascan.com |
| **API** | https://testnetapi.ecnascan.com |
| **Faucet** | https://testnetexplorer.ecnascan.com/faucet |
| **Website** | https://ecnascan.com |
| **Chainlist** | https://chainlist.org/?search=4112&testnets=true |

## Peer / bootnode (copy-paste)

```
enode://9ad0e0211881c099f4fe35b524368a1629b763b2b8d205848a8c7105aff412d39a965c3e63035dd2de44b59345c57535bf387546556ebd1370c0dcefb8600804@168.144.69.102:30313
```

- **P2P port:** `30313` TCP + UDP (mapped; does not conflict with mainnet `30303`)  
- **Host:** `168.144.69.102`  
- Place `static-nodes.json` under the node’s datadir `geth/` folder, or pass via bootnodes.

## How to sync a testnet full node (short)

1. Run Geth **v1.13.15** (or Docker image above).  
2. `geth init --datadir ./data` with the raw genesis.  
3. Copy `static-nodes.json` into `./data/geth/static-nodes.json`.  
4. Start with networkid **4112**, P2P open to peer on **30313**.  

## Mainnet companion

https://github.com/ecannablockchain/ecanna-mainnet (chain ID **4111** / ECNA) · [`docs/EXCHANGE-LISTING.md`](./EXCHANGE-LISTING.md)

## Do not send exchanges

Private keys, miner/faucet hex, SSH passwords, SQL credentials, or server `.env` files.
