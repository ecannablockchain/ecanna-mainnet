import { useMemo } from "react";
import { Link } from "react-router-dom";

export type HolderRow = {
  rank: number;
  address: string;
  balance: string;
  percentage: number | null;
};

type Props = {
  items: HolderRow[];
  totalHolders: number;
};

const CONC_COLORS = ["#0784c3", "#0ea5e9", "#38bdf8", "#7dd3fc", "#bae6fd", "#e2e8f0"];

type Tier = { key: string; label: string; emoji: string; minPct: number; maxPct: number };

const TIERS: Tier[] = [
  { key: "whale", label: "Whale", emoji: "🐋", minPct: 1, maxPct: 100 },
  { key: "shark", label: "Shark", emoji: "🦈", minPct: 0.1, maxPct: 1 },
  { key: "dolphin", label: "Dolphin", emoji: "🐬", minPct: 0.01, maxPct: 0.1 },
  { key: "fish", label: "Fish", emoji: "🐟", minPct: 0.001, maxPct: 0.01 },
  { key: "crab", label: "Crab", emoji: "🦀", minPct: 0.0001, maxPct: 0.001 },
  { key: "shrimp", label: "Shrimp", emoji: "🦐", minPct: 0, maxPct: 0.0001 },
];

function pctOf(items: HolderRow[], from: number, to: number): number {
  return items.slice(from, to).reduce((s, h) => s + (h.percentage ?? 0), 0);
}

function giniFromPcts(pcts: number[]): number {
  if (pcts.length === 0) return 0;
  const sorted = [...pcts].sort((a, b) => a - b);
  const n = sorted.length;
  let sum = 0;
  let cum = 0;
  for (let i = 0; i < n; i++) {
    cum += sorted[i];
    sum += cum;
  }
  const total = sorted.reduce((a, b) => a + b, 0) || 1;
  const g = (n + 1 - (2 * sum) / total) / n;
  return Math.max(0, Math.min(1, g));
}

