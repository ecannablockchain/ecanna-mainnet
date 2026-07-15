import { AbiCoder, ethers, getBytes } from "ethers";

/** Normalize to lowercase 0x-prefixed hex (or null if empty / invalid). */
export function normalizeHexOptional(raw: string | undefined | null): string | null {
  if (raw == null) return null;
  const t = String(raw).trim().replace(/\s+/g, "");
  if (!t) return null;
  const h = t.startsWith("0x") ? t : `0x${t}`;
  if (!/^0x[0-9a-fA-F]*$/.test(h) || h.length < 3) return null;
  return h.toLowerCase();
}

/**
 * If creation tx data starts with compiler bytecode, return ABI-encoded constructor tail (BscScan-style).
 */
export function splitConstructorArgsHex(
  creationTxInput: string,
  compilerCreationBytecode: string,
): string | null {
  const tx = normalizeHexOptional(creationTxInput);
  const bc = normalizeHexOptional(compilerCreationBytecode);
  if (!tx || !bc) return null;
  const txBody = tx.slice(2);
  const bcBody = bc.slice(2);
  if (txBody.length < bcBody.length) return null;
  if (txBody.slice(0, bcBody.length) !== bcBody) return null;
  const rest = txBody.slice(bcBody.length);
  return rest ? `0x${rest}` : "0x";
}

function argValueToString(v: unknown): string {
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "boolean") return v ? "true" : "false";
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) {
    return `[${v.map(argValueToString).join(", ")}]`;
  }
  try {
    return ethers.hexlify(ethers.getBytes(v as ethers.BytesLike));
  } catch {
    try {
      return JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x));
    } catch {
      return String(v);
    }
  }
}

export type ConstructorArgRow = { name: string; type: string; value: string };

export type ConstructorDecodeResult =
  | { kind: "empty" }
  | { kind: "no-constructor" }
  | { kind: "decoded"; rows: ConstructorArgRow[] }
  | { kind: "failed" };

/** Decode constructor tail using ABI `constructor` inputs. */
export function decodeConstructorArgs(abiJson: string, argsHex: string): ConstructorDecodeResult {
  const hex = normalizeHexOptional(argsHex);
  if (!hex || hex === "0x") return { kind: "empty" };
  let iface: ethers.Interface;
  try {
    iface = new ethers.Interface(JSON.parse(abiJson) as ethers.InterfaceAbi);
  } catch {
    return { kind: "failed" };
  }
  const inputs = iface.deploy.inputs;
  if (inputs.length === 0) return { kind: "no-constructor" };
  try {
    const decoded = AbiCoder.defaultAbiCoder().decode(inputs, getBytes(hex));
    const rows: ConstructorArgRow[] = inputs.map((inp, i) => ({
      name: inp.name && inp.name.length > 0 ? inp.name : `arg${i}`,
      type: inp.type,
      value: argValueToString(decoded[i]),
    }));
    return { kind: "decoded", rows };
  } catch {
    return { kind: "failed" };
  }
}
