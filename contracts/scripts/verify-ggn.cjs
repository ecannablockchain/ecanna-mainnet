/**
 * Verify GreenGloryNFT on ECNA explorer API (Etherscan-compatible).
 *
 *   node scripts/verify-ggn.cjs <contractAddress> <owner> <initialSupplyWei>
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

const API =
  process.env.PETH_EXPLORER_API_URL ||
  "https://api.ecnascan.com/api/verify/etherscan";

async function main() {
  const address = process.argv[2];
  const owner =
    process.argv[3] ||
    process.env.GGN_OWNER_ADDRESS ||
    process.env.TREASURY_ADDRESS ||
    "0xF4B6C206f7a6C4b59Ebe129C43Ea9592a03dc0cC";
  const supplyHuman =
    process.argv[4] || process.env.GGN_INITIAL_SUPPLY || "1000000000";

  if (!address || !hre.ethers.isAddress(address)) {
    throw new Error("Usage: node scripts/verify-ggn.cjs <contractAddress> [owner] [supplyGGN]");
  }

  const { ethers } = hre;
  const initialSupply = ethers.parseUnits(supplyHuman, 18);
  const artifact = await hre.artifacts.readArtifact("GreenGloryNFT");
  const sourcePath = path.join(__dirname, "..", "contracts", "GreenGloryNFT.sol");
  const sourceCode = fs.readFileSync(sourcePath, "utf8");
  const config = hre.config.solidity;
  const sol = typeof config === "object" && !Array.isArray(config) ? config : config.compilers?.[0];

  const body = {
    contractaddress: address,
    contractname: "GreenGloryNFT",
    compilerversion: `v${sol?.version || "0.8.24"}`,
    sourceCode,
    abi: JSON.stringify(artifact.abi),
    optimizationUsed: sol?.settings?.optimizer?.enabled ? "1" : "0",
    runs: String(sol?.settings?.optimizer?.runs ?? 200),
    evmVersion: sol?.settings?.evmVersion || "paris",
    compilerKind: "solidity-single-file",
    openSourceLicense: "MIT",
    compilerCreationBytecode: artifact.bytecode,
    constructorArguments: ethers.AbiCoder.defaultAbiCoder()
      .encode(["address", "uint256"], [owner, initialSupply])
      .slice(2),
  };

  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Verify API non-JSON (${res.status}): ${text.slice(0, 500)}`);
  }
  console.log("Verify response:", JSON.stringify(json, null, 2));
  if (json.status !== "1" && json.message !== "OK" && !json.result?.includes?.("Pass")) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
