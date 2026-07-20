import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BrandedLoader } from "../components/BrandedLoader";
import { SkeletonStat } from "../components/Skeleton";
import { fetchJson, type ApiConfig, type BlockRow, type Dashboard, type TxRow } from "../lib/api";
import { age, ageBlockInFeed, ageChainTip, fmtGwei, fmtNative, shortAddr, shortHash } from "../lib/format";
import { fmtUsd, fmtUsdCompact, useEthReferencePrice } from "../lib/useEthReferencePrice";

/** Indexed blocks when the indexer is behind; otherwise live RPC tip for accurate ages. */
async function fetchLatestBlocksForHome(dash: Dashboard | null): Promise<BlockRow[]> {
  const lag = dash?.indexerLagBlocks ?? 0;
  if (lag > 0) {
    const r = await fetchJson<{ items: BlockRow[] }>("/api/v1/blocks?limit=6&offset=0");
    return r.items ?? [];
  }
  try {
    const r = await fetchJson<{ items: BlockRow[] }>("/api/v1/blocks/rpc-recent?limit=6");
    if (r.items && r.items.length > 0) return r.items;
  } catch {
    /* use index below */
  }
  const r = await fetchJson<{ items: BlockRow[] }>("/api/v1/blocks?limit=6&offset=0");
  return r.items ?? [];
}

/** Match typical local block time (Anvil `--block-time`); keeps home “latest” lists near chain tip. */
const HOME_REFRESH_MS = 3000;

function chartAxisTicks(points: { date: string }[]): string[] {
  if (points.length === 0) return [];
  const out: string[] = [];
  for (let i = 0; i < points.length; i++) {
    if (i % 6 === 0 || i === points.length - 1) out.push(points[i].date);
  }
  return out;
}

function formatChartTickLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const h = String(d.getUTCHours()).padStart(2, "0");
  const mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()];
  return `${mo} ${d.getUTCDate()} · ${h}:00`;
}

