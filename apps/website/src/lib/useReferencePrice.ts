import { useEffect, useState } from "react";

/** Reference USD index (CoinGecko ethereum) — UI label uses native symbol; not an on-chain ECNA oracle. */
export type RefPrice = {
  usd: number | null;
  usd24hChange: number | null;
  marketCapUsd: number | null;
  loading: boolean;
};

export function useReferencePrice(pollMs = 120_000): RefPrice {
  const [usd, setUsd] = useState<number | null>(null);
  const [usd24hChange, setUsd24hChange] = useState<number | null>(null);
  const [marketCapUsd, setMarketCapUsd] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const url =
          "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true&include_market_cap=true";
        const r = await fetch(url);
        if (!r.ok) throw new Error(String(r.status));
        const j = (await r.json()) as {
          ethereum?: { usd?: number; usd_24h_change?: number; usd_market_cap?: number };
        };
        if (cancelled) return;
        const e = j.ethereum;
        setUsd(typeof e?.usd === "number" ? e.usd : null);
        setUsd24hChange(typeof e?.usd_24h_change === "number" ? e.usd_24h_change : null);
        setMarketCapUsd(typeof e?.usd_market_cap === "number" ? e.usd_market_cap : null);
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
