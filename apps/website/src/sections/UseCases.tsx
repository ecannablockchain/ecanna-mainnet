import { site } from "../config";
import { token20Label } from "../lib/chainBranding";

const T20 = token20Label();

const cases = [
  {
    title: "Token issuance",
    body: `Launch native ${site.nativeSymbol} treasuries or deploy ${T20} tokens with OpenZeppelin standards. Transfers appear in the explorer token tracker once indexed.`,
  },
  {
    title: "Smart contract applications",
    body: "Run DeFi primitives, escrow, loyalty programs, or supply-chain registries. Verified source code lets users inspect logic before signing transactions.",
  },
  {
    title: "Enterprise & consortium",
    body: "PoA validators give a known set of block signers. Suitable for internal settlement, B2B workflows, or regulated environments that need audit trails.",
  },
  {
    title: "Wallet integrations",
    body: "Add chain ID 4111 to MetaMask, Trust Wallet, or any EVM wallet. Users send and receive through the dashboard or their preferred client.",
  },
  {
    title: "Developer testing",
    body: "Hardhat and Anvil support local iteration. Persistent Anvil state or Geth Docker volumes let you resume chains without redeploying contracts.",
  },
  {
    title: "Analytics & compliance",
    body: "SQL Server stores normalized block and transaction data. Export or query for reporting, reconciliation, and operational monitoring.",
  },
];

export function UseCases() {
  return (
    <section id="use-cases" className="scroll-mt-20 border-b border-[var(--card-border)] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl font-semibold text-[var(--card-heading)] sm:text-3xl">What you can build</h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--card-muted)] sm:text-base">
            Because {site.chainName} speaks standard Ethereum JSON-RPC and Solidity, most Ethereum tooling works without
            forks or custom SDKs. These are common deployment patterns on the network today.
          </p>
        </div>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => (
            <li key={c.title} className="border-l-2 border-brand-500/60 pl-4">
              <h3 className="font-medium text-[var(--card-heading)]">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--card-muted)]">{c.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
