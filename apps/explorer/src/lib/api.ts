/**
 * Empty base = relative URLs (Vite dev proxies /api and /health → backend). Set VITE_API_URL for production.
 */
function apiOrigin(): string {
  return (import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");
}

/** Full URL for API paths like `/api/v1/...` or `/health`. */
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const o = apiOrigin();
  return o ? `${o}${p}` : p;
}

/** Legacy export: base URL for string concat (prefer apiUrl). */
const API = apiOrigin() || "";

export async function fetchJson<T>(path: string): Promise<T> {
  const r = await fetch(apiUrl(path));
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<T>;
}

export { API };

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
  indexedTransactions: number;
  indexedBlocks: number;
  gasGwei: number | null;
  latestBlockTimestamp: string | null;
  /** ISO time of RPC tip block — preferred for “last block … ago” on home. */
  chainHeadTimestamp?: string | null;
  /** Blocks the index is behind RPC tip (0 = caught up). */
  indexerLagBlocks?: number | null;
  avgBlockTimeSec: number | null;
  nativeSymbol: string;
};

export type TxTokenTransferRow = {
  token: string;
  from: string;
  to: string;
  value: string;
  valueFormatted: string;
  symbol: string;
  decimals: number;
  logoUrl?: string | null;
};

export type TxDecodedArg = {
  name: string;
  type: string;
  value: string;
  displayValue?: string;
};

export type TxDecodedInput = {
  name: string;
  /** Full signature with arg names, e.g. `claimRevenue(string stakingId, uint256 revenue)` */
  functionDisplay?: string;
  selector: string;
  args: TxDecodedArg[];
  /** 32-byte words after selector (hex), BscScan-style `[0]:` lines */
  rawParamWords?: string[];
};

export type TxRow = {
  hash: string;
  blockNumber: string;
  blockHash?: string;
  from: string;
  to: string | null;
  value: string;
  gasPrice: string | null;
  gasUsed: string | null;
  status: number;
  feeWei: string | null;
  action: string;
  timestamp?: string | null;
  input?: string;
  nonce?: number;
  transactionIndex?: number;
  gasLimit?: string | null;
  /** Human-readable fungible-token line when calldata decodes */
  actionSummary?: string | null;
  tokenTransfers?: TxTokenTransferRow[];
  decodedInput?: TxDecodedInput | null;
  /** From indexer DB */
  indexed?: boolean;
  /** Tx seen on RPC but not yet mined */
  pending?: boolean;
};

export type BlockRow = {
  number: string;
  hash: string;
  timestamp: string;
  txCount: number;
  gasUsed: string;
  miner: string;
};

/** Row from GET /api/v1/tokens/transfers or /address/.../erc20-transfers */
export type TokenXferRow = {
  txHash: string;
  logIndex: number;
  token: string;
  from: string;
  to: string;
  value: string;
  blockNumber: string;
  timestamp: string;
  feeWei?: string | null;
  /** Decoded parent tx method name or 4-byte selector */
  action?: string;
  /** On-chain token metadata (when API could read the contract) */
  tokenSymbol?: string | null;
  tokenDecimals?: number;
  /** Deployer-published logo from token Info profile */
  logoUrl?: string | null;
};
