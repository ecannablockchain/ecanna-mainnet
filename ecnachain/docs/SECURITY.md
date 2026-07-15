# Security model — ECNA (Geth Clique)

## Transaction authenticity

- Every transaction must be **ECDSA-signed**; Geth rejects invalid signatures, wrong nonce, or insufficient balance.
- **EIP-155** (`chainId = 4111`) reduces cross-chain **replay** of signed txs onto other networks.

## Double-spending

- Prevented by sequential **nonce** and account **balance** checks in the EVM state transition. Only one canonical block at each height on the honest chain.

## Block production

- **Clique:** only addresses encoded in genesis `extraData` may sign blocks. Unauthorized blocks are rejected by peers.

## Fake / tampered data

- Block headers are linked by hash; altering a past block breaks the hash chain unless an attacker controls enough signers to rewrite history (**validator compromise**).

## “No rollback”

- Operationally: keep **immutable backups** and **consensus policy**; do not delete `chaindata` without recovery plan.
- Protocol: reorganizations are limited depth under honest majority; **admin** RPC must be disabled or firewalled in production.

## Native ECNA supply

- There is **no** ERC-20 mint for the **native** currency; supply is **genesis state**. Increasing supply = **new chain / new genesis** (or a hard fork everyone upgrades to — out of scope here).

## Hardening checklist

- [ ] No `--allow-insecure-unlock` in production; use Clef/signer.
- [ ] RPC not public with `debug`/`personal` exposed.
- [ ] JWT secret for `authrpc` rotated; filesystem permissions on `jwt.hex`.
- [ ] Bootnode / static nodes authenticated where possible; monitor peer count.
- [ ] Regular **offline** backups of `geth/` + keystores.
