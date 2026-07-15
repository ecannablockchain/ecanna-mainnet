/** First top-level `contract Foo` in Solidity (skips `library` / comments heuristically). */
export function extractContractNameFromSource(solidity: string): string | null {
  if (!solidity.trim()) return null;
  const cleaned = solidity.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const re = /(?:^|\n)\s*(?:abstract\s+)?contract\s+([A-Za-z_][A-Za-z0-9_]*)\b/;
  const m = cleaned.match(re);
  return m?.[1] ?? null;
}

/** Hardhat artifact: `{ "contractName": "MyToken", "abi": ... }` */
export function extractContractNameFromAbiField(abiJson: string): string | null {
  const t = abiJson.trim();
  if (!t.startsWith("{")) return null;
  try {
    const o = JSON.parse(t) as { contractName?: string };
    if (typeof o.contractName === "string" && o.contractName.trim()) return o.contractName.trim();
  } catch {
    return null;
  }
  return null;
}
