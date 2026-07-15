import "./load-env-deployment.js";
import { ethers } from "ethers";
import type { Prisma } from "./generated/prisma/index.js";
import { prisma } from "./lib/prisma.js";
import { resolveDisplayMiner } from "./lib/cliqueMiner.js";
import { clearIndexedChainData } from "./lib/clearIndexedChainData.js";
import { bumpHourlyTxStats, incrementChainTotals } from "./lib/chainStats.js";
import { provider, TRANSFER_TOPIC, PETH_TOKEN_ADDRESS } from "./lib/chain.js";

function parseMinBlockEnv(): bigint {
  const raw = (process.env.INDEXER_MIN_BLOCK || "0").trim();
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 0n;
  return BigInt(n);
}

/**
 * Fresh DB: where indexing starts.
 * - INDEXER_START_AT_HEAD=1 → lastBlock = current RPC head (no backfill; home stays empty until new blocks).
 * - else → backfill from INDEXER_MIN_BLOCK (default 0): lastBlock = minBlock - 1 (use -1 for genesis).
 */
async function ensureState() {
  const row = await prisma.indexerState.findUnique({ where: { id: 1 } });
  if (row) return;

  const head = await provider.getBlockNumber();
  const headBn = BigInt(head);
  const minBlock = parseMinBlockEnv();
  const startAtHead =
    process.env.INDEXER_START_AT_HEAD === "1" || /^true$/i.test(process.env.INDEXER_START_AT_HEAD || "");

  let lastBlock: bigint;
  if (startAtHead) {
    // Old indexed rows stay in SQL Server unless we delete them — API would still show "ghost" blocks/txs.
    await clearIndexedChainData();
    lastBlock = headBn;
  } else if (minBlock > 0n) {
    lastBlock = minBlock - 1n;
  } else {
    lastBlock = -1n;
  }

  await prisma.indexerState.create({
    data: { id: 1, lastBlock },
  });
  if (startAtHead) {
    console.log(
      "[indexer] INDEXER_START_AT_HEAD: skipping existing chain history; only blocks after #" + head + " will be indexed",
    );
  }
}

/** Set INDEXER_ONLY_PETH=1 to index only PETH_TOKEN_ADDRESS (legacy). Default: index all ERC-20 Transfer logs. */
function shouldIndexToken(token: string): boolean {
  if (process.env.INDEXER_ONLY_PETH === "1") {
    if (!PETH_TOKEN_ADDRESS) return true;
    return token === PETH_TOKEN_ADDRESS;
  }
  return true;
}

async function loadTransactions(block: ethers.Block): Promise<ethers.TransactionResponse[]> {
  const raw = block.transactions;
  if (raw.length === 0) return [];
  if (typeof raw[0] === "string") {
    const out: ethers.TransactionResponse[] = [];
    for (const h of raw as string[]) {
      const tx = await provider.getTransaction(h);
      if (tx) out.push(tx);
    }
    return out;
  }
  return raw as unknown as ethers.TransactionResponse[];
}

function skipRpcReconcile(): boolean {
  return (
    process.env.INDEXER_SKIP_RPC_RECONCILE === "1" || /^true$/i.test(process.env.INDEXER_SKIP_RPC_RECONCILE || "")
  );
}

/**
 * Keeps the SQL Server index aligned with the RPC after Anvil rollback, corrupt state restore, or chain swap.
 * - Drops ghost rows when DB has blocks above current head.
 * - If block #0 is indexed, compares genesis hash to RPC.
 * - If the cursor block is indexed, compares its hash to RPC (same height, different chain).
 */
