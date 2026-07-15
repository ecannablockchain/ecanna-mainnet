const layers = [
  {
    label: "Clients",
    items: ["MetaMask / WalletConnect", "Hardhat / Foundry", "Browser dApps"],
  },
  {
    label: "Frontends",
    items: ["ECNASCAN Explorer :5174", "Wallet Dashboard :5173", "Marketing site :5180"],
  },
  {
    label: "Application",
    items: ["REST API :4000", "Block indexer", "Contract verification"],
  },
  {
    label: "Data & chain",
    items: ["MS SQL Server (indexed state)", "Geth Clique node :8545", "Genesis & validator keys"],
  },
];

export function Architecture() {
  return (
    <section id="architecture" className="scroll-mt-20 border-b border-[var(--card-border)] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl font-semibold text-[var(--card-heading)] sm:text-3xl">How it fits together</h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--card-muted)] sm:text-base">
            Wallets and scripts talk to the node over JSON-RPC. The indexer follows the chain head and writes blocks,
            transactions, and token events to SQL Server. The API and explorer read from that index — not directly from
            the node — for fast search at high block heights.
          </p>
        </div>
        <div className="mt-10 space-y-3">
          {layers.map((layer, i) => (
            <div key={layer.label} className="site-card p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-600/10 font-mono text-xs font-semibold text-brand-600">
                    {i + 1}
                  </span>
                  <span className="font-display font-semibold text-[var(--card-heading)]">{layer.label}</span>
                </div>
                <ul className="flex flex-wrap gap-2 sm:justify-end">
                  {layer.items.map((item) => (
                    <li
                      key={item}
                      className="rounded border border-[var(--card-border)] bg-[var(--page-bg)] px-2.5 py-1 font-mono text-[11px] text-[var(--card-muted)]"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs leading-relaxed text-[var(--card-muted)]">
          In production, run Geth via Docker (`ecnachain/`), host SQL Server with backups, and front the API and
          explorer behind HTTPS. Keep RPC port 8545 firewalled — expose only to trusted deployers and indexers.
        </p>
      </div>
    </section>
  );
}
