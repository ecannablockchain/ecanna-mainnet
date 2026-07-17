import { useState } from "react";
import { site } from "../config";
import { token20Label } from "../lib/chainBranding";

const T20 = token20Label();

type FaqItem = { q: string; a: string };
type FaqGroup = { title: string; items: FaqItem[] };

const groups: FaqGroup[] = [
  {
    title: "Network & chain",
    items: [
      {
        q: "Is this the same as Ethereum mainnet?",
        a: `No. ${site.chainName} is an independent Layer-1 with chain ID 4111. It uses EVM bytecode and JSON-RPC, but ${site.nativeSymbol} and deployed contracts are not automatically bridged to Ethereum unless you build a bridge.`,
      },
      {
        q: "What consensus does the network use?",
        a: "Geth Clique Proof of Authority (PoA). A configured set of validators sign blocks on a ~3 second schedule. There is no mining or staking slashing like proof-of-stake mainnet.",
      },
      {
        q: "How fast are transaction confirmations?",
        a: "Transactions are included in the next sealed block — typically within ~3 seconds. PoA finality is immediate at inclusion; there is no long probabilistic confirmation window.",
      },
      {
        q: "What is the block gas limit?",
        a: "30,000,000 gas per block (genesis default). Complex contracts must fit within this limit per block; heavy deployments may need optimization or constructor splitting.",
      },
      {
        q: "Can the chain be restarted without losing data?",
        a: "Yes, in production. Geth persists to disk via Docker volumes. In development, use Anvil persistent state or Geth — not ephemeral Hardhat, which resets on every restart.",
      },
    ],
  },
  {
    title: "Rates, gas & fees",
    items: [
      {
        q: "How are transaction fees calculated?",
        a: `Fee = gas used × gas price, paid in native ${site.nativeSymbol}. Wallets estimate gas before signing. The live gas price is shown on this site and in the explorer dashboard, read from the node via eth_feeHistory / getFeeData.`,
      },
      {
        q: `Why does the site show a USD price for ${site.nativeSymbol}?`,
        a: "The USD figure is a reference index (external ETH spot) used only to illustrate gas costs in familiar units. It is not an on-chain oracle and does not represent a listed market price for ECNA unless you operate an exchange.",
      },
      {
        q: "How much does a simple transfer cost?",
        a: "A standard native transfer uses 21,000 gas. Multiply by the current gas price in Gwei to get the fee in ECNA. The Rates & fees section on this page calculates this live.",
      },
      {
        q: "Are EIP-1559 priority fees supported?",
        a: "The node exposes maxFeePerGas and maxPriorityFeePerGas fields. On many PoA networks the effective price is stable and low; wallets may still send type-2 transactions.",
      },
      {
        q: "What affects gas cost for smart contracts?",
        a: "Storage writes, external calls, loop length, and contract size all increase gas. Deploy costs are highest; reads are cheapest. Always test on a dev node before mainnet deployment.",
      },
    ],
  },
  {
    title: "Wallets & users",
    items: [
      {
        q: "Can I use MetaMask or Trust Wallet?",
        a: "Yes. Add a custom EVM network with chain ID 4111, your RPC URL, and ECNA as the currency symbol. Copy values from the Wallet configuration or Network reference sections.",
      },
      {
        q: "Where do I get test ECNA?",
        a: "Genesis and treasury scripts fund operator accounts in development. On a live deployment, request funds from your network operator or use a faucet if one is published.",
      },
      {
        q: "What is the difference between the dashboard and the explorer?",
        a: "The explorer is read-only — search blocks, transactions, and contracts. The dashboard connects your wallet (MetaMask / WalletConnect) so you can sign and send transactions.",
      },
      {
        q: "Is the website login the same as my wallet?",
        a: "No. Register / log in on this site is for marketing hub accounts only. Your on-chain identity is your wallet address and private keys — never enter seed phrases on this website.",
      },
    ],
  },
  {
    title: "Developers",
    items: [
      {
        q: "Which tools can I use to deploy contracts?",
        a: "Hardhat, Foundry, and Remix. Always set compiler EVM version to london (Hardhat already does in this repo). Remix must not use default / shanghai / cancun — Advanced → EVM Version → london. Chain ID 4111 (mainnet) or 4112 (testnet) and the public RPC URL.",
      },
      {
        q: "Why does Remix default fail on E Canna?",
        a: "Remix default targets a newer Ethereum fork (e.g. osaka/prague). E Canna Clique genesis stops at London so stock Geth exchange nodes can sync. Set EVM Version to london, recompile, then deploy.",
      },
      {
        q: "How do I verify source code?",
        a: "After deployment, open Verify Contract in ECNASCAN. Provide compiler version, optimization runs, SPDX license, EVM london, and bytecode matching the deployment transaction.",
      },
      {
        q: "Does the API require authentication for reads?",
        a: "Public read endpoints (blocks, transactions, search, dashboard) are open for the explorer. Rate limiting applies in production. Write operations and account features use separate auth.",
      },
      {
        q: `What is ${T20}?`,
        a: `${T20} refers to ERC-20 style tokens on this chain — including the optional PETH token deployed via the contracts package. Transfers are indexed and visible on address and token pages.`,
      },
      {
        q: "How do I point my dApp at the network?",
        a: `Use ethers.js or viem with JsonRpcProvider pointing at your RPC URL and chainId 4111. For frontends, set VITE_* URLs to the public API and explorer hosts.`,
      },
    ],
  },
  {
    title: "Explorer, indexer & operations",
    items: [
      {
        q: "Where is blockchain data stored?",
        a: "Canonical state is on the Geth node. ECNASCAN indexes blocks, transactions, and token transfers into MS SQL Server for fast search and analytics.",
      },
      {
        q: "Why might the explorer lag behind the chain tip?",
        a: "The indexer processes blocks sequentially. During catch-up or heavy load, indexed block height can trail RPC chainHead. The live stats banner shows lag in blocks when present.",
      },
      {
        q: "Should JSON-RPC be public on the internet?",
        a: "No for production validators. Firewall port 8545 to trusted IPs (indexer, deployers). Public users should use the explorer and API, not your raw node.",
      },
      {
        q: "How do I run the full stack locally?",
        a: "Start a node (Geth Docker, Anvil, or Hardhat), then npm run local:stack from the repo root for API, indexer, explorer, and dashboard. See SETUP_NEW_LAPTOP.txt in the repository.",
      },
      {
        q: "What ports need to be open in production?",
        a: "Typically 443 (HTTPS) for explorer, dashboard, API, and website. RPC 8545 should not be public. SQL Server stays on a private network accessible only to API/indexer.",
      },
    ],
  },
];

