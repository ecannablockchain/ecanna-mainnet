import { useEffect, useState, type ReactNode } from "react";
import { fetchJson, type ApiConfig, type Dashboard } from "../lib/api";
import { fmtBlockTime, fmtGwei, fmtNum } from "../lib/format";
import { fmtUsd, useReferencePrice } from "../lib/useReferencePrice";
import { CopyButton } from "../components/CopyButton";
import { PanelIcon } from "../components/BlockchainIcons";
import { site } from "../config";

const REFRESH_MS = 15_000;

function StatTile({
  icon,
  label,
  value,
  sub,
  note,
  copyText,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  note?: string;
  copyText?: string;
}) {
  return (
    <div className="stat-tile">
      <div className="flex items-start justify-between gap-2">
        <div className="info-panel-icon h-8 w-8">{icon}</div>
        {copyText ? <CopyButton text={copyText} label={label} /> : null}
      </div>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--card-muted)]">{label}</p>
      <div className="mt-1 text-xl font-bold tracking-tight text-[var(--card-heading)]">{value}</div>
      {sub ? <div className="mt-1 text-sm text-[var(--card-muted)]">{sub}</div> : null}
      {note ? <p className="mt-2 text-[10px] leading-snug text-[var(--card-muted)]">{note}</p> : null}
    </div>
  );
}

export function NetworkLiveStats() {
  const ref = useReferencePrice();
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [cfg, setCfg] = useState<ApiConfig | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [d, c] = await Promise.all([
          fetchJson<Dashboard>("/api/v1/dashboard"),
          fetchJson<ApiConfig>("/api/v1/config").catch(() => null),
        ]);
        if (cancelled) return;
        setDash(d);
        if (c) setCfg(c);
        setErr(false);
      } catch {
        if (!cancelled) setErr(true);
      }
    };
    void load();
    const id = window.setInterval(() => void load(), REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const sym = dash?.nativeSymbol ?? cfg?.nativeSymbol ?? site.nativeSymbol;
  const chainId = String(cfg?.chainId ?? 4111);
  const gasGwei = dash?.gasGwei ?? null;
  const blockTime = fmtBlockTime(dash?.avgBlockTimeSec);
  const transferFeeNative = gasGwei != null ? (gasGwei * 21_000) / 1e9 : null;
  const transferFeeUsd = ref.usd != null && transferFeeNative != null ? transferFeeNative * ref.usd : null;
  const gasCopy = gasGwei != null ? String(gasGwei) : "";
  const blockCopy = dash ? String(dash.chainHead) : "";

  return (
    <section id="live-stats" className="scroll-mt-20 border-b border-[var(--card-border)] bg-[var(--page-bg)] pb-16 pt-4 sm:pb-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="info-panel info-panel-accent -mt-8 shadow-lg sm:-mt-10">
          <div className="info-panel-header">
            <div className="info-panel-icon">
              <PanelIcon name="gas" />
            </div>
            <div className="flex-1">
              <p className="font-display text-sm font-semibold text-[var(--card-heading)]">Network stats</p>
              <p className="text-xs text-[var(--card-muted)]">From ECNASCAN API · refreshes every 15s</p>
            </div>
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--card-muted)]">
              <span className={`h-1.5 w-1.5 rounded-full ${err ? "bg-amber-500" : "bg-emerald-500"}`} />
              {err ? "Offline" : "Live"}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              icon={<PanelIcon name="chain" />}
              label={`${sym} reference price`}
              value={ref.loading ? "…" : ref.usd != null ? fmtUsd(ref.usd) : "—"}
              sub={
                ref.usd24hChange != null ? (
                  <span className={ref.usd24hChange >= 0 ? "text-emerald-600" : "text-red-600"}>
                    {ref.usd24hChange >= 0 ? "+" : ""}
                    {ref.usd24hChange.toFixed(2)}% (24h)
                  </span>
                ) : null
              }
              note="Nexdax ECNAUSDT via api.ecnascan.com (CORS-safe proxy)."
            />
            <StatTile
              icon={<PanelIcon name="gas" />}
              label="Gas price"
              value={gasGwei != null ? `${fmtGwei(gasGwei)} Gwei` : "—"}
              copyText={gasCopy || undefined}
              sub={
                transferFeeNative != null ? (
                  <>
                    ~{transferFeeNative < 0.000001 ? "<0.000001" : transferFeeNative.toFixed(6)} {sym} / transfer
                    {transferFeeUsd != null ? ` · ${fmtUsd(transferFeeUsd, 4)}` : null}
                  </>
                ) : (
                  "21,000 gas baseline"
                )
              }
            />
            <StatTile
              icon={<PanelIcon name="explorer" />}
              label="Latest block"
              value={dash ? fmtNum(dash.chainHead) : "—"}
              copyText={blockCopy || undefined}
              sub={
                <>
                  Block time {blockTime}
                  {dash?.indexerLagBlocks != null && dash.indexerLagBlocks > 0 ? (
                    <span className="text-amber-600"> · index {dash.indexerLagBlocks} behind</span>
                  ) : null}
                </>
              }
            />
            <StatTile
              icon={<PanelIcon name="database" />}
              label="Indexed activity"
              value={dash ? fmtNum(dash.indexedTransactions) : "—"}
              copyText={chainId}
              sub={
                dash ? (
                  <>
                    {fmtNum(dash.indexedBlocks)} blocks · chain ID {chainId}
                  </>
                ) : (
                  "Transactions in SQL index"
                )
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}
