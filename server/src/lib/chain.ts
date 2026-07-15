import { ethers, Network } from "ethers";

const RPC = process.env.RPC_URL || "http://50.28.84.113:8545";
/** Default Hardhat / local node. Set RPC_CHAIN_ID for other chains (e.g. testnet). */
const chainId = Number.parseInt(process.env.RPC_CHAIN_ID || "4111", 10);
const network = Network.from(chainId);

export const provider = new ethers.JsonRpcProvider(RPC, network, {
  staticNetwork: network,
});

export const TRANSFER_TOPIC = ethers.id("Transfer(address,address,uint256)");
export const PETH_TOKEN_ADDRESS = (process.env.PETH_TOKEN_ADDRESS || "").toLowerCase();
