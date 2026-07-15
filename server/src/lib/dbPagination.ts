import { prisma } from "./prisma.js";

export const MAX_LEGACY_OFFSET = 1000;

export type BlockRow = {
  number: bigint;
  hash: string;
  parentHash: string;
  timestamp: Date;
  gasUsed: string;
  gasLimit: string;
  miner: string;
  txCount: number;
  createdAt: Date;
};

export type TxKeysetRow = {
  id: string;
  hash: string;
  blockNumber: bigint;
  blockHash: string;
  transactionIndex: number;
  from: string;
  to: string | null;
  value: string;
  gasPrice: string | null;
  gasUsed: string | null;
  status: number;
  input: string;
  nonce: number;
  deployedContractAddress: string | null;
  createdAt: Date;
  blockTimestamp: Date;
};

export async function fetchBlocksKeyset(cursor: bigint | null, limit: number): Promise<BlockRow[]> {
  try {
    return await prisma.$queryRaw<BlockRow[]>`
      EXEC [dbo].[sp_GetBlocksKeyset] @cursor = ${cursor}, @limit = ${limit}
    `;
  } catch {
    return prisma.block.findMany({
      where: cursor != null ? { number: { lt: cursor } } : {},
      orderBy: { number: "desc" },
      take: limit,
    });
  }
}

export async function fetchTransactionsKeyset(
  cursorBlock: bigint | null,
  cursorTxIndex: number | null,
  limit: number,
): Promise<TxKeysetRow[]> {
  try {
    return await prisma.$queryRaw<TxKeysetRow[]>`
      EXEC [dbo].[sp_GetTransactionsKeyset]
        @cursorBlock = ${cursorBlock},
        @cursorTxIndex = ${cursorTxIndex},
        @limit = ${limit}
    `;
  } catch {
    const where =
      cursorBlock != null
        ? cursorTxIndex != null
          ? {
              OR: [
                { blockNumber: { lt: cursorBlock } },
                { blockNumber: cursorBlock, transactionIndex: { lt: cursorTxIndex } },
              ],
            }
          : { blockNumber: { lt: cursorBlock } }
        : {};
    const rows = await prisma.transaction.findMany({
      where,
      orderBy: [{ blockNumber: "desc" }, { transactionIndex: "desc" }],
      take: limit,
      include: { block: true },
    });
    return rows.map((t) => ({
      id: t.id,
      hash: t.hash,
      blockNumber: t.blockNumber,
      blockHash: t.blockHash,
      transactionIndex: t.transactionIndex,
      from: t.from,
      to: t.to,
      value: t.value,
      gasPrice: t.gasPrice,
      gasUsed: t.gasUsed,
      status: t.status,
      input: t.input,
      nonce: t.nonce,
      deployedContractAddress: t.deployedContractAddress,
      createdAt: t.createdAt,
      blockTimestamp: t.block.timestamp,
    }));
  }
}

export function parseCursorBigInt(raw: unknown): bigint | null {
  if (raw == null || raw === "") return null;
  try {
    const n = BigInt(String(raw));
    return n >= 0n ? n : null;
  } catch {
    return null;
  }
}

export function parseCursorInt(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : null;
}
