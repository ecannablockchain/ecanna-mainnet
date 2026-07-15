import { site } from "../config";

const steps = [
  {
    step: "01",
    title: "Add the network to your wallet",
    body: "Use the wallet configuration table below: network name, RPC URL, chain ID 4111, and currency symbol ECNA. Test with a small transfer first.",
  },
  {
    step: "02",
    title: "Connect to JSON-RPC",
    body: "Point Hardhat, Foundry, or your dApp provider at the node endpoint (port 8545 by default). No custom chain config beyond chainId and RPC URL.",
  },
  {
    step: "03",
    title: "Deploy contracts",
    body: "Use existing Solidity toolchains. Fund deployer accounts from genesis or treasury scripts. UUPS proxy patterns are supported in the contracts workspace.",
  },
  {
    step: "04",
    title: "Verify on the explorer",
    body: "Submit source code through ECNASCAN so users can read contract state and confirm bytecode matches your repository.",
  },
  {
    step: "05",
    title: "Monitor via explorer & API",
    body: "Watch blocks finalize every ~3 seconds. Use the explorer for manual checks and the REST API for automated dashboards or alerts.",
  },
];

export function GettingStarted() {
  return (
    <section id="start" className="scroll-mt-20 border-b border-[var(--card-border)] bg-[var(--page-bg)] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <h2 className="font-display text-2xl font-semibold text-[var(--card-heading)] sm:text-3xl">Getting started</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--card-muted)] sm:text-base">
              From zero to a verified contract on {site.chainName}. If you already develop for Ethereum, most steps are
              identical — only the RPC URL and chain ID change.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#wallet"
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
              >
                Wallet setup
              </a>
              <a
                href={site.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-[var(--card-border)] px-4 py-2 text-sm font-semibold text-[var(--card-heading)] hover:border-brand-500/50"
              >
                Open explorer
              </a>
            </div>
          </div>
          <ol className="space-y-4 lg:col-span-3">
            {steps.map((s) => (
              <li key={s.step} className="site-card flex gap-4 p-5">
                <span className="font-mono text-lg font-semibold text-brand-600">{s.step}</span>
                <div>
                  <h3 className="font-medium text-[var(--card-heading)]">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--card-muted)]">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
