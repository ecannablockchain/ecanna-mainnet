/**
 * Copy generated Prisma client from src/generated → dist/generated so `node dist/index.js` resolves imports.
 * If query_engine DLL is locked (another `node` still running), we skip copy so the build can finish — stop other Node processes and rebuild for a fresh copy.
 */
import { cpSync, existsSync, rmSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "src", "generated");
const dest = join(root, "dist", "generated");

if (!existsSync(src)) {
  console.warn("src/generated missing — run: npm run db:generate -w server");
  process.exit(1);
}

if (existsSync(dest)) {
  try {
    rmSync(dest, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch (e) {
    console.warn(
      "Skipping Prisma copy to dist/generated (files locked — stop `node dist/...` / indexer, then run build again).",
    );
    process.exit(0);
  }
}

try {
  cpSync(src, dest, { recursive: true });
  console.log("Copied Prisma client to dist/generated");
} catch (e) {
  console.warn("Skipping Prisma copy:", e instanceof Error ? e.message : e);
  process.exit(0);
}
