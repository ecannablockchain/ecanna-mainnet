import { token20Label } from "../lib/chainBranding";
import { chainIdDecimal, publicRpcUrl } from "../lib/publicNetwork";

const T20 = token20Label();
const rpcUrl = publicRpcUrl();
const chainId = chainIdDecimal();

const rows = [
  { label: "Smart contracts", value: "Solidity, UUPS proxy upgrades, and on-chain verification via the explorer." },
  { label: "JSON-RPC", value: "Standard Ethereum JSON-RPC — use ethers.js, viem, or Hardhat without custom SDKs." },
  { label: "Token indexing", value: `ERC-20 transfers and ${T20} activity indexed for address and token pages.` },
  { label: "Hardhat / Foundry", value: "Point networks.ecna at your RPC URL and chain ID 4111; deploy scripts work unchanged." },
  { label: "Environment variables", value: "VITE_* for frontends, DATABASE_URL and RPC_URL for API/indexer — same pattern as other EVM stacks." },
];

export function Stack() {
  return (
    <section id="stack" className="scroll-mt-20 border-b border-[var(--card-border)] bg-[var(--page-bg)] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <h2 className="font-display text-2xl font-semibold text-[var(--card-heading)] sm:text-3xl">Developer tooling</h2>
            <p className="mt-3 text-[var(--card-muted)]">
              Familiar EVM workflows. Deploy with Hardhat or Foundry, verify source on the explorer, and monitor via the public API.
            </p>
            <ul className="mt-8 space-y-5">
              {rows.map((r) => (
                <li key={r.label} className="border-l-2 border-brand-500 pl-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{r.label}</p>
                  <p className="mt-1 text-sm text-[var(--card-muted)]">{r.value}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="site-card overflow-hidden p-0">
            <div className="border-b border-[var(--card-border)] bg-[var(--page-bg)] px-4 py-2">
              <p className="font-mono text-xs text-[var(--card-muted)]">hardhat.config — ecna network</p>
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-[var(--card-muted)]">
{`// hardhat.config — custom network
networks: {
  ecna: {
    url: "${rpcUrl}",
    chainId: ${chainId},
  },
},
// deploy: npx hardhat run scripts/deploy.ts --network ecna`}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
