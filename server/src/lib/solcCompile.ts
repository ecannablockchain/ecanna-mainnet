import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type CompileResult = {
  abi: unknown[];
  deployedBytecode: string;
  creationBytecode: string;
  contractName: string;
  warnings: string[];
};

type SolcLike = {
  compile: (input: string, findImports?: { import: (path: string) => { contents: string } | { error: string } }) => string;
  loadRemoteVersion?: (
    version: string,
    cb: (err: Error | null, solc: SolcLike) => void,
  ) => void;
};

function loadSolcLocal(): SolcLike {
  return require("solc") as SolcLike;
}

function loadSolcVersion(version: string): Promise<SolcLike> {
  const solc = loadSolcLocal();
  const v = version.startsWith("v") ? version : `v${version}`;
  const loadRemote = solc.loadRemoteVersion;
  if (typeof loadRemote !== "function") {
    return Promise.resolve(solc);
  }
  return new Promise((resolve) => {
    loadRemote(v, (err, remote) => {
      if (err || !remote) {
        // Fall back to bundled solc if remote snapshot unavailable
        resolve(solc);
        return;
      }
      resolve(remote);
    });
  });
}

/** Resolve @openzeppelin/* and relative imports from server node_modules. */
function findImports(importPath: string): { contents: string } | { error: string } {
  const candidates: string[] = [];
  if (importPath.startsWith("@openzeppelin/")) {
    candidates.push(path.join(process.cwd(), "node_modules", importPath));
    candidates.push(path.join(__dirname, "../../node_modules", importPath));
    candidates.push(path.join(__dirname, "../../../node_modules", importPath));
  } else if (!importPath.startsWith("http") && !path.isAbsolute(importPath)) {
    candidates.push(path.join(process.cwd(), importPath));
  }
  for (const p of candidates) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        return { contents: fs.readFileSync(p, "utf8") };
      }
    } catch {
      /* continue */
    }
  }
  return {
    error: `File not found: ${importPath}. Flatten the source (Remix Flatten) or include OpenZeppelin imports.`,
  };
}

function pickContract(
  contracts: Record<string, Record<string, { abi?: unknown[]; evm?: { bytecode?: { object?: string }; deployedBytecode?: { object?: string } } }>>,
  preferredName?: string,
): { file: string; name: string; data: { abi?: unknown[]; evm?: { bytecode?: { object?: string }; deployedBytecode?: { object?: string } } } } | null {
  const preferred = preferredName?.trim();
  if (preferred) {
    for (const [file, map] of Object.entries(contracts)) {
      if (map[preferred]) return { file, name: preferred, data: map[preferred] };
    }
  }
  // Prefer non-abstract / contracts that have bytecode (skip interfaces/libraries with empty bytecode)
  for (const [file, map] of Object.entries(contracts)) {
    for (const [name, data] of Object.entries(map)) {
      const deployed = data.evm?.deployedBytecode?.object || "";
      if (deployed && deployed !== "0x") return { file, name, data };
    }
  }
  const file = Object.keys(contracts)[0];
  if (!file) return null;
  const name = Object.keys(contracts[file] || {})[0];
  if (!name) return null;
  return { file, name, data: contracts[file][name] };
}

/**
 * Compile Solidity like Etherscan: source + settings → ABI + bytecode.
 * Supports single-file sources that import @openzeppelin/contracts (installed on API host).
 */
