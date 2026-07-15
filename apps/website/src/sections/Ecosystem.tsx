import { site } from "../config";
import { publicRpcUrl } from "../lib/publicNetwork";

const rpcPublic = publicRpcUrl();

const products = [
  {
    name: "Block Explorer",
    port: "live",
    desc: "Public search for blocks, transactions, addresses, and verified contracts. Primary interface for end users and auditors.",
    url: site.explorerUrl,
    cta: "Open explorer",
  },
  {
    name: "Wallet Dashboard",
    port: "live",
    desc: "Connect MetaMask or WalletConnect to send native ECNA and interact with indexed tokens. Built with wagmi and RainbowKit.",
    url: site.dashboardUrl,
    cta: "Open dashboard",
  },
  {
    name: "ECNASCAN API",
    port: "live",
    desc: "REST backend for the explorer, contract verification, and chain statistics. Powers search and detail pages from SQL Server.",
    url: site.apiUrl,
    cta: "API endpoint",
  },
  {
    name: "JSON-RPC Node",
    port: "443",
    desc: "Geth validator behind HTTPS JSON-RPC. Point wallets and deployment scripts at the public RPC endpoint.",
    url: rpcPublic,
    cta: "Open RPC endpoint",
  },
];

export function Ecosystem() {
  return (
    <section id="ecosystem" className="scroll-mt-20 border-b border-[var(--card-border)] bg-[var(--page-bg)] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-2xl font-semibold text-[var(--card-heading)] sm:text-3xl">Platform components</h2>
          <p className="mt-3 text-sm text-[var(--card-muted)] sm:text-base">
            Four services work together: node, indexer, API, and frontends. Each runs as a separate process in development
            and can be deployed independently in production.
          </p>
        </div>
        <ul className="mt-12 grid gap-6 md:grid-cols-2">
          {products.map((p) => (
            <li key={p.name} className="site-card flex flex-col p-6">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-lg font-semibold text-[var(--card-heading)]">{p.name}</h3>
                <span className="shrink-0 rounded border border-[var(--card-border)] bg-[var(--page-bg)] px-2 py-0.5 font-mono text-[10px] text-[var(--card-muted)]">
                  {p.port === "live" ? "live" : `:${p.port}`}
                </span>
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--card-muted)]">{p.desc}</p>
              {p.url ? (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex w-fit rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
                >
                  {p.cta}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
