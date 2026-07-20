import { ethers } from "ethers";

export type AbiFunctionJson = {
  type: "function";
  name: string;
  inputs: { name: string; type: string; internalType?: string }[];
  outputs?: { name: string; type: string; internalType?: string }[];
  stateMutability: string;
};

/** Accept raw Hardhat artifact `{ "abi": [...] }`, a bare array, or JSON string with whitespace. */
export function parseAbiToArray(abiJson: string): unknown[] {
  const t = abiJson.trim();
  if (!t) return [];
  try {
    const parsed: unknown = JSON.parse(t);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as { abi?: unknown }).abi)) {
      return (parsed as { abi: unknown[] }).abi;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Normalize legacy ABI entries that only set `constant` / `payable`
 * (common in older explorer pastes) into modern `stateMutability`.
 * Also drops malformed items so ethers.Contract does not throw.
 */
export function normalizeAbiItems(items: unknown[]): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const raw = { ...(item as Record<string, unknown>) };
    const t = typeof raw.type === "string" ? raw.type : "";
    if (t === "function") {
      let sm =
        typeof raw.stateMutability === "string" ? raw.stateMutability.trim().toLowerCase() : "";
      if (!sm) {
        if (raw.constant === true) sm = "view";
        else if (raw.payable === true) sm = "payable";
        else sm = "nonpayable";
      }
      raw.stateMutability = sm;
      raw.constant = sm === "view" || sm === "pure";
      raw.payable = sm === "payable";
      if (typeof raw.name !== "string" || !raw.name) continue;
      if (!Array.isArray(raw.inputs)) raw.inputs = [];
      if (!Array.isArray(raw.outputs)) raw.outputs = [];
    }
    out.push(raw);
  }
  return out;
}

/** Stringify ABI array only — required for `new Contract(..., abi)` when users paste full artifact JSON. */
export function getNormalizedAbiJson(abiJson: string): string {
  return JSON.stringify(normalizeAbiItems(parseAbiToArray(abiJson)));
}

function normalizeFunctionItem(raw: Record<string, unknown>): AbiFunctionJson | null {
  if (raw.type !== "function" || typeof raw.name !== "string") return null;
  const inputsRaw = raw.inputs;
  const inputs: AbiFunctionJson["inputs"] = Array.isArray(inputsRaw)
    ? (inputsRaw as { name?: string; type?: string }[]).map((i, idx) => ({
        name: typeof i.name === "string" && i.name ? i.name : `arg${idx}`,
        type: typeof i.type === "string" ? i.type : "bytes32",
      }))
    : [];

  const outputsRaw = raw.outputs;
  const outputs: AbiFunctionJson["outputs"] = Array.isArray(outputsRaw)
    ? (outputsRaw as { name?: string; type?: string }[]).map((o, idx) => ({
        name: typeof o.name === "string" && o.name ? o.name : `out${idx}`,
        type: typeof o.type === "string" ? o.type : "bytes32",
      }))
    : [];

  let sm = typeof raw.stateMutability === "string" ? raw.stateMutability.trim().toLowerCase() : "";
  if (!sm) {
    if (raw.constant === true) sm = "view";
    else if (raw.payable === true) sm = "payable";
    else sm = "nonpayable";
  }

  return {
    type: "function",
    name: raw.name,
    inputs,
    outputs,
    stateMutability: sm,
  };
}

export function listAbiFunctions(abiJson: string): AbiFunctionJson[] {
  const abi = normalizeAbiItems(parseAbiToArray(abiJson));
  const out: AbiFunctionJson[] = [];
  for (const item of abi) {
    const fn = normalizeFunctionItem(item);
    if (fn) out.push(fn);
  }
  return out;
}

export function functionSignature(fn: AbiFunctionJson): string {
  return `${fn.name}(${fn.inputs.map((i) => i.type).join(",")})`;
}

/** 4-byte selector like Etherscan: `0x70a08231` */
export function functionSelector(fn: AbiFunctionJson): string {
  try {
    return ethers.id(functionSignature(fn)).slice(0, 10);
  } catch {
    return "";
  }
}

/** Parse one argument from explorer text field → ethers call value */
export function parseAbiValue(type: string, raw: string): unknown {
  const v = raw.trim();
  const t = type.trim();

  if (t === "bool") {
    if (v !== "true" && v !== "false" && v !== "1" && v !== "0") throw new Error(`bool: got "${raw}"`);
    return v === "true" || v === "1";
  }
  if (t === "address") {
    if (!v) throw new Error("address required");
    return ethers.getAddress(v);
  }
  if (t === "string") return v;
  if (t.startsWith("uint") || t.startsWith("int")) {
    if (!v) throw new Error("integer required");
    return BigInt(v.startsWith("0x") ? v : v);
  }
  if (t === "bytes") {
    if (!v) throw new Error("bytes required");
    return v.startsWith("0x") ? v : ethers.hexlify(ethers.toUtf8Bytes(v));
  }
  if (t.startsWith("bytes") && t !== "bytes") {
    if (!v.startsWith("0x")) throw new Error("fixed bytes need 0x…");
    return v;
  }
  if (t.endsWith("[]")) {
    const inner = t.slice(0, -2);
    if (!v) return [];
    const arr = JSON.parse(v) as unknown[];
    if (!Array.isArray(arr)) throw new Error("Expected JSON array");
    return arr.map((x) => parseAbiValue(inner, String(x)));
  }
  if (t.startsWith("tuple") || t.includes("tuple")) {
    if (!v) throw new Error("tuple: paste JSON object/array");
    return JSON.parse(v);
  }

  throw new Error(`Unsupported Solidity type in UI: ${type}. Use standard types or JSON for tuple/array.`);
}

export function formatCallResult(r: unknown): string {
  if (r == null) return String(r);
  if (typeof r === "bigint") return r.toString();
  if (typeof r === "boolean" || typeof r === "string" || typeof r === "number") return String(r);
  try {
    return JSON.stringify(
      r,
      (_, x) => (typeof x === "bigint" ? x.toString() : x),
      2,
    );
  } catch {
    return String(r);
  }
}

export function inferSourceFileName(sourceCode: string, contractName: string): string {
  const m = sourceCode.match(/File\s+(\S+\.sol)/i) || sourceCode.match(/\/\/\s*File:\s*(\S+)/i);
  if (m?.[1]) return m[1].replace(/^[^\w]+/, "");
  const m2 = sourceCode.match(/contract\s+\w+/);
  if (m2) return `${contractName || "Contract"}.sol`;
  return `${contractName || "Contract"}.sol`;
}