export function HomePage() {
  const chartFillId = useId().replace(/:/g, "");
  const ethRef = useEthReferencePrice();
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [cfg, setCfg] = useState<ApiConfig | null>(null);
  const [chart, setChart] = useState<{ date: string; count: number }[]>([]);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [txs, setTxs] = useState<TxRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [bootDone, setBootDone] = useState(false);
  /** Re-render every second so `age()` stays current between API polls. */
  const [, setAgeTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setAgeTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let c = true;
    (async () => {
      try {
        const conf = await fetchJson<ApiConfig>("/api/v1/config").catch(() => null);
        const d = await fetchJson<Dashboard>("/api/v1/dashboard");
        const [ch, b, t] = await Promise.all([
          fetchJson<{ points: { date: string; count: number }[] }>("/api/v1/charts/daily-transactions").catch(
            () => ({ points: [] as { date: string; count: number }[] }),
          ),
          fetchLatestBlocksForHome(d),
          fetchJson<{ items: TxRow[] }>("/api/v1/transactions?limit=6&offset=0"),
        ]);
        if (!c) return;
        if (conf) setCfg(conf);
        setDash(d);
        setChart(ch.points?.length ? ch.points : []);
        setBlocks(b);
        setTxs(t.items ?? []);
        setErr(null);
      } catch (e: unknown) {
        if (c) setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (c) setBootDone(true);
      }
    })();
    return () => {
      c = false;
    };
  }, []);

  useEffect(() => {
    if (!bootDone || err) return;
    const id = window.setInterval(() => {
      void (async () => {
        try {
          const d = await fetchJson<Dashboard>("/api/v1/dashboard");
          const [ch, b, t] = await Promise.all([
            fetchJson<{ points: { date: string; count: number }[] }>("/api/v1/charts/daily-transactions").catch(
              () => ({ points: [] as { date: string; count: number }[] }),
            ),
            fetchLatestBlocksForHome(d),
            fetchJson<{ items: TxRow[] }>("/api/v1/transactions?limit=6&offset=0"),
          ]);
          setDash(d);
          setChart(ch.points?.length ? ch.points : []);
          setBlocks(b);
          setTxs(t.items ?? []);
        } catch {
          /* keep last good data; avoid flashing errors on transient API hiccups */
        }
      })();
    }, HOME_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [bootDone, err]);

  const sym = cfg?.nativeSymbol ?? "ECNA";

  const tpsApprox = useMemo(() => {
    if (!dash?.avgBlockTimeSec || blocks.length === 0) return null;
    const avgTx = blocks.reduce((s, b) => s + b.txCount, 0) / blocks.length;
    const v = avgTx / Math.max(dash.avgBlockTimeSec, 0.001);
    if (!Number.isFinite(v)) return null;
    if (v < 0.01) return v.toExponential(1);
    return v.toFixed(2);
  }, [dash?.avgBlockTimeSec, blocks]);

  const gasTransferUsd = useMemo(() => {
    if (ethRef.usd == null || dash?.gasGwei == null) return null;
    const gwei = dash.gasGwei;
    const ethCost = (gwei * 21_000) / 1e9;
    return ethCost * ethRef.usd;
  }, [ethRef.usd, dash?.gasGwei]);

  const blockTimeSec = useMemo(() => {
    const avg = dash?.avgBlockTimeSec;
    if (avg != null && avg > 0 && avg < 120) return Math.max(1, Math.round(avg));
    return 3;
  }, [dash?.avgBlockTimeSec]);

  const tipTimestamp =
    dash?.indexerLagBlocks != null && dash.indexerLagBlocks > 0
      ? dash.latestBlockTimestamp || blocks[0]?.timestamp || null
      : dash?.chainHeadTimestamp || blocks[0]?.timestamp || null;

  /** RPC tip time — feed-relative ages (3, 6, 9 …) when block timestamps drift from wall clock. */
  const tipLastBlockAge = tipTimestamp ? ageChainTip(tipTimestamp, blockTimeSec) : "—";

  if (!bootDone && !err) {
    return <BrandedLoader  />;
  }

  if (err) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Indexer / API:</strong> {err}. Start Geth (<code className="rounded bg-white px-1">ecnachain/docker-compose</code>
        ), API + indexer (<code className="rounded bg-white px-1">npm run local:stack</code> from repo root).
      </div>
    );
  }

  return (

    
    <div className="space-y-8">

  

      {/* BscScan-style stats — overlaps hero */}
      <section
        className="home-bsc-dash relative z-10 -mt-[4.5rem] rounded-xl border shadow-md sm:-mt-[5rem] md:-mt-[5.5rem]"
        style={{
          boxShadow: "0 0.125rem 0.5rem rgba(0,0,0,0.08)",
          background: "var(--card-bg)",
          borderColor: "var(--card-border)",
        }}
      >
        <div className="grid grid-cols-1 divide-y divide-[var(--card-border)] lg:grid-cols-4 lg:divide-x lg:divide-y-0">
          {/* Col 1 — price + market cap */}
          <div className="flex flex-col gap-0 p-4 sm:p-5">
            <DashStatBlock
              icon={  <img src="../logo-thumb.png" alt="icon" className="w-5 shrink-0" />
   
}
              label={`${sym} PRICE`}
              note={`${sym} spot USD from Nexdax ECNAUSDT (poll)`}
            >
              {ethRef.loading ? (
                <SkeletonStat className="h-7 w-32" />
              ) : ethRef.usd != null ? (
                <>
                  <div className="text-xl font-bold tracking-tight text-[var(--card-heading)]">{fmtUsd(ethRef.usd)}</div>
                  {ethRef.usd24hChange != null ? (
                    <div
                      className={`mt-0.5 text-sm font-medium ${
                        ethRef.usd24hChange >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {ethRef.usd24hChange >= 0 ? "+" : ""}
                      {ethRef.usd24hChange.toFixed(2)}% (24h)
                    </div>
                  ) : null}
                </>
              ) : (
                <span className="text-lg text-[var(--card-muted)]">—</span>
              )}
            </DashStatBlock>
            <div className="my-4 h-px bg-[var(--card-border)]" />
            <DashStatBlock
              icon={<IconGlobe className="h-5 w-5 text-[var(--card-muted)]" />}
              label={`${sym} MARKET CAP (REF.)`}
              note={`${sym} market cap ≈ lastPrice × 1 Crore genesis supply`}
            >
              {ethRef.loading ? (
                <SkeletonStat className="h-7 w-36" />
              ) : ethRef.marketCapUsd != null ? (
                <div className="text-xl font-bold text-[var(--card-heading)]">{fmtUsdCompact(ethRef.marketCapUsd)}</div>
              ) : (
                <span className="text-[var(--card-muted)]">—</span>
              )}
            </DashStatBlock>
          </div>

          {/* Col 2 — txs + latest block */}
          <div className="flex flex-col gap-0 p-4 sm:p-5">
            <DashStatBlock icon={<IconLayers className="h-5 w-5 text-[var(--card-muted)]" />} label="TRANSACTIONS">
              <div className="text-xl font-bold text-[var(--card-heading)]">
                {dash ? dash.indexedTransactions.toLocaleString() : <SkeletonStat className="h-8 w-24" />}
              </div>
              <div className="mt-0.5 text-sm text-[var(--card-muted)]">
                {tpsApprox != null ? (
                  <>
                    (<span className="font-semibold text-[var(--card-heading)]">{tpsApprox}</span> TPS approx.)
                  </>
                ) : (
                  "(TPS —)"
                )}
              </div>
            </DashStatBlock>
            <div className="my-4 h-px bg-[var(--card-border)]" />
            <DashStatBlock icon={<IconClock className="h-5 w-5 text-[var(--card-muted)]" />} label="LATEST BLOCK">
              <div className="text-xl font-bold text-[var(--card-heading)]">
                {dash != null ? (
                  (dash.indexerLagBlocks != null && dash.indexerLagBlocks > 0 && dash.indexedLatestBlock != null
                    ? Number(dash.indexedLatestBlock)
                    : dash.chainHead
                  ).toLocaleString()
                ) : blocks[0]?.number != null ? (
                  blocks[0].number
                ) : (
                  <SkeletonStat className="h-8 w-20" />
                )}
              </div>
              <div className="mt-0.5 text-sm text-[var(--card-muted)]">
                {dash?.avgBlockTimeSec != null ? (
                  <>
                    Last block <span className="font-medium text-[var(--card-heading)]">{tipLastBlockAge}</span>
                    {dash.avgBlockTimeSec > 0 ? (
                      <span>
                        {" "}
                        · ~{dash.avgBlockTimeSec.toFixed(2)}s avg
                      </span>
                    ) : null}
                  </>
                ) : (
                  tipLastBlockAge
                )}
              </div>
              {dash != null &&
              dash.indexerLagBlocks != null &&
              dash.indexerLagBlocks > 0 &&
              dash.indexedLatestBlock != null ? (
                <div className="mt-1 text-[11px] leading-snug text-amber-700 dark:text-amber-400">
                  Chain tip {dash.chainHead.toLocaleString()} · indexing {dash.indexerLagBlocks} block
                  {dash.indexerLagBlocks === 1 ? "" : "s"} behind — explorer shows indexed blocks only.
                </div>
              ) : null}
            </DashStatBlock>
          </div>

          {/* Col 3 — gas + voting */}
          <div className="flex flex-col gap-0 p-4 sm:p-5">
            <DashStatBlock icon={<IconGas className="h-5 w-5 text-[var(--card-muted)]" />} label="MED GAS PRICE">
              <div className="text-xl font-bold text-[var(--card-heading)]">
                {dash?.gasGwei != null ? `${fmtGwei(dash.gasGwei)} Gwei` : "—"}
              </div>
              <div className="mt-0.5 text-sm text-[var(--card-muted)]">
                {gasTransferUsd != null ? (
                  <>
                    ≈ <span className="font-medium text-[var(--card-heading)]">${gasTransferUsd.toFixed(4)}</span> / simple tx (
                    {sym} ref.)
                  </>
                ) : (
                  "—"
                )}
              </div>
            </DashStatBlock>
            <div className="my-4 h-px bg-[var(--card-border)]" />
            <DashStatBlock icon={<IconVote className="h-5 w-5 text-[var(--card-muted)]" />} label="VOTING POWER">
              <div className="text-lg font-semibold text-[var(--card-muted)]">—</div>
              <div className="mt-0.5 text-xs text-[var(--card-muted)]">Not tracked on this explorer (PoA / local)</div>
            </DashStatBlock>
          </div>

          {/* Col 4 — chart */}
          <div className="flex flex-col p-4 sm:p-5">
            <h3 className="mb-1 text-center text-[11px] font-bold uppercase leading-snug tracking-wide text-[var(--card-muted)]">
              Transaction activity
            </h3>
            <p className="mb-3 text-center text-[10px] text-[var(--card-muted)]">
              Indexed txs per hour (UTC) · last 48h · updates with dashboard
            </p>
            <div className="h-[200px] w-full sm:h-[220px]">
              {chart.length === 0 ? (
                <p className="flex h-full items-center justify-center text-center text-xs text-[var(--card-muted)]">
                  No chart data (API unavailable)
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chart}
                    margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                    style={{ touchAction: "pan-y" }}
                  >
                    <defs>
                      <linearGradient id={chartFillId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0d6efd" stopOpacity={0.45} />
                        <stop offset="45%" stopColor="#0784c3" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="#0784c3" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="var(--card-border)" opacity={0.85} />
                    <XAxis
                      dataKey="date"
                      type="category"
                      ticks={chartAxisTicks(chart)}
                      tick={{ fontSize: 9, fill: "var(--card-muted)" }}
                      stroke="var(--card-border)"
                      tickLine={false}
                      axisLine={{ stroke: "var(--card-border)" }}
                      height={40}
                      tickFormatter={(v) => formatChartTickLabel(String(v))}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--card-muted)" }}
                      stroke="var(--card-border)"
                      width={40}
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, (dataMax: number) => Math.max(4, Math.ceil(dataMax * 1.15))]}
                    />
                    <Tooltip
                      cursor={{ stroke: "#0784c3", strokeWidth: 1, strokeDasharray: "4 4" }}
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid var(--card-border)",
                        fontSize: 12,
                        background: "var(--card-bg)",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                      }}
                      labelStyle={{ fontSize: 11, color: "var(--card-heading)", fontWeight: 600 }}
                      labelFormatter={(iso) => {
                        const d = new Date(String(iso));
                        return Number.isNaN(d.getTime())
                          ? String(iso)
                          : d.toLocaleString("en-GB", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                              timeZone: "UTC",
                            }) + " UTC";
                      }}
                      formatter={(value) => {
                        const n = typeof value === "number" ? value : Number(value);
                        return [`${Number.isFinite(n) ? n.toLocaleString() : "0"} indexed`, "Transactions"];
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      name="Txs"
                      stroke="#05649e"
                      strokeWidth={2}
                      fill={`url(#${chartFillId})`}
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff", fill: "#0784c3" }}
                      isAnimationActive
                      animationDuration={600}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <BscFeedCard
          title="Latest Blocks"
          footerLink="/blocks"
          footerLabel="VIEW ALL BLOCKS"
          customizeTitle="Customize (coming soon)"
        >
          {blocks.map((b) => (
            <div
              key={b.number}
              className="flex flex-col gap-3 border-b border-[var(--card-border)] py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-[var(--card-border)] bg-[var(--nav-link-hover-bg)] text-[var(--card-muted)]">
                  <IconCube className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <Link to={`/block/${b.number}`} className="text-base font-semibold text-brand-600 hover:text-brand-700 hover:underline">
                    {b.number}
                  </Link>
                  <div className="text-xs text-[var(--card-muted)]">
                    {ageBlockInFeed(b.timestamp, blocks[0]?.timestamp, blockTimeSec)}
                  </div>
                </div>
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <span className="text-[var(--card-muted)]">Validated by </span>
                <Link to={`/address/${b.miner}`} className="font-medium text-brand-600 hover:underline">
                  {shortAddr(b.miner, 8)}
                </Link>
                <div className="mt-1">
                  <Link to={`/block/${b.number}`} className="text-sm font-medium text-brand-600 hover:underline">
                    {b.txCount} txns
                  </Link>
                </div>
              </div>
              <div className="shrink-0 self-end sm:self-center">
                <div
                  className="rounded border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-1.5 text-right font-mono text-xs text-[var(--card-heading)]"
                  title="Native block reward / fee — not tracked on this network"
                >
                  —
                </div>
              </div>
            </div>
          ))}
          {blocks.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--card-muted)]">No blocks indexed yet.</p>
          ) : null}
        </BscFeedCard>

        <BscFeedCard
          title="Latest Transactions"
          footerLink="/txs"
          footerLabel="VIEW ALL TRANSACTIONS"
          customizeTitle="Customize (coming soon)"
        >
          {txs.map((t) => (
            <div
              key={t.hash}
              className="flex flex-col gap-3 border-b border-[var(--card-border)] py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-[var(--card-border)] bg-[var(--nav-link-hover-bg)] text-[var(--card-muted)]">
                  <IconDoc className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <Link to={`/tx/${t.hash}`} className="font-mono text-sm font-semibold text-brand-600 hover:text-brand-700 hover:underline">
                    {shortHash(t.hash, 10)}
                  </Link>
                  <div className="text-xs text-[var(--card-muted)]">{age(t.timestamp)}</div>
                </div>
              </div>
              <div className="min-w-0 flex-1 text-xs sm:text-sm">
                <div className="text-[var(--card-muted)]">
                  From{" "}
                  <Link to={`/address/${t.from}`} className="font-mono font-medium text-brand-600 hover:underline">
                    {shortAddr(t.from, 8)}
                  </Link>
                </div>
                <div className="mt-0.5 text-[var(--card-muted)]">
                  To{" "}
                  {t.to ? (
                    <Link to={`/address/${t.to}`} className="font-mono font-medium text-brand-600 hover:underline">
                      {shortAddr(t.to, 8)}
                    </Link>
                  ) : (
                    <span className="font-mono text-[var(--card-heading)]">—</span>
                  )}
                </div>
              </div>
              <div className="shrink-0 self-end sm:self-center">
                <div className="rounded border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-1.5 text-right font-mono text-xs text-[var(--card-heading)]">
                  {fmtNative(t.value, sym)}
                </div>
              </div>
            </div>
          ))}
          {txs.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--card-muted)]">No transactions indexed yet.</p>
          ) : null}
        </BscFeedCard>
      </div>
    </div>
  );
}