function groupKey(title: string, index: number) {
  return `${title}-${index}`;
}

export function Faq() {
  const [openKey, setOpenKey] = useState<string | null>(groupKey(groups[0]!.title, 0));

  return (
    <section id="faq" className="scroll-mt-20 border-b border-[var(--card-border)] bg-[var(--page-bg)] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-2xl font-semibold text-[var(--card-heading)] sm:text-3xl">Frequently asked questions</h2>
          <p className="mt-3 text-sm text-[var(--card-muted)] sm:text-base">
            {groups.reduce((n, g) => n + g.items.length, 0)} answers covering network parameters, fees, wallets,
            development, and operations.
          </p>
        </div>

        <div className="mt-12 space-y-10">
          {groups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-4 font-display text-lg font-semibold text-brand-600">{group.title}</h3>
              <ul className="divide-y divide-[var(--card-border)] rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)]">
                {group.items.map((item, i) => {
                  const key = groupKey(group.title, i);
                  const isOpen = openKey === key;
                  return (
                    <li key={item.q}>
                      <button
                        type="button"
                        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
                        onClick={() => setOpenKey(isOpen ? null : key)}
                        aria-expanded={isOpen}
                      >
                        <span className="font-medium text-[var(--card-heading)]">{item.q}</span>
                        <span className="mt-0.5 shrink-0 text-brand-600">{isOpen ? "−" : "+"}</span>
                      </button>
                      {isOpen ? (
                        <p className="border-t border-[var(--card-border)] px-5 pb-4 pt-2 text-sm leading-relaxed text-[var(--card-muted)]">
                          {item.a}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
