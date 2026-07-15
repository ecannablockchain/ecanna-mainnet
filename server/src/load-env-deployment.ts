/**
 * Auto-load PETH proxy + treasury from contracts/deployments/localhost.json
 * so server/indexer work right after deploy without hand-editing .env.
 *
 * Must load server/.env FIRST — otherwise deployment JSON overwrites TREASURY_ADDRESS etc.
 *
 * ECNA_PRIMARY_ADDRESS: validator (Clique signer / gas + block rewards / explorer miner for blocks > 0).
 * ECNA_NATIVE_MINT_ADDRESS: optional — treasury + genesis-style mint display; if unset, treasury = primary.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFromPath(p: string) {
  const text = readFileSync(p, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
}

function loadEnvFile() {
  const explicit = process.env.SERVER_ENV_FILE?.trim();
  if (explicit && existsSync(explicit)) {
    loadEnvFromPath(explicit);
    return;
  }
  const candidates = [join(__dirname, ".env"), join(__dirname, "..", ".env")];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    loadEnvFromPath(p);
    return;
  }
}

loadEnvFile();

/** Resolve deployments file whether server runs from server/, repo root, or dist/. */
function deploymentFile(): string | null {
  const rel = join("contracts", "deployments", "localhost.json");
  const candidates = [
    join(__dirname, "..", "..", rel),
    join(process.cwd(), rel),
    join(process.cwd(), "..", rel),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

const file = deploymentFile();

if (file) {
  try {
    const j = JSON.parse(readFileSync(file, "utf8")) as { pethProxy?: string; treasury?: string };
    if (!process.env.PETH_TOKEN_ADDRESS?.trim() && j.pethProxy) {
      process.env.PETH_TOKEN_ADDRESS = j.pethProxy.toLowerCase();
    }
    if (!process.env.TREASURY_ADDRESS?.trim() && j.treasury) {
      process.env.TREASURY_ADDRESS = j.treasury;
    }
  } catch {
    /* ignore */
  }
}

function applyPrimaryAddress() {
  const validator = process.env.ECNA_PRIMARY_ADDRESS?.trim();
  const mint = process.env.ECNA_NATIVE_MINT_ADDRESS?.trim();

  if (validator && ethers.isAddress(validator)) {
    process.env.CLIQUE_SIGNER_ADDRESS = validator.toLowerCase();
  }

  if (mint && ethers.isAddress(mint)) {
    const m = mint.toLowerCase();
    process.env.TREASURY_ADDRESS = m;
    process.env.GENESIS_COINBASE_ADDRESS = m;
  } else if (validator && ethers.isAddress(validator)) {
    const v = validator.toLowerCase();
    process.env.TREASURY_ADDRESS = v;
    process.env.GENESIS_COINBASE_ADDRESS = v;
  }
}

applyPrimaryAddress();
