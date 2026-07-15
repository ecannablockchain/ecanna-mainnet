import { useEffect, useMemo, useState } from "react";
import { fetchJson, type Dashboard, type GasResponse } from "../lib/api";
import { feeNativeFromGwei, fmtGwei, fmtNativeAmount } from "../lib/format";
import { fmtUsd, useReferencePrice } from "../lib/useReferencePrice";
import { DataRow, InfoPanel } from "../components/InfoPanel";
import { CopyButton } from "../components/CopyButton";
import { PanelIcon } from "../components/BlockchainIcons";
import { site } from "../config";
import { token20Label } from "../lib/chainBranding";

const GAS_ESTIMATES = [
  { action: "Native transfer", gas: 21_000, note: "Standard wallet-to-wallet send" },
  { action: "ERC-20 transfer", gas: 65_000, note: "Typical token transfer call" },
  { action: "Contract interaction", gas: 120_000, note: "Average dApp call (varies widely)" },
  { action: "Contract deploy", gas: 1_500_000, note: "Rough mid-size Solidity deploy" },
] as const;

export function RatesAndFees() {
  const ref = useReferencePrice();
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [gas, setGas] = useState<GasResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [d, g] = await Promise.all([
          fetchJson<Dashboard>("/api/v1/dashboard"),
          fetchJson<GasResponse>("/api/v1/gas").catch(() => null),
        ]);
        if (cancelled) return;
        setDash(d);
        if (g) setGas(g);
      } catch {
        /* keep last values */
      }
    };
    void load();
    const id = window.setInterval(() => void load(), 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const sym = dash?.nativeSymbol ?? site.nativeSymbol;
  const gasGwei = dash?.gasGwei ?? null;
  const T20 = token20Label(sym);
  const gasWei = gas?.live.gasPrice ?? "";

  const rows = useMemo(() => {
    if (gasGwei == null) return GAS_ESTIMATES.map((e) => ({ ...e, native: null as number | null, usd: null as number | null }));
    return GAS_ESTIMATES.map((e) => {
      const native = feeNativeFromGwei(gasGwei, e.gas);
      const usd = ref.usd != null ? native * ref.usd : null;
      return { ...e, native, usd };
    });
  }, [gasGwei, ref.usd]);

  const blockRate =
    dash?.avgBlockTimeSec != null && dash.avgBlockTimeSec > 0
      ? `${(1 / dash.avgBlockTimeSec).toFixed(2)} blocks/sec`
      : "~0.33 blocks/sec (~3s)";

  return (
    <section id="rates" className="scroll-mt-20 border-b border-[var(--card-border)] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl font-semibold text-[var(--card-heading)] sm:text-3xl">Rates & fee estimates</h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--card-muted)] sm:text-base">
            Live gas and block rates from the node. Copy values for scripts, docs, or wallet fee settings.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <InfoPanel
            title="Live network rates"
            subtitle="From JSON-RPC + indexer"
            icon={<PanelIcon name="gas" />}
            action={gasGwei != null ? <CopyButton text={String(gasGwei)} label="gas Gwei" size="md" /> : undefined}
          >
            <DataRow
              label="Gas price"
              value={gasGwei != null ? `${fmtGwei(gasGwei)} Gwei` : "—"}
              copyable={gasGwei != null}
              copyValue={gasGwei != null ? String(gasGwei) : undefined}
            />
            <DataRow label="Block production rate" value={blockRate} copyable copyValue={blockRate} mono={false} />
            <DataRow
              label="Gas price (wei)"
              value={gasWei || "—"}
              copyable={!!gasWei}
            />
            <DataRow
              label="Max fee per gas"
              value={gas?.live.maxFeePerGas ?? "—"}
              copyable={!!gas?.live.maxFeePerGas}
            />
            <DataRow
              label="Priority fee"
              value={gas?.live.maxPriorityFeePerGas ?? "—"}
              copyable={!!gas?.live.maxPriorityFeePerGas}
            />
            <DataRow
              label="Last block gas used"
              value={gas?.latestIndexed?.gasUsed ? Number(gas.latestIndexed.gasUsed).toLocaleString() : "—"}
              copyable={!!gas?.latestIndexed?.gasUsed}
              copyValue={gas?.latestIndexed?.gasUsed}
            />
          </InfoPanel>

          <InfoPanel
            title="Estimated transaction costs"
            subtitle={`At current gas · paid in ${sym}`}
            icon={<PanelIcon name="wallet" />}
          >
            {rows.map((r) => (
              <div key={r.action} className="data-row">
                <div>
                  <p className="text-sm font-medium text-[var(--card-heading)]">{r.action}</p>
                  <p className="text-xs text-[var(--card-muted)]">{r.note}</p>
                  <p className="mt-1 font-mono text-[10px] text-[var(--card-muted)]">{r.gas.toLocaleString()} gas</p>
                </div>
                <div className="data-row-value-wrap">
                  <div className="text-right">
                    <p className="font-mono text-xs font-medium text-[var(--card-heading)]">
                      {r.native != null ? fmtNativeAmount(r.native, sym, 6) : "—"}
                    </p>
                    {r.usd != null ? (
                      <p className="font-mono text-[10px] text-[var(--card-muted)]">{fmtUsd(r.usd, 4)} ref.</p>
                    ) : null}
                  </div>
                  {r.native != null ? (
                    <CopyButton text={r.native < 0.000001 ? r.native.toExponential(6) : r.native.toFixed(8)} label={r.action} />
                  ) : null}
                </div>
              </div>
            ))}
          </InfoPanel>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-[var(--card-muted)]">
          USD figures use an external reference index for illustration. Native {sym} and optional {T20} (ERC-20) fees are
          always paid on-chain in {sym}.
        </p>
      </div>
    </section>
  );
}
