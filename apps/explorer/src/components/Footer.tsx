import { useState } from "react";
import { Link } from "react-router-dom";
import { CHAIN_DISPLAY_NAME } from "../lib/chainBranding";
import { addOrSwitchEcnascanNetwork, getChainConfig } from "../lib/metamaskNetwork";


/** BscScan-style footer: 4 columns + bottom bar — nothing extra. */
export function ExplorerFooter() {
  const [msg, setMsg] = useState<string | null>(null);
  const { chainId, nativeSymbol } = getChainConfig();

  const onAddNetwork = async () => {
    setMsg(null);
    const r = await addOrSwitchEcnascanNetwork();
    setMsg(r.ok ? `✓ ${r.message}` : r.message);
  };


  return (
    <footer className="ecna-footer border-t text-slate-300" style={{ borderColor: "var(--footer-border)", background: "var(--footer-bg)" }}>
      <div className="mx-auto max-w-7xl px-3 py-8 sm:px-4">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-white">
             <img src="../logo-thumb.png" alt="" className="ecna-wordmark-footer" />
              <span className="font-display text-base font-semibold sm:text-lg">Powered by {nativeSymbol}</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              ECNASCAN is a block explorer and analytics platform for {CHAIN_DISPLAY_NAME}.
            </p>
            <p className="text-xs leading-relaxed text-amber-200/90">
              Contract deploy: Remix / solc <strong className="text-amber-100">EVM = london</strong> (not default or
              shanghai). See Verify &amp; Publish.
            </p>
            <button
              type="button"
              onClick={() => void onAddNetwork()}
              className="add-network-button"
            >
              <span className="bg-addnetwork">
                 <img src="../logo-thumb.png" alt="" className="h-7 w-7 shrink-0 ecna-icon-mark" />
              </span>
              {/* <MetaMaskFox className="h-7 w-7 shrink-0" /> */}
              Add ECNA network
            </button>
            {msg ? <p className="text-xs text-slate-300">{msg}</p> : null}
            <p className="text-xs text-slate-500">
              Chain ID <span className="font-mono text-slate-400">{chainId}</span>
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Company</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="text-slate-400">Brand assets</li>
              <li className="text-slate-400">Contact — self-hosted</li>
              <li className="text-slate-400">Terms &amp; privacy</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Community</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                <Link to="/api-docs" className="hover:text-brand-400">
                  API documentation
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-brand-400">
                  Network status
                </Link>
              </li>
              <li>
                <Link to="/blocks" className="hover:text-brand-400">
                  Blocks
                </Link>
              </li>
              <li>
                <Link to="/txs" className="hover:text-brand-400">
                  Transactions
                </Link>
              </li>
              <li>
                <Link to="/verified-contracts" className="hover:text-brand-400">
                  Verified contracts
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Products &amp; services</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                <Link to="/verify" className="hover:text-brand-400">
                  Verify contract
                </Link>
              </li>
              <li>
                <Link to="/token-transfers" className="hover:text-brand-400">
                  Token transfers
                </Link>
              </li>
              <li>
                <Link to="/api-docs" className="hover:text-brand-400">
                  API plans
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div
        className="border-t py-3 text-center text-[11px] text-slate-500 sm:flex sm:items-center sm:justify-between sm:px-4 sm:text-left"
        style={{ borderColor: "var(--footer-border)", background: "var(--footer-bottom)" }}
      >
        <span className="mx-auto block max-w-7xl sm:mx-0">
          © {new Date().getFullYear()} ECNASCAN · ECNA Smart Chain Explorer · ecnascan.com
          
          {/* ECNASCAN · ECNA Smart Chain · Built as an open block explorer for the ECNA network. */}
        </span>
      </div>
    </footer>
  );
}

function MetaMaskFox({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 35 33" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M32.96 1L19.72 10.49l2.45-5.73L32.96 1zM2.04 1l13.09 9.65-2.35-5.89L2.04 1zM28.7 23.88l-3.47 5.33 7.51 2.07 2.15-7.28-6.19-.12zM1.11 24l2.14 7.28 7.51-2.07-3.47-5.33-6.18.12z"
        fill="#E17726"
      />
      <path
        d="M10.24 13.18l-.21 3.12 5.5-2.89-5.29-.23zm14.52 0l-5.29.23 5.5 2.89-.21-3.12zM10.47 28.21l3.31-1.61-2.85-2.22-.46 3.83zm13.06-1.61l3.31 1.61-.46-3.83-2.85 2.22z"
        fill="#E27625"
      />
      <path d="M23.53 26.6l-3.31-1.01 2.6 1.9.71-.89zm-12.06 0l.71.89 2.6-1.9-3.31 1.01z" fill="#D5BFB2" />
      <path
        d="M14.47 19.69l-2.6 1.9 1.86 5.62-.12-3.83-3.31-1.01zm5.06 0l-3.31 1.01-.12 3.83 1.86-5.62-2.6-1.9z"
        fill="#233447"
      />
      <path d="M17.5 1L10.24 13.18l2.23-5.73L17.5 1zm0 0l7.26 12.18 2.23-5.73L17.5 1z" fill="#E27625" />
    </svg>
  );
}
