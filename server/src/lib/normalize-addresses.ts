import type { PrismaClient } from "../generated/prisma/index.js";

/**
 * SQL Server: normalize address columns to lowercase for consistent search.
 * Skipped on API boot in production unless NORMALIZE_ADDRESSES_ON_START=1 (one-off maintenance).
 */
export async function normalizeStoredAddresses(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE [Transaction] SET [from] = LOWER([from]), [to] = LOWER([to]) WHERE [to] IS NOT NULL`,
  );
  await prisma.$executeRawUnsafe(
    `UPDATE [Transaction] SET [from] = LOWER([from]) WHERE [to] IS NULL`,
  );
  await prisma.$executeRawUnsafe(
    `UPDATE [TokenTransfer] SET [from] = LOWER([from]), [to] = LOWER([to]), [token] = LOWER([token])`,
  );
  await prisma.$executeRawUnsafe(`UPDATE [Block] SET [miner] = LOWER([miner])`);
  await prisma.$executeRawUnsafe(`UPDATE [ContractVerification] SET [address] = LOWER([address])`);
}

export function shouldNormalizeAddressesOnStart(): boolean {
  if (process.env.NORMALIZE_ADDRESSES_ON_START === "1") return true;
  if (process.env.NODE_ENV === "production") return false;
  return process.env.NORMALIZE_ADDRESSES_ON_START !== "0";
}
