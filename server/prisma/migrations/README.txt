Baseline: 20260209000000_init_sqlserver

- Empty SQL Server: run `npm run db:migrate:deploy` from server/ (applies migration.sql).
- Database already created earlier with `prisma db push`: run once:
    npx prisma migrate resolve --applied 20260209000000_init_sqlserver
  so Prisma records the baseline without re-running CREATE TABLE.

Future schema changes: `npx prisma migrate dev --name describe_change` (dev) then commit migration folder; production: `npm run db:migrate:deploy`.
