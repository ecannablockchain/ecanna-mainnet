import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { BrandedLoader } from "../components/BrandedLoader";
import { ContractVerifiedPanel } from "../components/ContractVerifiedPanel";
import { SkeletonLine } from "../components/Skeleton";
import { TokenContractTabs } from "../components/TokenContractTabs";
import { fetchJson, type TxRow } from "../lib/api";
import { token20Label } from "../lib/chainBranding";
import { age, fmtNative, fmtToken, shortAddr, shortHash } from "../lib/format";

type Summary = {
  address: string;
  balanceWei: string;
  indexedTxCount: number;
  indexedErc20TransferCount?: number;
  asTokenTransferCount?: number;
  nativeSymbol?: string;
  pethToken: string | null;
  pethBalance: string | null;
  pethDecimals?: number;
  isContract?: boolean;
  contractVerified?: boolean;
  contractName?: string | null;
  compilerVersion?: string | null;
};

type VerifiedContract = {
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
  deployedBytecode?: string | null;
  contractCreationCode?: string | null;
  compilerCreationBytecode?: string | null;
  constructorArgsHex?: string | null;
  constructorArgsSplitOk?: boolean | null;
  constructorArgsDecoded?: { name: string; type: string; value: string }[] | null;
  constructorDecodeNote?: string | null;
};

type ChainMeta = {
  isContract: boolean;
  bytecode: string | null;
  bytecodeLength: number;
  contractName: string | null;
  symbol: string | null;
  isErc20Like: boolean;
  suggestedAbi: string | null;
};

type Erc20TransferRow = {
  txHash: string;
  logIndex: number;
  token: string;
  from: string;
  to: string;
  value: string;
  blockNumber: string;
  timestamp: string;
  action?: string;
  /** From API: on-chain token `symbol()` (+ decimals) */
  tokenSymbol?: string | null;
  tokenDecimals?: number;
};

type TokenHolding = {
  token: string;
  balance: string;
  balanceFormatted: string;
  symbol: string;
  decimals: number;
};

function Pill({ children, variant = "slate" }: { children: ReactNode; variant?: "slate" | "emerald" | "sky" }) {
  const cls =
    variant === "emerald"
      ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200"
      : variant === "sky"
        ? "bg-sky-100 text-sky-900 ring-1 ring-sky-200"
        : "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{children}</span>;
}

function AddrTabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-t-lg border border-b-0 px-2.5 py-2 text-xs font-semibold transition sm:px-4 sm:py-2.5 sm:text-sm ${
        active ? "border-slate-200 bg-white text-brand-700 shadow-sm" : "border-transparent bg-slate-100/80 text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function TokenHoldingsCard({ address }: { address: string }) {
  const [data, setData] = useState<{ items: TokenHolding[]; tokenCount: number } | null>(null);
  const [holdErr, setHoldErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const a = address.toLowerCase();
    setData(null);
    setHoldErr(null);
    fetchJson<{ items: TokenHolding[]; tokenCount: number }>(`/api/v1/address/${a}/token-holdings`)
      .then(setData)
      .catch((e: Error) => setHoldErr(e.message));
  }, [address]);

  const summary: ReactNode =
    holdErr != null ? (
      "—"
    ) : data == null ? (
      <SkeletonLine className="h-4 w-28" />
    ) : data.tokenCount === 0 ? (
      "0 tokens"
    ) : (
      `${data.tokenCount} token(s)`
    );

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Token holdings</div>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">
        Balances from indexed <code className="rounded bg-white px-0.5">Transfer</code> logs (all {token20Label()} tokens by default)
        plus live <code className="rounded bg-white px-0.5">balanceOf</code> for the configured featured token. Amounts use each
        token&apos;s{" "}
        <code className="rounded bg-white px-0.5">decimals()</code>.
      </p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-2 flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm hover:bg-slate-50"
      >
        <span className="font-mono text-sm font-semibold text-slate-900">{summary}</span>
        <span className="text-slate-400">{open ? "▾" : "▸"}</span>
      </button>
      {holdErr ? <p className="mt-2 text-xs text-amber-800">{holdErr}</p> : null}
      {open && data && data.items.length > 0 ? (
        <ul className="mt-2 max-h-64 space-y-2 overflow-auto border-t border-slate-200 pt-2">
          {data.items.map((h) => (
            <li
              key={h.token}
              className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-2 text-xs last:border-0"
            >
              <div>
                <Link to={`/address/${h.token}`} className="font-semibold text-brand-600 hover:underline">
                  {h.symbol}
                </Link>
                <div className="mt-0.5 font-mono text-[10px] text-slate-500">{shortAddr(h.token, 8)}</div>
              </div>
              <div className="text-right font-mono text-slate-900">
                {h.balanceFormatted}
                <div className="text-[10px] text-slate-400">{h.decimals} dp</div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {open && data && data.items.length === 0 && !holdErr ? (
        <p className="mt-2 text-xs text-slate-500">
          No balances yet. Run <code className="rounded bg-white px-1">npm run indexer -w server</code> (indexes all {token20Label()}{" "}
          transfers unless{" "}
          <code className="rounded bg-white px-1">INDEXER_ONLY_PETH=1</code>).
        </p>
      ) : null}
    </div>
  );
}

function CopyHashBtn({ hash }: { hash: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      title="Copy transaction hash"
      className="inline-flex shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      onClick={() => {
        void navigator.clipboard.writeText(hash).then(() => {
          setOk(true);
          setTimeout(() => setOk(false), 1200);
        });
      }}
    >
      {ok ? (
        <span className="text-[10px] font-semibold text-emerald-600">✓</span>
      ) : (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

function xferAmountLabel(r: Erc20TransferRow): string {
  const dec = r.tokenDecimals ?? 18;
  const sym = (r.tokenSymbol && r.tokenSymbol.trim()) || shortAddr(r.token, 4);
  return fmtToken(r.value, dec, sym);
}

export function AddressPage() {
  const { addr } = useParams();
  const [sum, setSum] = useState<Summary | null>(null);
  const [txs, setTxs] = useState<TxRow[]>([]);
  const [erc20, setErc20] = useState<Erc20TransferRow[]>([]);
  const [verified, setVerified] = useState<VerifiedContract | null>(null);
  const [chainMeta, setChainMeta] = useState<ChainMeta | null>(null);
  const [chainLoading, setChainLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [addrTab, setAddrTab] = useState<"transactions" | "token-transfers" | "contract">("transactions");

  useEffect(() => {
    setAddrTab("transactions");
  }, [addr]);

  useEffect(() => {
    if (!addr) return;
    setSum(null);
    setVerified(null);
    setChainMeta(null);
    setErr(null);
    const a = addr.toLowerCase();
    Promise.all([
      fetchJson<Summary>(`/api/v1/address/${a}/summary`),
      fetchJson<{ items: TxRow[] }>(`/api/v1/address/${a}/transactions?limit=50`),
      fetchJson<{ items: Erc20TransferRow[] }>(`/api/v1/address/${a}/erc20-transfers?limit=50`),
    ])
      .then(([s, t, e]) => {
        setSum(s);
        setTxs(t.items ?? []);
        setErc20(e.items ?? []);
      })
      .catch((e: Error) => setErr(e.message));
  }, [addr]);

  useEffect(() => {
    if (!addr) return;
    if (!sum) {
      setVerified(null);
      return;
    }
    if (!sum.contractVerified) {
      setVerified(null);
      return;
    }
    if (sum.address.toLowerCase() !== addr.toLowerCase()) {
      setVerified(null);
      return;
    }
    const a = addr.toLowerCase();
    let c = true;
    fetchJson<VerifiedContract>(`/api/v1/contract/${a}/verified`)
      .then((v) => {
        if (c) setVerified(v);
      })
      .catch(() => {
        if (c) setVerified(null);
      });
    return () => {
      c = false;
    };
  }, [addr, sum]);

  useEffect(() => {
    if (!addr || !sum?.isContract) {
      setChainMeta(null);
      return;
    }
    const a = addr.toLowerCase();
    let c = true;
    setChainLoading(true);
    fetchJson<ChainMeta>(`/api/v1/contract/${a}/chain-meta`)
      .then((m) => {
        if (c) setChainMeta(m);
      })
      .catch(() => {
        if (c) setChainMeta(null);
      })
      .finally(() => {
        if (c) setChainLoading(false);
      });
    return () => {
      c = false;
    };
  }, [addr, sum?.isContract]);

  if (err) return <p className="text-red-600">{err}</p>;
  if (!sum) return <BrandedLoader variant="inline" subtitle="Loading address…" />;

  const dec = sum.pethDecimals ?? 18;

  const showTokenPage =
    sum.isContract && ((sum.asTokenTransferCount ?? 0) > 0 || chainMeta?.isErc20Like === true);

  const chainInferredVerified =
    chainMeta?.isContract && chainMeta.bytecode && chainMeta.suggestedAbi
      ? {
          address: sum.address,
          contractName: chainMeta.contractName || "Contract",
          compilerKind: "solidity-single-file" as const,
          compilerVersion: "—",
          optimization: false,
          runs: 0,
          evmVersion: "—",
          exactBytecodeMatch: false,
          openSourceLicense: "—",
          sourceCode: `// Runtime bytecode from eth_getCode.\n// Use Verify & Publish to attach Solidity source.\n\n${chainMeta.bytecode}`,
          abi: chainMeta.suggestedAbi,
        }
      : null;

  const pageTitle = showTokenPage ? "Token / contract" : sum.isContract ? "Contract" : "Wallet";

  const overviewRow = (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm">
        <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-900">Overview</div>
        <div className="mt-2 text-xs font-semibold uppercase text-emerald-800">Native balance</div>
        <div className="mt-1 break-all font-mono text-lg font-bold text-emerald-950 sm:text-2xl">
          {fmtNative(sum.balanceWei, sum.nativeSymbol ?? "ECNA")}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-emerald-900/90">
          Used for gas on this network. {token20Label()} balances are separate — see <strong>Token holdings</strong>.
        </p>
      </div>
      <TokenHoldingsCard address={sum.address} />
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">More info</div>
        <ul className="mt-2 space-y-2 text-sm text-slate-700">
          <li>
            <span className="text-slate-500">Type:</span> {sum.isContract ? "Smart contract" : "Wallet (EOA)"}
          </li>
          {sum.contractVerified ? (
            <li className="text-emerald-800">
              <span aria-hidden>✓</span> Source verified
              {sum.contractName ? <span className="ml-1 font-mono text-xs">({sum.contractName})</span> : null}
            </li>
          ) : sum.isContract ? (
            <li className="text-amber-800">Source not verified</li>
          ) : null}
          <li>
            <span className="text-slate-500">Indexed transactions:</span> {sum.indexedTxCount.toLocaleString()}
          </li>
          <li>
            <span className="text-slate-500">Indexed {token20Label()} events (this address):</span>{" "}
            {(sum.indexedErc20TransferCount ?? 0).toLocaleString()}
          </li>
        </ul>
        <div className="mt-3 border-t border-slate-100 pt-3">
          <div className="text-[10px] font-bold uppercase text-slate-500">Network</div>
          <p className="mt-1 text-xs text-slate-600">Single-chain explorer (indexed locally). No multichain portfolio.</p>
        </div>
      </div>
    </div>
  );

  const tokenTrackerCard =
    showTokenPage || (sum.isContract && (chainMeta?.symbol || chainMeta?.contractName)) ? (
      <div className="mt-4 rounded-lg border border-sky-100 bg-sky-50/60 px-4 py-3 text-sm text-sky-950">
        <span className="text-xs font-bold uppercase tracking-wide text-sky-800">Token tracker</span>
        <p className="mt-1">
          This contract is the{" "}
          <strong>{chainMeta?.symbol ?? chainMeta?.contractName ?? sum.contractName ?? token20Label(sum.nativeSymbol)}</strong> token.
          Use the tabs below for transfers, holders, and contract code.
        </p>
      </div>
    ) : null;

  const contractPanel = (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900">Contract</h2>
          <p className="mt-1 text-sm text-slate-600">
            Publish verified source for full explorer metadata. Bytecode and a standard {token20Label()} ABI are auto-fetched from the
            RPC when
            possible.
          </p>
          {sum.contractVerified ? (
            <p className="mt-2 inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
              <span aria-hidden>✓</span> Contract source verified
              {sum.contractName ? <span className="font-mono text-xs">· {sum.contractName}</span> : null}
            </p>
          ) : (
            <p className="mt-2 text-sm text-amber-800">
              Not verified yet — use <strong>Verify & Publish</strong> to submit Solidity source and ABI (Hardhat artifact JSON is
              supported).
            </p>
          )}
        </div>
        {!sum.contractVerified ? (
          <Link
            to={`/verify?address=${encodeURIComponent(sum.address)}`}
            className="shrink-0 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700"
          >
            Verify & Publish
          </Link>
        ) : (
          <span className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800">
            Verified (locked)
          </span>
        )}
      </div>
      {verified ? (
        <ContractVerifiedPanel verified={verified} />
      ) : sum.contractVerified ? (
        <p className="mt-4 text-sm text-slate-500">Loading verified source…</p>
      ) : null}

      {!sum.contractVerified && sum.isContract ? (
        <div className="mt-6 border-t border-slate-100 pt-6">
          {chainLoading ? (
            <p className="text-sm text-slate-500">Loading bytecode and ABI hints from chain…</p>
          ) : chainMeta?.isContract && chainMeta.bytecode ? (
            chainMeta.suggestedAbi ? (
              <ContractVerifiedPanel
                variant="chain-inferred"
                verified={{
                  address: sum.address,
                  contractName: chainMeta.contractName || "Contract",
                  compilerKind: "solidity-single-file",
                  compilerVersion: "—",
                  optimization: false,
                  runs: 0,
                  evmVersion: "—",
                  exactBytecodeMatch: false,
                  openSourceLicense: "—",
                  sourceCode: `// Runtime bytecode from eth_getCode (same as BscScan "Contract Creation Code" / deployed code).\n// Use Verify & Publish to attach Solidity source.\n\n${chainMeta.bytecode}`,
                  abi: chainMeta.suggestedAbi,
                }}
              />
            ) : (
              <div className="space-y-2">
                <h3 className="font-display text-sm font-semibold text-slate-800">Deployed bytecode (auto-fetched)</h3>
                <p className="text-xs text-slate-600">
                  Could not infer a token ABI from this address (no {token20Label()}-style responses). Use Verify &amp; Publish with
                  your artifact ABI for Read/Write, or copy bytecode below.
                </p>
                <pre className="max-h-64 overflow-auto rounded-lg border border-slate-800 bg-[#1e1e1e] p-3 text-left text-[10px] leading-relaxed text-[#d4d4d4]">
                  {chainMeta.bytecode}
                </pre>
              </div>
            )
          ) : null}
        </div>
      ) : null}
    </section>
  );

  const transfersTable = (
    <div>
      <p className="mb-2 text-sm text-slate-600">
        {token20Label()} <code className="rounded bg-slate-100 px-1">Transfer</code> events involving this address. Receiving tokens
        appears here
        even when the chain tx <code className="rounded bg-slate-100 px-1">to</code> is the token contract.
      </p>
      <p className="mb-2 text-sm font-medium text-slate-700">
        {(sum.indexedErc20TransferCount ?? erc20.length).toLocaleString()} transfer
        {(sum.indexedErc20TransferCount ?? erc20.length) === 1 ? "" : "s"} indexed
        {erc20.length > 0 ? (
          <span className="font-normal text-slate-500"> — showing latest {erc20.length} (max 50)</span>
        ) : null}
      </p>
      <div className="pes-table-wrap">
        <table className="w-full min-w-[920px] border-collapse">
          <thead>
            <tr>
              <th className="pes-th">Transaction hash</th>
              <th className="pes-th">Action</th>
              <th className="pes-th">Block</th>
              <th className="pes-th">Age</th>
              <th className="pes-th">From / To</th>
              <th className="pes-th text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {erc20.map((r) => (
              <tr key={`${r.txHash}-${r.logIndex}`}>
                <td className="pes-td">
                  <div className="flex items-center gap-0.5">
                    <Link to={`/tx/${r.txHash}`} className="pes-link">
                      {shortHash(r.txHash)}
                    </Link>
                    <CopyHashBtn hash={r.txHash} />
                  </div>
                </td>
                <td className="pes-td">
                  <span className="pes-pill font-mono text-[11px]">{r.action ?? "Transfer"}</span>
                </td>
                <td className="pes-td">
                  <Link to={`/block/${r.blockNumber}`} className="pes-link">
                    {r.blockNumber}
                  </Link>
                </td>
                <td className="pes-td text-slate-500">{age(r.timestamp)}</td>
                <td className="pes-td">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link to={`/address/${r.from}`} className="pes-link">
                      {shortAddr(r.from)}
                    </Link>
                    <span
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs text-slate-400"
                      aria-hidden
                    >
                      →
                    </span>
                    <Link to={`/address/${r.to}`} className="pes-link">
                      {shortAddr(r.to)}
                    </Link>
                  </div>
                </td>
                <td className="pes-td text-right font-mono text-xs">
                  {xferAmountLabel(r)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {erc20.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">No indexed transfers yet for this address.</p>
      ) : null}
    </div>
  );

  const transactionsTable = (
    <div>
      <p className="mb-2 text-sm text-slate-600">
        Native + contract calls where this address appears as <code className="rounded bg-slate-100 px-1">from</code> or{" "}
        <code className="rounded bg-slate-100 px-1">to</code>.
      </p>
      <div className="pes-table-wrap">
        <table className="w-full min-w-[960px] border-collapse">
          <thead>
            <tr>
              <th className="pes-th">Transaction hash</th>
              <th className="pes-th">Action</th>
              <th className="pes-th">Block</th>
              <th className="pes-th">Age</th>
              <th className="pes-th">From</th>
              <th className="pes-th">To</th>
              <th className="pes-th text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {txs.map((t) => (
              <tr key={t.hash}>
                <td className="pes-td">
                  <div className="flex items-center gap-0.5">
                    <Link to={`/tx/${t.hash}`} className="pes-link">
                      {shortHash(t.hash)}
                    </Link>
                    <CopyHashBtn hash={t.hash} />
                  </div>
                </td>
                <td className="pes-td">
                  <span className="pes-pill">{t.action}</span>
                </td>
                <td className="pes-td">
                  <Link to={`/block/${t.blockNumber}`} className="pes-link">
                    {t.blockNumber}
                  </Link>
                </td>
                <td className="pes-td text-slate-500">{t.timestamp ? age(t.timestamp) : "—"}</td>
                <td className="pes-td">
                  <Link to={`/address/${t.from}`} className="pes-link">
                    {shortAddr(t.from)}
                  </Link>
                </td>
                <td className="pes-td">
                  {t.to ? (
                    <Link to={`/address/${t.to}`} className="pes-link">
                      {shortAddr(t.to)}
                    </Link>
                  ) : (
                    <span className="text-slate-400">Contract creation</span>
                  )}
                </td>
                <td className="pes-td text-right font-mono text-xs">{fmtNative(t.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {!showTokenPage ? (
        <>
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">{pageTitle}</h1>
            <p className="mt-1 break-all font-mono text-sm text-slate-600">{sum.address}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {sum.isContract ? <Pill variant="sky">Contract</Pill> : <Pill>Wallet</Pill>}
              {sum.contractVerified ? (
                <Pill variant="emerald">
                  <span aria-hidden>✓</span> Verified
                </Pill>
              ) : null}
              {sum.isContract && chainMeta?.isErc20Like ? <Pill>{token20Label(sum.nativeSymbol)}</Pill> : null}
            </div>
          </div>

          {overviewRow}
        </>
      ) : null}

      {showTokenPage ? (
        <TokenContractTabs
          tokenAddress={sum.address}
          pethToken={sum.pethToken}
          pethDecimals={dec}
          verified={verified}
          verifiedLoading={Boolean(sum.contractVerified && !verified)}
          chainInferred={chainInferredVerified}
          chainLoading={chainLoading}
          verifyHref={`/verify?address=${encodeURIComponent(sum.address)}`}
          contractVerified={Boolean(sum.contractVerified)}
          contractName={sum.contractName ?? null}
          nativeBalanceWei={sum.balanceWei}
          nativeSymbol={sum.nativeSymbol ?? "ECNA"}
          chainNameHint={chainMeta?.contractName ?? null}
          chainSymbolHint={chainMeta?.symbol ?? null}
        />
      ) : (
        <>
          {sum.isContract && tokenTrackerCard}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm">
            <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-100/80 px-2 pt-2">
              <AddrTabButton active={addrTab === "transactions"} onClick={() => setAddrTab("transactions")}>
                Transactions
              </AddrTabButton>
              <AddrTabButton active={addrTab === "token-transfers"} onClick={() => setAddrTab("token-transfers")}>
                Token transfers ({token20Label(sum.nativeSymbol)})
              </AddrTabButton>
              {sum.isContract ? (
                <AddrTabButton active={addrTab === "contract"} onClick={() => setAddrTab("contract")}>
                  <span className="inline-flex items-center gap-1.5">
                    Contract
                    {sum.contractVerified ? (
                      <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">✓</span>
                    ) : null}
                  </span>
                </AddrTabButton>
              ) : null}
            </div>
            <div className="bg-white p-3 sm:p-4">
              {addrTab === "transactions" ? transactionsTable : null}
              {addrTab === "token-transfers" ? transfersTable : null}
              {addrTab === "contract" && sum.isContract ? contractPanel : null}
            </div>
          </div>
        </>
      )}

      {!showTokenPage ? (
        <p className="rounded-lg border border-sky-100 bg-sky-50/80 px-3 py-2 text-sm text-slate-700">
          <strong>Tip:</strong> Import custom tokens in MetaMask with the contract address. The indexer now records{" "}
          <strong>all</strong> {token20Label()} <code className="rounded bg-white px-1">Transfer</code> logs by default (set{" "}
          <code className="rounded bg-white px-1">INDEXER_ONLY_PETH=1</code> on the indexer to limit to the configured token only).
        </p>
      ) : null}
    </div>
  );
}
