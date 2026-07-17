# Deploy contracts on E Canna (users + agents)

**EVM target: `london` only** (mainnet 4111 & testnet 4112).

This Clique / stock Geth chain does **not** enable Shanghai. Remix **default** and
newer forks (shanghai, cancun, prague, osaka) often fail `eth_estimateGas` or deploy.

## Remix (most common failure)

1. Open [Remix](https://remix.ethereum.org)
2. **Solidity Compiler** → **Advanced Configurations** → **EVM Version** → **`london`**
3. Do **not** leave **default**
4. Compile → **Deploy & Run** → Injected Provider (MetaMask on E Canna)
5. Verify on explorer with EVM **london**:  
   - Mainnet: https://explorer.ecnascan.com/verify  
   - Testnet: https://testnetexplorer.ecnascan.com/verify  

Smoke test (no imports): `contracts/contracts/remix/RemixSmokeTest.sol`  
Full notes: `contracts/REMIX_LOCALHOST.txt`

## Hardhat (recommended for apps)

`contracts/hardhat.config.cjs` already sets:

```js
evmVersion: "london"
```

Point `PETH_RPC_URL` at `https://rpc.ecnascan.com` (or testnet RPC) and `chainId` 4111 / 4112.

## Why we cannot “just enable default like ETH / BNB”

Upstream Geth rejects Clique + `shanghaiTime` (`clique does not support shanghai fork`).
Exchanges sync with stock Geth — genesis must stay London. A future “v2” modern-EVM
chain would be a planned redesign/wipe, not a silent fork.

## Where this is shown in product UI

- **Website** ([ecnascan.com](https://ecnascan.com)): Network reference (RPC boxes), Wallet setup, Developer tooling, FAQ, Build CTA, Network overview  
- **Testnet faucet** page (explorer): deploy tip banner  
- **Verify & Publish** (explorer): EVM london reminder for verifiers  
- Docs: `AGENTS.md`, KT, this file  

Do **not** put a large london banner on explorer home (keeps casual users focused on blocks/txs).

## Agent checklist

- Never tell users to use Remix default / shanghai on live ECNA  
- Never add `shanghaiTime` back to genesis without an explicit redesign plan  
- After UI copy changes: `deploy-hotfix` / frontends only — **no chain wipe**  
