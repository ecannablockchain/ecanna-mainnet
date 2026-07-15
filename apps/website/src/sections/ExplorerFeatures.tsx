import { CopyButton } from "../components/CopyButton";
import { PanelIcon } from "../components/BlockchainIcons";
import { site } from "../config";

const features = [
  {
    icon: "explorer" as const,
    title: "Blocks & transactions",
    desc: "Browse the latest blocks, drill into transaction details, view gas used, status, and input data.",
    href: site.explorerUrl,
    linkLabel: "Latest blocks",
    copyText: site.explorerUrl,
  },
  {
    icon: "chain" as const,
    title: "Address pages",
    desc: "Look up any wallet or contract address. See balance, transaction history, and token holdings.",
    href: site.explorerUrl,
    linkLabel: "Search addresses",
    copyText: site.explorerUrl,
  },
  {
    icon: "verify" as const,
    title: "Contract verification",
    desc: "Submit Solidity source to match bytecode on-chain. Verified contracts expose read/write tabs.",
    href: site.explorerUrl,
    linkLabel: "Verify contract",
    copyText: `${site.explorerUrl}/verify`,
  },
  {
    icon: "wallet" as const,
    title: "Token transfers",
    desc: "ERC-20 transfer events indexed from logs. Token pages list holders, transfers, and metadata.",
    href: site.explorerUrl,
    linkLabel: "Token tracker",
    copyText: site.explorerUrl,
  },
  {
    icon: "gas" as const,
    title: "Charts & statistics",
    desc: "Network stats — block height, transaction counts, and gas trends from rollup tables.",
    href: site.explorerUrl,
    linkLabel: "View stats",
    copyText: site.explorerUrl,
  },
  {
    icon: "link" as const,
    title: "REST API",
    desc: "ECNASCAN API serves the explorer and integrations. JSON responses, CORS-aware for frontends.",
    href: site.apiUrl,
    linkLabel: "API base URL",
    copyText: site.apiUrl,
  },
];

export function ExplorerFeatures() {
  return (
    <section id="explorer" className="scroll-mt-20 border-b border-[var(--card-border)] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl font-semibold text-[var(--card-heading)] sm:text-3xl">ECNASCAN explorer</h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--card-muted)] sm:text-base">
            BscScan-style interface for {site.chainName}. Each card links to the live explorer — copy URLs for docs or
            integrations.
          </p>
        </div>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <li key={f.title} className="feature-card flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="info-panel-icon h-9 w-9">
                  <PanelIcon name={f.icon} />
                </div>
                <CopyButton text={f.copyText} label={f.title} />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-[var(--card-heading)]">{f.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--card-muted)]">{f.desc}</p>
              <a
                href={f.href}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
              >
                {f.linkLabel}
                <span aria-hidden>→</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
