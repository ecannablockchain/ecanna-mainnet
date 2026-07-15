/**
 * Deploy GreenGloryNFT (GGN) to ECNA — Paris EVM bytecode (no PUSH0).
 *
 * Usage:
 *   DEPLOYER_PRIVATE_KEY=0x... PETH_RPC_URL=https://rpc.ecnascan.com \
 *     npx hardhat run scripts/deploy-ggn.cjs --network pethMainnet
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

const OWNER =
  process.env.GGN_OWNER_ADDRESS ||
  process.env.TREASURY_ADDRESS ||
  "0xF4B6C206f7a6C4b59Ebe129C43Ea9592a03dc0cC";

/** 100 Cr = 100 crore = 1,000,000,000 GGN (18 decimals). Override with GGN_INITIAL_SUPPLY. */
const INITIAL_SUPPLY =
  process.env.GGN_INITIAL_SUPPLY || "1000000000";

async function main() {
  const { ethers } = hre;
  const [deployer] = await ethers.getSigners();
  const initialSupply = ethers.parseUnits(INITIAL_SUPPLY, 18);

  console.log("Network:", hre.network.name, "chainId:", hre.network.config.chainId);
  console.log("Deployer (pays gas):", deployer.address);
  console.log("Owner + mint recipient:", OWNER);
  console.log("Initial supply (GGN):", INITIAL_SUPPLY);

  const bal = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer ECNA balance:", ethers.formatEther(bal));

  const Factory = await ethers.getContractFactory("GreenGloryNFT");
  const contract = await Factory.deploy(OWNER, initialSupply);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("\nGreenGloryNFT deployed:", address);

  const name = await contract.name();
  const symbol = await contract.symbol();
  const total = await contract.totalSupply();
  const ownerBal = await contract.balanceOf(OWNER);
  console.log("name:", name, "| symbol:", symbol);
  console.log("totalSupply:", ethers.formatUnits(total, 18), symbol);
  console.log("owner token balance:", ethers.formatUnits(ownerBal, 18), symbol);

  const artifact = await hre.artifacts.readArtifact("GreenGloryNFT");
  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const payload = {
    network: hre.network.name,
    chainId: Number(hre.network.config.chainId) || 4111,
    contract: "GreenGloryNFT",
    address,
    owner: OWNER,
    initialSupply: INITIAL_SUPPLY,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(outDir, "ggn.json"), JSON.stringify(payload, null, 2));

  console.log("\n--- Add to server/.env and apps/dashboard/.env ---");
  console.log(`PETH_TOKEN_ADDRESS=${address.toLowerCase()}`);
  console.log(`VITE_PETH_TOKEN=${address}`);
  console.log("--- Written: contracts/deployments/ggn.json ---\n");

  return { address, artifact, constructorArguments: [OWNER, initialSupply] };
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
