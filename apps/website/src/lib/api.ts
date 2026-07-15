/**
 * API base: set VITE_API_URL in production. Dev uses Vite proxy to :4000 when unset.
 */
export function apiUrl(path: string): string {
  const base = (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/$/, "") ?? "";
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

export async function fetchJson<T>(path: string): Promise<T> {
  const r = await fetch(apiUrl(path));
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<T>;
}

export type ApiConfig = {
  rpcUrl: string;
  chainId: number;
  nativeSymbol?: string;
  nativeName?: string;
  pethToken: string | null;
  treasuryAddress: string | null;
  explorerUrl?: string;
  dashboardUrl?: string;
  chainHead: number;
};

export type Dashboard = {
  chainHead: number;
  indexedLatestBlock: string | null;
  indexedTransactions: string | number;
  indexedBlocks: string | number;
  gasGwei: number | null;
  latestBlockTimestamp: string | null;
  chainHeadTimestamp?: string | null;
  indexerLagBlocks?: number | null;
  avgBlockTimeSec: number | null;
  nativeSymbol: string;
};

export type GasResponse = {
  latestIndexed: { blockNum: string; gasUsed: string; timestamp: string } | null;
  live: {
    gasPrice: string | null;
    maxFeePerGas: string | null;
    maxPriorityFeePerGas: string | null;
  };
};
