# List E Canna on [chainlist.org](https://chainlist.org)

Verified live (15 Jul 2026): RPC returns `0x100f` (4111) and `0x1010` (4112). Chain IDs were free on `chainid.network` and DefiLlama `additionalChainRegistry`.

| Network | Chain ID | Symbol | RPC | Explorer |
|---------|----------|--------|-----|----------|
| E Canna Mainnet | **4111** | ECNA | https://rpc.ecnascan.com | https://explorer.ecnascan.com |
| E Canna Testnet | **4112** | tECNA | https://testnetrpc.ecnascan.com | https://testnetexplorer.ecnascan.com |

Faucet (testnet only): https://testnetexplorer.ecnascan.com/faucet

## Fastest path for chainlist.org (DefiLlama)

1. Fork https://github.com/DefiLlama/chainlist  
2. Copy into `constants/additionalChainRegistry/`:
   - `chainid-4111.js` (this folder)
   - `chainid-4112.js` (this folder)
3. Open a PR titled: `Add E Canna Mainnet (4111) and E Canna Testnet (4112)`
4. PR body tip: website https://ecnascan.com · RPCs public · faucet URL for testnet

After merge, search **E Canna** / **4111** / **4112** on https://chainlist.org (may take a short deploy delay).

## Canonical registry (ethereum-lists / many other wallets)

1. Fork https://github.com/ethereum-lists/chains  
2. Copy into `_data/chains/`:
   - `eip155-4111.json`
   - `eip155-4112.json`
3. Open a PR with the same title; keep CI green.

## Temporary (until PRs merge)

On https://chainlist.org click **Add Your Network** and paste RPC + chain ID manually, or add networks in MetaMask by hand:

| Field | Mainnet | Testnet |
|-------|---------|---------|
| Network name | E Canna Mainnet | E Canna Testnet |
| RPC URL | https://rpc.ecnascan.com | https://testnetrpc.ecnascan.com |
| Chain ID | 4111 | 4112 |
| Currency symbol | ECNA | tECNA |
| Block explorer | https://explorer.ecnascan.com | https://testnetexplorer.ecnascan.com |

Do **not** change chain IDs after listing — first merged claim owns the ID permanently.
