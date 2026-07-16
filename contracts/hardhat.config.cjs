require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

const PRIVATE_KEY =
  process.env.DEPLOYER_PRIVATE_KEY || ""  // set DEPLOYER_PRIVATE_KEY in contracts/.env (never commit);
const PETH_RPC_URL = process.env.PETH_RPC_URL || "https://rpc.ecnascan.com";
const PETH_CHAIN_ID = parseInt(process.env.PETH_CHAIN_ID || "4111", 10);

/**
 * Empty blocks every ~3s on `hardhat node` so the explorer chain head stays alive
 * without traffic. Transactions still automine immediately.
 * Override: HARDHAT_NODE_INTERVAL_MS=0 (tx-only) or another ms value.
 * `hardhat test` never enables interval (would slow tests).
 */
function isHardhatNodeCommand() {
  const args = process.argv;
  const last = args[args.length - 1];
  return (
    last === "node" &&
    args.some((a) => typeof a === "string" && a.includes("hardhat"))
  );
}

const defaultIntervalMs = isHardhatNodeCommand() ? "3000" : "0";
const hardhatNodeIntervalMs = parseInt(
  process.env.HARDHAT_NODE_INTERVAL_MS ?? defaultIntervalMs,
  10,
);

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      // ECNA Clique activates Shanghai (PUSH0). Cancun is not used (miner crash on Clique).
      evmVersion: "shanghai",
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 4111,
      ...(hardhatNodeIntervalMs > 0
        ? {
            mining: {
              auto: true,
              interval: hardhatNodeIntervalMs,
            },
          }
        : {}),
    },
    // No `accounts`: Hardhat uses Geth's unlocked/miner account (ecnachain). If you add
    // accounts: [PRIVATE_KEY], set DEPLOYER_PRIVATE_KEY to a funded key (e.g. miner).
    localhost: {
      url: PETH_RPC_URL,
      chainId: PETH_CHAIN_ID,
    },
    pethTestnet: {
      url: process.env.PETH_TESTNET_RPC || PETH_RPC_URL,
      chainId: parseInt(process.env.PETH_TESTNET_CHAIN_ID || "4111", 10),
      accounts: [PRIVATE_KEY],
    },
    pethMainnet: {
      url: process.env.PETH_MAINNET_RPC || PETH_RPC_URL,
      chainId: parseInt(process.env.PETH_MAINNET_CHAIN_ID || String(PETH_CHAIN_ID), 10),
      accounts: [PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      localhost: process.env.PETH_EXPLORER_API_KEY || "dummy",
      pethTestnet: process.env.PETH_EXPLORER_API_KEY || "dummy",
      pethMainnet: process.env.PETH_EXPLORER_API_KEY || "dummy",
    },
    customChains: [
      {
        network: "localhost",
        chainId: PETH_CHAIN_ID,
        urls: {
          apiURL: process.env.PETH_EXPLORER_API_URL || "https://api.ecnascan.com/api/verify/etherscan",
          browserURL: process.env.PETH_EXPLORER_BROWSER_URL || "https://explorer.ecnascan.com",
        },
      },
      {
        network: "pethTestnet",
        chainId: parseInt(process.env.PETH_TESTNET_CHAIN_ID || "4111", 10),
        urls: {
          apiURL: process.env.PETH_EXPLORER_API_URL || "https://api.ecnascan.com/api/verify/etherscan",
          browserURL: process.env.PETH_EXPLORER_BROWSER_URL || "https://explorer.ecnascan.com",
        },
      },
      {
        network: "pethMainnet",
        chainId: parseInt(process.env.PETH_MAINNET_CHAIN_ID || String(PETH_CHAIN_ID), 10),
        urls: {
          apiURL:
            process.env.PETH_EXPLORER_API_URL ||
            "https://api.ecnascan.com/api/verify/etherscan",
          browserURL:
            process.env.PETH_EXPLORER_BROWSER_URL || "https://explorer.ecnascan.com",
        },
      },
    ],
  },
  sourcify: { enabled: false },
};
