import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";

const chainId = Number(import.meta.env.VITE_CHAIN_ID || 4111);
const rpc = import.meta.env.VITE_RPC_URL || "https://rpc.ecnascan.com";
const explorerUrl = import.meta.env.VITE_EXPLORER_URL || "https://explorer.ecnascan.com";

export const ecnaChain = defineChain({
  id: chainId,
  name: "E Canna Mainnet",
  nativeCurrency: {
    name: "E Canna",
    symbol: "ECNA",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [rpc] },
  },
  blockExplorers: {
    default: { name: "ECNASCAN Explorer", url: explorerUrl },
  },
});

/** @deprecated use ecnaChain */
export const pethChain = ecnaChain;

export const wagmiConfig = getDefaultConfig({
  appName: "ECNASCAN",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "demo",
  chains: [ecnaChain],
  ssr: false,
});
