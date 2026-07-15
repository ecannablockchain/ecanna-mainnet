/**
 * Wipes local chain snapshot + deploy record.
 * Does NOT touch SQL Server — production index reset: npm run clear-indexed -w server.
 * Run from repo root: npm run local:fresh
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const persistentDir = path.join(root, "contracts", ".persistent-chain");
const targets = [
  path.join(persistentDir, "anvil-state.json"),
  path.join(persistentDir, "anvil-state.json.bak"),
  path.join(root, "contracts", "deployments", "localhost.json"),
];

let removed = 0;
for (const p of targets) {
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log("Removed:", p);
    removed++;
  }
}
if (fs.existsSync(persistentDir)) {
  for (const f of fs.readdirSync(persistentDir)) {
    if (f.startsWith("anvil-state.json.corrupt.")) {
      const p = path.join(persistentDir, f);
      fs.unlinkSync(p);
      console.log("Removed:", p);
      removed++;
    }
  }
}
if (removed === 0) {
  console.log("Nothing to remove (already clean or paths missing).");
}

console.log(`
--- Flow A (fresh deploy) — npm run local:fresh already ran local:prepare ---

1)  Terminal A — L1 (one of):
      npm run local:node:persistent   (Anvil + disk; use for resume later)
      npm run local:node              (Hardhat; each start = new chain)

2)  Terminal B:
      npm run local:deploy

3)  Paste PETH / treasury lines into server/.env + apps/dashboard/.env

4)  Terminal B — wipe indexed blocks/transactions (required for SQL Server):
      npm run server:clear-indexed

5)  Terminal B:
      npm run local:stack

Optional — extra native top-up from contracts folder:
      npm run fund:treasury -w contracts

--- Flow B (resume) — no local:fresh, no local:deploy ---
  Terminal A: npm run local:node:persistent
  Terminal B: npm run local:stack
`);
