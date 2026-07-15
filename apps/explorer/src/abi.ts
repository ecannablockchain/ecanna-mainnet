import { type Abi, parseAbi } from "viem";

export function parseAbiFlexible(raw: string): Abi | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const j = JSON.parse(t) as unknown;
    if (Array.isArray(j) && j.length > 0 && typeof j[0] === "string") {
      return parseAbi(j as string[]);
    }
    if (Array.isArray(j) && typeof j[0] === "object") {
      return j as Abi;
    }
    return null;
  } catch {
    return null;
  }
}
