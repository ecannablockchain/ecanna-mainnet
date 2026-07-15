import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { BrandedLoader } from "../components/BrandedLoader";
import { fetchJson, type TxRow } from "../lib/api";
import { age, fmtNative, shortAddr, shortHash } from "../lib/format";

type BlockDetail = {
  number: string;
  hash: string;
  parentHash: string;
  timestamp: string;
  gasUsed: string;
  gasLimit: string;
  miner: string;
  txCount: number;
  transactions: TxRow[];
};

export function BlockPage() {
  const { num } = useParams();
  const [b, setB] = useState<BlockDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!num) return;
    fetchJson<BlockDetail>(`/api/v1/blocks/${num}`)
      .then(setB)
      .catch((e: Error) => setErr(e.message));
  }, [num]);

  if (!num) return <p className="text-red-600">Missing block number</p>;
  if (err) return <p className="text-red-600">{err}</p>;
  if (!b) return <BrandedLoader variant="inline" subtitle="Loading block…" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">Block #{b.number}</h1>
        <p className="mt-1 text-sm text-slate-500">{age(b.timestamp)}</p>
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm sm:p-4 md:grid-cols-2">
        <Row k="Hash" v={b.hash} mono />
        <Row k="Parent hash" v={b.parentHash} mono />
        <Row k="Timestamp" v={new Date(b.timestamp).toLocaleString()} />
        <Row k="Validator" v={<Link to={`/address/${b.miner}`} className="text-brand-600 hover:underline">{b.miner}</Link>} />
        <Row k="Gas used / limit" v={`${Number(b.gasUsed).toLocaleString()} / ${Number(b.gasLimit).toLocaleString()}`} />
        <Row k="Transactions" v={String(b.txCount)} />
      </div>

      <div>
        <h2 className="mb-2 font-display text-lg font-semibold">Transactions in block</h2>
        <div className="pes-table-wrap">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr>
                <th className="pes-th">Hash</th>
                <th className="pes-th">Action</th>
                <th className="pes-th">From</th>
                <th className="pes-th">To</th>
                <th className="pes-th">Value</th>
              </tr>
            </thead>
            <tbody>
              {b.transactions.map((t) => (
                <tr key={t.hash}>
                  <td className="pes-td">
                    <Link to={`/tx/${t.hash}`} className="pes-link">
                      {shortHash(t.hash)}
                    </Link>
                  </td>
                  <td className="pes-td">
                    <span className="pes-pill">{t.action}</span>
                  </td>
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
                      "—"
                    )}
                  </td>
                  <td className="pes-td font-mono text-xs">{fmtNative(t.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: ReactNode; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase text-slate-500">{k}</div>
      <div className={mono ? "break-all font-mono text-xs text-slate-800" : "text-slate-800"}>{v}</div>
    </div>
  );
}
