import type { Request, Response } from "express";
import { ethers } from "ethers";
import { prisma } from "../lib/prisma.js";
import { provider } from "../lib/chain.js";
import { compileSoliditySource } from "../lib/solcCompile.js";
import {
  assertBytecodeMatches,
  parseOptionalHexField,
} from "../lib/verifyBytecode.js";

function parseAbiJson(abiRaw: string): unknown[] | null {
  const t = abiRaw.trim();
  if (!t || t === "[]") return null;
  try {
    const parsed: unknown = JSON.parse(t);
    if (Array.isArray(parsed)) return parsed.length ? parsed : null;
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as { abi?: unknown }).abi)) {
      const arr = (parsed as { abi: unknown[] }).abi;
      return arr.length ? arr : null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Industry-standard verify: paste source → server compiles → ABI + bytecode auto.
 * Manual ABI still accepted as override. Once verified, source is locked (ABI-only fix via abiOnly=1).
 */
export async function verifyContractHandler(req: Request, res: Response) {
  const body = req.body as Record<string, string>;
  const address = (body.contractaddress || body.address || "").toLowerCase();
  let contractName = body.contractname || body.ContractName || body.contractName || "Contract";
  const compilerVersion = body.compilerversion || body.compilerVersion || "v0.8.28+commit.7893614a";
  const sourceCode = body.sourceCode || body.SourceCode || "";
  const abiRaw = body.abi || body.ABI || "[]";
  const optimization = (body.optimizationUsed || body.optimization || "0") === "1";
  const runs = parseInt(body.runs || body.Runs || "200", 10);
  let compiledRuntime = (body.compiledRuntimeBytecode || body.runtimeBytecode || "").trim();
  const evmVersion = (body.evmVersion || body.EvmVersion || "london").trim() || "london";
  const compilerKind =
    (body.compilerKind || body.compilerType || body.CompilerType || "solidity-single-file").trim() ||
    "solidity-single-file";
  const openSourceLicense =
    (body.openSourceLicense || body.licenseType || body.LicenseType || "MIT").trim() || "MIT";
  const forceAuto =
    String(body.autoCompile || body.autoAbi || "1").trim() !== "0" &&
    String(body.autoCompile || "").toLowerCase() !== "false";

  if (!address || !ethers.isAddress(address)) {
    return res.status(400).json({ status: "0", message: "Invalid address" });
  }

  const existing = await prisma.contractVerification.findUnique({ where: { address } });
  const abiOnly =
    String(body.abiOnly || body.updateAbi || body.ABIOnly || "").trim() === "1" ||
    String(body.abiOnly || body.updateAbi || "").toLowerCase() === "true";

  let abiArr = parseAbiJson(abiRaw);
  let abiStr = abiArr ? JSON.stringify(abiArr) : "";
  let compilerCreationFromCompile: string | undefined;
  let compileWarnings: string[] = [];

  /** Critical correction: replace stored ABI only (no schema change; source stays locked). */
  if (existing && abiOnly) {
    // Allow empty body ABI + autoCompile so ops can fix old wrong suggested ABIs from source.
    if (!abiArr && (forceAuto || true)) {
      try {
        const compiled = await compileSoliditySource({
          sourceCode: existing.sourceCode,
          contractName:
            contractName && contractName !== "Contract" && contractName !== "Context"
              ? contractName
              : undefined,
          compilerVersion: existing.compilerVersion || compilerVersion,
          optimization: existing.optimization,
          runs: existing.runs,
          evmVersion: existing.evmVersion || evmVersion,
        });
        abiArr = compiled.abi;
        abiStr = JSON.stringify(compiled.abi);
        if (compiled.contractName) contractName = compiled.contractName;
        compileWarnings = compiled.warnings;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return res.status(400).json({
          status: "0",
          message: `abiOnly auto-compile failed: ${msg.slice(0, 2000)}`,
        });
      }
    }
    if (!abiArr) {
      return res.status(400).json({ status: "0", message: "ABI required for abiOnly update" });
    }
    const nameUpdate =
      contractName &&
      contractName !== "Contract" &&
      contractName !== existing.contractName
        ? { contractName }
        : {};
    await prisma.contractVerification.update({
      where: { address },
      data: { abi: abiStr, ...nameUpdate },
    });
    return res.json({
      status: "1",
      message: "OK",
      result: address,
      updated: "abi",
      contractName: nameUpdate.contractName || existing.contractName,
      warnings: compileWarnings,
    });
  }

  if (existing) {
    return res.status(400).json({
      status: "0",
      message:
        "Contract is already verified. Re-verification and source updates are not allowed. To fix a wrong ABI only, resubmit with abiOnly=1 (source unchanged).",
    });
  }

  if (!sourceCode.trim()) {
    return res.status(400).json({ status: "0", message: "Missing source code" });
  }

  if (evmVersion === "shanghai" || evmVersion === "cancun" || evmVersion === "prague") {
    return res.status(400).json({
      status: "0",
      message: `EVM version "${evmVersion}" is not supported on ECNA Clique (stock Geth). Use london (or paris/berlin).`,
    });
  }

  // Etherscan-style: compile source → ABI (+ bytecode proof) automatically when ABI empty / autoCompile
  const shouldCompile = forceAuto || !abiArr;
  if (shouldCompile) {
    try {
      const compiled = await compileSoliditySource({
        sourceCode,
        contractName: contractName !== "Contract" ? contractName : undefined,
        compilerVersion,
        optimization,
        runs: Number.isFinite(runs) ? runs : 200,
        evmVersion,
      });
      abiArr = compiled.abi;
      abiStr = JSON.stringify(compiled.abi);
      if (compiled.contractName) contractName = compiled.contractName;
      compileWarnings = compiled.warnings;
      if (!compiledRuntime && compiled.deployedBytecode) {
        compiledRuntime = compiled.deployedBytecode;
      }
      if (compiled.creationBytecode) {
        compilerCreationFromCompile = compiled.creationBytecode;
      }
    } catch (e) {
      if (!abiArr) {
        const msg = e instanceof Error ? e.message : String(e);
        return res.status(400).json({
          status: "0",
          message: `Auto-compile failed (ABI could not be generated from source). ${msg}`,
        });
      }
      // Manual ABI present — continue without compile
    }
  }

  if (!abiArr || !abiStr) {
    return res.status(400).json({
      status: "0",
      message:
        "ABI is empty and auto-compile did not produce one. Paste Solidity source (or flattened source / Hardhat artifact JSON).",
    });
  }

  const creationTxInput = parseOptionalHexField(
    body.creationTxInput ?? body.creationtxinput ?? body.contractCreationCodeInput,
  );
  if (creationTxInput === "invalid") {
    return res.status(400).json({ status: "0", message: "Invalid creationTxInput hex" });
  }
  let compilerCreationBytecode = parseOptionalHexField(
    body.compilerCreationBytecode ?? body.compilerBytecode ?? body.bytecodeObject ?? body.creationBytecodeObject,
  );
  if (compilerCreationBytecode === "invalid") {
    return res.status(400).json({ status: "0", message: "Invalid compilerCreationBytecode hex" });
  }
  if (!compilerCreationBytecode && compilerCreationFromCompile) {
    compilerCreationBytecode = compilerCreationFromCompile;
  }

  if (!compiledRuntime.trim() && !compilerCreationBytecode) {
    return res.status(400).json({
      status: "0",
      message:
        "Bytecode proof required. Auto-compile did not yield bytecode — paste deployedBytecode / creation bytecode, or ensure compiler settings match the deployment (EVM london).",
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
        runs: Number.isFinite(runs) ? runs : 200,
        evmVersion,
        exactBytecodeMatch,
        openSourceLicense,
        sourceCode,
        abi: abiStr,
        ...(creationTxInput !== undefined ? { creationTxInput } : {}),
        ...(compilerCreationBytecode !== undefined && compilerCreationBytecode !== "invalid"
          ? { compilerCreationBytecode }
          : {}),
      },
    });

    return res.json({
      status: "1",
      message: "OK",
      result: address,
      contractName,
      abiAuto: shouldCompile,
      warnings: compileWarnings.slice(0, 5),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Verification failed";
    return res.status(400).json({ status: "0", message: msg });
  }
}
