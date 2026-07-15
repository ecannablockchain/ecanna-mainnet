/**
 * Full wipe: indexed chain data, indexer cursor, and contract verifications.
 *
 * Usage (from server/): npx tsx scripts/clear-all-indexed.ts
 */
import "../src/load-env-deployment.js";
import { prisma } from "../src/lib/prisma.js";
import { clearIndexedChainData } from "../src/lib/clearIndexedChainData.js";

async function main() {
  await clearIndexedChainData();
  await prisma.indexerState.deleteMany();
  await prisma.contractVerification.deleteMany();
  await prisma.contractTokenProfile.deleteMany();
  await prisma.gasSnapshot.deleteMany();
  await prisma.hourlyTxStats.deleteMany();

  const [blocks, txs, transfers, verifications, profiles, indexerState] = await Promise.all([
    prisma.block.count(),
    prisma.transaction.count(),
    prisma.tokenTransfer.count(),
    prisma.contractVerification.count(),
    prisma.contractTokenProfile.count(),
    prisma.indexerState.count(),
  ]);

  console.log("[clear-all-indexed] Done.", {
    blocks,
    txs,
    transfers,
    verifications,
    profiles,
    indexerState,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
