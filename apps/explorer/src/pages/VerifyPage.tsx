import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiUrl, fetchJson } from "../lib/api";
import { abiConstructorInputCount } from "../lib/abiConstructor";
import { extractContractNameFromAbiField, extractContractNameFromSource } from "../lib/contractNameGuess";
import { token20Label } from "../lib/chainBranding";

const COMPILER_TYPES = [
  { value: "solidity-single-file", label: "Solidity (Single file)" },
  { value: "solidity-multi-part", label: "Solidity (Multi-Part files)" },
  { value: "solidity-standard-json", label: "Solidity (Standard-Json-Input)" },
] as const;

/** Stable + pre releases from solc-bin (no nightlies), 0.4.11 … 0.8.35-pre.1, newest first */
const COMPILER_VERSIONS = [
  "v0.8.35-pre.1+commit.a99b6d8c",
  "v0.8.34+commit.80d5c536",
  "v0.8.33+commit.64118f21",
  "v0.8.32+commit.ebbd65e5",
  "v0.8.31+commit.fd3a2265",
  "v0.8.31-pre.1+commit.b59566f6",
  "v0.8.30+commit.73712a01",
  "v0.8.29+commit.ab55807c",
  "v0.8.28+commit.7893614a",
  "v0.8.27+commit.40a35a09",
  "v0.8.26+commit.8a97fa7a",
  "v0.8.25+commit.b61c2a91",
  "v0.8.24+commit.e11b9ed9",
  "v0.8.23+commit.f704f362",
  "v0.8.22+commit.4fc1097e",
  "v0.8.21+commit.d9974bed",
  "v0.8.20+commit.a1b79de6",
  "v0.8.19+commit.7dd6d404",
  "v0.8.18+commit.87f61d96",
  "v0.8.17+commit.8df45f5f",
  "v0.8.16+commit.07a7930e",
  "v0.8.15+commit.e14f2714",
  "v0.8.14+commit.80d49f37",
  "v0.8.13+commit.abaa5c0e",
  "v0.8.12+commit.f00d7308",
  "v0.8.11+commit.d7f03943",
  "v0.8.10+commit.fc410830",
  "v0.8.9+commit.e5eed63a",
  "v0.8.8+commit.dddeac2f",
  "v0.8.7+commit.e28d00a7",
  "v0.8.6+commit.11564f7e",
  "v0.8.5+commit.a4f2e591",
  "v0.8.4+commit.c7e474f2",
  "v0.8.3+commit.8d00100c",
  "v0.8.2+commit.661d1103",
  "v0.8.1+commit.df193b15",
  "v0.8.0+commit.c7dfd78e",
  "v0.7.6+commit.7338295f",
  "v0.7.5+commit.eb77ed08",
  "v0.7.4+commit.3f05b770",
  "v0.7.3+commit.9bfce1f6",
  "v0.7.2+commit.51b20bc0",
  "v0.7.1+commit.f4a555be",
  "v0.7.0+commit.9e61f92b",
  "v0.6.12+commit.27d51765",
  "v0.6.11+commit.5ef660b1",
  "v0.6.10+commit.00c0fcaf",
  "v0.6.9+commit.3e3065ac",
  "v0.6.8+commit.0bbfe453",
  "v0.6.7+commit.b8d736ae",
  "v0.6.6+commit.6c089d02",
  "v0.6.5+commit.f956cc89",
  "v0.6.4+commit.1dca32f3",
  "v0.6.3+commit.8dda9521",
  "v0.6.2+commit.bacdbe57",
  "v0.6.1+commit.e6f7d5a4",
  "v0.6.0+commit.26b70077",
  "v0.5.17+commit.d19bba13",
  "v0.5.16+commit.9c3226ce",
  "v0.5.15+commit.6a57276f",
  "v0.5.14+commit.01f1aaa4",
  "v0.5.13+commit.5b0b510c",
  "v0.5.12+commit.7709ece9",
  "v0.5.11+commit.c082d0b4",
  "v0.5.11+commit.22be8592",
  "v0.5.10+commit.5a6ea5b1",
  "v0.5.9+commit.e560f70d",
  "v0.5.9+commit.c68bc34e",
  "v0.5.8+commit.23d335f2",
  "v0.5.7+commit.6da8b019",
  "v0.5.6+commit.b259423e",
  "v0.5.5+commit.47a71e8f",
  "v0.5.4+commit.9549d8ff",
  "v0.5.3+commit.10d17f24",
  "v0.5.2+commit.1df8f40c",
  "v0.5.1+commit.c8a2cb62",
  "v0.5.0+commit.1d4f565a",
  "v0.4.26+commit.4563c3fc",
  "v0.4.25+commit.59dbf8f1",
  "v0.4.24+commit.e67f0147",
  "v0.4.23+commit.124ca40d",
  "v0.4.22+commit.4cb486ee",
  "v0.4.21+commit.dfe3193c",
  "v0.4.20+commit.3155dd80",
  "v0.4.19+commit.c4cbbb05",
  "v0.4.18+commit.9cf6e910",
  "v0.4.17+commit.bdeb9e52",
  "v0.4.16+commit.d7661dd9",
  "v0.4.15+commit.bbb8e64f",
  "v0.4.15+commit.8b45bddb",
  "v0.4.14+commit.c2215d46",
  "v0.4.13+commit.0fb4cb1a",
  "v0.4.12+commit.194ff033",
  "v0.4.11+commit.68ef5810",
] as const;

