/**
 * Funds native ECNA on local RPC (Anvil / Hardhat).
 *
 * Recipient (first match):
 *   1. ECNA_NATIVE_MINT_ADDRESS — canonical premine target (same as server/.env / ecnachain)
 *   2. TREASURY_ADDRESS
 *   3. FUND_TO
 *
 * If ECNA_NATIVE_MINT_ADDRESS is unset in contracts/.env, the script tries server/.env (repo root).
 *
 * Default: on-chain transfer so explorer shows a tx. Set FUND_SILENT=1 for setBalance only.
 */
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const contractsEnv = path.join(__dirname, "..", ".env");
dotenv.config({ path: contractsEnv });

const serverEnv = path.join(__dirname, "..", "..", "server", ".env");
if (!process.env.ECNA_NATIVE_MINT_ADDRESS?.trim() && fs.existsSync(serverEnv)) {
  try {
    const parsed = dotenv.parse(fs.readFileSync(serverEnv, "utf8"));
    const v = parsed.ECNA_NATIVE_MINT_ADDRESS?.trim();
    if (v) process.env.ECNA_NATIVE_MINT_ADDRESS = v;
  } catch (_) {
    /* ignore */
  }
}

const hre = require("hardhat");

/**
 * Hardhat node: hardhat_setBalance. Foundry Anvil: anvil_setBalance (same address + wei hex).
 * Without this fallback, fund:treasury does nothing useful on Anvil (local:node:persistent).
 */
function weiToHex(wei) {
  if (wei === 0n) return "0x0";
  return "0x" + wei.toString(16);
}

async function rpcSetBalance(provider, address, wei) {
  const hex = weiToHex(wei);
  try {
    await provider.send("hardhat_setBalance", [address, hex]);
  } catch (e1) {
    try {
      await provider.send("anvil_setBalance", [address, hex]);
    } catch (e2) {
      const m1 = e1?.message || String(e1);
      const m2 = e2?.message || String(e2);
      throw new Error(`setBalance failed (tried hardhat_setBalance + anvil_setBalance): ${m1} | ${m2}`);
    }
  }
}

function resolveRecipient() {
  const a = process.env.ECNA_NATIVE_MINT_ADDRESS?.trim();
  const b = process.env.TREASURY_ADDRESS?.trim();
  const c = process.env.FUND_TO?.trim();
  const to = a || b || c;
  return { to, source: a ? "ECNA_NATIVE_MINT_ADDRESS" : b ? "TREASURY_ADDRESS" : c ? "FUND_TO" : null };
}

async function main() {
  const { to, source } = resolveRecipient();
  if (!to || !hre.ethers.isAddress(to)) {
    throw new Error(
      "Set ECNA_NATIVE_MINT_ADDRESS (recommended, same as server/.env) or TREASURY_ADDRESS or FUND_TO in contracts/.env"
    );
  }
  const ethStr = (process.env.FUND_ECNA || process.env.FUND_ETH || "10000000").trim();
  const wei = hre.ethers.parseEther(ethStr);
  const checksumTo = hre.ethers.getAddress(to);

  const silent = process.env.FUND_SILENT === "1" || /^true$/i.test(process.env.FUND_SILENT || "");
  const preferTx =
    !silent && process.env.FUND_USE_TRANSFER_TX !== "0" && /^localhost|hardhat$/i.test(hre.network.name);

  const prov = hre.network.provider;
  const cfgUrl = hre.network.config.url;
  console.log("RPC:", cfgUrl || "(hardhat in-process)", "| network:", hre.network.name);
  console.log("Native ECNA recipient (" + source + "):", checksumTo);

  if (preferTx) {
    try {
      const [signer] = await hre.ethers.getSigners();
      const from = signer.address;
      if (process.env.FUND_ACCUMULATE !== "1") {
        await rpcSetBalance(prov, checksumTo, 0n);
      }
      const gasBuffer = hre.ethers.parseEther("100");
      const topUp = wei + gasBuffer;
      await rpcSetBalance(prov, from, topUp);
      const tx = await signer.sendTransaction({ to: checksumTo, value: wei });
      const rec = await tx.wait();
      console.log("On-chain native transfer →", checksumTo);
      console.log("Amount:", ethStr, "ECNA");
      console.log("Tx hash (explorer / Latest transactions):", tx.hash);
      console.log("Block:", rec.blockNumber?.toString());
    } catch (e) {
      console.warn("Transfer+setBalance path failed, falling back to recipient setBalance only:", e.message);
      await rpcSetBalance(prov, checksumTo, wei);
      console.log("setBalance (hardhat/anvil) →", checksumTo, "(no transfer tx — set FUND_SILENT=0 and fix errors for visible tx)");
    }
  } else {
    try {
      await rpcSetBalance(prov, checksumTo, wei);
      console.log("setBalance (hardhat/anvil) →", checksumTo);
      console.log("Set native balance to", ethStr, "ECNA (FUND_SILENT / non-local: no on-chain transfer row)");
    } catch (e) {
      console.warn("setBalance not available, falling back to sendTransaction:", e.message);
      const [signer] = await hre.ethers.getSigners();
      const tx = await signer.sendTransaction({ to: checksumTo, value: wei });
      await tx.wait();
      console.log("Funded", checksumTo, "with", ethStr, "ECNA via transfer. Tx:", tx.hash);
    }
  }

  const bal = await hre.ethers.provider.getBalance(checksumTo);
  console.log("Recipient balance now (wei):", bal.toString());
  console.log("Recipient balance now (ECNA):", hre.ethers.formatEther(bal));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
