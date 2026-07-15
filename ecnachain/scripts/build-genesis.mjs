#!/usr/bin/env node
/**
 * Builds ecnachain genesis.json from env:
 *   ECNA_VALIDATORS   comma-separated Clique signer addresses (0x + 40 hex)
 *   ECNA_TREASURY     address receiving full pre-mint (wei)
 *   ECNA_TOTAL_WEI    optional; default 10_000_000 * 10^18 (1 Crore ECNA, 18 decimals)
 *   ECNA_CHAIN_ID     optional; default 4111 (new chain = new genesis + new id)
 *   ECNA_BASE_FEE_WEI optional; EIP-1559 initial base fee (wei), default 100000000 (0.1 Gwei)
 *
 * Usage (from ecnachain/):
 *   ECNA_VALIDATORS=0xabc...,0xdef... ECNA_TREASURY=0x... node scripts/build-genesis.mjs
 */
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function requireEnv(name, fallback = "") {
  const v = process.env[name] || fallback;
  if (!String(v).trim()) throw new Error(`Missing required env: ${name}`);
  return String(v).trim();
}

function normalizeAddr(a) {
  const h = a.replace(/^0x/i, "").toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(h)) throw new Error(`Invalid address: ${a}`);
  return "0x" + h;
}

function cliqueExtraData(signers) {
  const vanity = "0".repeat(64);
  const suffix = "0".repeat(130);
  const body = signers.map((s) => s.replace(/^0x/i, "").toLowerCase()).join("");
  return "0x" + vanity + body + suffix;
}

const validators = requireEnv("ECNA_VALIDATORS")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map(normalizeAddr);

if (validators.length === 0) throw new Error("ECNA_VALIDATORS must list at least one signer");

const treasury = normalizeAddr(requireEnv("ECNA_TREASURY"));
const totalWei = process.env.ECNA_TOTAL_WEI?.trim() || "10000000000000000000000000";
const chainId = Number.parseInt(process.env.ECNA_CHAIN_ID || "4111", 10);
if (!Number.isFinite(chainId) || chainId <= 0) throw new Error("ECNA_CHAIN_ID must be a positive integer");

const baseFeeWei = process.env.ECNA_BASE_FEE_WEI?.trim() || "100000000";
let baseFeeBn;
try {
  baseFeeBn = BigInt(baseFeeWei);
} catch {
  throw new Error(`Invalid ECNA_BASE_FEE_WEI: ${baseFeeWei}`);
}
if (baseFeeBn <= 0n) throw new Error("ECNA_BASE_FEE_WEI must be positive");

const genesis = {
  config: {
    chainId,
    homesteadBlock: 0,
    eip150Block: 0,
    eip155Block: 0,
    eip158Block: 0,
    byzantiumBlock: 0,
    constantinopleBlock: 0,
    petersburgBlock: 0,
    istanbulBlock: 0,
    berlinBlock: 0,
    londonBlock: 0,
    // Shanghai enables PUSH0 — required for modern Remix/solc. Cancun is NOT enabled:
    // geth Clique PoA panics on Cancun (nil beacon root) in v1.13.x.
    shanghaiTime: 0,
    clique: {
      period: 3,
      epoch: 30000,
    },
  },
  nonce: "0x0",
  timestamp: "0x0",
  extraData: cliqueExtraData(validators),
  gasLimit: "0x2625a00",
  difficulty: "0x1",
  mixHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
  coinbase: "0x0000000000000000000000000000000000000000",
  baseFeePerGas: "0x" + baseFeeBn.toString(16),
  alloc: {
    [treasury]: { balance: totalWei },
  },
  number: "0x0",
  gasUsed: "0x0",
  parentHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
};

const outPath = join(root, "genesis.json");
mkdirSync(root, { recursive: true });
writeFileSync(outPath, JSON.stringify(genesis, null, 2) + "\n", "utf8");
console.log("Wrote", outPath);
console.log("Clique signers:", validators.join(", "));
console.log("Treasury:", treasury, "balance (wei):", totalWei);
console.log("baseFeePerGas (wei):", baseFeeWei);
