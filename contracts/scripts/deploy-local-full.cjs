/**
 * Deploy PETH proxy + write deployments/localhost.json
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const { ethers, upgrades } = hre;
  const [deployer] = await ethers.getSigners();
  const treasury =
    process.env.TREASURY_ADDRESS && process.env.TREASURY_ADDRESS.length > 0
      ? process.env.TREASURY_ADDRESS
      : deployer.address;
  const admin =
    process.env.ADMIN_ADDRESS && process.env.ADMIN_ADDRESS.length > 0
      ? process.env.ADMIN_ADDRESS
      : deployer.address;

  console.log("Deploying with:", deployer.address);
  console.log("Treasury (receives 5B PETH):", treasury);
  console.log("Admin:", admin);

  const PETH = await ethers.getContractFactory("PETH");
  const proxy = await upgrades.deployProxy(PETH, [treasury, admin], {
    kind: "uups",
    initializer: "initialize",
  });
  await proxy.waitForDeployment();

  const proxyAddr = await proxy.getAddress();
  const impl = await upgrades.erc1967.getImplementationAddress(proxyAddr);

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const payload = {
    network: "localhost",
    chainId: Number(hre.network.config.chainId) || 4111,
    pethProxy: proxyAddr,
    implementation: impl,
    treasury,
    admin,
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(outDir, "localhost.json"), JSON.stringify(payload, null, 2));
  console.log("\n--- Copy into server/.env and apps/dashboard/.env ---");
  console.log(`PETH_TOKEN_ADDRESS=${proxyAddr.toLowerCase()}`);
  console.log(`VITE_PETH_TOKEN=${proxyAddr}`);
  console.log(`TREASURY_ADDRESS=${treasury}`);
  console.log(`VITE_TREASURY_ADDRESS=${treasury}`);
  console.log("--- Written: contracts/deployments/localhost.json ---\n");

  console.log("PETH proxy (token address):", proxyAddr);
  console.log("Implementation:", impl);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
