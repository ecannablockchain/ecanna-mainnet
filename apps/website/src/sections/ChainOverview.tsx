import { DataRow, InfoPanel } from "../components/InfoPanel";
import { FeatureCard, PanelIcon } from "../components/BlockchainIcons";
import { site } from "../config";
import { NATIVE_SYMBOL } from "../lib/chainBranding";

const highlights = [
  {
    icon: "chain" as const,
    title: "Predictable blocks",
    text: "Fixed ~3 second block interval keeps transaction confirmation times consistent for wallets and dApps.",
  },
  {
    icon: "ops" as const,
    title: "Low operational overhead",
    text: "PoA validators sign blocks without proof-of-work mining. Suitable for permissioned or consortium deployments.",
  },
  {
    icon: "rpc" as const,
    title: "Full EVM compatibility (London)",
    text: "Deploy Solidity with standard tools. Set compiler EVM to london (Remix must not use default/shanghai). Hardhat/Foundry and ethers.js/viem work unchanged.",
  },
  {
    icon: "database" as const,
    title: "Indexed explorer layer",
    text: "Blocks and transactions are synced from RPC into SQL Server so search, charts, and history pages stay fast at scale.",
  },
];

export function ChainOverview() {
  return (
    <section id="network" className="scroll-mt-20 border-b border-[var(--card-border)] bg-[var(--page-bg)] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="font-display text-2xl font-semibold text-[var(--card-heading)] sm:text-3xl">Network overview</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--card-muted)] sm:text-base">
              {site.chainName} is a Layer-1 EVM chain operated with Geth Clique validators. Copy chain parameters
              directly into wallet or deployment configs.
            </p>
            <InfoPanel className="mt-8" title="Chain specification" subtitle="Core L1 parameters" icon={<PanelIcon name="chain" />}>
              <DataRow label="Network name" value={site.chainName} copyable mono={false} />
              <DataRow label="Chain ID" value="4111" copyable required />
              <DataRow label="Chain ID (hex)" value="0x100f" copyable />
              <DataRow label="Consensus" value="Clique (Proof of Authority)" mono={false} />
              <DataRow label="Block time" value="~3 seconds" mono={false} />
              <DataRow label="Virtual machine" value="EVM — London (Remix: set EVM = london)" mono={false} />
              <DataRow label="Native currency" value={`${NATIVE_SYMBOL} (18 decimals)`} copyable copyValue={NATIVE_SYMBOL} />
              <DataRow label="Block gas limit" value="30000000" copyable />
              <DataRow label="Finality" value="Immediate on inclusion (PoA)" mono={false} />
            </InfoPanel>
            <div className="mt-4 rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <p className="font-semibold">Contract deploy tip</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-900/90">
                In Remix choose <strong>EVM Version → london</strong> (not default / shanghai / cancun). Stock Geth Clique
                does not support Shanghai. See{" "}
                <a className="font-medium underline" href={`${site.explorerUrl}/verify`}>
                  Verify &amp; Publish
                </a>{" "}
                and docs/DEPLOY-CONTRACTS.md.
              </p>
            </div>
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-[var(--card-heading)]">Why operators choose PoA EVM</h3>
            <ul className="mt-6 space-y-4">
              {highlights.map((h) => (
                <FeatureCard key={h.title} icon={h.icon} title={h.title} body={h.text} />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
