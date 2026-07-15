function formatUnitsWei(wei: bigint, decimals: number): string {
  const base = 10n ** BigInt(decimals);
  const whole = wei / base;
  const frac = wei % base;
  if (frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${whole}.${fracStr}`;
}

export function shortAddr(a: string, n = 6): string {
  if (!a || a.length < 12) return a;
  return `${a.slice(0, n + 2)}…${a.slice(-4)}`;
}

export function shortHash(h: string, n = 8): string {
  if (!h || h.length < 20) return h;
  return `${h.slice(0, n + 2)}…${h.slice(-6)}`;
}

/** Typical ECNA block time (Geth Clique / Anvil / Hardhat interval). */
export const DEFAULT_BLOCK_TIME_SEC = 3;

function formatSecondsAgo(s: number): string {
  const n = Math.max(0, Math.floor(s));
  if (n < 60) return `${n} secs ago`;
  if (n < 3600) return `${Math.floor(n / 60)} mins ago`;
  if (n < 86400) return `${Math.floor(n / 3600)} hrs ago`;
  return `${Math.floor(n / 86400)} days ago`;
}

export function age(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const s = Math.max(0, (Date.now() - t) / 1000);
  return formatSecondsAgo(s);
}

/**
 * Age for the chain tip — caps display at ~one block interval so dev nodes whose
 * block timestamps lag wall clock (Hardhat) still show “3 secs ago” at the head.
 */
export function ageChainTip(
  tipIso: string | null | undefined,
  blockTimeSec = DEFAULT_BLOCK_TIME_SEC,
): string {
  if (!tipIso) return "—";
  const tip = new Date(tipIso).getTime();
  if (Number.isNaN(tip)) return "—";
  const tipWallAge = Math.floor((Date.now() - tip) / 1000);
  const slot = Math.min(Math.max(1, blockTimeSec), Math.max(1, tipWallAge));
  return formatSecondsAgo(slot);
}

/**
 * Age for rows in the home “Latest Blocks” list — tip-relative spacing (3, 6, 9 …)
 * while the tip row still ticks 1…blockTime between new blocks.
 */
export function ageBlockInFeed(
  iso: string | null | undefined,
  tipIso: string | null | undefined,
  blockTimeSec = DEFAULT_BLOCK_TIME_SEC,
): string {
  if (!iso || !tipIso) return age(iso);
  const tip = new Date(tipIso).getTime();
  const t = new Date(iso).getTime();
  if (Number.isNaN(tip) || Number.isNaN(t)) return "—";
  const behindTip = Math.max(0, Math.round((tip - t) / 1000));
  const tipWallAge = Math.floor((Date.now() - tip) / 1000);
  const tipSlot = Math.min(Math.max(1, blockTimeSec), Math.max(1, tipWallAge));
  return formatSecondsAgo(behindTip + tipSlot);
}

/** Thousand separators for integer strings (no precision loss). */
function withCommas(intStr: string): string {
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Default ticker for native (gas) currency in the explorer UI. */
export const DEFAULT_NATIVE_SYMBOL = "ECNA";

/**
 * Native chain currency (18 decimals). Uses bigint — safe for huge balances on local or main networks.
 */
export function fmtNative(wei: string, symbol = DEFAULT_NATIVE_SYMBOL): string {
  try {
    const w = BigInt(wei);
    const base = 10n ** 18n;
    const whole = w / base;
    const frac = w % base;
    const wholeFmt = withCommas(whole.toString());
    if (frac === 0n) return `${wholeFmt} ${symbol}`;
    const fracStr = frac.toString().padStart(18, "0").replace(/0+$/, "");
    return `${wholeFmt}.${fracStr} ${symbol}`;
  } catch {
    return wei;
  }
}

export function fmtToken(raw: string, decimals = 18, symbol = "ECNA"): string {
  try {
    const w = BigInt(raw);
    const base = 10n ** BigInt(decimals);
    const whole = w / base;
    const frac = w % base;
    const wholeFmt = withCommas(whole.toString());
    if (frac === 0n) return `${wholeFmt} ${symbol}`;
    const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
    return `${wholeFmt}.${fracStr} ${symbol}`;
  } catch {
    return raw;
  }
}

export function fmtFee(feeWei: string | null | undefined): string {
  if (!feeWei) return "—";
  try {
    return formatUnitsWei(BigInt(feeWei), 18);
  } catch {
    return "—";
  }
}

/** Fee in native currency with ticker (matches `fmtNative` labeling). */
export function fmtFeeNative(feeWei: string | null | undefined, symbol = DEFAULT_NATIVE_SYMBOL): string {
  const n = fmtFee(feeWei);
  if (n === "—") return "—";
  return `${n} ${symbol}`;
}

export function fmtGwei(g: number | null | undefined): string {
  if (g == null || Number.isNaN(g)) return "—";
  if (g < 0.0001) return g.toExponential(2);
  return g.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

/** Live gas from RPC (Gwei) — matches small values like 0.1 Gwei on L2s / local. */
export function formatLiveGasGwei(g: number | null | undefined): string {
  if (g == null || Number.isNaN(g)) return "—";
  if (g === 0) return "0";
  if (g < 1e-6) return g.toExponential(2);
  if (g < 1) return g.toLocaleString(undefined, { maximumFractionDigits: 6, minimumFractionDigits: 0 });
  return g.toLocaleString(undefined, { maximumFractionDigits: 4 });
}
