import { prisma } from "./prisma.js";

export type ChainTotals = {
  blockCount: bigint;
  txCount: bigint;
  transferCount: bigint;
};

export async function getChainTotals(): Promise<ChainTotals> {
  const [blockCount, txCount, transferCount] = await Promise.all([
    prisma.block.count(),
    prisma.transaction.count(),
    prisma.tokenTransfer.count(),
  ]);
  const actual: ChainTotals = {
    blockCount: BigInt(blockCount),
    txCount: BigInt(txCount),
    transferCount: BigInt(transferCount),
  };
  const row = await prisma.chainStats.findUnique({ where: { id: 1 } });
  if (
    row &&
    row.blockCount === actual.blockCount &&
    row.txCount === actual.txCount &&
    row.transferCount === actual.transferCount
  ) {
    return actual;
  }
  await prisma.chainStats.upsert({
    where: { id: 1 },
    create: { id: 1, ...actual },
    update: actual,
  });
  return actual;
}

export async function incrementChainTotals(blocks: number, txs: number, transfers: number): Promise<void> {
  if (blocks === 0 && txs === 0 && transfers === 0) return;
  try {
    await prisma.$executeRaw`
      EXEC [dbo].[sp_IncrementChainStats]
        @blocks = ${BigInt(blocks)},
        @txs = ${BigInt(txs)},
        @transfers = ${BigInt(transfers)}
    `;
  } catch {
    await prisma.chainStats.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        blockCount: BigInt(blocks),
        txCount: BigInt(txs),
        transferCount: BigInt(transfers),
      },
      update: {
        blockCount: { increment: blocks },
        txCount: { increment: txs },
        transferCount: { increment: transfers },
      },
    });
  }
}

export function utcHourBucket(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), 0, 0, 0));
}

export async function bumpHourlyTxStats(blockTimestamp: Date, txDelta: number): Promise<void> {
  if (txDelta <= 0) return;
  const bucket = utcHourBucket(blockTimestamp);
  try {
    await prisma.$executeRaw`
      EXEC [dbo].[sp_UpsertHourlyTxStats] @bucket = ${bucket}, @delta = ${txDelta}
    `;
  } catch {
    await prisma.hourlyTxStats.upsert({
      where: { bucket },
      create: { bucket, txCount: txDelta },
      update: { txCount: { increment: txDelta } },
    });
  }
}