const LICENSE_OPTIONS = [
  { value: "None", label: "No License (None)" },
  { value: "Unlicense", label: "The Unlicense (Unlicense)" },
  { value: "MIT", label: "MIT License (MIT)" },
  { value: "GNU GPLv2", label: "GNU General Public License v2.0 (GNU GPLv2)" },
  { value: "GNU GPLv3", label: "GNU General Public License v3.0 (GNU GPLv3)" },
  { value: "GNU LGPLv2.1", label: "GNU Lesser General Public License v2.1 (GNU LGPLv2.1)" },
  { value: "GNU LGPLv3", label: "GNU Lesser General Public License v3.0 (GNU LGPLv3)" },
  { value: "BSD-2-Clause", label: 'BSD 2-clause "Simplified" license (BSD-2-Clause)' },
  {
    value: "BSD-3-Clause",
    label: 'BSD 3-clause "New" Or "Revised" license (BSD-3-Clause)',
  },
  { value: "MPL-2.0", label: "Mozilla Public License 2.0 (MPL-2.0)" },
  { value: "OSL-3.0", label: "Open Software License 3.0 (OSL-3.0)" },
  { value: "Apache-2.0", label: "Apache 2.0 (Apache-2.0)" },
  { value: "GNU AGPLv3", label: "GNU Affero General Public License (GNU AGPLv3)" },
  { value: "BSL-1.1", label: "Business Source License (BSL 1.1)" },
] as const;

