/**
 * Native transfer on any RPC (e.g. https://rpc.ecnascan.com).
 * Creates a real tx so the explorer / indexer shows it (genesis alloc alone does not).
 *
 * contracts/.env (or env):
 *   RPC_URL=https://rpc.ecnascan.com
 *   PRIVATE_KEY=0x...   or same as Hardhat: DEPLOYER_PRIVATE_KEY (sender — must hold balance + gas)
 *   RECIPIENT=0x...       (receiver)
 *   SEND_AMOUNT=1000    (whole units, 18 decimals)  OR  SEND_ALL=1  (balance minus gas)
 *
 * Usage:
 *   node scripts/send-native-rpc.cjs
 *   npm run send-native:rpc -w contracts
 *   (from ecnachain/) npm run send-native:rpc
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { ethers } = require("ethers");

async function main() {
  const rpc = (
    process.env.RPC_URL ||
    process.env.PETH_RPC_URL ||
    "https://rpc.ecnascan.com"
  ).trim();
  const pk = (
    process.env.PRIVATE_KEY ||
    process.env.SEND_FROM_KEY ||
    process.env.DEPLOYER_PRIVATE_KEY ||
    ""
  ).trim();
  const to = (process.env.RECIPIENT || process.env.TO || "").trim();
  const sendAll =
    process.env.SEND_ALL === "1" || /^true$/i.test(process.env.SEND_ALL || "");

  if (!pk) {
    throw new Error(
      "No sender key in contracts/.env. Add one of:\n" +
        "  PRIVATE_KEY=0x...\n" +
        "  DEPLOYER_PRIVATE_KEY=0x...   (same as Hardhat deploy)\n" +
        "Key must be for an address that already has native balance on this RPC (e.g. genesis alloc).",
    );
  }
  if (!to || !ethers.isAddress(to)) {
    throw new Error(
      "Set RECIPIENT=0x... (or TO=) in contracts/.env — who receives the native transfer.",
    );
  }

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);
  const checksumTo = ethers.getAddress(to);

  const network = await provider.getNetwork();
  console.log("RPC:", rpc, "| chainId:", network.chainId.toString());
  console.log("From:", wallet.address);
  console.log("To:  ", checksumTo);

  let value;
  if (sendAll) {
    const bal = await provider.getBalance(wallet.address);
    const fd = await provider.getFeeData();
    const gasPrice = fd.gasPrice ?? fd.maxFeePerGas ?? 100000000n;
    const gasLimit = 21000n;
    const fee = gasLimit * gasPrice;
    if (bal <= fee) throw new Error(`Balance too low for gas: have ${bal}, need > ${fee} wei`);
    value = bal - fee;
    console.log("SEND_ALL: value (wei):", value.toString());
  } else {
    const amountStr = (process.env.SEND_AMOUNT || "1").trim();
    value = ethers.parseEther(amountStr);
    console.log("Amount:", amountStr, "(parseEther)");
  }

  const tx = await wallet.sendTransaction({ to: checksumTo, value });
  console.log("Tx hash (explorer):", tx.hash);
  const rec = await tx.wait();
  console.log("Block:", rec.blockNumber?.toString(), "| status:", rec.status);
  const balAfter = await provider.getBalance(checksumTo);
  console.log("Recipient balance now:", ethers.formatEther(balAfter));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
