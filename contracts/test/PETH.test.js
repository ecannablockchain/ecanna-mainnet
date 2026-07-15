const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("PETH", () => {
  const TOTAL = 5_000_000_000n * 10n ** 18n;

  it("deploys UUPS proxy, mints 5B to treasury, roles work", async () => {
    const [deployer, treasury, user] = await ethers.getSigners();
    const PETH = await ethers.getContractFactory("PETH");
    const proxy = await upgrades.deployProxy(PETH, [treasury.address, deployer.address], {
      kind: "uups",
      initializer: "initialize",
    });
    await proxy.waitForDeployment();

    expect(await proxy.balanceOf(treasury.address)).to.equal(TOTAL);
    expect(await proxy.name()).to.equal("PrimeEther");
    expect(await proxy.symbol()).to.equal("PETH");

    await proxy.connect(deployer).mint(user.address, 1n);
    expect(await proxy.balanceOf(user.address)).to.equal(1n);
    await proxy.connect(user).burn(1n);
    expect(await proxy.balanceOf(user.address)).to.equal(0n);
    await expect(proxy.connect(user).mint(user.address, 1n)).to.be.reverted;
  });
});
