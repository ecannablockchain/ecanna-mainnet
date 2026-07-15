import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageDataSkeleton } from "../components/Skeleton";
import { fetchJson } from "../lib/api";
import { fmtNative, shortAddr } from "../lib/format";

const PAGE_SIZE = 25;

export type VerifiedContractRow = {
  address: string;
  contractName: string;
  compilerKind: string;
  compilerVersion: string;
  optimization: boolean;
  runs: number;
  openSourceLicense: string;
  verifiedAt: string;
  balanceWei: string;
  txCount: number;
};

type VerifiedContractsResponse = {
  items: VerifiedContractRow[];
  total: number;
  limit: number;
  offset: number;
  nativeSymbol: string;
  stats: {
    contractsDeployed: number;
    verifiedTotal: number;
    verified24h: number;
  };
};

function compilerLabel(kind: string, version: string): string {
  const v = version.startsWith("v") ? version : `v${version}`;
  const verShort = v.replace(/\+commit\.[a-f0-9]+$/i, "");
  if (kind === "solidity-standard-json") return `Solidity(Json) ${verShort}`;
  if (kind === "solidity-multi-part") return `Solidity(Multi) ${verShort}`;
  return `Solidity ${verShort}`;
}

function CopyAddr({ address }: { address: string }) {
  const [ok, setOk] = useState(false);
  const copy = useCallback(() => {
    void navigator.clipboard.writeText(address).then(() => {
      setOk(true);
      window.setTimeout(() => setOk(false), 1200);
    });
  }, [address]);
  return (
    <button
      type="button"
      title="Copy address"
      onClick={() => copy()}
      className="ml-1 inline-flex rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
    >
      {ok ? (
        <span className="text-xs text-emerald-600">✓</span>
      ) : (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      )}
    </button>
  );
}

export function VerifiedContractsPage() {
  const [sp, setSp] = useSearchParams();
  const page = Math.max(1, parseInt(sp.get("p") || "1", 10) || 1);
  const qParam = sp.get("q") || "";
  const [searchDraft, setSearchDraft] = useState(qParam);

  useEffect(() => {
    setSearchDraft(qParam);
  }, [qParam]);

  const [data, setData] = useState<VerifiedContractsResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const offset = (page - 1) * PAGE_SIZE;
    const q = encodeURIComponent(qParam.trim());
    const qs = `/api/v1/verified-contracts?limit=${PAGE_SIZE}&offset=${offset}${qParam.trim() ? `&q=${q}` : ""}`;
    fetchJson<VerifiedContractsResponse>(qs)
      .then(setData)
      .catch((e: Error) => setErr(e.message));
  }, [page, qParam]);

  const applySearch = () => {
    const t = searchDraft.trim();
    setSp(t ? { p: "1", q: t } : { p: "1" });
  };

  if (err) return <p className="text-red-600">{err}</p>;
  if (!data) return <PageDataSkeleton titleWidth="w-56" />;

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const sym = data.nativeSymbol || "ECNA";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">Verified Contracts</h1>
        <p className="mt-1 text-sm text-slate-600">
          Contracts with source code verified on this explorer (same idea as BscScan&apos;s directory).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Contracts deployed (indexed)</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {data.stats.contractsDeployed.toLocaleString()}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Creation txs with <span className="font-mono">to</span> null</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Contracts verified (total)</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {data.stats.verifiedTotal.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Verified (24h)</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {data.stats.verified24h.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Showing <strong>{data.items.length}</strong> of <strong>{data.total.toLocaleString()}</strong> matching verified
          contracts
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            placeholder="Search by address or contract name"
            className="min-w-[200px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm sm:max-w-xs"
          />
          <button
            type="button"
            onClick={() => applySearch()}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Search
          </button>
        </div>
      </div>

      {data.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center text-sm text-slate-600">
          {data.total === 0 && !qParam.trim() ? (
            <>
              <p>No verified contracts yet.</p>
              <p className="mt-2">
                <Link to="/verify" className="font-medium text-brand-600 hover:underline">
                  Verify &amp; publish source
                </Link>
              </p>
            </>
          ) : (
            <p>No results for this search.</p>
          )}
        </div>
      ) : (
        <div className="pes-table-wrap">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="pes-th">Address</th>
                <th className="pes-th">Contract name</th>
                <th className="pes-th">Compiler</th>
                <th className="pes-th">Balance</th>
                <th className="pes-th">Txns</th>
                <th className="pes-th">Setting</th>
                <th className="pes-th">Verified</th>
                <th className="pes-th">Audit</th>
                <th className="pes-th">License</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={row.address}>
                  <td className="pes-td">
                    <span className="inline-flex items-center font-mono text-xs">
                      <Link to={`/address/${row.address}`} className="pes-link">
                        {shortAddr(row.address)}
                      </Link>
                      <CopyAddr address={row.address} />
                    </span>
                  </td>
                  <td className="pes-td max-w-[140px] truncate" title={row.contractName}>
                    {row.contractName}
                  </td>
                  <td className="pes-td max-w-[200px] font-mono text-[11px] leading-snug text-slate-700">
                    {compilerLabel(row.compilerKind, row.compilerVersion)}
                  </td>
                  <td className="pes-td whitespace-nowrap font-mono text-xs">{fmtNative(row.balanceWei, sym)}</td>
                  <td className="pes-td tabular-nums">{row.txCount.toLocaleString()}</td>
                  <td className="pes-td" title={row.optimization ? `Optimized, ${row.runs} runs` : "No optimization"}>
                    {row.optimization ? (
                      <span className="text-amber-500" aria-label="Optimization on">
                        ⚡
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="pes-td whitespace-nowrap text-slate-600">
                    {new Date(row.verifiedAt).toLocaleDateString()}
                  </td>
                  <td className="pes-td text-slate-400">—</td>
                  <td className="pes-td font-mono text-xs">{row.openSourceLicense}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.items.length > 0 ? (
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            className="rounded border border-slate-300 bg-white px-3 py-1 disabled:opacity-40"
            onClick={() => setSp(qParam.trim() ? { p: "1", q: qParam.trim() } : { p: "1" })}
          >
            First
          </button>
          <button
            type="button"
            disabled={page <= 1}
            className="rounded border border-slate-300 bg-white px-3 py-1 disabled:opacity-40"
            onClick={() => setSp({ ...(qParam.trim() ? { q: qParam.trim() } : {}), p: String(page - 1) })}
          >
            Previous
          </button>
          <span className="text-slate-600">
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            className="rounded border border-slate-300 bg-white px-3 py-1 disabled:opacity-40"
            onClick={() => setSp({ ...(qParam.trim() ? { q: qParam.trim() } : {}), p: String(page + 1) })}
          >
            Next
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            className="rounded border border-slate-300 bg-white px-3 py-1 disabled:opacity-40"
            onClick={() =>
              setSp({ ...(qParam.trim() ? { q: qParam.trim() } : {}), p: String(totalPages) })
            }
          >
            Last
          </button>
        </div>
      ) : null}
    </div>
  );
}
