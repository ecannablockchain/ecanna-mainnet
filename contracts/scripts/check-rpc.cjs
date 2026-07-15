/**
 * ECNA RPC sanity check before Remix deploy.
 * Usage (from contracts/): node scripts/check-rpc.cjs
 * Or: PETH_RPC_URL=http://50.28.84.113:8545 node scripts/check-rpc.cjs
 */
require("dotenv").config();
const http = require("http");

const url = new URL(process.env.PETH_RPC_URL || "http://50.28.84.113:8545");
const expected = parseInt(process.env.PETH_CHAIN_ID || "4111", 10);

function post(body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname || "/",
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    };
    const req = http.request(opts, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${d.slice(0, 200)}`));
          return;
        }
        try {
          resolve(JSON.parse(d));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  console.log("RPC:", url.href);
  const chain = await post(
    JSON.stringify({ jsonrpc: "2.0", method: "eth_chainId", params: [], id: 1 })
  );
  const block = await post(
    JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 2 })
  );
  const id = parseInt(chain.result, 16);
  console.log("eth_chainId:", chain.result, "(", id, ")");
  console.log("eth_blockNumber:", block.result);
  if (id !== expected) {
    console.error("FAIL: chain id mismatch. Expected", expected, "got", id);
    console.error("Fix MetaMask: RPC", url.href, "Chain ID", expected);
    process.exit(1);
  }
  console.log("OK: node reachable and chain id matches PETH_CHAIN_ID", expected);
  process.exit(0);
})().catch((e) => {
  console.error("FAIL:", e.message);
  console.error("Start a local node on port 8545 (Hardhat, Anvil, or Geth).");
  process.exit(1);
});
