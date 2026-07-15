# Backup & recovery (ECNA / Geth)

## What to back up

- Entire **`geth/`** directory under the node datadir (contains `chaindata` LevelDB, triedb, snapshots depending on version/settings).
- **`genesis.json`** used to create the chain (must match restore).
- **Validator keys** (keystore + passwords) — store offline encrypted.

## Automated backup

**Linux/macOS:**

```bash
cd ecnachain
./scripts/backup-chain.sh ./data/validator1
```

**Windows (PowerShell):**

```powershell
cd ecnachain
.\scripts\backup-chain.ps1
```

Optional: set `BACKUP_DIR` to a mounted volume or NAS path; schedule with cron / Task Scheduler.

## Recovery

1. **Stop** Geth (`docker compose down`).
2. Remove or rename broken `data/validator1/geth` (or empty datadir).
3. Restore:

```bash
./scripts/restore-chain.sh backups/ecna-chaindata-XXXX.tar.gz ./data/validator1
```

PowerShell: `.\scripts\restore-chain.ps1 -Archive path\to\backup.tar.gz`

4. Start Geth again. **Do not** run `geth init` on top of restored `chaindata`.

## Multi-node

Each validator/full node has its own datadir; back up **each**. For the same chain, all nodes share the same **genesis**; state should converge via P2P sync if one node is restored from backup and others keep running (prefer taking backups when quiesced or accept small reorg window).
