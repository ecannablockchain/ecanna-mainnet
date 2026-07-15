/**
 * Full blank local dev: no PETH / no extra contracts — only chain native balances (Anvil/Hardhat defaults).
 * Wipes Anvil state, Hardhat deployments/localhost.json, and clears PETH token env lines.
 *
 * Repo root: npm run local:fresh:native
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const targets = [
  path.join(root, "contracts", ".persistent-chain", "anvil-state.json"),
  path.join(root, "contracts", "deployments", "localhost.json"),
];

for (const p of targets) {
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log("Removed:", p);
  }
}

/** Set KEY= (empty value) for matching lines; add line if missing. */
function clearEnvKeys(file, keys) {
  if (!fs.existsSync(file)) {
    console.log("Skip env patch (missing):", file);
    return;
  }
  let lines = fs.readFileSync(file, "utf8").split("\n");
  const keySet = new Set(keys);
  const seen = new Set();
  lines = lines.map((line) => {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
    if (m && keySet.has(m[1])) {
      seen.add(m[1]);
      return `${m[1]}=`;
    }
    return line;
  });
  for (const k of keys) {
    if (!seen.has(k)) lines.push(`${k}=`);
  }
  fs.writeFileSync(file, lines.join("\n"));
  console.log("Cleared keys in", file, ":", keys.join(", "));
}

clearEnvKeys(path.join(root, "server", ".env"), ["PETH_TOKEN_ADDRESS"]);
clearEnvKeys(path.join(root, "apps", "dashboard", ".env"), ["VITE_PETH_TOKEN"]);

console.log(`
--- Native-only fresh (no ERC-20 deploy) ---

Already ran (or will run with npm script): npm run local:prepare

1)  Stop anything on port 8545 (Hardhat/Anvil).

2)  Terminal A — Anvil (persistent + ~3s empty blocks by default):
      npm run local:node:persistent

    (Hardhat instead: npm run local:node — no disk persistence)

3)  Terminal B — do NOT run local:deploy (that would add PETH).

      npm run server:clear-indexed   (clears SQL Server index when DATABASE_URL is set)

      npm run local:stack

Explorer/API: native chain + default dev accounts only. PETH slot empty in config.
`);