export async function compileSoliditySource(opts: {
  sourceCode: string;
  contractName?: string;
  compilerVersion: string;
  optimization: boolean;
  runs: number;
  evmVersion: string;
}): Promise<CompileResult> {
  const source = opts.sourceCode.trim();
  if (!source) throw new Error("Missing source code");

  // Hardhat artifact pasted as "source" — extract ABI without solc
  if (source.startsWith("{")) {
    try {
      const art = JSON.parse(source) as {
        contractName?: string;
        abi?: unknown[];
        bytecode?: string | { object?: string };
        deployedBytecode?: string | { object?: string };
      };
      if (Array.isArray(art.abi) && art.abi.length > 0) {
        const creation =
          typeof art.bytecode === "string"
            ? art.bytecode
            : art.bytecode?.object || "";
        const deployed =
          typeof art.deployedBytecode === "string"
            ? art.deployedBytecode
            : art.deployedBytecode?.object || "";
        return {
          abi: art.abi,
          creationBytecode: creation.startsWith("0x") ? creation : creation ? `0x${creation}` : "",
          deployedBytecode: deployed.startsWith("0x") ? deployed : deployed ? `0x${deployed}` : "",
          contractName: art.contractName || opts.contractName || "Contract",
          warnings: ["Used Hardhat/Foundry artifact JSON (ABI + bytecode extracted automatically)."],
        };
      }
    } catch {
      /* treat as Solidity */
    }
  }

  // Standard-JSON-Input pasted wholesale
  let standardInput: Record<string, unknown> | null = null;
  if (source.startsWith("{") && source.includes('"language"') && source.includes('"sources"')) {
    try {
      standardInput = JSON.parse(source) as Record<string, unknown>;
    } catch {
      standardInput = null;
    }
  }

  const evm = (opts.evmVersion || "london").toLowerCase();
  const input =
    standardInput ||
    ({
      language: "Solidity",
      sources: {
        "Contract.sol": { content: source },
      },
      settings: {
        optimizer: { enabled: opts.optimization, runs: opts.runs || 200 },
        evmVersion: evm === "default" ? "london" : evm,
        outputSelection: {
          "*": {
            "*": ["abi", "evm.bytecode", "evm.deployedBytecode"],
          },
        },
      },
    } as Record<string, unknown>);

  // Ensure optimizer / evm from form override when using pasted standard JSON lightly
  if (standardInput) {
    const settings = (input.settings = (input.settings || {}) as Record<string, unknown>);
    settings.optimizer = { enabled: opts.optimization, runs: opts.runs || 200 };
    settings.evmVersion = evm === "default" ? "london" : evm;
    settings.outputSelection = {
      "*": { "*": ["abi", "evm.bytecode", "evm.deployedBytecode"] },
    };
  }

  const solc = await loadSolcVersion(opts.compilerVersion);
  const output = JSON.parse(
    solc.compile(JSON.stringify(input), { import: findImports }),
  ) as {
    errors?: { severity?: string; formattedMessage?: string; message?: string }[];
    contracts?: Record<
      string,
      Record<string, { abi?: unknown[]; evm?: { bytecode?: { object?: string }; deployedBytecode?: { object?: string } } }>
    >;
  };

  const errors = (output.errors || []).filter((e) => e.severity === "error");
  const warnings = (output.errors || [])
    .filter((e) => e.severity !== "error")
    .map((e) => e.formattedMessage || e.message || "")
    .filter(Boolean);

  if (errors.length) {
    const msg = errors.map((e) => e.formattedMessage || e.message || "compile error").join("\n");
    throw new Error(msg.slice(0, 4000));
  }

  const contracts = output.contracts || {};
  const picked = pickContract(contracts, opts.contractName);
  if (!picked) throw new Error("Compile produced no contracts — check contract name / source.");

  const creationRaw = picked.data.evm?.bytecode?.object || "";
  const deployedRaw = picked.data.evm?.deployedBytecode?.object || "";
  if (!deployedRaw) {
    throw new Error(
      `Contract "${picked.name}" has no deployed bytecode (interface/library/abstract?). Pick the main contract name.`,
    );
  }

  const abi = Array.isArray(picked.data.abi) ? picked.data.abi : [];
  if (abi.length === 0) {
    throw new Error(`Compile produced empty ABI for ${picked.name}`);
  }

  return {
    abi,
    creationBytecode: creationRaw.startsWith("0x") ? creationRaw : `0x${creationRaw}`,
    deployedBytecode: deployedRaw.startsWith("0x") ? deployedRaw : `0x${deployedRaw}`,
    contractName: picked.name,
    warnings,
  };
}
