/**
 * Wipe explorer-indexed chain data + indexer cursor. Keeps contract verifications.
 *
 * Usage (from server/): npx tsx scripts/clear-indexed.ts
 * Then restart API + indexer. Next run will backfill from block 0 unless INDEXER_START_AT_HEAD=1.
 */
import "../src/load-env-deployment.js";
import { prisma } from "../src/lib/prisma.js";
import { clearIndexedChainData } from "../src/lib/clearIndexedChainData.js";

async function main() {
  await clearIndexedChainData();
  await prisma.indexerState.deleteMany();
  console.log("[clear-indexed] Done. Restart the indexer (and API if running).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
