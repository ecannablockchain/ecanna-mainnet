import type { Request, Response } from "express";
import { ethers } from "ethers";
import { prisma } from "../lib/prisma.js";
import { provider } from "../lib/chain.js";
import {
  assertBytecodeMatches,
  parseOptionalHexField,
} from "../lib/verifyBytecode.js";

/**
 * Strict verification: bytecode must match on-chain code.
 * Once verified, address cannot be updated or re-verified.
 */
export async function verifyContractHandler(req: Request, res: Response) {
  const body = req.body as Record<string, string>;
  const address = (body.contractaddress || body.address || "").toLowerCase();
  const contractName = body.contractname || body.ContractName || body.contractName || "Contract";
  const compilerVersion = body.compilerversion || body.compilerVersion || "0.8.24";
  const sourceCode = body.sourceCode || body.SourceCode || "";
  const abiRaw = body.abi || body.ABI || "[]";
  const optimization = (body.optimizationUsed || body.optimization || "0") === "1";
  const runs = parseInt(body.runs || body.Runs || "200", 10);
  const compiledRuntime = (body.compiledRuntimeBytecode || body.runtimeBytecode || "").trim();
  const evmVersion = (body.evmVersion || body.EvmVersion || "shanghai").trim() || "shanghai";
  const compilerKind =
    (body.compilerKind || body.compilerType || body.CompilerType || "solidity-single-file").trim() ||
    "solidity-single-file";
  const openSourceLicense =
    (body.openSourceLicense || body.licenseType || body.LicenseType || "MIT").trim() || "MIT";

  if (!address || !ethers.isAddress(address)) {
    return res.status(400).json({ status: "0", message: "Invalid address" });
  }
  if (!sourceCode.trim()) {
    return res.status(400).json({ status: "0", message: "Missing source code" });
  }

  const existing = await prisma.contractVerification.findUnique({ where: { address } });
  if (existing) {
    return res.status(400).json({
      status: "0",
      message:
        "Contract is already verified. Re-verification and source updates are not allowed. Contact support only for critical corrections.",
    });
  }

  let abiStr = abiRaw.trim();
  try {
    const parsed: unknown = JSON.parse(abiStr);
    let abiArr: unknown[];
    if (Array.isArray(parsed)) {
      abiArr = parsed;
    } else if (parsed && typeof parsed === "object" && Array.isArray((parsed as { abi?: unknown }).abi)) {
      abiArr = (parsed as { abi: unknown[] }).abi;
    } else {
      return res.status(400).json({ status: "0", message: "ABI must be a JSON array or { abi: [...] } artifact" });
    }
    if (abiArr.length === 0) {
      return res.status(400).json({
        status: "0",
        message: "ABI is empty. Paste the abi array from your compiler artifacts.",
      });
    }
    abiStr = JSON.stringify(abiArr);
  } catch {
    return res.status(400).json({ status: "0", message: "Invalid ABI JSON" });
  }

  const creationTxInput = parseOptionalHexField(
    body.creationTxInput ?? body.creationtxinput ?? body.contractCreationCodeInput,
  );
  if (creationTxInput === "invalid") {
    return res.status(400).json({ status: "0", message: "Invalid creationTxInput hex" });
  }
  const compilerCreationBytecode = parseOptionalHexField(
    body.compilerCreationBytecode ?? body.compilerBytecode ?? body.bytecodeObject ?? body.creationBytecodeObject,
  );
  if (compilerCreationBytecode === "invalid") {
    return res.status(400).json({ status: "0", message: "Invalid compilerCreationBytecode hex" });
  }

  if (!compiledRuntime.trim() && !compilerCreationBytecode) {
    return res.status(400).json({
      status: "0",
      message:
        "Bytecode proof required. Paste compiler bytecode (artifacts → bytecode) and creation tx input, or deployedBytecode from compile output.",
    });
  }

  if (evmVersion === "cancun" || evmVersion === "prague") {
    return res.status(400).json({
      status: "0",
      message: `EVM version "${evmVersion}" is not supported on ECNA Clique. Use shanghai (PUSH0 / modern Solidity) or paris.`,
    });
  }

  try {
    const code = await provider.getCode(address);
    if (!code || code === "0x") {
      return res.status(400).json({ status: "0", message: "Not a contract on this network" });
    }

    const { exactBytecodeMatch } = await assertBytecodeMatches(address, {
      compilerCreationBytecode,
      compiledRuntimeBytecode: compiledRuntime || undefined,
      creationTxInput,
    });

    await prisma.contractVerification.create({
      data: {
        address,
        contractName,
        compilerKind,
        compilerVersion,
        optimization,
        runs,
        evmVersion,
        exactBytecodeMatch,
        openSourceLicense,
        sourceCode,
        abi: abiStr,
        ...(creationTxInput !== undefined ? { creationTxInput } : {}),
        ...(compilerCreationBytecode !== undefined ? { compilerCreationBytecode } : {}),
      },
    });

    return res.json({ status: "1", message: "OK", result: address });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Verification failed";
    return res.status(400).json({ status: "0", message: msg });
  }
}