function DashStatBlock({
  icon,
  label,
  note,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--card-muted)]">{label}</div>
          {note ? <div className="mt-0.5 text-[12px] leading-tight text-[var(--card-muted)]">{note}</div> : null}
          <div className="mt-2">{children}</div>
        </div>
      </div>
    </div>
  );
}

function BscFeedCard({
  title,
  children,
  footerLink,
  footerLabel,
  customizeTitle,
}: {
  title: string;
  children: ReactNode;
  footerLink: string;
  footerLabel: string;
  customizeTitle: string;
}) {
  return (
    <section
      className="overflow-hidden rounded-lg border shadow-sm"
      style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
    >
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: "var(--card-border)" }}
      >
        <h2 className="font-display text-base font-semibold" style={{ color: "var(--card-heading)" }}>
          {title}
        </h2>
        <button
          type="button"
          title={customizeTitle}
          className="inline-flex items-center gap-1.5 rounded border border-transparent px-2 py-1 text-xs font-medium transition hover:opacity-90"
          style={{ color: "var(--card-muted)", background: "transparent" }}
          onClick={() => {}}
        >
          <IconGrid className="h-4 w-4" />
          Customize
        </button>
      </div>
      <div className="px-4">{children}</div>
      <div className="border-t py-3 text-center" style={{ borderColor: "var(--card-border)" }}>
        <Link
          to={footerLink}
          className="text-xs font-bold uppercase tracking-wide text-[var(--card-muted)] transition hover:text-brand-600"
        >
          {footerLabel} →
        </Link>
      </div>
    </section>
  );
}

