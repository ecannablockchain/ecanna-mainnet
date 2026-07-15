const peerUrl = (import.meta.env.VITE_PEER_EXPLORER_URL as string | undefined)?.trim();
const peerLabel = (import.meta.env.VITE_PEER_NETWORK_LABEL as string | undefined)?.trim() || "Other network";
const networkKind = ((import.meta.env.VITE_NETWORK_KIND as string | undefined)?.trim() || "mainnet").toLowerCase();

export function peerExplorerUrl(): string | null {
  return peerUrl || null;
}

export function peerNetworkLabel(): string {
  return peerLabel;
}

export function isTestnetExplorer(): boolean {
  return networkKind === "testnet";
}

export function currentNetworkBadge(): string {
  return isTestnetExplorer() ? "Testnet" : "Mainnet";
}
