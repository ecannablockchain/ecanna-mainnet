import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchJson, type TxDecodedInput, type TxRow } from "../lib/api";
import { token20Label } from "../lib/chainBranding";
import { BrandedLoader } from "../components/BrandedLoader";
import { TokenLogo } from "../components/TokenLogo";
import { age, fmtFeeNative, fmtNative, shortAddr } from "../lib/format";

function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      title={label}
      className="ml-1 inline-flex rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setOk(true);
          setTimeout(() => setOk(false), 1200);
        });
      }}
    >
      {ok ? <span className="text-[10px] font-semibold text-emerald-600">✓</span> : "⎘"}
    </button>
  );
}

function gasPriceLabel(wei: string | null): string {
  if (!wei) return "—";
  try {
    const n = BigInt(wei);
    const gwei = Number(n) / 1e9;
    return `${gwei.toLocaleString(undefined, { maximumFractionDigits: 6 })} Gwei`;
  } catch {
    return wei;
  }
}

function absTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toUTCString().replace("GMT", "UTC");
  } catch {
    return iso;
  }
}

function exportDecodedJson(d: TxDecodedInput): string {
  return JSON.stringify(
    {
      function: d.functionDisplay ?? d.name,
      methodId: d.selector,
      arguments: d.args.map((a) => ({
        name: a.name,
        type: a.type,
        value: a.value,
        displayValue: a.displayValue,
      })),
      paramSlots: d.rawParamWords ?? [],
    },
    null,
    2,
  );
}

function gasUsageLine(gasLimit: string | null | undefined, gasUsed: string | null | undefined): string | null {
  if (!gasLimit || !gasUsed) return null;
  try {
    const lim = Number(gasLimit);
    const used = Number(gasUsed);
    if (!Number.isFinite(lim) || !Number.isFinite(used) || lim <= 0) return null;
    const pct = ((used / lim) * 100).toFixed(2);
    return `${lim.toLocaleString()} | ${used.toLocaleString()} (${pct}%)`;
  } catch {
    return null;
  }
}

