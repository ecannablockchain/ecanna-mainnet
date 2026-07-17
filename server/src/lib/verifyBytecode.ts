import { ethers } from "ethers";
import { prisma } from "./prisma.js";
import { provider } from "./chain.js";
import { normalizeHexOptional } from "./contractBytecodeSections.js";

export function normalizeBytecode(hex: string): string {
  let h = hex.startsWith("0x") ? hex.slice(2) : hex;
  h = h.toLowerCase();
  if (h.length > 4) {
    const metaLen = parseInt(h.slice(-4), 16);
    if (!Number.isNaN(metaLen) && metaLen > 0 && metaLen < h.length) {
      h = h.slice(0, -metaLen * 2 - 4);
    }
  }
  return h;
}

export type BytecodeProofInput = {
  compilerCreationBytecode?: string | undefined | "invalid";
  compiledRuntimeBytecode?: string;
  creationTxInput?: string | undefined | "invalid";
};

/** Returns true when on-chain bytecode matches submitted compiler output. */
export async function assertBytecodeMatches(
  address: string,
  proof: BytecodeProofInput,
): Promise<{ exactBytecodeMatch: boolean }> {
  const deployedRaw = await provider.getCode(address);
  if (!deployedRaw || deployedRaw === "0x") {
    throw new Error("Not a contract on this network");
  }
  const deployedNorm = normalizeBytecode(deployedRaw);

  const compilerBc =
    proof.compilerCreationBytecode === "invalid"
      ? null
      : proof.compilerCreationBytecode
        ? normalizeBytecode(proof.compilerCreationBytecode)
        : null;

  let creationInput =
    proof.creationTxInput === "invalid"
      ? null
      : proof.creationTxInput
        ? normalizeBytecode(proof.creationTxInput)
        : null;

  if (!creationInput) {
    const row = await prisma.transaction.findFirst({
      where: { deployedContractAddress: address.toLowerCase() },
      orderBy: [{ blockNumber: "asc" }, { transactionIndex: "asc" }],
      select: { input: true },
    });
    if (row?.input && row.input !== "0x") {
      creationInput = normalizeBytecode(row.input);
    }
  }

  const runtimeRaw = proof.compiledRuntimeBytecode?.trim();
  const runtimeNorm = runtimeRaw ? normalizeBytecode(runtimeRaw) : null;

  if (compilerBc && creationInput) {
    if (!creationInput.startsWith(compilerBc)) {
      throw new Error(
        "Creation bytecode does not match the indexed deployment transaction. Recompile with the same EVM (london/paris) and optimizer settings as the deployment.",
      );
    }
    return { exactBytecodeMatch: true };
  }

  if (runtimeNorm) {
    if (!deployedNorm.includes(runtimeNorm) && deployedNorm !== runtimeNorm) {
      throw new Error(
        "Runtime bytecode mismatch. deployedBytecode must match on-chain code (same compiler version, EVM, optimization).",
      );
    }
    return { exactBytecodeMatch: true };
  }

  if (compilerBc) {
    const onChainCreation = await fetchCreationBytecodeFromChain(address);
    if (onChainCreation && onChainCreation.startsWith(compilerBc)) {
      return { exactBytecodeMatch: true };
    }
    throw new Error(
      "Provide creationTxInput from the deploy transaction, or compiledRuntimeBytecode from artifacts deployedBytecode.",
    );
  }

  throw new Error(
    "Bytecode proof required: paste compiler bytecode (artifacts bytecode field) and creation tx input, or deployedBytecode from compile output.",
  );
}

async function fetchCreationBytecodeFromChain(address: string): Promise<string | null> {
  const addr = address.toLowerCase();
  const row = await prisma.transaction.findFirst({
    where: { deployedContractAddress: addr },
    orderBy: [{ blockNumber: "asc" }],
    select: { input: true },
  });
  if (row?.input && row.input !== "0x") return normalizeBytecode(row.input);
  return null;
}

export function parseOptionalHexField(raw: string | undefined): string | undefined | "invalid" {
  if (raw == null) return undefined;
  const s = String(raw).trim();
  if (!s) return undefined;
  if (s.startsWith("{")) {
    try {
      const o = JSON.parse(s) as { bytecode?: unknown; object?: unknown };
      let inner: string | null = null;
      if (typeof o.object === "string") inner = o.object;
      else if (typeof o.bytecode === "string") inner = o.bytecode;
      else if (o.bytecode && typeof o.bytecode === "object" && o.bytecode !== null && "object" in o.bytecode) {
        const ob = (o.bytecode as { object?: string }).object;
        if (typeof ob === "string") inner = ob;
      }
      if (!inner) return "invalid";
      const n = normalizeHexOptional(inner);
      return n ?? "invalid";
    } catch {
      return "invalid";
    }
  }
  const n = normalizeHexOptional(s);
  return n ?? "invalid";
}

export async function resolveContractDeployer(contractAddress: string): Promise<string | null> {
  const addr = contractAddress.toLowerCase();
  if (!ethers.isAddress(addr)) return null;
  const row = await prisma.transaction.findFirst({
    where: { deployedContractAddress: addr },
    orderBy: [{ blockNumber: "asc" }, { transactionIndex: "asc" }],
    select: { from: true },
  });
  return row?.from?.toLowerCase() ?? null;
}
