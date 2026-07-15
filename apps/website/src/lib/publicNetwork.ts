/** Production defaults — overridden by VITE_RPC_URL / VITE_CHAIN_ID at build time. */
export const PUBLIC_RPC_DEFAULT = "https://rpc.ecnascan.com";
export const CHAIN_ID_DEFAULT = "4111";

function normalizeUrl(url: string): string {
  const t = url.trim();
  if (!t) return PUBLIC_RPC_DEFAULT;
  return t.startsWith("http") ? t : `https://${t}`;
}

/** Public JSON-RPC URL for wallets and docs (never localhost in production builds). */
export function publicRpcUrl(): string {
  const env = (import.meta.env.VITE_RPC_URL as string | undefined)?.trim();
  return normalizeUrl(env || PUBLIC_RPC_DEFAULT);
}

export function chainIdDecimal(): string {
  return (import.meta.env.VITE_CHAIN_ID as string | undefined)?.trim() || CHAIN_ID_DEFAULT;
}

function isInternalRpc(url: string): boolean {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/i.test(url.trim());
}

/** Prefer build-time VITE_RPC_URL; otherwise API value if it is not an internal server URL. */
export function resolvePublicRpc(apiRpc?: string | null): string {
  const fromEnv = (import.meta.env.VITE_RPC_URL as string | undefined)?.trim();
  if (fromEnv) return normalizeUrl(fromEnv);
  if (apiRpc && !isInternalRpc(apiRpc)) return normalizeUrl(apiRpc);
  return PUBLIC_RPC_DEFAULT;
}
