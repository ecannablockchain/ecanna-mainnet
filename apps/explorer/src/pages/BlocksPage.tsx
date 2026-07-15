import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageDataSkeleton } from "../components/Skeleton";
import { fetchJson, type BlockRow } from "../lib/api";
import { age, shortAddr } from "../lib/format";

const PAGE_SIZE = 25;

export function BlocksPage() {
  const [sp, setSp] = useSearchParams();
  const page = Math.max(1, parseInt(sp.get("p") || "1", 10) || 1);
  const [data, setData] = useState<{ items: BlockRow[]; total: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const offset = (page - 1) * PAGE_SIZE;
    fetchJson<{ items: BlockRow[]; total: number }>(`/api/v1/blocks?limit=${PAGE_SIZE}&offset=${offset}`)
      .then(setData)
      .catch((e: Error) => setErr(e.message));
  }, [page]);

  if (err) return <p className="text-red-600">{err}</p>;
  if (!data) return <PageDataSkeleton titleWidth="w-32" />;

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">Blocks</h1>
      <p className="text-sm text-slate-600">
        <strong>{data.total.toLocaleString()}</strong> blocks indexed
      </p>

      <div className="pes-table-wrap">
        <table className="w-full min-w-[600px] border-collapse">
          <thead>
            <tr>
              <th className="pes-th">Block</th>
              <th className="pes-th">Age</th>
              <th className="pes-th">Txn</th>
              <th className="pes-th">Gas used</th>
              <th className="pes-th">Validator</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((b) => (
              <tr key={b.number}>
                <td className="pes-td">
                  <Link to={`/block/${b.number}`} className="pes-link">
                    {b.number}
                  </Link>
                </td>
                <td className="pes-td text-slate-500">{age(b.timestamp)}</td>
                <td className="pes-td">{b.txCount}</td>
                <td className="pes-td font-mono text-xs">{Number(b.gasUsed).toLocaleString()}</td>
                <td className="pes-td">
                  <Link to={`/address/${b.miner}`} className="pes-link">
                    {shortAddr(b.miner)}
                  </Link>
                </td>
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