function explorerPublicBase(): string {
  const v = (import.meta.env.VITE_EXPLORER_URL || "").trim().replace(/\/$/, "");
  if (v) return v;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

/**
 * If user pastes a full Hardhat artifact `{ contractName, abi, ... }`, keep only the ABI array
 * so the field matches what the API expects and Read/Write tabs work.
 */
function normalizeAbiInput(raw: string): string {
  const t = raw.trim();
  if (!t.startsWith("{")) return raw;
  try {
    const o = JSON.parse(t) as { abi?: unknown };
    if (o && typeof o === "object" && Array.isArray(o.abi)) {
      return JSON.stringify(o.abi, null, 2);
    }
  } catch {
    /* keep raw */
  }
  return raw;
}

/** Normalize API `result` (address string) or extract 0x from a message. */
function parseVerifiedContractAddress(result: unknown, fallbackBodyAddress: string): string | null {
  const raw = String(result ?? "").trim();
  if (/^0x[a-fA-F0-9]{40}$/i.test(raw)) return raw.toLowerCase();
  const m = raw.match(/(0x[a-fA-F0-9]{40})/i);
  if (m) return m[1].toLowerCase();
  const fb = fallbackBodyAddress.trim();
  if (/^0x[a-fA-F0-9]{40}$/i.test(fb)) return fb.toLowerCase();
  return null;
}

export function VerifyPage() {
  const [sp] = useSearchParams();
  const [step, setStep] = useState<1 | 2>(1);

  const [address, setAddress] = useState("");
  const [compilerKind, setCompilerKind] = useState<string>("solidity-single-file");
  const [compilerVersion, setCompilerVersion] = useState("v0.8.24+commit.e11b9ed9");
  const [openSourceLicense, setOpenSourceLicense] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [step1Err, setStep1Err] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [nameHint, setNameHint] = useState<string | null>(null);
  const nameTouched = useRef(false);
  const hasLocalGuessRef = useRef(false);
  const chainStep2Fetched = useRef(false);
  const [source, setSource] = useState("");
  const [abi, setAbi] = useState("[]");
  const [bytecode, setBytecode] = useState("");
  const [creationTxInput, setCreationTxInput] = useState("");
  const [compilerCreationBytecode, setCompilerCreationBytecode] = useState("");
  const [deployMetaHint, setDeployMetaHint] = useState<string | null>(null);
  const [evmVersion, setEvmVersion] = useState("london");
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const [verifiedCheckDone, setVerifiedCheckDone] = useState(false);
  const [optimizationUsed, setOptimizationUsed] = useState(true);
  const [runs, setRuns] = useState("200");

  const [out, setOut] = useState<{
    ok: boolean;
    text: string;
    /** Set on success when we have a checksummed/lowercase contract address */
    verifiedAddress?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const a = (sp.get("address") || sp.get("a") || "").trim();
    if (a && /^0x[a-fA-F0-9]{40}$/.test(a)) {
      setAddress(a);
    }
  }, [sp]);

  useEffect(() => {
    const addr = address.trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(addr)) {
      setAlreadyVerified(false);
      setVerifiedCheckDone(false);
      return;
    }
    let c = true;
    setVerifiedCheckDone(false);
    fetchJson<{ address: string }>(`/api/v1/contract/${addr}/verified`)
      .then(() => {
        if (c) setAlreadyVerified(true);
      })
      .catch(() => {
        if (c) setAlreadyVerified(false);
      })
      .finally(() => {
        if (c) setVerifiedCheckDone(true);
      });
    return () => {
      c = false;
    };
  }, [address]);

  const suggestedFromPaste = useMemo(() => {
    const fromArt = extractContractNameFromAbiField(abi);
    if (fromArt) return { value: fromArt, hint: "Hardhat artifact (contractName field)" as const };
    const fromSrc = extractContractNameFromSource(source);
    if (fromSrc) return { value: fromSrc, hint: "Solidity source (contract X …)" as const };
    return null;
  }, [abi, source]);

  useEffect(() => {
    hasLocalGuessRef.current = Boolean(suggestedFromPaste);
  }, [suggestedFromPaste]);

  useEffect(() => {
    if (nameTouched.current) return;
    if (suggestedFromPaste) {
      setName(suggestedFromPaste.value);
      setNameHint(suggestedFromPaste.hint);
    }
  }, [suggestedFromPaste]);

  useEffect(() => {
    if (step === 1) chainStep2Fetched.current = false;
  }, [step]);

  type ChainMeta = {
    isContract: boolean;
    bytecode: string | null;
    contractName: string | null;
    symbol: string | null;
    suggestedAbi: string | null;
  };

  type DeployMetaResponse =
    | { found: true; creationTxInput: string; deployTxHash: string; blockNumber: string; source: string }
    | { found: false; message?: string };

  useEffect(() => {
    if (step !== 2) return;
    const addr = address.trim();
    if (!/^0x[a-fA-F0-9]{40}$/i.test(addr)) return;
    if (chainStep2Fetched.current) return;
    chainStep2Fetched.current = true;
    let c = true;
    setDeployMetaHint(null);
    Promise.all([
      fetchJson<ChainMeta>(`/api/v1/contract/${addr.toLowerCase()}/chain-meta`),
      fetchJson<DeployMetaResponse>(`/api/v1/contract/${addr.toLowerCase()}/deploy-meta`),
    ])
      .then(([m, d]) => {
        if (!c) return;
        if (m.bytecode) setBytecode(m.bytecode);
        const abiTrim = abi.trim();
        if (m.suggestedAbi && (abiTrim === "" || abiTrim === "[]")) {
          setAbi(m.suggestedAbi);
        }
        if (!nameTouched.current && !hasLocalGuessRef.current && m.contractName) {
          setName(m.contractName);
          setNameHint(
            m.symbol ? `On-chain: name() + symbol (${m.symbol})` : `On-chain ${token20Label()} name()`,
          );
        }
        if (d.found && d.creationTxInput) {
          setCreationTxInput((prev) => (prev.trim() ? prev : d.creationTxInput));
        } else if (!d.found && d.message) {
          setDeployMetaHint(d.message);
        }
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      c = false;
    };
  }, [step, address, abi]);

  /** When ABI lists `constructor()` with zero parameters, compiler bytecode equals full creation input. */
  useEffect(() => {
    if (step !== 2) return;
    if (abiConstructorInputCount(abi) !== 0) return;
    const cr = creationTxInput.trim();
    if (!cr) return;
    if (compilerCreationBytecode.trim()) return;
    setCompilerCreationBytecode(cr);
  }, [step, abi, creationTxInput, compilerCreationBytecode]);

  const continueToStep2 = () => {
    setStep1Err(null);
    const addr = address.trim();
    if (!addr || !/^0x[a-fA-F0-9]{40}$/i.test(addr)) {
      setStep1Err("Enter a valid contract address (0x…).");
      return;
    }
    if (alreadyVerified) {
      setStep1Err("This contract is already verified. Re-verification is not allowed.");
      return;
    }
    if (!compilerVersion) {
      setStep1Err("Select compiler version.");
      return;
    }
    if (!openSourceLicense.trim()) {
      setStep1Err("Select an open source license.");
      return;
    }
    if (!agreeTerms) {
      setStep1Err("You must agree to the terms of service to continue.");
      return;
    }
    setStep(2);
  };

  const submit = async () => {
    setOut(null);
    if (alreadyVerified) {
      setOut({ ok: false, text: "This contract is already verified. Re-verification is not allowed." });
      return;
    }
    const bc = bytecode.trim();
    const cc = compilerCreationBytecode.trim();
    const cr = creationTxInput.trim();
    if (!bc && !cc) {
      setOut({
        ok: false,
        text: "Bytecode proof required: paste compiler bytecode (artifacts → bytecode) and creation tx input, or deployedBytecode from compile output.",
      });
      return;
    }
    if (cc && !cr && !bc) {
      setOut({
        ok: false,
        text: "When using compiler creation bytecode, also paste the deployment transaction input (or deployedBytecode).",
      });
      return;
    }
    const evm = evmVersion.trim().toLowerCase();
    if (evm === "shanghai" || evm === "cancun" || evm === "prague") {
      setOut({
        ok: false,
        text: `EVM "${evm}" is not supported on ECNA Clique (stock Geth). In Remix set EVM version to london.`,
      });
      return;
    }
    setLoading(true);
    const cv = compilerVersion.startsWith("v") ? compilerVersion : `v${compilerVersion}`;
    const body: Record<string, string> = {
      address: address.trim(),
      contractName: name.trim() || "Contract",
      sourceCode: source,
      abi,
      compilerKind,
      compilerVersion: cv,
      openSourceLicense,
      optimizationUsed: optimizationUsed ? "1" : "0",
      runs: runs.trim() || "200",
    };
    if (bytecode.trim()) body.compiledRuntimeBytecode = bytecode.trim();
    if (creationTxInput.trim()) body.creationTxInput = creationTxInput.trim();
    if (compilerCreationBytecode.trim()) body.compilerCreationBytecode = compilerCreationBytecode.trim();
    if (evmVersion.trim()) body.evmVersion = evmVersion.trim();
    try {
      const r = await fetch(apiUrl("/api/verify/etherscan"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const raw = await r.text();
      let msg = raw;
      try {
        const j = JSON.parse(raw) as { status?: string; message?: string; result?: string };
        if (j.message) msg = j.message;
        const ok = r.ok && j.status === "1";
        let verifiedAddress: string | undefined;
        if (ok) {
          const parsed = parseVerifiedContractAddress(j.result, body.address);
          if (parsed) verifiedAddress = parsed;
          if (verifiedAddress) {
            msg = `Verification successful — contract ${verifiedAddress}`;
          } else if (j.result) {
            msg = `Verification successful — contract ${j.result}`;
          }
        }
        setOut({ ok, text: msg, verifiedAddress });
      } catch {
        setOut({ ok: r.ok, text: msg });
      }
    } catch (e) {
      setOut({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  };

  const addrEnc = address.trim() ? encodeURIComponent(address.trim()) : "";

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold leading-snug text-slate-900 sm:text-2xl">
          Verify & Publish Contract Source Code
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Same flow as BscScan: enter contract details first, then paste source and ABI. Verification is permanent — bytecode must match on-chain code exactly.
        </p>
      </div>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
        <p className="font-semibold">ECNA Clique uses London EVM (stock Geth)</p>
        <p className="mt-1 text-xs leading-relaxed">
          In Remix set <strong>EVM version → london</strong> (not shanghai/cancun/prague). Upstream Geth rejects Clique chains with Shanghai. Solidity 0.8.20+ must explicitly select london (default solc targets emit PUSH0 otherwise).
        </p>
      </div>

      {verifiedCheckDone && alreadyVerified && address.trim() ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          <p className="font-semibold">Already verified</p>
          <p className="mt-1 text-xs">
            This address cannot be re-verified or updated.{" "}
            <Link to={`/address/${address.trim()}`} className="font-medium underline">
              View contract
            </Link>
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm font-medium text-slate-700">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full ${
            step === 1 ? "bg-brand-600 text-white" : "bg-emerald-600 text-white"
          }`}
        >
          1
        </span>
        <span className={step === 1 ? "text-slate-900" : "text-slate-500"}>Enter Contract Details</span>
        <span className="text-slate-300">→</span>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full ${
            step === 2 ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-600"
          }`}
        >
          2
        </span>
        <span className={step === 2 ? "text-slate-900" : "text-slate-500"}>Enter Source Code & ABI</span>
      </div>

      {addrEnc ? (
        <p className="text-sm">
          <Link to={`/address/${address.trim()}`} className="font-medium text-brand-600 hover:underline">
            ← Back to address
          </Link>
        </p>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="font-display text-lg font-semibold text-slate-900">Step 1 — Enter contract details</h2>

          <label className="block text-sm">
            <span className="font-medium text-slate-800">Contract address to verify</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
              placeholder="0x…"
              value={address}
              onChange={(e) => setAddress(e.target.value.trim())}
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-800">Compiler type</span>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              value={compilerKind}
              onChange={(e) => setCompilerKind(e.target.value)}
            >
              {COMPILER_TYPES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-800">Compiler version</span>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-mono"
              value={compilerVersion}
              onChange={(e) => setCompilerVersion(e.target.value)}
            >
              {COMPILER_VERSIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-800">Open source license type</span>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              value={openSourceLicense}
              onChange={(e) => setOpenSourceLicense(e.target.value)}
            >
              <option value="" disabled>
                Please Select
              </option>
              {LICENSE_OPTIONS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1 rounded border-slate-300"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
            />
            <span>I agree to the terms of service and understand that source code will be stored on this explorer.</span>
          </label>

          {step1Err ? <p className="text-sm text-red-600">{step1Err}</p> : null}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => void continueToStep2()}
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={() => {
                setAddress("");
                setOpenSourceLicense("");
                setAgreeTerms(false);
                setStep1Err(null);
              }}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold text-slate-900">Step 2 — Source code & ABI</h2>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              ← Back to step 1
            </button>
          </div>

          <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Address: <span className="font-mono">{address}</span> · Compiler: {compilerVersion} · License:{" "}
            {LICENSE_OPTIONS.find((l) => l.value === openSourceLicense)?.label ?? openSourceLicense}
          </p>
          <p className="rounded-md border border-sky-100 bg-sky-50/90 px-3 py-2 text-xs text-sky-950">
            <strong>Auto-fetch:</strong> deployed bytecode is filled from RPC. A <strong>suggested ABI</strong> is filled when the chain responds like a {token20Label()} token (bytecode pattern, or{" "}
            <code className="rounded bg-white/80 px-0.5">name</code>/<code className="rounded bg-white/80 px-0.5">symbol</code>/<code className="rounded bg-white/80 px-0.5">decimals</code> on a proxy), plus common OpenZeppelin-style extras (mint, burn, roles, UUPS). It is <strong>not</strong> compiled from your Solidity — for a{" "}
            <strong>perfect</strong> ABI match, paste the <code className="rounded bg-white/80 px-0.5">abi</code> from{" "}
            <code className="rounded bg-white/80 px-0.5">artifacts/.../ContractName.json</code>.
          </p>

          <label className="block text-sm">
            <span className="font-medium text-slate-800">Solidity source code</span>
            <textarea
              className="mt-1 h-44 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
              placeholder="// SPDX-License-Identifier: MIT&#10;pragma solidity ^0.8.24;&#10;..."
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-800">ABI</span>
            <span className="ml-1 text-xs font-normal text-slate-500">
              (JSON array, or full Hardhat artifact with <code className="rounded bg-slate-100 px-0.5">abi</code>)
            </span>
            <textarea
              className="mt-1 h-28 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
              value={abi}
              onChange={(e) => setAbi(normalizeAbiInput(e.target.value))}
            />
          </label>

          <div className="rounded-lg border border-emerald-100 bg-emerald-50/80 px-3 py-3 text-sm">
            <label className="block">
              <span className="font-medium text-emerald-950">Contract name</span>
              <span className="ml-2 text-xs font-normal text-emerald-800">(auto-detected — edit if needed)</span>
              <input
                className="mt-1 w-full rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm font-medium"
                placeholder="Filled from artifact / source / on-chain name()"
                value={name}
                onChange={(e) => {
                  nameTouched.current = true;
                  setName(e.target.value);
                  setNameHint(null);
                }}
              />
            </label>
            {nameHint && !nameTouched.current ? (
              <p className="mt-2 text-xs text-emerald-800">
                <span className="font-medium">Source:</span> {nameHint}
              </p>
            ) : name.trim() ? (
              <p className="mt-2 text-xs text-emerald-800">You can change the name above before submitting.</p>
            ) : (
              <p className="mt-2 text-xs text-amber-800">
                Paste Solidity or full Hardhat JSON above, or we try {token20Label()} <code className="rounded bg-white px-1">name()</code>{" "}
                from
                the chain. If still empty, we store as &quot;Contract&quot;.
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="rounded border-slate-300"
                checked={optimizationUsed}
                onChange={(e) => setOptimizationUsed(e.target.checked)}
              />
              <span>Optimization enabled</span>
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-800">Runs</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
                value={runs}
                onChange={(e) => setRuns(e.target.value)}
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="font-medium text-slate-800">EVM version</span>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={evmVersion}
              onChange={(e) => setEvmVersion(e.target.value)}
            >
              <option value="london">london (recommended — Clique / stock Geth)</option>
              <option value="paris">paris</option>
              <option value="berlin">berlin</option>
              <option value="istanbul">istanbul</option>
              <option value="petersburg">petersburg</option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-800">Deployed bytecode (required unless creation bytecode + tx input)</span>
            <textarea
              className="mt-1 h-20 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
              placeholder="0x… from artifacts/.../Contract.json → deployedBytecode"
              value={bytecode}
              onChange={(e) => setBytecode(e.target.value)}
            />
          </label>

          <div className="rounded-lg border border-sky-100 bg-sky-50/90 px-3 py-3 text-xs text-sky-950">
            <p className="font-semibold text-sky-950">Optional: BscScan-style creation code &amp; constructor args</p>
            <p className="mt-1 leading-relaxed text-sky-900/90">
              Paste the <strong>deployment transaction input data</strong> (full hex) and the compiler&apos;s{" "}
              <strong>creation bytecode</strong> from <code className="rounded bg-white/90 px-1">bytecode</code> /{" "}
              <code className="rounded bg-white/90 px-1">bytecode.object</code> in your artifact (without manually appending constructor args — the
              tx input already includes them). The explorer splits the ABI-encoded constructor tail like{" "}
              <a
                href="https://bscscan.com/token/0xfaf4c6e7acf3ef8a362801ecf224d9f495ffb3e6#code"
                className="font-medium underline"
                target="_blank"
                rel="noreferrer"
              >
                BscScan
              </a>
              .
            </p>
            <p className="mt-2 text-xs font-medium leading-relaxed text-sky-900">
              <strong>Auto-fill:</strong> <strong>Deployed bytecode</strong> and (when indexed) <strong>creation tx input</strong> load from the API. If your ABI
              defines a parameterless <code className="rounded bg-white/90 px-1">constructor()</code>, <strong>compiler creation bytecode</strong> is set to the
              same hex as the creation input. Contracts created via an internal factory often have no creation tx in the indexer — paste manually.
            </p>
            {deployMetaHint ? (
              <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs leading-relaxed text-amber-950">
                {deployMetaHint}
              </p>
            ) : null}
          </div>

          <label className="block text-sm">
            <span className="font-medium text-slate-800">Optional: contract creation transaction input</span>
            <textarea
              className="mt-1 h-20 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
              placeholder="0x… full &quot;Input Data&quot; from the contract creation tx (same length as in your explorer / wallet)"
              value={creationTxInput}
              onChange={(e) => setCreationTxInput(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-800">Optional: compiler creation bytecode (artifact)</span>
            <textarea
              className="mt-1 h-20 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
              placeholder="0x… from artifacts/.../Contract.json → bytecode (or paste { &quot;object&quot;: &quot;...&quot; } JSON)"
              value={compilerCreationBytecode}
              onChange={(e) => setCompilerCreationBytecode(e.target.value)}
            />
          </label>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => void submit()}
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? "Submitting…" : "Verify and Publish"}
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back
            </button>
          </div>

          {out ? (
            out.ok && out.verifiedAddress ? (
              <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 shadow-sm">
                <p className="text-sm font-semibold text-emerald-900">Verification successful</p>
                <p className="text-xs text-emerald-800/90">Contract verified — open it on this explorer below.</p>
                <Link
                  to={`/address/${out.verifiedAddress}`}
                  className="block rounded-md border border-emerald-300/80 bg-white px-3 py-2.5 font-mono text-sm font-medium text-brand-700 shadow-sm transition hover:border-brand-400 hover:bg-emerald-50/50 hover:underline"
                >
                  {out.verifiedAddress}
                </Link>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link
                    to={`/address/${out.verifiedAddress}`}
                    className="inline-flex items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-700"
                  >
                    View contract page
                  </Link>
                  <a
                    href={`${explorerPublicBase()}/address/${out.verifiedAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-md border border-emerald-600/40 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 shadow-sm hover:bg-emerald-100/80"
                  >
                    Blockchain explorer (new tab)
                  </a>
                </div>
                <p className="text-xs text-emerald-800/80">
                  Address pe click ya <strong>View contract page</strong> se yahi explorer mein contract khulega;{" "}
                  <strong>Blockchain explorer</strong> nayi tab mein khulega (URL: <span className="font-mono">VITE_EXPLORER_URL</span> ya
                  current site).
                </p>
              </div>
            ) : (
              <div
                className={`rounded-lg px-3 py-2 text-sm ${
                  out.ok ? "border border-emerald-200 bg-emerald-50 text-emerald-900" : "border border-red-200 bg-red-50 text-red-900"
                }`}
              >
                {out.text}
                {out.ok && !out.verifiedAddress && /^0x[a-fA-F0-9]{40}/.test(address.trim()) ? (
                  <span className="mt-2 block text-xs">
                    <Link className="font-medium text-brand-700 underline" to={`/address/${address.trim().toLowerCase()}`}>
                      Go to contract page
                    </Link>
                  </span>
                ) : null}
              </div>
            )
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
