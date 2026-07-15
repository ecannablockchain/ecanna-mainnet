/** Internal RPC for indexer/API (e.g. http://127.0.0.1:8545 on the validator host). */
export function internalRpcUrl(): string {
  return process.env.RPC_URL?.trim() || "http://127.0.0.1:8545";
}

/** Public JSON-RPC URL exposed to wallets, website, and /api/v1/config. */
export function publicRpcUrl(): string {
  const pub = process.env.RPC_PUBLIC_URL?.trim();
  if (pub) return pub.startsWith("http") ? pub : `https://${pub}`;
  const internal = internalRpcUrl();
  if (!/^(https?:\/\/)?(localhost|127\.0\.0\.1)/i.test(internal)) {
    return internal.startsWith("http") ? internal : `https://${internal}`;
  }
  return "https://rpc.ecnascan.com";
}
