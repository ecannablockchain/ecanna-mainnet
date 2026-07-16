/**
 * Add / switch ECNA chain in MetaMask (EIP-3085 / 3326).
 * RPC must include http:// — e.g. https://rpc.ecnascan.com
 */

const DEFAULT_RPC = "https://rpc.ecnascan.com";
const DEFAULT_CHAIN_ID = 4111;

function chainIdHex(id: number): string {
  return "0x" + id.toString(16);
}

export function getChainConfig() {
  const chainId = Number(import.meta.env.VITE_CHAIN_ID || DEFAULT_CHAIN_ID);
  let rpc = (import.meta.env.VITE_RPC_URL || DEFAULT_RPC).trim();
  if (!/^https?:\/\//i.test(rpc)) {
    rpc = `http://${rpc.replace(/^\/\//, "")}`;
  }
  const explorer = (import.meta.env.VITE_EXPLORER_URL || (typeof window !== "undefined" ? window.location.origin : "")).replace(
    /\/$/,
    "",
  );
  const chainName = (import.meta.env.VITE_CHAIN_NAME || "E Canna Mainnet").trim();
  const nativeName = (import.meta.env.VITE_NATIVE_NAME || "E Canna").trim();
  const nativeSymbol = (import.meta.env.VITE_NATIVE_SYMBOL || "ECNA").trim();
  return { chainId, chainIdHex: chainIdHex(chainId), rpc, explorer, chainName, nativeName, nativeSymbol };
}

export async function addOrSwitchEcnascanNetwork(): Promise<{ ok: boolean; message: string }> {
  const { chainIdHex: hex, rpc, explorer, chainName, nativeName, nativeSymbol } = getChainConfig();
  const ethereum = (typeof window !== "undefined" && window.ethereum) as
    | { request: (a: { method: string; params?: unknown }) => Promise<unknown> }
    | undefined;

  if (!ethereum?.request) {
    return { ok: false, message: "No browser wallet found. Install Chrome + MetaMask." };
  }

  const params = [
    {
      chainId: hex,
      chainName,
      nativeCurrency: {
        name: nativeName,
        symbol: nativeSymbol,
        decimals: 18,
      },
      rpcUrls: [rpc],
      blockExplorerUrls: explorer ? [explorer] : [],
    },
  ];

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hex }],
    });
    return { ok: true, message: "Switched to this network." };
  } catch (switchErr: unknown) {
    const code = switchErr && typeof switchErr === "object" && "code" in switchErr ? (switchErr as { code: number }).code : 0;
    if (code !== 4902) {
      const msg =
        switchErr && typeof switchErr === "object" && "message" in switchErr
          ? String((switchErr as { message: string }).message)
          : "Switch failed";
      return { ok: false, message: msg };
    }
    try {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params,
      });
      return { ok: true, message: "Network added — continue on this chain." };
    } catch (addErr: unknown) {
      const msg =
        addErr && typeof addErr === "object" && "message" in addErr
          ? String((addErr as { message: string }).message)
          : "Add failed";
      return { ok: false, message: msg };
    }
  }
}

/** @deprecated use addOrSwitchEcnascanNetwork */
export const addOrSwitchPrimeEtherNetwork = addOrSwitchEcnascanNetwork;
