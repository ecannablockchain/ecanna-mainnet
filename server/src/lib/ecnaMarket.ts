/**
 * Server-side ECNA/USDT ticker from Nexdax.
 * Browser cannot call api.nexdax.com directly (no CORS) — clients use GET /api/v1/market/ecna.
 *
 * // Deprecated client-side CoinGecko ETH placeholder:
 * // https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&...
 */
const NEXDAX_ECNA_TICKER = "https://api.nexdax.com/api/v1/ticker/24hr?symbol=ECNAUSDT";

/** Mainnet genesis supply (1 Crore) for reference market cap. */
const ECNA_GENESIS_SUPPLY = 10_000_000;

const CACHE_MS = 30_000;

export type EcnaMarketQuote = {
  symbol: string;
  usd: number;
  usd24hChange: number | null;
  marketCapUsd: number;
  lastPrice: number;
  highPrice: number | null;
  lowPrice: number | null;
  volume: number | null;
  quoteVolume: number | null;
  source: "nexdax";
  fetchedAt: string;
};

let cache: { at: number; data: EcnaMarketQuote } | null = null;

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function fetchEcnaMarketQuote(force = false): Promise<EcnaMarketQuote> {
  const now = Date.now();
  if (!force && cache && now - cache.at < CACHE_MS) {
    return cache.data;
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 12_000);
  let r: Response;
  try {
    r = await fetch(NEXDAX_ECNA_TICKER, {
      headers: { Accept: "application/json" },
      signal: ac.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!r.ok) {
    throw new Error(`Nexdax ticker HTTP ${r.status}`);
  }
  const j = (await r.json()) as Record<string, unknown>;
  const last = num(j.lastPrice);
  if (last == null) {
    throw new Error("Nexdax ticker missing lastPrice");
  }
  const changePct = num(j.priceChangePercent);
  const data: EcnaMarketQuote = {
    symbol: typeof j.symbol === "string" ? j.symbol : "ECNAUSDT",
    usd: last,
    usd24hChange: changePct,
    marketCapUsd: last * ECNA_GENESIS_SUPPLY,
    lastPrice: last,
    highPrice: num(j.highPrice),
    lowPrice: num(j.lowPrice),
    volume: num(j.volume),
    quoteVolume: num(j.quoteVolume),
    source: "nexdax",
    fetchedAt: new Date().toISOString(),
  };
  cache = { at: now, data };
  return data;
}
