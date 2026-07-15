import { prisma } from "./prisma.js";

/** Removes blocks, txs, token transfers, gas snapshots — not ContractVerification. */
export async function clearIndexedChainData(): Promise<void> {
  try {
    await prisma.$executeRaw`EXEC [dbo].[sp_ClearIndexedChainData]`;
    return;
  } catch {
    /* procedure missing — fall back */
  }
  await prisma.$transaction([
    prisma.tokenTransfer.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.gasSnapshot.deleteMany(),
    prisma.hourlyTxStats.deleteMany(),
    prisma.block.deleteMany(),
    prisma.chainStats.upsert({
      where: { id: 1 },
      create: { id: 1, blockCount: 0n, txCount: 0n, transferCount: 0n },
      update: { blockCount: 0n, txCount: 0n, transferCount: 0n },
    }),
  ]);
}
