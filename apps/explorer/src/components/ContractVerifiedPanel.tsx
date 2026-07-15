import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BrowserProvider, Contract, JsonRpcProvider, formatUnits } from "ethers";
import {
  type AbiFunctionJson,
  formatCallResult,
  functionSignature,
  getNormalizedAbiJson,
  inferSourceFileName,
  listAbiFunctions,
  parseAbiToArray,
  parseAbiValue,
} from "../lib/abiInteract";
import { Web3ConnectBar } from "./Web3ConnectBar";
import { shortHash } from "../lib/format";
import { fetchJson } from "../lib/api";
import { token20Label } from "../lib/chainBranding";

function BytecodePre({
  title,
  subtitle,
  hex,
  copyLabel,
}: {
  title: string;
  subtitle?: string;
  hex: string;
  copyLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-2 border-t border-slate-200 pt-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-semibold text-slate-900">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs leading-relaxed text-slate-600">{subtitle}</p> : null}
        </div>
        <button
          type="button"
          className="shrink-0 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          onClick={() => {
            void navigator.clipboard.writeText(hex).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? "Copied" : copyLabel}
        </button>
      </div>
      <pre className="max-h-[min(360px,50vh)] overflow-auto rounded-lg border border-slate-200 bg-slate-100 p-3 text-left font-mono text-[10px] leading-relaxed text-slate-800">
        {hex}
      </pre>
    </div>
  );
}

export type VerifiedForPanel = {
  address: string;
  contractName: string;
  compilerKind?: string;
  compilerVersion: string;
  optimization: boolean;
  runs: number;
  evmVersion?: string;
  exactBytecodeMatch?: boolean;
  openSourceLicense?: string;
  sourceCode: string;
  abi: string;
  /** Runtime code from `eth_getCode` (BscScan “Deployed Bytecode”). */
  deployedBytecode?: string | null;
  /** Full contract-creation transaction `input` if submitted at verify. */
  contractCreationCode?: string | null;
  /** Compiler bytecode prefix used to split constructor args (optional). */
  compilerCreationBytecode?: string | null;
  /** ABI-encoded constructor tail when split succeeds. */
  constructorArgsHex?: string | null;
  constructorArgsSplitOk?: boolean | null;
  constructorArgsDecoded?: { name: string; type: string; value: string }[] | null;
  constructorDecodeNote?: string | null;
};

type Tab = "code" | "abi" | "read" | "write";