async function detectAndClearChainMismatch(head: number, headBn: bigint, state: { lastBlock: bigint }): Promise<boolean> {
  if (skipRpcReconcile()) return false;

  const wipe = async (reason: string) => {
    console.warn(`[indexer] ${reason}; clearing indexed chain data and resetting cursor`);
    await clearIndexedChainData();
    await prisma.indexerState.update({
      where: { id: 1 },
      data: { lastBlock: -1n },
    });
  };

  const maxRow = await prisma.block.aggregate({ _max: { number: true } });
  const maxN = maxRow._max.number;
  if (maxN !== null && maxN > headBn) {
    await wipe(`indexed tip #${maxN} is above RPC head #${head}`);
    return true;
  }

  const b0 = await prisma.block.findUnique({ where: { number: 0n } });
  if (b0) {
    const r0 = await provider.getBlock(0);
    if (!r0) {
      await wipe("genesis block #0 missing on RPC while present in index");
      return true;
    }
    if (b0.hash.toLowerCase() !== (r0.hash ?? "").toLowerCase()) {
      await wipe("genesis block #0 hash mismatch (RPC vs index)");
      return true;
    }
  }

  if (state.lastBlock < 0n) return false;

  const dbAtCursor = await prisma.block.findUnique({ where: { number: state.lastBlock } });
  if (!dbAtCursor) return false;

  const rpcAtCursor = await provider.getBlock(state.lastBlock);
  if (!rpcAtCursor) {
    await wipe(`block #${state.lastBlock} in index but missing on RPC`);
    return true;
  }
  if (dbAtCursor.hash.toLowerCase() !== (rpcAtCursor.hash ?? "").toLowerCase()) {
    await wipe(`block #${state.lastBlock} hash mismatch (RPC vs index)`);
    return true;
  }

  return false;
}

function writeGasSnapshots(): boolean {
  return process.env.INDEXER_GAS_SNAPSHOTS === "1" || /^true$/i.test(process.env.INDEXER_GAS_SNAPSHOTS || "");
}

function parseBatchSize(): number {
  const n = parseInt(process.env.INDEXER_BATCH_SIZE || "32", 10);
  if (!Number.isFinite(n) || n < 1) return 32;
  return Math.min(n, 500);
}

async function indexBlock(blockNumber: bigint): Promise<{ txCount: number; transferCount: number; blockTimestamp: Date }> {
  const block = await provider.getBlock(blockNumber, true);
  if (!block) return { txCount: 0, transferCount: 0, blockTimestamp: new Date() };

  const txs = await loadTransactions(block);
  const receipts: ethers.TransactionReceipt[] = [];
  for (const tx of txs) {
    const r = await provider.getTransactionReceipt(tx.hash);
    if (r) receipts.push(r);
  }

  let transferCount = 0;
  const blockTimestamp = new Date(Number(block.timestamp) * 1000);

  await prisma.$transaction(async (db: Prisma.TransactionClient) => {
    await db.block.upsert({
      where: { number: blockNumber },
      create: {
        number: blockNumber,
        hash: block.hash!,
        parentHash: block.parentHash,
        timestamp: new Date(Number(block.timestamp) * 1000),
        gasUsed: block.gasUsed.toString(),
        gasLimit: block.gasLimit.toString(),
        miner: resolveDisplayMiner((block.miner ?? ethers.ZeroAddress).toString().toLowerCase(), blockNumber),
        txCount: txs.length,
      },
      update: {
        hash: block.hash!,
        parentHash: block.parentHash,
        timestamp: new Date(Number(block.timestamp) * 1000),
        gasUsed: block.gasUsed.toString(),
        gasLimit: block.gasLimit.toString(),
        miner: resolveDisplayMiner((block.miner ?? ethers.ZeroAddress).toString().toLowerCase(), blockNumber),
        txCount: txs.length,
      },
    });

    for (const r of receipts) {
      const tx = await provider.getTransaction(r.hash);
      if (!tx) continue;
      const status = r.status ?? 0;
      const txHash = r.hash.toLowerCase();
      const txIndex = Number(r.index);
      const deployedContractAddress = r.contractAddress ? r.contractAddress.toLowerCase() : null;
      await db.transaction.upsert({
        where: { hash: txHash },
        create: {
          hash: txHash,
          blockNumber,
          blockHash: r.blockHash,
          transactionIndex: txIndex,
          from: r.from.toLowerCase(),
          to: r.to ? r.to.toLowerCase() : null,
          value: tx.value.toString(),
          gasPrice: tx.gasPrice?.toString() ?? null,
          gasUsed: r.gasUsed.toString(),
          status,
          input: tx.data,
          nonce: Number(tx.nonce),
          deployedContractAddress,
        },
        update: {
          blockNumber,
          blockHash: r.blockHash,
          transactionIndex: txIndex,
          from: r.from.toLowerCase(),
          to: r.to ? r.to.toLowerCase() : null,
          gasUsed: r.gasUsed.toString(),
          status,
          input: tx.data,
          deployedContractAddress,
        },
      });

      for (const log of r.logs) {
        if (log.topics[0] !== TRANSFER_TOPIC) continue;
        const token = log.address.toLowerCase();
        if (!shouldIndexToken(token)) continue;
        if (log.topics.length < 3) continue;
        const from = ethers.getAddress("0x" + log.topics[1].slice(26)).toLowerCase();
        const to = ethers.getAddress("0x" + log.topics[2].slice(26)).toLowerCase();
        const value = ethers.toBigInt(log.data).toString();
        const logIndex = log.index;
        await db.tokenTransfer.upsert({
          where: {
            txHash_logIndex: { txHash: txHash, logIndex },
          },
          create: {
            txHash: txHash,
            logIndex,
            token,
            from,
            to,
            value,
          },
          update: { from, to, value, token },
        });
        transferCount += 1;
      }
    }

    if (writeGasSnapshots()) {
      await db.gasSnapshot.create({
        data: {
          blockNum: blockNumber,
          baseFee: block.baseFeePerGas?.toString() ?? null,
          gasUsed: block.gasUsed.toString(),
        },
      });
    }
  }, {
    maxWait: 60_000,
    timeout: 180_000,
  });

  return { txCount: txs.length, transferCount, blockTimestamp };
}