export function TxPage() {
  const { hash } = useParams();
  const [t, setT] = useState<TxRow | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [exportOk, setExportOk] = useState(false);

  useEffect(() => {
    if (!hash) return;
    fetchJson<TxRow>(`/api/v1/tx/${hash}`)
      .then(setT)
      .catch((e: Error) => setErr(e.message));
  }, [hash]);

  if (!hash) return <p className="text-red-600">Missing transaction hash</p>;
  if (err) return <p className="text-red-600">{err}</p>;
  if (!t) return <BrandedLoader variant="inline" subtitle="Loading transaction…" />;

  const isPending = t.pending === true || t.blockNumber === "pending";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">Transaction details</h1>
        <p className="mt-1 flex flex-wrap items-center break-all font-mono text-sm text-slate-600">
          {t.hash}
          <CopyBtn text={t.hash} label="Copy transaction hash" />
        </p>
      </div>

      {t.indexed === false ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong>Live RPC data:</strong> This transaction is not in the indexer DB yet (or indexer is behind). Details below are read
          directly from your node. After the indexer catches up, lists on Home / Txs will show it too.
        </div>
      ) : null}

      {isPending ? (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          <strong>Pending:</strong> Transaction is in the mempool — not mined yet. Refresh after a block is produced.
        </div>
      ) : null}

      {t.actionSummary ? (
        <div className="flex gap-3 rounded-xl border border-amber-100 bg-gradient-to-r from-amber-50/90 to-orange-50/50 px-4 py-3 text-sm text-slate-800 shadow-sm">
          <img src="../logo-thumb.png" alt="" className="h-9 w-9 shrink-0 ecna-icon-mark" />
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-900/80">Transaction action</div>
            <p className="mt-1 font-medium leading-relaxed">{t.actionSummary}</p>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm sm:p-4">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Overview</h2>
        <dl className="divide-y divide-slate-100">
          <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:items-center">
            <dt className="text-xs font-medium uppercase text-slate-500">Status</dt>
            <dd>
              <span
                className={
                  isPending
                    ? "inline-flex rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800"
                    : t.status === 1
                      ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800"
                      : "inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800"
                }
              >
                {isPending ? "Pending" : t.status === 1 ? "Success" : "Failed"}
              </span>
            </dd>
          </div>
          <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:items-center">
            <dt className="text-xs font-medium uppercase text-slate-500">Block</dt>
            <dd>
              {isPending ? (
                <span className="text-slate-600">— (pending)</span>
              ) : (
                <Link to={`/block/${t.blockNumber}`} className="font-mono text-brand-600 hover:underline">
                  {t.blockNumber}
                </Link>
              )}
            </dd>
          </div>
          <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:items-start">
            <dt className="text-xs font-medium uppercase text-slate-500">Timestamp</dt>
            <dd className="text-slate-700">
              {t.timestamp ? (
                <>
                  <span className="text-slate-500">{age(t.timestamp)}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{absTimestamp(t.timestamp)}</span>
                </>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:items-start">
            <dt className="text-xs font-medium uppercase text-slate-500">From</dt>
            <dd className="break-all font-mono text-xs">
              <Link to={`/address/${t.from}`} className="text-brand-600 hover:underline">
                {t.from}
              </Link>
              <CopyBtn text={t.from} />
            </dd>
          </div>
          <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:items-start">
            <dt className="text-xs font-medium uppercase text-slate-500">Interacted with (To)</dt>
            <dd className="break-all font-mono text-xs">
              {t.to ? (
                <>
                  <Link to={`/address/${t.to}`} className="text-brand-600 hover:underline">
                    {t.to}
                  </Link>
                  <CopyBtn text={t.to} />
                </>
              ) : (
                <span className="text-slate-400">Contract creation</span>
              )}
            </dd>
          </div>

          {t.tokenTransfers && t.tokenTransfers.length > 0 ? (
            <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:items-start">
              <dt className="text-xs font-medium uppercase text-slate-500">{token20Label()} tokens transferred</dt>
              <dd className="space-y-2">
                {t.tokenTransfers.map((x, i) => (
                  <div key={`${x.token}-${x.from}-${x.to}-${i}`} className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs">
                    <span className="text-slate-600">From</span>{" "}
                    <Link to={`/address/${x.from}`} className="font-mono text-brand-600 hover:underline">
                      {shortAddr(x.from, 8)}
                    </Link>
                    <span className="mx-2 text-slate-400">→</span>
                    <span className="text-slate-600">To</span>{" "}
                    <Link to={`/address/${x.to}`} className="font-mono text-brand-600 hover:underline">
                      {shortAddr(x.to, 8)}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-slate-900">
                      <TokenLogo src={x.logoUrl} alt="" size={18} />
                      <span className="font-semibold">{x.valueFormatted}</span>{" "}
                      <Link to={`/address/${x.token}`} className="inline-flex items-center gap-1 text-brand-600 hover:underline">
                        {x.symbol}
                      </Link>
                      <span className="ml-1 text-[10px] text-slate-400">({x.decimals} decimals)</span>
                    </div>
                  </div>
                ))}
              </dd>
            </div>
          ) : null}

          <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:items-center">
            <dt className="text-xs font-medium uppercase text-slate-500">Method</dt>
            <dd>
              <span className="pes-pill font-mono text-[11px]">{t.action}</span>
            </dd>
          </div>
          <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:items-center">
            <dt className="text-xs font-medium uppercase text-slate-500">Value</dt>
            <dd className="font-mono">{fmtNative(t.value)}</dd>
          </div>
          <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:items-center">
            <dt className="text-xs font-medium uppercase text-slate-500">Transaction fee</dt>
            <dd className="font-mono">{fmtFeeNative(t.feeWei)}</dd>
          </div>
          <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:items-center">
            <dt className="text-xs font-medium uppercase text-slate-500">Gas price</dt>
            <dd className="font-mono text-xs">{gasPriceLabel(t.gasPrice)}</dd>
          </div>
        </dl>

        <button
          type="button"
          className="mt-4 text-sm font-semibold text-brand-600 hover:text-brand-700"
          onClick={() => setShowMore((v) => !v)}
        >
          {showMore ? "− Click to show less" : "+ Click to show more"}
        </button>

        {showMore ? (
          <dl className="mt-4 divide-y divide-slate-100 border-t border-slate-100 pt-2">
            <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:items-center">
              <dt className="text-xs font-medium uppercase text-slate-500">Nonce</dt>
              <dd className="font-mono">{t.nonce ?? "—"}</dd>
            </div>
            <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:items-center">
              <dt className="text-xs font-medium uppercase text-slate-500">Position in block</dt>
              <dd className="font-mono">{t.transactionIndex ?? "—"}</dd>
            </div>
            {gasUsageLine(t.gasLimit, t.gasUsed) ? (
              <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:items-center">
                <dt className="text-xs font-medium uppercase text-slate-500">Gas limit &amp; usage by txn</dt>
                <dd className="font-mono text-xs">{gasUsageLine(t.gasLimit, t.gasUsed)}</dd>
              </div>
            ) : (
              <>
                <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:items-center">
                  <dt className="text-xs font-medium uppercase text-slate-500">Gas limit</dt>
                  <dd className="font-mono">{t.gasLimit ?? "—"}</dd>
                </div>
                <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:items-center">
                  <dt className="text-xs font-medium uppercase text-slate-500">Gas used</dt>
                  <dd className="font-mono">{t.gasUsed ?? "—"}</dd>
                </div>
              </>
            )}
            {t.blockHash ? (
              <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:items-start">
                <dt className="text-xs font-medium uppercase text-slate-500">Block hash</dt>
                <dd className="break-all font-mono text-[11px] text-slate-700">{t.blockHash}</dd>
              </div>
            ) : null}

            <div className="py-3">
              <dt className="mb-2 text-xs font-medium uppercase text-slate-500">Input data</dt>
              <dd className="space-y-3">
                {t.decodedInput ? (
                  <>
                    <div className="rounded-lg border border-slate-200 bg-slate-100 p-3 font-mono text-[11px] leading-relaxed text-slate-900 shadow-inner">
                      <div className="break-words">
                        <span className="text-slate-500">Function:</span>{" "}
                        <span className="font-semibold text-slate-900">
                          {t.decodedInput.functionDisplay ?? t.decodedInput.name}
                        </span>
                      </div>
                      <div className="mt-1.5 break-all text-slate-700">
                        <span className="text-slate-500">MethodID:</span> {t.decodedInput.selector}
                      </div>
                      {(t.decodedInput.rawParamWords ?? []).map((w, i) => (
                        <div key={i} className="mt-1.5 break-all text-slate-800">
                          <span className="text-slate-500">[{i}]:</span> {w}
                        </div>
                      ))}
                    </div>

                    {t.decodedInput.args.length > 0 ? (
                      <div>
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Decoded values
                        </p>
                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                          <table className="w-full min-w-[400px] border-collapse text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50">
                                <th className="px-3 py-2 font-semibold text-slate-600">#</th>
                                <th className="px-3 py-2 font-semibold text-slate-600">Name</th>
                                <th className="px-3 py-2 font-semibold text-slate-600">Type</th>
                                <th className="px-3 py-2 font-semibold text-slate-600">Data</th>
                              </tr>
                            </thead>
                            <tbody>
                              {t.decodedInput.args.map((a, i) => (
                                <tr key={i} className="border-b border-slate-100">
                                  <td className="px-3 py-2 font-mono text-slate-500">{i}</td>
                                  <td className="px-3 py-2 font-mono">{a.name}</td>
                                  <td className="px-3 py-2 font-mono text-slate-600">{a.type}</td>
                                  <td className="px-3 py-2 font-mono text-slate-900">
                                    {a.displayValue && a.displayValue !== a.value ? (
                                      <>
                                        <span className="font-semibold text-emerald-800">{a.displayValue}</span>
                                        <div className="mt-0.5 text-[10px] text-slate-400">raw: {a.value}</div>
                                      </>
                                    ) : a.type === "address" ? (
                                      <Link to={`/address/${a.value}`} className="text-brand-600 hover:underline">
                                        {a.value}
                                      </Link>
                                    ) : (
                                      <span className="break-all">{a.value}</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                        onClick={() => {
                          void navigator.clipboard.writeText(exportDecodedJson(t.decodedInput!)).then(() => {
                            setExportOk(true);
                            setTimeout(() => setExportOk(false), 1500);
                          });
                        }}
                      >
                        {exportOk ? "Copied JSON" : "Export JSON"}
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                        onClick={() => {
                          const raw = t.input && t.input !== "0x" ? t.input : "0x";
                          void navigator.clipboard.writeText(raw);
                        }}
                      >
                        Copy raw calldata
                      </button>
                      {t.to ? (
                        <Link
                          to={`/address/${t.to}`}
                          className="inline-flex items-center rounded-md border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-800 hover:bg-brand-100"
                        >
                          Contract · Read / Write
                        </Link>
                      ) : null}
                    </div>
                  </>
                ) : t.input && t.input !== "0x" && t.input.length >= 10 ? (
                  <p className="rounded-md border border-amber-100 bg-amber-50/90 px-3 py-2 text-xs text-amber-950">
                    Calldata could not be decoded. Verify the called contract and submit the full ABI — then refresh this page.
                  </p>
                ) : null}

                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Raw input (hex)</p>
                  <pre className="max-h-52 overflow-auto rounded-lg border border-slate-800 bg-[#1e1e1e] p-3 font-mono text-[11px] leading-relaxed text-[#d4d4d4]">
                    {t.input && t.input !== "0x" ? t.input : "0x"}
                  </pre>
                </div>
              </dd>
            </div>
          </dl>
        ) : null}
      </div>
    </div>
  );
}
