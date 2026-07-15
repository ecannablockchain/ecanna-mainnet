import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageDataSkeleton } from "../components/Skeleton";
import { fetchJson } from "../lib/api";
import { token20Label } from "../lib/chainBranding";
import { age, fmtFeeNative, fmtToken, shortAddr, shortHash } from "../lib/format";

const PAGE_SIZE = 25;

type Row = {
  txHash: string;
  logIndex: number;
  token: string;
  from: string;
  to: string;
  value: string;
  blockNumber: string;
  timestamp: string;
  feeWei: string | null;
  action?: string;
  tokenSymbol?: string | null;
  tokenDecimals?: number;
};

export function TransfersPage() {
  const [sp, setSp] = useSearchParams();
  const token = sp.get("token") || "";
  const page = Math.max(1, parseInt(sp.get("p") || "1", 10) || 1);
  const [data, setData] = useState<{ items: Row[]; total: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const offset = (page - 1) * PAGE_SIZE;
    const q = token
      ? `/api/v1/tokens/transfers?limit=${PAGE_SIZE}&offset=${offset}&token=${encodeURIComponent(token)}`
      : `/api/v1/tokens/transfers?limit=${PAGE_SIZE}&offset=${offset}`;
    fetchJson<{ items: Row[]; total: number }>(q)
      .then(setData)
      .catch((e: Error) => setErr(e.message));
  }, [page, token]);

  if (err) return <p className="text-red-600">{err}</p>;
  if (!data) return <PageDataSkeleton titleWidth="w-64" />;

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">Token transfers ({token20Label()})</h1>
      <p className="break-words text-sm text-slate-600">
        {token ? (
          <>
            Filter: <span className="break-all font-mono text-xs sm:text-sm">{token}</span> —{" "}
          </>
        ) : null}
        {data.total.toLocaleString()} transfers indexed
      </p>

      <div className="pes-table-wrap">
        <table className="w-full min-w-[960px] border-collapse">
          <thead>
            <tr>
              <th className="pes-th">Txn hash</th>
              <th className="pes-th">Action</th>
              <th className="pes-th">Block</th>
              <th className="pes-th">Age</th>
              <th className="pes-th">From</th>
              <th className="pes-th">To</th>
              <th className="pes-th text-right">Amount</th>
              <th className="pes-th text-right">Txn fee</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((r) => (
              <tr key={`${r.txHash}-${r.logIndex}`}>
                <td className="pes-td">
                  <Link to={`/tx/${r.txHash}`} className="pes-link">
                    {shortHash(r.txHash)}
                  </Link>
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
                  <Link to={`/address/${r.from}`} className="pes-link">
                    {shortAddr(r.from)}
                  </Link>
                </td>
                <td className="pes-td">
                  <Link to={`/address/${r.to}`} className="pes-link">
                    {shortAddr(r.to)}
                  </Link>
                </td>
                <td className="pes-td text-right font-mono text-xs">
                  {fmtToken(
                    r.value,
                    r.tokenDecimals ?? 18,
                    (r.tokenSymbol && r.tokenSymbol.trim()) || shortAddr(r.token, 4),
                  )}
                </td>
                <td className="pes-td text-right font-mono text-xs">{fmtFeeNative(r.feeWei)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
        <button
          type="button"
          disabled={page <= 1}
          className="rounded border border-slate-300 bg-white px-3 py-1 disabled:opacity-40"
          onClick={() => {
            const n = new URLSearchParams(sp);
            n.set("p", String(page - 1));
            setSp(n);
          }}
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
          onClick={() => {
            const n = new URLSearchParams(sp);
            n.set("p", String(page + 1));
            setSp(n);
          }}
        >
          Next
        </button>
      </div>

      <p className="text-xs text-slate-500">
        Tip: add <code className="rounded bg-slate-100 px-1">?token=0x...</code> to filter one token contract.
      </p>
    </div>
  );
}
