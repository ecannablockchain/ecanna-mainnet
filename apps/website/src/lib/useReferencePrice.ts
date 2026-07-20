import { useEffect, useState } from "react";
import { fetchJson } from "./api";

/**
 * Live ECNA USD via our API proxy → Nexdax ECNAUSDT (server-side; no browser CORS).
 * // Old CoinGecko ETH (wrong) — do not use:
 * // https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&...
 * // Direct Nexdax from browser fails (no Access-Control-Allow-Origin).
 */
export type RefPrice = {
  usd: number | null;
  usd24hChange: number | null;
  marketCapUsd: number | null;
  loading: boolean;
};

type MarketApi = {
  usd: number;
  usd24hChange: number | null;
  marketCapUsd: number;
};

export function useReferencePrice(pollMs = 60_000): RefPrice {
  const [usd, setUsd] = useState<number | null>(null);
  const [usd24hChange, setUsd24hChange] = useState<number | null>(null);
  const [marketCapUsd, setMarketCapUsd] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const j = await fetchJson<MarketApi>("/api/v1/market/ecna");
        if (cancelled) return;
        setUsd(typeof j.usd === "number" ? j.usd : null);
        setUsd24hChange(typeof j.usd24hChange === "number" ? j.usd24hChange : null);
        setMarketCapUsd(typeof j.marketCapUsd === "number" ? j.marketCapUsd : null);
      } catch {
        if (!cancelled) {
          setUsd(null);
          setUsd24hChange(null);
          setMarketCapUsd(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    const id = window.setInterval(() => void load(), pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pollMs]);

  return { usd, usd24hChange, marketCapUsd, loading };
}

export function fmtUsd(n: number | null | undefined, digits = 2): string {
  if (n == null || Number.isNaN(n)) return "—";
  return (
    "$" +
    n.toLocaleString(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
  );
}

export function fmtUsdCompact(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return fmtUsd(n, 0);
}
