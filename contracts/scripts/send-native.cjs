/**
 * Send native ECNA (18 decimals; local Hardhat or ECNA Geth) from default account #0 to RECIPIENT.
 * Usage: npx hardhat run scripts/send-native.cjs --network localhost
 * Env: RECIPIENT=0x... (optional, default Hardhat account #1), SEND_AMOUNT=1 (optional, in whole units)
 */
require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const signers = await hre.ethers.getSigners();
  const from = signers[0];
  const defaultTo = signers[1] ? signers[1].address : null;
  const to = (process.env.RECIPIENT || defaultTo || "").trim();
  if (!to || !hre.ethers.isAddress(to)) {
    throw new Error("Set RECIPIENT to a valid 0x address or use a network with 2+ unlocked accounts.");
  }
  const amountStr = (process.env.SEND_AMOUNT || "1000").trim();
  const value = hre.ethers.parseEther(amountStr);

  console.log("From:", from.address);
  console.log("To:  ", to);
  console.log("Amount:", amountStr, "(wei units = native token)");

  const balBefore = await hre.ethers.provider.getBalance(to);
  const tx = await from.sendTransaction({ to, value });
  console.log("Tx hash:", tx.hash);
  const rec = await tx.wait();
  console.log("Mined in block:", rec.blockNumber);

  const balAfter = await hre.ethers.provider.getBalance(to);
  console.log("Recipient balance before (wei):", balBefore.toString());
  console.log("Recipient balance after (wei): ", balAfter.toString());
  console.log("Recipient balance after:      ", hre.ethers.formatEther(balAfter));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
