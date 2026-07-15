import { useEffect, useState } from "react";
import { DataRow, InfoPanel } from "../components/InfoPanel";
import { PanelIcon } from "../components/BlockchainIcons";
import { allNetworks, type NetworkProfile } from "../lib/networks";
import { token20Label } from "../lib/chainBranding";

function NetworkPanel({ net }: { net: NetworkProfile }) {
  const T20 = token20Label(net.nativeSymbol);
  const isTestnet = net.kind === "testnet";

  return (
    <InfoPanel
      title={net.label}
      subtitle={`${net.chainName} — chain ID ${net.chainId}`}
      icon={<PanelIcon name={isTestnet ? "link" : "chain"} />}
    >
      <DataRow label="Network name" value={net.chainName} copyable required mono={false} />
      <DataRow label="Chain ID" value={net.chainId} copyable required />
      <DataRow
        label="Chain ID (hex)"
        value={`0x${Number(net.chainId).toString(16)}`}
        copyable
        copyValue={`0x${Number(net.chainId).toString(16)}`}
      />
      <DataRow label="Native symbol" value={net.nativeSymbol} copyable required />
      <DataRow label="Native name" value={net.nativeName} copyable mono={false} />
      <DataRow label="Decimals" value="18" copyable required />
      <DataRow label="RPC URL" value={net.rpcUrl} copyable required />
      <DataRow label="REST API" value={net.apiUrl} copyable href={net.apiUrl} />
      <DataRow label="Block explorer" value={net.explorerUrl} copyable href={net.explorerUrl} />
      {net.faucetUrl ? (
        <DataRow
          label="Faucet"
          value={`POST ${net.faucetUrl}`}
          copyable
          copyValue={net.faucetUrl}
          mono={false}
        />
      ) : null}
      <DataRow label="Token standard" value={`ERC-20 (${T20} on ${net.label})`} mono={false} />
      <DataRow label="Environment" value={isTestnet ? "Test / staging" : "Production (live)"} mono={false} />
    </InfoPanel>
  );
}

export function NetworkReference() {
  const [active, setActive] = useState<"mainnet" | "testnet">("mainnet");

  useEffect(() => {
    if (window.location.hash === "#testnet") setActive("testnet");
  }, []);

  return (
    <section id="reference" className="scroll-mt-20 border-b border-[var(--card-border)] bg-[var(--page-bg)] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h2 className="font-display text-2xl font-semibold text-[var(--card-heading)] sm:text-3xl">
            Network reference
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--card-muted)] sm:text-base">
            One marketing site — two networks. Use <strong>Mainnet (live)</strong> for production and{" "}
            <strong>Testnet</strong> for development. Free test coins via the testnet faucet.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {allNetworks.map((n) => (
              <button
                key={n.kind}
                type="button"
                onClick={() => setActive(n.kind)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                  active === n.kind
                    ? "border-brand-500 bg-brand-500/15 text-brand-600"
                    : "border-[var(--card-border)] text-[var(--card-muted)] hover:border-brand-500/50"
                }`}
              >
                {n.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <NetworkPanel net={allNetworks.find((n) => n.kind === active)!} />
          <InfoPanel
            title="Quick compare"
            subtitle="Mainnet vs testnet"
            icon={<PanelIcon name="contract" />}
          >
            <DataRow label="Live chain ID" value={allNetworks[0]!.chainId} copyable />
            <DataRow label="Testnet chain ID" value={allNetworks[1]!.chainId} copyable />
            <DataRow label="Live RPC" value={allNetworks[0]!.rpcUrl} copyable />
            <DataRow label="Testnet RPC" value={allNetworks[1]!.rpcUrl} copyable />
            <DataRow label="Live explorer" value={allNetworks[0]!.explorerUrl} copyable href={allNetworks[0]!.explorerUrl} />
            <DataRow
              label="Testnet explorer"
              value={allNetworks[1]!.explorerUrl}
              copyable
              href={allNetworks[1]!.explorerUrl}
            />
            <DataRow
              label="Get test coins"
              value="Open testnet explorer → Faucet, or POST /api/v1/faucet"
              mono={false}
            />
          </InfoPanel>
        </div>

        <div id="testnet" className="mt-8 scroll-mt-24">
          <div className="grid gap-6 lg:grid-cols-2">
            {allNetworks.map((n) => (
              <NetworkPanel key={n.kind} net={n} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