async function loop() {
  await ensureState();
  const head = await provider.getBlockNumber();
  const headBn = BigInt(head);
  let state = await prisma.indexerState.findUniqueOrThrow({ where: { id: 1 } });
  // After switching RPC or resetting the local chain, lastBlock can be past the new chain's
  // head — the catch-up loop would never run and the explorer stays empty.
  if (state.lastBlock > headBn) {
    console.warn(
      `[indexer] cursor lastBlock=${state.lastBlock} > chain head=${head}; clearing index and resyncing from block 0`,
    );
    await clearIndexedChainData();
    await prisma.indexerState.update({
      where: { id: 1 },
      data: { lastBlock: -1n },
    });
    state = await prisma.indexerState.findUniqueOrThrow({ where: { id: 1 } });
  }
  if (await detectAndClearChainMismatch(head, headBn, state)) {
    state = await prisma.indexerState.findUniqueOrThrow({ where: { id: 1 } });
  }
  let next = state.lastBlock + 1n;
  const batchSize = parseBatchSize();
  let batchBlocks = 0;
  let batchTxs = 0;
  let batchTransfers = 0;

  while (next <= headBn && batchBlocks < batchSize) {
    const result = await indexBlock(next);
    batchBlocks += 1;
    batchTxs += result.txCount;
    batchTransfers += result.transferCount;
    if (result.txCount > 0) {
      await bumpHourlyTxStats(result.blockTimestamp, result.txCount);
    }
    await prisma.indexerState.update({
      where: { id: 1 },
      data: { lastBlock: next },
    });
    next += 1n;
  }

  if (batchBlocks > 0) {
    await incrementChainTotals(batchBlocks, batchTxs, batchTransfers);
  }
}

const interval = parseInt(process.env.INDEXER_POLL_MS || "3000", 10);

async function main() {
  const resetOnce =
    process.env.INDEXER_RESET_ONCE === "1" || /^true$/i.test(process.env.INDEXER_RESET_ONCE || "");
  if (resetOnce) {
    console.warn(
      "[indexer] INDEXER_RESET_ONCE: clearing indexed tables + cursor (remove this env var after one run)",
    );
    await clearIndexedChainData();
    await prisma.indexerState.deleteMany();
  }

  for (;;) {
    try {
      await loop();
    } catch (e) {
      console.error("[indexer]", e);
    }
    await new Promise((r) => setTimeout(r, interval));
  }
}

main();