/** Pure CSS analytics from indexed holders — no new API. */
export function HoldersAnalytics({ items, totalHolders }: Props) {
  const stats = useMemo(() => {
    const top5 = pctOf(items, 0, 5);
    const top10 = pctOf(items, 0, 10);
    const top100 = pctOf(items, 0, 100);
    const outside = Math.max(0, 100 - top100);
    const whalePct = items.filter((h) => (h.percentage ?? 0) >= 1).reduce((s, h) => s + (h.percentage ?? 0), 0);
    const whaleHolders = items.filter((h) => (h.percentage ?? 0) >= 1).length;
    const whaleHolderShare = totalHolders > 0 ? (whaleHolders / totalHolders) * 100 : 0;
    const gini = giniFromPcts(items.map((h) => h.percentage ?? 0));

    const bands = [
      { label: "Top 1–5", value: pctOf(items, 0, 5), color: CONC_COLORS[0] },
      { label: "Top 6–10", value: pctOf(items, 5, 10), color: CONC_COLORS[1] },
      { label: "Top 11–25", value: pctOf(items, 10, 25), color: CONC_COLORS[2] },
      { label: "Top 26–50", value: pctOf(items, 25, 50), color: CONC_COLORS[3] },
      { label: "Top 51–100", value: pctOf(items, 50, 100), color: CONC_COLORS[4] },
      { label: "Outside 100", value: outside, color: CONC_COLORS[5] },
    ];

    const tiers = TIERS.map((t) => {
      const matched = items.filter((h) => {
        const p = h.percentage ?? 0;
        return p >= t.minPct && p < t.maxPct;
      });
      const mcap = matched.reduce((s, h) => s + (h.percentage ?? 0), 0);
      return {
        ...t,
        count: matched.length,
        holdersPct: totalHolders > 0 ? (matched.length / totalHolders) * 100 : 0,
        mcapPct: mcap,
      };
    });

    const depth = [
      { label: "> 5% supply", count: items.filter((h) => (h.percentage ?? 0) > 5).length },
      { label: "> 1% supply", count: items.filter((h) => (h.percentage ?? 0) > 1).length },
      { label: "> 0.1% supply", count: items.filter((h) => (h.percentage ?? 0) > 0.1).length },
      { label: "> 0.01% supply", count: items.filter((h) => (h.percentage ?? 0) > 0.01).length },
      { label: "> 0.001% supply", count: items.filter((h) => (h.percentage ?? 0) > 0.001).length },
    ];
    const depthMax = Math.max(1, ...depth.map((d) => d.count));

    return { top5, top10, top100, whalePct, whaleHolderShare, gini, bands, tiers, depth, depthMax };
  }, [items, totalHolders]);

  // Donut via conic-gradient
  let cursor = 0;
  const conic = stats.bands
    .map((b) => {
      const start = cursor;
      cursor += b.value;
      return `${b.color} ${start}% ${cursor}%`;
    })
    .join(", ");

  return (
    <div className="space-y-4">
      <h3 className="font-display text-sm font-semibold text-slate-900">Holders overview</h3>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          title="Top 100 concentration"
          value={`${stats.top100.toFixed(2)}%`}
          sub={`Top 5: ${stats.top5.toFixed(2)}% · Top 10: ${stats.top10.toFixed(2)}%`}
        />
        <MetricCard
          title="Whale concentration"
          value={`${stats.whalePct.toFixed(2)}%`}
          sub={`${stats.whaleHolderShare.toFixed(2)}% of listed holders hold ≥1%`}
        />
        <MetricCard
          title="Gini (approx.)"
          value={stats.gini.toFixed(4)}
          sub="From indexed top holders (0 = equal, 1 = concentrated)"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Donut */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Holder concentration</div>
          <div className="mt-4 flex flex-col items-center gap-4">
            <div
              className="relative h-40 w-40 rounded-full shadow-inner"
              style={{ background: `conic-gradient(${conic || "#e2e8f0 0% 100%"})` }}
              aria-hidden
            >
              <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-white text-center shadow-sm">
                <div className="text-[10px] font-semibold uppercase text-slate-500">Listed</div>
                <div className="font-mono text-sm font-bold text-slate-900">{items.length}</div>
              </div>
            </div>
            <ul className="grid w-full grid-cols-2 gap-1.5 text-[11px]">
              {stats.bands.map((b) => (
                <li key={b.label} className="flex items-center gap-1.5 text-slate-700">
                  <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: b.color }} />
                  <span className="truncate">{b.label}</span>
                  <span className="ml-auto font-mono">{b.value.toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Tiers */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-1">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Tier distribution</div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[260px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-500">
                  <th className="py-1.5 font-semibold">Tier</th>
                  <th className="py-1.5 font-semibold text-right">Count</th>
                  <th className="py-1.5 font-semibold text-right">% Cap</th>
                </tr>
              </thead>
              <tbody>
                {stats.tiers.map((t) => (
                  <tr key={t.key} className="border-b border-slate-50">
                    <td className="py-2 font-medium text-slate-800">
                      <span className="mr-1" aria-hidden>
                        {t.emoji}
                      </span>
                      {t.label}
                    </td>
                    <td className="py-2 text-right font-mono">{t.count}</td>
                    <td className="py-2 text-right font-mono">{t.mcapPct.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
            Tiers use % of total supply among indexed holders (not USD — no price oracle on this explorer).
          </p>
        </div>

        {/* Depth bars */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Wallet depth by threshold</div>
          <ul className="mt-4 space-y-3">
            {stats.depth.map((d) => (
              <li key={d.label}>
                <div className="mb-1 flex justify-between text-[11px] text-slate-600">
                  <span>{d.label}</span>
                  <span className="font-mono font-semibold text-slate-900">{d.count}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-teal-500"
                    style={{ width: `${Math.max(4, (d.count / stats.depthMax) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold text-slate-900">
          Top {items.length.toLocaleString()} holders
          <span className="ml-2 font-sans text-xs font-normal text-slate-500">
            of {totalHolders.toLocaleString()} total
          </span>
        </h3>
      </div>
    </div>
  );
}

function MetricCard({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-1 font-mono text-xl font-bold text-slate-900">{value}</div>
      <p className="mt-1 text-[11px] leading-snug text-slate-500">{sub}</p>
    </div>
  );
}

/** Compact address link used by parent table — kept here for reuse if needed */
export function HolderAddressLink({ address }: { address: string }) {
  return (
    <Link to={`/address/${address}`} className="pes-link font-mono text-xs">
      {address}
    </Link>
  );
}
