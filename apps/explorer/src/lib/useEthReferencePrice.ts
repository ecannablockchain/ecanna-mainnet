import { useEffect, useState } from "react";

/**
 * Live ECNA/USDT spot from Nexdax ticker (poll — no webhooks yet).
 * // Old placeholder (wrong for ECNA — was ETH):
 * // https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true&include_market_cap=true
 */
const NEXDAX_ECNA_TICKER = "https://api.nexdax.com/api/v1/ticker/24hr?symbol=ECNAUSDT";

/** Mainnet genesis supply (1 Crore) — used for reference market cap until exchange provides one. */
const ECNA_GENESIS_SUPPLY = 10_000_000;

export type EthRefPrice = {
  usd: number | null;
  usd24hChange: number | null;
  marketCapUsd: number | null;
  loading: boolean;
};

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function useEthReferencePrice(pollMs = 60_000): EthRefPrice {
  const [usd, setUsd] = useState<number | null>(null);
  const [usd24hChange, setUsd24hChange] = useState<number | null>(null);
  const [marketCapUsd, setMarketCapUsd] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch(NEXDAX_ECNA_TICKER);
        if (!r.ok) throw new Error(String(r.status));
        const j = (await r.json()) as Record<string, unknown>;
        if (cancelled) return;
        const last = num(j.lastPrice);
        const changePct = num(j.priceChangePercent);
        setUsd(last);
        setUsd24hChange(changePct);
        setMarketCapUsd(last != null ? last * ECNA_GENESIS_SUPPLY : null);
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