function IconCube({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 2l8 4v12l-8 4-8-4V6l8-4z" strokeLinejoin="round" />
      <path d="M12 22V12M4 6l8 4 8-4" strokeLinejoin="round" />
    </svg>
  );
}

function IconDoc({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" strokeLinejoin="round" />
      <path d="M14 2v6h6M8 13h8M8 17h8" strokeLinecap="round" />
    </svg>
  );
}

function IconGrid({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z" opacity={0.85} />
    </svg>
  );
}

function IconGlobe({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 000 18M12 3a15 15 0 010 18" strokeLinecap="round" />
    </svg>
  );
}

function IconLayers({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 2l9 5-9 5-9-5 9-5z" strokeLinejoin="round" />
      <path d="M3 12l9 5 9-5M3 17l9 5 9-5" strokeLinejoin="round" />
    </svg>
  );
}

function IconClock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconGas({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M4 21V8a2 2 0 012-2h6a2 2 0 012 2v13M4 21h10" strokeLinecap="round" />
      <path d="M14 11h3l2 2v3a2 2 0 002 2h0a2 2 0 002-2v-5" strokeLinecap="round" />
      <path d="M16 21v-3" strokeLinecap="round" />
    </svg>
  );
}

function IconVote({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M9 12l2 2 4-4M7 4h10v16H7V4z" strokeLinejoin="round" />
    </svg>
  );
}
