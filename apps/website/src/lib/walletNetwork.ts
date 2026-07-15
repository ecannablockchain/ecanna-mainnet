import { publicRpcUrl, chainIdDecimal, resolvePublicRpc } from "./publicNetwork.js";
import { site } from "../config";

export type AddChainParams = {
  chainId: string;
  chainName: string;
  rpcUrls: string[];
  nativeCurrency: { name: string; symbol: string; decimals: number };
  blockExplorerUrls: string[];
};

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?: boolean;
  isTrust?: boolean;
  isTokenPocket?: boolean;
  providers?: EthereumProvider[];
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
    trustwallet?: EthereumProvider;
    tokenpocket?: { ethereum?: EthereumProvider };
  }
}

function rpcUrl(): string {
  return publicRpcUrl();
}

function chainIdDecimalValue(): string {
  return chainIdDecimal();
}

export function getAddChainParams(): AddChainParams {
  const id = Number(chainIdDecimalValue());
  return {
    chainId: `0x${id.toString(16)}`,
    chainName: site.chainName,
    rpcUrls: [rpcUrl()],
    nativeCurrency: {
      name: site.nativeSymbol,
      symbol: site.nativeSymbol,
      decimals: 18,
    },
    blockExplorerUrls: [site.explorerUrl],
  };
}

export function getMetaMaskJson(): string {
  return JSON.stringify(getAddChainParams(), null, 2);
}

export function getNetworkClipboardText(): string {
  const p = getAddChainParams();
  return [
    `Network name: ${p.chainName}`,
    `RPC URL: ${p.rpcUrls[0]}`,
    `Chain ID: ${chainIdDecimalValue()} (${p.chainId})`,
    `Currency symbol: ${p.nativeCurrency.symbol}`,
    `Block explorer: ${p.blockExplorerUrls[0]}`,
  ].join("\n");
}

/** All injected EVM providers in this browser (MetaMask, Trust, TokenPocket, Rabby, …). */
function getAllProviders(): EthereumProvider[] {
  if (typeof window === "undefined") return [];
  const seen = new Set<EthereumProvider>();
  const list: EthereumProvider[] = [];
  const add = (p: EthereumProvider | undefined) => {
    if (p && !seen.has(p)) {
      seen.add(p);
      list.push(p);
    }
  };
  if (window.ethereum?.providers?.length) {
    window.ethereum.providers.forEach(add);
  }
  add(window.ethereum);
  add(window.trustwallet);
  add(window.tokenpocket?.ethereum);
  return list;
}

function isUserRejection(err: unknown): boolean {
  return (err as { code?: number })?.code === 4001;
}

async function addViaProvider(provider: EthereumProvider, params: AddChainParams): Promise<{ ok: boolean; message: string }> {
  try {
    await provider.request({ method: "wallet_addEthereumChain", params: [params] });
    return { ok: true, message: `${site.chainName} added to your wallet.` };
  } catch (err) {
    if (isUserRejection(err)) {
      return { ok: false, message: "Request cancelled in wallet." };
    }
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: params.chainId }] });
      return { ok: true, message: `Switched to ${site.chainName}.` };
    } catch (switchErr) {
      if (isUserRejection(switchErr)) {
        return { ok: false, message: "Request cancelled in wallet." };
      }
      throw err;
    }
  }
}

/**
 * One action for every EIP-3085 wallet — MetaMask, Trust Wallet, TokenPocket, Brave, Rabby, Coinbase, etc.
 * Uses the same `wallet_addEthereumChain` RPC call all EVM wallets support.
 */
export async function addNetworkToInjectedWallet(): Promise<{ ok: boolean; message: string }> {
  const providers = getAllProviders();
  const params = getAddChainParams();

  if (providers.length === 0) {
    const copied = await copyNetworkDetails();
    return {
      ok: false,
      message: copied
        ? "No wallet extension detected. Network details copied — paste into MetaMask, Trust Wallet, TokenPocket, or any EVM wallet."
        : "No wallet detected. Scroll to Wallet configuration to copy network fields.",
    };
  }

  let lastError = "";
  for (const provider of providers) {
    try {
      const result = await addViaProvider(provider, params);
      if (result.ok || result.message === "Request cancelled in wallet.") {
        return result;
      }
      lastError = result.message;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  return {
    ok: false,
    message: lastError || "Could not add network. Copy details below and add manually in your wallet.",
  };
}

export async function copyNetworkDetails(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(getNetworkClipboardText());
    return true;
  } catch {
    return false;
  }
}

export function hasInjectedWallet(): boolean {
  return getAllProviders().length > 0;
}
