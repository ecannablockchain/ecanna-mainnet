export function fmtGwei(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (n === 0) return "0";
  if (n < 0.01) return n.toExponential(2);
  if (n < 10) return n.toFixed(4).replace(/\.?0+$/, "");
  return n.toFixed(2);
}

export function fmtNum(n: string | number | null | undefined): string {
  if (n == null) return "—";
  const v = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString();
}

export function fmtBlockTime(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return "~3 s";
  if (sec < 10) return `~${sec.toFixed(2)} s`;
  return `~${Math.round(sec)} s`;
}

/** Fee in native units from gwei and gas units. */
export function feeNativeFromGwei(gasGwei: number, gasUnits: number): number {
  return (gasGwei * gasUnits) / 1e9;
}

export function fmtNativeAmount(amount: number, symbol: string, digits = 6): string {
  if (!Number.isFinite(amount)) return "—";
  if (amount === 0) return `0 ${symbol}`;
  if (amount < 0.000001) return `<0.000001 ${symbol}`;
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: digits })} ${symbol}`;
}
