/** Mainnet + testnet public endpoints (website shows both). */
const HOST = "ecnascan.com";

function t(v: string | undefined, fallback: string): string {
  const s = (v ?? "").trim();
  return s || fallback;
}

export type NetworkProfile = {
  kind: "mainnet" | "testnet";
  label: string;
  chainName: string;
  chainId: string;
  nativeSymbol: string;
  nativeName: string;
  rpcUrl: string;
  apiUrl: string;
  explorerUrl: string;
  faucetUrl?: string;
};

export const mainnetNetwork: NetworkProfile = {
  kind: "mainnet",
  label: "Mainnet (Live)",
  chainName: t(import.meta.env.VITE_CHAIN_NAME, "E Canna Mainnet"),
  chainId: t(import.meta.env.VITE_CHAIN_ID, "4111"),
  nativeSymbol: t(import.meta.env.VITE_NATIVE_SYMBOL, "ECNA"),
  nativeName: t(import.meta.env.VITE_NATIVE_NAME, "E Canna"),
  rpcUrl: t(import.meta.env.VITE_RPC_URL, `https://rpc.${HOST}`),
  apiUrl: t(import.meta.env.VITE_API_URL, `https://api.${HOST}`),
  explorerUrl: t(import.meta.env.VITE_EXPLORER_URL, `https://explorer.${HOST}`),
};

export const testnetNetwork: NetworkProfile = {
  kind: "testnet",
  label: "Testnet",
  chainName: t(import.meta.env.VITE_TESTNET_CHAIN_NAME, "E Canna Testnet"),
  chainId: t(import.meta.env.VITE_TESTNET_CHAIN_ID, "4112"),
  nativeSymbol: t(import.meta.env.VITE_TESTNET_NATIVE_SYMBOL, "tECNA"),
  nativeName: t(import.meta.env.VITE_TESTNET_NATIVE_NAME, "E Canna Testnet"),
  rpcUrl: t(import.meta.env.VITE_TESTNET_RPC_URL, `https://testnetrpc.${HOST}`),
  apiUrl: t(import.meta.env.VITE_TESTNET_API_URL, `https://testnetapi.${HOST}`),
  explorerUrl: t(import.meta.env.VITE_TESTNET_EXPLORER_URL, `https://testnetexplorer.${HOST}`),
  faucetUrl: t(import.meta.env.VITE_TESTNET_FAUCET_URL, `https://testnetapi.${HOST}/api/v1/faucet`),
};

export const allNetworks: NetworkProfile[] = [mainnetNetwork, testnetNetwork];
