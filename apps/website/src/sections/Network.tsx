import { FeatureCard } from "../components/BlockchainIcons";
import { site } from "../config";

const pillars: { icon: Parameters<typeof FeatureCard>[0]["icon"]; title: string; body: string }[] = [
  {
    icon: "explorer",
    title: "Block explorer",
    body: "Search blocks, transactions, addresses, and verified contracts with the same patterns used on major EVM explorers.",
  },
  {
    icon: "database",
    title: "Indexed data",
    body: "SQL Server–backed indexer keeps lists, charts, and address history responsive as the chain grows past millions of blocks.",
  },
  {
    icon: "rpc",
    title: "Standard RPC",
    body: "JSON-RPC for wallets and tools. When deploying contracts, set Solidity EVM to london (Remix Advanced — not default).",
  },
  {
    icon: "wallet",
    title: "Wallet dashboard",
    body: "RainbowKit-powered UI for sending native ECNA and interacting with contracts after connecting a browser wallet.",
  },
  {
    icon: "verify",
    title: "Contract verification",
    body: "Publish Solidity source on ECNASCAN so bytecode is auditable and read/write contract tabs are available to users.",
  },
  {
    icon: "ops",
    title: "Production operations",
    body: "Geth Docker stack, PM2 process management, SQL backups, and documented deploy paths for DigitalOcean and bare metal.",
  },
];

export function Network() {
  return (
    <section id="features" className="scroll-mt-20 border-b border-[var(--card-border)] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-2xl font-semibold text-[var(--card-heading)] sm:text-3xl">Built for operators and developers</h2>
          <p className="mt-3 text-[var(--card-muted)]">
            Production stack for {site.chainName}: Geth node, ECNASCAN API, explorer UI, and MS SQL Server index.
          </p>
        </div>
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map((p) => (
            <FeatureCard key={p.title} icon={p.icon} title={p.title} body={p.body} />
          ))}
        </ul>
      </div>
    </section>
  );
}
