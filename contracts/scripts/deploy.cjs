const { ethers, upgrades } = require("hardhat");

async function main() {
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
  console.log("Treasury:", treasury);
  console.log("Admin:", admin);

  const PETH = await ethers.getContractFactory("PETH");
  const proxy = await upgrades.deployProxy(PETH, [treasury, admin], {
    kind: "uups",
    initializer: "initialize",
  });
  await proxy.waitForDeployment();

  const proxyAddr = await proxy.getAddress();
  const impl = await upgrades.erc1967.getImplementationAddress(proxyAddr);

  console.log("PETH proxy (token address):", proxyAddr);
  console.log("Implementation:", impl);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