export function ContractVerifiedPanel({
  verified,
  variant = "verified",
}: {
  verified: VerifiedForPanel;
  /** `chain-inferred`: bytecode + standard fungible-token ABI from RPC (unverified contract). */
  variant?: "verified" | "chain-inferred";
}) {
  const rpcUrl = (import.meta.env.VITE_RPC_URL || "https://rpc.ecnascan.com").trim();
  const [tab, setTab] = useState<Tab>("code");
  const [codeSearch, setCodeSearch] = useState("");
  const [copyFlash, setCopyFlash] = useState(false);
  const [copyAbiFlash, setCopyAbiFlash] = useState(false);
  const [chainDeployedBytecode, setChainDeployedBytecode] = useState<string | null>(null);

  useEffect(() => {
    if (variant !== "chain-inferred") return;
    let c = true;
    fetchJson<{ bytecode: string | null }>(`/api/v1/contract/${verified.address}/chain-meta`)
      .then((m) => {
        if (c) setChainDeployedBytecode(m.bytecode);
      })
      .catch(() => {
        if (c) setChainDeployedBytecode(null);
      });
    return () => {
      c = false;
    };
  }, [variant, verified.address]);

  const fileName = useMemo(() => inferSourceFileName(verified.sourceCode, verified.contractName), [verified]);

  const filteredSource = useMemo(() => {
    const q = codeSearch.trim().toLowerCase();
    if (!q) return verified.sourceCode;
    const lines = verified.sourceCode.split("\n").filter((line) => line.toLowerCase().includes(q));
    return lines.length ? lines.join("\n") : "";
  }, [verified.sourceCode, codeSearch]);

  const abiItems = useMemo(() => parseAbiToArray(verified.abi), [verified.abi]);
  const abiPretty = useMemo(() => JSON.stringify(abiItems, null, 2), [abiItems]);
  const abiIsEmpty = abiItems.length === 0;

  const allFns = useMemo(() => listAbiFunctions(verified.abi), [verified.abi]);
  const abiForEthers = useMemo(() => getNormalizedAbiJson(verified.abi), [verified.abi]);

  const readFns = useMemo(
    () => allFns.filter((f) => f.stateMutability === "view" || f.stateMutability === "pure"),
    [allFns],
  );
  const writeFns = useMemo(
    () => allFns.filter((f) => f.stateMutability === "nonpayable" || f.stateMutability === "payable"),
    [allFns],
  );

  const copyCode = async () => {
    await navigator.clipboard.writeText(verified.sourceCode);
    setCopyFlash(true);
    setTimeout(() => setCopyFlash(false), 1500);
  };

  const copyAbi = async () => {
    await navigator.clipboard.writeText(abiPretty);
    setCopyAbiFlash(true);
    setTimeout(() => setCopyAbiFlash(false), 1500);
  };

  const compilerLabel = verified.compilerVersion.startsWith("v")
    ? verified.compilerVersion
    : `v${verified.compilerVersion}`;

  const isChain = variant === "chain-inferred";

  return (
    <div className="mt-4 space-y-4">
      {isChain ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/95 px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-lg text-white shadow-inner">
            ⛓
          </span>
          <div>
            <div className="text-base font-semibold text-amber-950">On-chain data (auto-fetched)</div>
            <p className="text-xs text-amber-900/90">
              Bytecode via <code className="rounded bg-white/80 px-1">eth_getCode</code>. Read/Write use a{" "}
              <strong>standard {token20Label()} ABI</strong> when the bytecode matches common token patterns — verify source to show
              exact Solidity and full ABI.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/90 px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-lg text-white shadow-inner">
            ✓
          </span>
          <div>
            <div className="text-base font-semibold text-emerald-950">
              Contract Source Code Verified
              {verified.exactBytecodeMatch ? (
                <span className="ml-2 font-medium text-emerald-800">(Exact Match)</span>
              ) : (
                <span className="ml-2 font-normal text-emerald-800">
                  (Submitted — add <code className="rounded bg-white/80 px-1">deployedBytecode</code> on verify for exact
                  match)
                </span>
              )}
            </div>
            <p className="text-xs text-emerald-900/85">Code · Read Contract · Write Contract (explorer-standard layout)</p>
          </div>
        </div>
      )}

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50/90 p-4 text-sm sm:grid-cols-2">
        <Meta label="Contract Name" value={verified.contractName} mono />
        <Meta label="Compiler Version" value={isChain ? "— (not verified)" : compilerLabel} mono />
        <Meta
          label="Compiler Type"
          value={
            isChain
              ? "—"
              : verified.compilerKind === "solidity-multi-part"
                ? "Solidity (Multi-Part files)"
                : verified.compilerKind === "solidity-standard-json"
                  ? "Solidity (Standard-Json-Input)"
                  : "Solidity (Single file)"
          }
        />
        <Meta label="Optimization Enabled" value={isChain ? "—" : verified.optimization ? `Yes · ${verified.runs} runs` : "No"} />
        <Meta label="Other Settings" value={isChain ? "RPC / bytecode" : `EVM ${verified.evmVersion ?? "cancun"}`} />
        <Meta label="Open Source License" value={isChain ? "—" : verified.openSourceLicense ?? "—"} />
      </div>

      {abiIsEmpty && variant === "verified" ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Stored ABI is empty — Read / Write cannot list functions.</p>
          <p className="mt-1 text-xs leading-relaxed">
            This verification is locked. Contact support if the ABI was submitted incorrectly.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {(
          [
            ["code", "Code"],
            ["abi", "Contract ABI"],
            ["read", "Read Contract"],
            ["write", "Write Contract"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`shrink-0 whitespace-nowrap rounded-t-md px-2.5 py-2 text-xs font-semibold transition sm:px-4 sm:py-2.5 sm:text-sm ${
              tab === id ? "bg-brand-600 text-white shadow-md" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "read" || tab === "write" ? (
        <div className="space-y-3">
          <Web3ConnectBar />
          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
            Descriptions below are derived from the contract ABI. This explorer does not guarantee the safety or accuracy
            of function behaviour — same disclaimer style as BscScan NatSpec notes.
          </p>
        </div>
      ) : null}

      {tab === "code" ? (
        <div className="space-y-2">
          {!verified.sourceCode.trim() ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              No Solidity source was stored for this address.
            </p>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <span className="min-w-0 text-sm font-medium text-slate-700">
              File 1 of 1:{" "}
              <span className="break-all font-mono text-xs text-brand-800 sm:text-sm">{fileName}</span>
            </span>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <input
                type="search"
                placeholder="Search in source…"
                value={codeSearch}
                onChange={(e) => setCodeSearch(e.target.value)}
                disabled={!verified.sourceCode.trim()}
                className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm shadow-sm sm:min-w-[12rem] sm:flex-none disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => void copyCode()}
                disabled={!verified.sourceCode.trim()}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-slate-50 disabled:opacity-50"
              >
                {copyFlash ? "Copied!" : "Copy code"}
              </button>
            </div>
          </div>
          <pre className="max-h-[min(520px,70vh)] overflow-auto rounded-lg border border-[#2d2d2d] bg-[#1e1e1e] p-4 text-left text-xs leading-relaxed text-[#d4d4d4]">
            {verified.sourceCode.trim()
              ? filteredSource || "(no lines match — clear search)"
              : "(nothing to display)"}
          </pre>

          {!isChain ? (
            <div className="mt-6 space-y-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              {verified.contractCreationCode ? (
                <BytecodePre
                  title="Contract creation code"
                  subtitle="The full input data of the transaction that deployed this contract (BscScan-style)."
                  hex={verified.contractCreationCode}
                  copyLabel="Copy creation code"
                />
              ) : (
                <div className="pb-4">
                  <h3 className="font-display text-sm font-semibold text-slate-900">Contract creation code</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Not stored for this verification record.
                  </p>
                </div>
              )}

              {verified.contractCreationCode && verified.compilerCreationBytecode ? (
                <div className="space-y-3 border-t border-slate-200 pt-4">
                  <div>
                    <h3 className="font-display text-sm font-semibold text-slate-900">Constructor arguments</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      ABI-encoded data appended after the compiler bytecode — the last bytes of the contract creation code above (same layout as{" "}
                      <a
                        href="https://bscscan.com/token/0xfaf4c6e7acf3ef8a362801ecf224d9f495ffb3e6#code"
                        className="font-medium text-brand-700 underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        BscScan
                      </a>
                      ).
                    </p>
                  </div>
                  {verified.constructorArgsSplitOk === false ? (
                    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                      Could not split constructor args: the creation transaction does not begin with the stored compiler bytecode
                      (wrong artifact, library placeholders, or different settings).
                    </p>
                  ) : null}
                  {verified.constructorArgsHex && verified.constructorArgsHex !== "0x" ? (
                    <BytecodePre
                      title="ABI-encoded constructor arguments (hex)"
                      hex={verified.constructorArgsHex}
                      copyLabel="Copy constructor args"
                    />
                  ) : verified.constructorArgsSplitOk === true ? (
                    <p className="text-xs text-slate-600">No extra constructor bytes after compiler bytecode (empty tail).</p>
                  ) : null}
                  {verified.constructorDecodeNote ? (
                    <p className="rounded-md border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-950">{verified.constructorDecodeNote}</p>
                  ) : null}
                  {verified.constructorArgsDecoded && verified.constructorArgsDecoded.length > 0 ? (
                    <div>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Decoded constructor</p>
                      <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full min-w-[280px] border-collapse text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                              <th className="px-3 py-2 font-semibold text-slate-600">Name</th>
                              <th className="px-3 py-2 font-semibold text-slate-600">Type</th>
                              <th className="px-3 py-2 font-semibold text-slate-600">Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {verified.constructorArgsDecoded.map((r, i) => (
                              <tr key={i} className="border-b border-slate-100">
                                <td className="px-3 py-2 font-mono">{r.name}</td>
                                <td className="px-3 py-2 font-mono text-slate-600">{r.type}</td>
                                <td className="break-all px-3 py-2 font-mono">{r.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : verified.contractCreationCode ? (
                <div className="border-t border-slate-200 pt-4">
                  <h3 className="font-display text-sm font-semibold text-slate-900">Constructor arguments</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Compiler creation bytecode was not stored with this verification — constructor tail cannot be split automatically.
                  </p>
                </div>
              ) : null}

              {verified.deployedBytecode ? (
                <BytecodePre
                  title="Deployed bytecode"
                  subtitle="Runtime bytecode at this address from the node (`eth_getCode`) — matches BscScan &quot;Deployed Bytecode&quot;."
                  hex={verified.deployedBytecode}
                  copyLabel="Copy deployed bytecode"
                />
              ) : (
                <div className="border-t border-slate-200 pt-4">
                  <h3 className="font-display text-sm font-semibold text-slate-900">Deployed bytecode</h3>
                  <p className="mt-1 text-xs text-slate-500">Could not load runtime bytecode from the RPC.</p>
                </div>
              )}
            </div>
          ) : chainDeployedBytecode ? (
            <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <BytecodePre
                title="Deployed bytecode"
                subtitle="Runtime bytecode from the node (`eth_getCode`). Verify the contract to show creation code and constructor arguments."
                hex={chainDeployedBytecode}
                copyLabel="Copy deployed bytecode"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "abi" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-600">
              Application Binary Interface (JSON) stored with this verification — used for{" "}
              <button type="button" className="font-medium text-brand-700 underline" onClick={() => setTab("read")}>
                Read
              </button>{" "}
              /{" "}
              <button type="button" className="font-medium text-brand-700 underline" onClick={() => setTab("write")}>
                Write
              </button>
              .
            </p>
            <button
              type="button"
              onClick={() => void copyAbi()}
              className="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-slate-50"
            >
              {copyAbiFlash ? "Copied!" : "Copy ABI JSON"}
            </button>
          </div>
          {abiIsEmpty ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950">
              <p className="font-medium">This verification has an empty ABI (`[]`).</p>
              <p className="mt-2 text-xs leading-relaxed">
                <strong>Read Contract</strong> and <strong>Write Contract</strong> need the real ABI from your compiler. This record is locked after verification.
              </p>
            </div>
          ) : (
            <pre className="max-h-[min(520px,70vh)] overflow-auto rounded-lg border border-[#2d2d2d] bg-[#1e1e1e] p-4 text-left text-[10px] leading-relaxed text-[#d4d4d4]">
              {abiPretty}
            </pre>
          )}
          {!abiIsEmpty ? (
            <p className="text-xs text-slate-500">
              Parsed <strong>{allFns.length}</strong> function(s) for Read/Write — events and errors are shown in JSON only.
            </p>
          ) : null}
        </div>
      ) : null}

      {tab === "read" ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Read-only calls use the public RPC{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">{rpcUrl}</code>. Use{" "}
            <strong>Connect to Web3</strong> above if you want the same wallet flow as BscScan (optional for read).
          </p>
          <p className="text-xs text-slate-500">
            Parsed <strong>{allFns.length}</strong> function(s) from ABI — Read: {readFns.length}, Write: {writeFns.length}.
          </p>
          {readFns.length === 0 ? (
            <AbiEmptyHint parsedTotal={allFns.length} kind="read" />
          ) : (
            readFns.map((fn, idx) => (
              <AbiReadCard
                key={`read-${idx}-${functionSignature(fn)}`}
                address={verified.address}
                abiJson={abiForEthers}
                fn={fn}
                rpcUrl={rpcUrl}
              />
            ))
          )}
        </div>
      ) : null}

      {tab === "write" ? (
        <div className="space-y-4">
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <strong>Write</strong>: connect with <strong>Connect to Web3</strong> first (BscScan-style), then fill
            parameters and submit — your wallet must be on the same chain as{" "}
            <code className="rounded bg-white px-1">{rpcUrl}</code>.
          </p>
          <p className="text-xs text-slate-500">
            Parsed <strong>{allFns.length}</strong> function(s) — Read: {readFns.length}, Write: {writeFns.length}.
          </p>
          {writeFns.length === 0 ? (
            <AbiEmptyHint parsedTotal={allFns.length} kind="write" />
          ) : (
            writeFns.map((fn, idx) => (
              <AbiWriteCard
                key={`write-${idx}-${functionSignature(fn)}`}
                address={verified.address}
                abiJson={abiForEthers}
                fn={fn}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function AbiEmptyHint({ parsedTotal, kind }: { parsedTotal: number; kind: "read" | "write" }) {
  if (parsedTotal === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950">
        <p className="font-medium">No functions parsed from the stored ABI.</p>
        <p className="mt-2 text-xs leading-relaxed">
          On <strong>Verify Contract</strong>, paste either the full Hardhat artifact JSON (file with an{" "}
          <code className="rounded bg-white px-1">abi</code> array) or the raw <code className="rounded bg-white px-1">abi</code>{" "}
          array from <code className="rounded bg-white px-1">artifacts/.../YourContract.json</code>, then submit again.
        </p>
      </div>
    );
  }
  return (
    <p className="text-sm text-slate-600">
      {kind === "read"
        ? "No view/pure functions in this ABI (only state-changing functions, or ABI uses an unsupported shape)."
        : "No nonpayable/payable functions in this ABI (only read-only functions)."}
    </p>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={mono ? "mt-0.5 font-mono text-xs text-slate-900" : "mt-0.5 text-slate-900"}>{value}</div>
    </div>
  );
}

function AbiReadCard({
  address,
  abiJson,
  fn,
  rpcUrl,
}: {
  address: string;
  abiJson: string;
  fn: AbiFunctionJson;
  rpcUrl: string;
}) {
  const [values, setValues] = useState<string[]>(() => fn.inputs.map(() => ""));
  const [out, setOut] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setErr(null);
    setOut(null);
    try {
      const provider = new JsonRpcProvider(rpcUrl);
      const contract = new Contract(address, abiJson, provider);
      const sig = functionSignature(fn);
      const cfn = contract.getFunction(sig);
      const args = fn.inputs.map((inp, i) => parseAbiValue(inp.type, values[i] ?? ""));
      const result = await cfn.staticCall(...args);
      const out0 = fn.outputs?.[0];
      const outIsUint = out0 && /^u?int\d*$/.test(out0.type);
      if (
        outIsUint &&
        (fn.name === "totalSupply" || fn.name === "balanceOf" || fn.name === "allowance")
      ) {
        try {
          const decFn = contract.getFunction("decimals");
          const symFn = contract.getFunction("symbol");
          const [decRaw, symRaw] = await Promise.all([decFn.staticCall(), symFn.staticCall()]);
          const decimals = Number(decRaw);
          const d = Number.isFinite(decimals) && decimals >= 0 && decimals <= 36 ? decimals : 18;
          const symbol = typeof symRaw === "string" ? symRaw : String(symRaw);
          const raw = result as bigint;
          setOut(`${formatUnits(raw, d)} ${symbol}\n(raw uint256: ${raw.toString()})`);
        } catch {
          setOut(formatCallResult(result));
        }
      } else {
        setOut(formatCallResult(result));
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="break-all font-mono text-sm font-semibold leading-snug text-slate-900">{functionSignature(fn)}</div>
      <div className="mt-3 space-y-2">
        {fn.inputs.map((inp, i) => (
          <label key={i} className="block text-xs">
            <span className="text-slate-500">{(inp.name || `arg${i}`) + ` (${inp.type})`}</span>
            <input
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 font-mono text-xs"
              value={values[i]}
              onChange={(e) => {
                const next = [...values];
                next[i] = e.target.value;
                setValues(next);
              }}
              placeholder={inp.type}
            />
          </label>
        ))}
        <button
          type="button"
          disabled={loading}
          onClick={() => void run()}
          className="mt-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Querying…" : "Query"}
        </button>
        {err ? <p className="mt-2 text-sm text-red-600">{err}</p> : null}
        {out ? <pre className="mt-2 max-h-48 overflow-auto rounded bg-slate-900 p-3 text-xs text-emerald-200">{out}</pre> : null}
      </div>
    </div>
  );
}

type WriteTxUi =
  | { kind: "idle" }
  | { kind: "signing" }
  | { kind: "pending"; hash: string }
  | {
      kind: "done";
      hash: string;
      blockNumber: string;
      gasUsed: string;
      success: boolean;
    }
  | { kind: "error"; message: string; hash?: string };

function AbiWriteCard({ address, abiJson, fn }: { address: string; abiJson: string; fn: AbiFunctionJson }) {
  const [values, setValues] = useState<string[]>(() => fn.inputs.map(() => ""));
  const [wei, setWei] = useState("");
  const [txUi, setTxUi] = useState<WriteTxUi>({ kind: "idle" });
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!window.ethereum?.request) {
      setTxUi({ kind: "error", message: "No wallet found — install MetaMask (or another injected wallet)." });
      return;
    }
    setLoading(true);
    setTxUi({ kind: "signing" });
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(address, abiJson, signer);
      const sig = functionSignature(fn);
      const cfn = contract.getFunction(sig);
      const args = fn.inputs.map((inp, i) => parseAbiValue(inp.type, values[i] ?? ""));
      let tx;
      if (fn.stateMutability === "payable") {
        const v = wei.trim() ? BigInt(wei.trim()) : 0n;
        tx = await cfn(...args, { value: v });
      } else {
        tx = await cfn(...args);
      }
      const h = tx.hash;
      setTxUi({ kind: "pending", hash: h });
      const rec = await tx.wait();
      if (!rec) {
        setTxUi({ kind: "error", message: "No receipt returned.", hash: h });
        return;
      }
      const success = Number(rec.status) !== 0;
      setTxUi({
        kind: "done",
        hash: rec.hash,
        blockNumber: rec.blockNumber.toString(),
        gasUsed: rec.gasUsed.toString(),
        success,
      });
    } catch (e) {
      setTxUi({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="break-all font-mono text-sm font-semibold leading-snug text-slate-900">{functionSignature(fn)}</div>
      <div className="mt-3 space-y-2">
        {fn.stateMutability === "payable" ? (
          <label className="block text-xs">
            <span className="text-slate-500">value (wei)</span>
            <input
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 font-mono text-xs"
              value={wei}
              onChange={(e) => setWei(e.target.value)}
              placeholder="0"
            />
          </label>
        ) : null}
        {fn.inputs.map((inp, i) => (
          <label key={i} className="block text-xs">
            <span className="text-slate-500">{(inp.name || `arg${i}`) + ` (${inp.type})`}</span>
            <input
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 font-mono text-xs"
              value={values[i]}
              onChange={(e) => {
                const next = [...values];
                next[i] = e.target.value;
                setValues(next);
              }}
            />
          </label>
        ))}
        <button
          type="button"
          disabled={loading}
          onClick={() => void run()}
          className="mt-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {loading ? (txUi.kind === "signing" ? "Confirm in wallet…" : "Confirming…") : "Write"}
        </button>

        {txUi.kind === "signing" ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
            <strong>Waiting for wallet</strong>
            <p className="mt-1 text-xs opacity-90">Approve or sign this transaction in MetaMask (or your connected wallet).</p>
          </div>
        ) : null}

        {txUi.kind === "pending" ? (
          <div className="mt-3 space-y-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-3 text-sm text-sky-950 shadow-sm">
            <div className="font-semibold">Transaction submitted</div>
            <p className="text-xs text-sky-900/90">Waiting for confirmation…</p>
            <div className="border-t border-sky-200/80 pt-2 text-xs">
              <div className="font-medium uppercase tracking-wide text-sky-800/80">Transaction hash</div>
              <Link to={`/tx/${txUi.hash}`} className="mt-0.5 block break-all font-mono text-brand-600 hover:underline">
                {txUi.hash}
              </Link>
            </div>
          </div>
        ) : null}

        {txUi.kind === "done" ? (
          <div
            className={`mt-3 rounded-xl border p-3 text-sm shadow-sm ${
              txUi.success
                ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                : "border-red-200 bg-red-50 text-red-950"
            }`}
          >
            <div className="font-semibold">{txUi.success ? "Success" : "Failed"}</div>
            <p className="mt-1 text-xs opacity-90">
              {txUi.success ? "Transaction mined and executed successfully." : "Transaction mined but execution reverted (status 0)."}
            </p>
            <div className="mt-3 grid gap-2 border-t border-black/5 pt-3 text-xs md:grid-cols-2">
              <div>
                <div className="font-medium uppercase text-black/50">Transaction hash</div>
                <Link to={`/tx/${txUi.hash}`} className="break-all font-mono text-brand-600 hover:underline" title={txUi.hash}>
                  {txUi.hash}
                </Link>
              </div>
              <div>
                <div className="font-medium uppercase text-black/50">Block</div>
                <Link to={`/block/${txUi.blockNumber}`} className="font-mono text-brand-600 hover:underline">
                  {txUi.blockNumber}
                </Link>
              </div>
              <div>
                <div className="font-medium uppercase text-black/50">Gas used</div>
                <div className="font-mono">{BigInt(txUi.gasUsed).toLocaleString()}</div>
              </div>
              <div>
                <div className="font-medium uppercase text-black/50">Status</div>
                <div className={txUi.success ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
                  {txUi.success ? "Success" : "Failed"}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {txUi.kind === "error" ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900">
            <strong>Error</strong>
            <p className="mt-1 break-words">{txUi.message}</p>
            {txUi.hash ? (
              <p className="mt-2 font-mono text-xs">
                Hash:{" "}
                <Link to={`/tx/${txUi.hash}`} className="text-brand-700 hover:underline">
                  {shortHash(txUi.hash, 12)}
                </Link>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
