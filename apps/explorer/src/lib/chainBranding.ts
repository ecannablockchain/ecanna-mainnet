/**
 * User-facing chain labels. Override with Vite env in each app.
 * Native: Full Name = E Canna, Short Name = ECNA, Supply = 1 Crore (10,000,000).
 */
export const NATIVE_SYMBOL = (import.meta.env.VITE_NATIVE_SYMBOL as string | undefined)?.trim() || "ECNA";
export const NATIVE_NAME = (import.meta.env.VITE_NATIVE_NAME as string | undefined)?.trim() || "E Canna";
export const CHAIN_DISPLAY_NAME =
  (import.meta.env.VITE_CHAIN_NAME as string | undefined)?.trim() || "E Canna Mainnet";

/** Fungible-token standard label for this chain, e.g. `ECNA-20`. */
export function token20Label(nativeSymbol?: string | null): string {
  const s = (nativeSymbol?.trim() || NATIVE_SYMBOL).trim();
  return `${s}-20`;
}
