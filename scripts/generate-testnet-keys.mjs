#!/usr/bin/env node
/**
 * Generate testnet validator + faucet keys (separate from mainnet).
 */
import { Wallet } from "ethers";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dockerDir = join(root, "testnet", "ecnachain", "docker");
const minerPath = join(dockerDir, "miner-private.hex");
const faucetPath = join(dockerDir, "faucet-private.hex");

mkdirSync(dockerDir, { recursive: true });

function loadOrCreate(path, label) {
  if (existsSync(path)) {
    const hex = readFileSync(path, "utf8").trim().replace(/^0x/, "");
    console.error(`[keys] Reusing existing testnet ${label} key`);
    return new Wallet("0x" + hex);
  }
  const w = Wallet.createRandom();
  writeFileSync(path, w.privateKey.slice(2) + "\n", { mode: 0o600 });
  console.error(`[keys] Created testnet ${label} key:`, path);
  return w;
}

const minerWallet = loadOrCreate(minerPath, "validator");
const faucetWallet = loadOrCreate(faucetPath, "faucet");

console.log(
  JSON.stringify(
    {
      validator: minerWallet.address,
      faucet: faucetWallet.address,
      faucetPrivateKey: faucetWallet.privateKey,
    },
    null,
    2,
  ),
);
