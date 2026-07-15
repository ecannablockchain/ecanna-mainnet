import { ethers } from "ethers";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

/**
 * Block #0: ECNA_NATIVE_MINT_ADDRESS (premine / mint). Later blocks: ECNA_PRIMARY_ADDRESS (validator / gas).
 */
export function resolveDisplayMiner(miner: string, blockNumber: bigint): string {
  const mint = process.env.ECNA_NATIVE_MINT_ADDRESS?.trim();
  const validator = process.env.ECNA_PRIMARY_ADDRESS?.trim();

  if (blockNumber === 0n && mint && ethers.isAddress(mint)) {
    return mint.toLowerCase();
  }
  if (validator && ethers.isAddress(validator)) {
    return validator.toLowerCase();
  }

  const raw = miner?.trim() || "";
  const m = (raw === "" ? ZERO_ADDR : raw).toLowerCase();

  if (blockNumber === 0n) {
    const coinbase = process.env.GENESIS_COINBASE_ADDRESS?.trim();
    if (coinbase && ethers.isAddress(coinbase)) return coinbase.toLowerCase();
    return m;
  }

  if (blockNumber > 0n && m === ZERO_ADDR) {
    const fallback = process.env.CLIQUE_SIGNER_ADDRESS?.trim();
    if (fallback && ethers.isAddress(fallback)) return fallback.toLowerCase();
  }

  return m;
}
