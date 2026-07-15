import { ethers } from "ethers";
import type { FunctionFragment } from "ethers";
import type { PrismaClient } from "../generated/prisma/index.js";

const erc20CallIface = new ethers.Interface([
  "function transfer(address to, uint256 amount)",
  "function transferFrom(address from, address to, uint256 amount)",
  "function approve(address spender, uint256 amount)",
]);

export type DecodedArg = {
  name: string;
  type: string;
  value: string;
  displayValue?: string;
};

export type DecodedInput = {
  /** Short function name, e.g. `transfer` */
  name: string;
  /** Explorer-style line, e.g. `mint(address to, uint256 amount)` */
  functionDisplay: string;
  selector: string;
  args: DecodedArg[];
  /** 32-byte ABI words after the 4-byte selector (hex), like BscScan `[0]:` rows */
  rawParamWords: string[];
};

/** Split calldata after function selector into 32-byte (64 hex char) words. */
function calldataWordsAfterSelector(input: string): string[] {
  const norm = input.startsWith("0x") ? input.slice(2) : input;
  if (norm.length <= 8) return [];
  const body = norm.slice(8);
  const words: string[] = [];
  for (let i = 0; i < body.length; i += 64) {
    const w = body.slice(i, i + 64);
    if (w.length === 0) break;
    words.push(`0x${w.toLowerCase()}`);
  }
  return words;
}

