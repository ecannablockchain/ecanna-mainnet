#!/usr/bin/env node
/**
 * Public JSON-RPC guard — blocks unlocked-account drain methods.
 * Faucet / MetaMask use eth_sendRawTransaction (signed client-side) — still allowed.
 *
 * Usage:
 *   RPC_UPSTREAM=http://127.0.0.1:8545 RPC_GUARD_PORT=28545 node scripts/rpc-public-guard.mjs
 */
import http from "node:http";

const UPSTREAM = (process.env.RPC_UPSTREAM || "http://127.0.0.1:8545").replace(/\/$/, "");
const PORT = Number(process.env.RPC_GUARD_PORT || 28545);
const HOST = process.env.RPC_GUARD_HOST || "127.0.0.1";

const BLOCKED = new Set([
  "eth_sendtransaction",
  "eth_sign",
  "eth_signtransaction",
  "eth_signtypeddata",
  "eth_signtypeddata_v3",
  "eth_signtypeddata_v4",
  "personal_sign",
  "personal_ecrecover",
  "personal_sendtransaction",
  "personal_unlockaccount",
  "personal_lockaccount",
  "personal_listaccounts",
  "personal_newaccount",
  "personal_importec",
  "miner_start",
  "miner_stop",
  "miner_setetherbase",
  "miner_setgasprice",
  "admin_addpeer",
  "admin_removepeer",
  "admin_startrpc",
  "admin_stoprpc",
  "debug_traceTransaction",
  "debug_traceBlockByNumber",
  "debug_traceBlockByHash",
]);

function methodsOf(body) {
  try {
    const j = JSON.parse(body);
    const arr = Array.isArray(j) ? j : [j];
    return arr.map((x) => String(x?.method || "").toLowerCase()).filter(Boolean);
  } catch {
    return [];
  }
}

function deny(id, method) {
  return JSON.stringify({
    jsonrpc: "2.0",
    id: id ?? null,
    error: {
      code: -32000,
      message: `Method ${method} is disabled on public RPC (use eth_sendRawTransaction with a locally signed tx)`,
    },
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "POST only" }));
  }

  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", async () => {
    const body = Buffer.concat(chunks).toString("utf8");
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      res.writeHead(400, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      return res.end(JSON.stringify({ error: "invalid json" }));
    }

    const batch = Array.isArray(parsed);
    const items = batch ? parsed : [parsed];
    for (const item of items) {
      const m = String(item?.method || "").toLowerCase();
      if (BLOCKED.has(m) || m.startsWith("personal_") || m.startsWith("admin_") || m.startsWith("miner_")) {
        res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        if (batch) {
          return res.end(
            JSON.stringify(items.map((it) => JSON.parse(deny(it?.id, it?.method || m)))),
          );
        }
        return res.end(deny(item?.id, item?.method || m));
      }
    }

    try {
      const up = await fetch(UPSTREAM, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const text = await up.text();
      res.writeHead(up.status, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(text);
    } catch (e) {
      res.writeHead(502, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      res.end(JSON.stringify({ error: "upstream unavailable", detail: String(e?.message || e) }));
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[rpc-public-guard] ${HOST}:${PORT} → ${UPSTREAM}`);
});
