# Database scale & reliability (90M+ blocks)

SQL Server schema hardening for ECNASCAN indexer + API at **tens of millions of blocks** without full-table scans on hot paths.

## Apply on your server

```bash
cd server
npx prisma generate
npm run db:apply-scale
npx prisma db push
```

`db:apply-scale` creates rollup tables, indexes, and stored procedures.  
`db push` syncs Prisma models (`ChainStats`, `HourlyTxStats`).

If the DB was created before this migration, rollups are **backfilled** from existing rows on first `db:apply-scale`.

## Architecture

| Layer | Purpose at scale |
|-------|------------------|
| **Block** (PK `number`) | ~90M rows — clustered PK; list pages use **keyset** (`number < cursor`) |
| **Transaction** | Indexed by `(from, blockNumber DESC)`, `(to, blockNumber DESC)` |
| **TokenTransfer** | Indexed by `token`, `from`, `to` |
| **ChainStats** (1 row) | O(1) `blockCount` / `txCount` / `transferCount` — no `COUNT(*)` on API |
| **HourlyTxStats** | 48 chart buckets — no join scan on 90M txs |
| **GasSnapshot** | **Disabled by default** (was 1 row/block = 90M rows). Enable only if needed. |

## Indexer settings (`server/.env`)

| Variable | Default | Meaning |
|----------|---------|---------|
| `INDEXER_BATCH_SIZE` | `32` | Blocks indexed per poll when catching up |
| `INDEXER_GAS_SNAPSHOTS` | off | Set `1` to write `GasSnapshot` per block (not recommended at scale) |
| `INDEXER_POLL_MS` | `3000` | Poll interval |

## API pagination

**Blocks** — prefer keyset:

```
GET /api/v1/blocks?limit=25
GET /api/v1/blocks?limit=25&cursor=89999999
```

Response includes `nextCursor` (last block number in page).

**Transactions**:

```
GET /api/v1/transactions?limit=25&cursorBlock=123&cursorTxIndex=0
```

Legacy `offset` works only for first **1000** rows (`MAX_LEGACY_OFFSET`). Deep pages **must** use cursor.

## Stored procedures

| Procedure | Use |
|-----------|-----|
| `sp_IncrementChainStats` | Indexer increments rollups |
| `sp_UpsertHourlyTxStats` | Indexer chart buckets |
| `sp_GetBlocksKeyset` | Fast block list pages |
| `sp_GetTransactionsKeyset` | Fast tx list pages |
| `sp_ClearIndexedChainData` | Reset index (chain unchanged) |
| `sp_RebuildChainStats` | Maintenance if rollups drift |

Rebuild stats manually:

```sql
EXEC [dbo].[sp_RebuildChainStats];
```

## Capacity notes (90M blocks)

| Item | Estimate |
|------|----------|
| Empty blocks only | ~15–25 GB SQL data (depends on column sizes) |
| With transactions | Dominated by `Transaction` + `TokenTransfer` row count |
| Index overhead | ~30–50% extra |

**Recommendations for production:**

1. SQL Server on **SSD/NVMe**, `DATABASE_URL` to dedicated instance.
2. **Backup** `ecnachain` chaindata + SQL DB (see `docs/SERVER-MIGRATION.md`).
3. Do **not** enable `INDEXER_GAS_SNAPSHOTS` at scale.
4. Schedule `sp_RebuildChainStats` monthly or after manual DB edits.
5. For **archive** beyond 90M blocks, plan table partitioning by `blockNumber` (ops task; not in Prisma).

## Security

- Keep `DATABASE_URL` credentials out of git.
- Restrict SQL Server firewall to API/indexer host only.
- `SiteUser` passwords are bcrypt-hashed; rotate DB password if `.env` was exposed.

## Related

- [`SETUP_NEW_LAPTOP.txt`](../SETUP_NEW_LAPTOP.txt) — run order
- [`SERVER-MIGRATION.md`](./SERVER-MIGRATION.md) — move DB to new server
