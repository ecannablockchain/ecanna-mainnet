/** Number of parameters on the ABI `constructor`, or `null` if unparseable. */
export function abiConstructorInputCount(abiRaw: string): number | null {
  try {
    const t = abiRaw.trim();
    if (!t) return null;
    const parsed = JSON.parse(t) as unknown;
    let arr: unknown[] | null = null;
    if (Array.isArray(parsed)) arr = parsed;
    else if (parsed && typeof parsed === "object" && Array.isArray((parsed as { abi?: unknown[] }).abi)) {
      arr = (parsed as { abi: unknown[] }).abi;
    }
    if (!arr) return null;
    const ctor = arr.find(
      (x) => x && typeof x === "object" && (x as { type?: string }).type === "constructor",
    ) as { inputs?: unknown[] } | undefined;
    if (!ctor) return null;
    return ctor.inputs?.length ?? 0;
  } catch {
    return null;
  }
}
