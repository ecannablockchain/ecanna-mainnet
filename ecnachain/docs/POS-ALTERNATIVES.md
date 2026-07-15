# Proof of Stake (PoS) vs this repo’s Clique PoA

**ECNA** as shipped in `ecnachain/` uses **Geth Clique (Proof of Authority)**. That satisfies “PoA **or** PoS” for a private/permissioned EVM chain similar in *execution model* to BSC’s EVM layer.

## If you need true PoS

PoS in Ethereum-style networks today implies:

- A **consensus layer** (beacon / validator set with fork choice), **plus**
- An **execution client** (Geth, Nethermind, etc.) after The Merge,

or a standalone stack (e.g. Cosmos SDK + EVM module, Polkadot parachain, etc.).

Those are **large separate deployments** and are **not** embedded in this repository. Practical options:

1. **Stay on Clique PoA** for controlled validators (fastest path; already implemented).
2. **Run a public testnet/mainnet** that already exposes JSON-RPC and point this repo’s indexer + ECNASCAN at it (`RPC_URL`, `CHAIN_ID`).
3. **Adopt an existing PoS+EVM distribution** (documentation only here): evaluate BSC client releases, op-stack, Polygon stack, etc., then replace `ecnachain/docker-compose.yml` with that vendor’s node recipe while keeping **genesis / chain ID / branding** consistent with your governance.

For **new genesis + new chain ID** when branding or supply changes, the same rule applies regardless of PoA vs PoS: **new genesis, new network id, new data directory.**