function formatFunctionDisplay(fragment: FunctionFragment): string {
  const fname = fragment.name;
  const parts = fragment.inputs.map((inp, i) => {
    const n = inp.name && String(inp.name).length > 0 ? String(inp.name) : `arg${i}`;
    return `${inp.type} ${n}`;
  });
  return `${fname}(${parts.join(", ")})`;
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

function buildDecodedInputFromParsed(
  parsed: ethers.TransactionDescription,
  inputHex: string,
  meta: { decimals: number; symbol: string },
): DecodedInput {
  const fname = parsed.name;
  const functionDisplay = formatFunctionDisplay(parsed.fragment);
  const rawParamWords = calldataWordsAfterSelector(inputHex);
  const args: DecodedArg[] = parsed.fragment.inputs.map((inp, i) => {
    const v = parsed.args[i];
    const valStr = argValueToString(v);
    let displayValue: string | undefined;
    if (typeof v === "bigint" && inp.type.startsWith("uint")) {
      displayValue = uint256Display(fname, i, v, meta) ?? valStr;
    } else if (inp.type === "address") {
      displayValue = String(v).toLowerCase();
    }
    return {
      name: inp.name && inp.name.length > 0 ? inp.name : `arg${i}`,
      type: inp.type,
      value: valStr,
      displayValue,
    };
  });
  return {
    name: fname,
    functionDisplay,
    selector: parsed.selector.toLowerCase(),
    args,
    rawParamWords,
  };
}

function maybeActionSummary(
  parsed: ethers.TransactionDescription,
  meta: { decimals: number; symbol: string },
): string | null {
  const fname = parsed.name;
  if (fname === "transfer" && typeof parsed.args[1] === "bigint") {
    const recv = String(parsed.args[0]).toLowerCase();
    return `Transfer ${ethers.formatUnits(parsed.args[1], meta.decimals)} ${meta.symbol} to ${recv}`;
  }
  if (fname === "transferFrom" && typeof parsed.args[2] === "bigint") {
    return `Transfer ${ethers.formatUnits(parsed.args[2], meta.decimals)} ${meta.symbol} (transferFrom)`;
  }
  if (fname === "approve" && typeof parsed.args[1] === "bigint") {
    return `Approve ${ethers.formatUnits(parsed.args[1], meta.decimals)} ${meta.symbol}`;
  }
  return null;
}

/** On-chain ERC-20 metadata for formatting (used by tx detail + address holdings). */
export async function fetchTokenMeta(
  provider: ethers.Provider,
  addr: string,
): Promise<{ decimals: number; symbol: string }> {
  const c = new ethers.Contract(
    addr,
    [
      "function decimals() view returns (uint8)",
      "function symbol() view returns (string)",
    ],
    provider,
  );
  let decimals = 18;
  let symbol = "tokens";
  try {
    const d = await c.decimals();
    const n = Number(d);
    if (Number.isFinite(n) && n >= 0 && n <= 36) decimals = n;
  } catch {
    /* non-ERC20 or revert */
  }
  try {
    const s = await c.symbol();
    symbol = typeof s === "string" ? s : String(s);
  } catch {
    try {
      const c32 = new ethers.Contract(addr, ["function symbol() view returns (bytes32)"], provider);
      const b32 = await c32.symbol();
      symbol = ethers.decodeBytes32String(b32 as ethers.BytesLike).trim();
    } catch {
      /* */
    }
  }
  return { decimals, symbol: symbol.trim() };
}

function uint256Display(
  fragmentName: string,
  argIndex: number,
  raw: bigint,
  meta: { decimals: number; symbol: string },
): string | undefined {
  if (fragmentName === "transfer" && argIndex === 1) {
    return `${ethers.formatUnits(raw, meta.decimals)} ${meta.symbol}`;
  }
  if (fragmentName === "transferFrom" && argIndex === 2) {
    return `${ethers.formatUnits(raw, meta.decimals)} ${meta.symbol}`;
  }
  if (fragmentName === "approve" && argIndex === 1) {
    return `${ethers.formatUnits(raw, meta.decimals)} ${meta.symbol}`;
  }
  return undefined;
}

/**
 * Attach gas limit, indexed token transfers (formatted with on-chain decimals), decoded calldata, and a one-line action summary.
 * Uses stored verification ABI when present; otherwise falls back to standard ERC-20 calldata shapes.
 */
export async function enrichTransactionDetail(
  prisma: PrismaClient,
  provider: ethers.Provider,
  hash: string,
  base: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const h = hash.toLowerCase();
  const txRpc = await provider.getTransaction(h).catch(() => null);
  const gasLimit = txRpc?.gasLimit != null ? txRpc.gasLimit.toString() : null;

  const logs = await prisma.tokenTransfer.findMany({
    where: { txHash: h },
    orderBy: { logIndex: "asc" },
  });

  const tokenAddrs = [...new Set(logs.map((l) => l.token.toLowerCase()))];
  const metaMap = new Map<string, { decimals: number; symbol: string }>();
  await Promise.all(
    tokenAddrs.map(async (a) => {
      metaMap.set(a, await fetchTokenMeta(provider, a));
    }),
  );

  const tokenTransfers = logs.map((l) => {
    const m = metaMap.get(l.token.toLowerCase()) ?? { decimals: 18, symbol: "???" };
    const valueFormatted = ethers.formatUnits(l.value, m.decimals);
    return {
      token: l.token,
      from: l.from,
      to: l.to,
      value: l.value,
      valueFormatted,
      symbol: m.symbol,
      decimals: m.decimals,
    };
  });

  const to = typeof base.to === "string" ? base.to.toLowerCase() : null;
  const input = typeof base.input === "string" ? base.input : "0x";

  let decodedInput: DecodedInput | null = null;
  let actionSummary: string | null = null;

  if (to && input && input !== "0x" && input.length >= 10) {
    let meta = metaMap.get(to);
    if (!meta) {
      meta = await fetchTokenMeta(provider, to);
      metaMap.set(to, meta);
    }

    let parsedTx: ethers.TransactionDescription | null = null;

    const ver = await prisma.contractVerification.findUnique({
      where: { address: to },
      select: { abi: true },
    });
    if (ver?.abi) {
      try {
        const arr = JSON.parse(ver.abi) as unknown;
        if (Array.isArray(arr) && arr.length > 0) {
          const iface = new ethers.Interface(arr as ethers.InterfaceAbi);
          parsedTx = iface.parseTransaction({ data: input });
        }
      } catch {
        /* bad ABI or selector not in contract */
      }
    }

    if (!parsedTx) {
      try {
        parsedTx = erc20CallIface.parseTransaction({ data: input });
      } catch {
        /* not transfer / approve */
      }
    }

    if (parsedTx) {
      decodedInput = buildDecodedInputFromParsed(parsedTx, input, meta);
      actionSummary = maybeActionSummary(parsedTx, meta);
    }
  }

  return {
    ...base,
    gasLimit,
    tokenTransfers,
    decodedInput,
    actionSummary,
  };
}
