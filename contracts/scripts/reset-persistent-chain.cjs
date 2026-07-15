/**
 * Deletes Anvil persistent state so the next `npm run node:persistent` starts a fresh chain.
 * Removes the whole `.persistent-chain` directory (multi-GB safe: no JSON parse), then recreates an empty folder.
 *
 * Explorer/API against a real node: set server `RPC_URL` + `DATABASE_URL` and run `npm run local:stack`
 * — you do not need local Anvil or this folder.
 */
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", ".persistent-chain");

function humanBytes(n) {
  if (!Number.isFinite(n) || n < 0) return "?";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let x = n;
  while (x >= 1024 && i < u.length - 1) {
    x /= 1024;
    i++;
  }
  return `${x.toFixed(i > 1 ? 2 : 0)} ${u[i]}`;
}

if (!fs.existsSync(dir)) {
  console.log("[contracts] No .persistent-chain directory (nothing to reset).");
  process.exit(0);
}

let total = 0;
function addSize(p) {
  try {
    const st = fs.statSync(p);
    if (st.isFile()) total += st.size;
    else if (st.isDirectory())
      for (const name of fs.readdirSync(p)) addSize(path.join(p, name));
  } catch {
    /* ignore */
  }
}
addSize(dir);
if (total > 0) console.log("[contracts] Removing persistent chain data (~" + humanBytes(total) + ")…");

fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });

console.log("[contracts] Persistent chain cleared — next `npm run node:persistent` starts from genesis.");
console.log(
  "[contracts] Tip: for explorer/API without local Anvil, use server .env RPC_URL + DATABASE_URL and `npm run local:stack`.",
);
