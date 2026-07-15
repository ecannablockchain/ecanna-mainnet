import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageDataSkeleton } from "../components/Skeleton";
import { fetchJson, type TxRow } from "../lib/api";
import { age, fmtFeeNative, fmtNative, shortAddr, shortHash } from "../lib/format";

const PAGE_SIZE = 25;

export function TxsPage() {
  const [sp, setSp] = useSearchParams();
  const page = Math.max(1, parseInt(sp.get("p") || "1", 10) || 1);
  const [data, setData] = useState<{ items: TxRow[]; total: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const offset = (page - 1) * PAGE_SIZE;
    fetchJson<{ items: TxRow[]; total: number }>(`/api/v1/transactions?limit=${PAGE_SIZE}&offset=${offset}`)
      .then(setData)
      .catch((e: Error) => setErr(e.message));
  }, [page]);

  if (err) return <p className="text-red-600">{err}</p>;
  if (!data) return <PageDataSkeleton titleWidth="w-48" />;

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">Transactions</h1>
          <p className="mt-1 text-sm text-slate-600">
            A total of <strong>{data.total.toLocaleString()}</strong> transactions indexed
            {data.total > PAGE_SIZE ? ` (page ${page} of ${totalPages})` : ""}.
          </p>
        </div>
        <Link to="/api-docs" className="text-sm text-brand-600 hover:underline">
          API →
        </Link>
      </div>

      <div className="pes-table-wrap">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr>
              <th className="pes-th">Transaction hash</th>
              <th className="pes-th">Action</th>
              <th className="pes-th">Block</th>
              <th className="pes-th">Age</th>
              <th className="pes-th">From</th>
              <th className="pes-th">To</th>
              <th className="pes-th text-right">Value</th>
              <th className="pes-th text-right">Txn fee</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((t) => (
              <tr key={t.hash}>
                <td className="pes-td">
                  <Link to={`/tx/${t.hash}`} className="pes-link">
                    {shortHash(t.hash, 10)}
                  </Link>
                </td>
                <td className="pes-td">
                  <span className="pes-pill">{t.action}</span>
                </td>
                <td className="pes-td">
                  <Link to={`/block/${t.blockNumber}`} className="pes-link">
                    {t.blockNumber}
                  </Link>
                </td>
                <td className="pes-td text-slate-500">{age(t.timestamp)}</td>
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
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="pes-td text-right font-mono text-xs">{fmtNative(t.value)}</td>
                <td className="pes-td text-right font-mono text-xs">{fmtFeeNative(t.feeWei)}</td>
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
          onClick={() => setSp({ p: String(page - 1) })}
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
          onClick={() => setSp({ p: String(page + 1) })}
        >
          Next
        </button>
      </div>
    </div>
  );
}
