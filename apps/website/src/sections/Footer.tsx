import { Link } from "react-router-dom";
import { BrandMark } from "../components/BrandMark";
import { SocialLinks } from "../components/SocialLinks";
import { AddToWallet } from "../components/AddToWallet";
import { site } from "../config";

const exploreLinks = [
  { href: "#live-stats", label: "Network stats" },
  { href: "#rates", label: "Gas & fees" },
  { href: "#reference", label: "Chain reference" },
  { href: site.explorerUrl, label: "Explorer", external: true },
];

const devLinks: { href: string; label: string; external?: boolean }[] = [
  { href: "#stack", label: "Developers" },
  { href: "#faq", label: "FAQ" },
  { href: site.dashboardUrl, label: "Dashboard", external: true },
  { href: "#wallet", label: "Wallet setup" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr_minmax(280px,340px)] lg:gap-10">
          <div>
            <div className="flex items-center gap-3">
              <BrandMark />
              <div>
                <p className="font-display text-base font-semibold text-white">ECNASCAN</p>
                <p className="text-xs text-slate-500">Chain ID 4111</p>
              </div>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
              Block explorer and indexer for {site.chainName}.
            </p>
            <SocialLinks className="mt-5" />
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="footer-col-title">Site</p>
              <ul className="mt-3 space-y-2">
                {exploreLinks.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      {...(l.external ? { target: "_blank", rel: "noreferrer" } : {})}
                      className="footer-link"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="footer-col-title">Account</p>
              <ul className="mt-3 space-y-2">
                {devLinks.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      {...(l.external ? { target: "_blank", rel: "noreferrer" } : {})}
                      className="footer-link"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
                <li>
                  <Link to="/register" className="footer-link">
                    Register
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="footer-link">
                    Log in
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div id="add-wallet" className="footer-wallet-panel">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Custom network</p>
            <p className="mt-1 font-display text-lg font-semibold leading-tight text-white">{site.chainName}</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div>
                <dt className="text-slate-500">Chain ID</dt>
                <dd className="font-mono text-slate-200">4111</dd>
              </div>
              <div>
                <dt className="text-slate-500">Symbol</dt>
                <dd className="font-mono text-slate-200">{site.nativeSymbol}</dd>
              </div>
            </dl>
            <AddToWallet variant="footer" className="mt-4" />
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row">
          <p>© {year} ECNASCAN</p>
          <p>PoA · ~3s blocks · EVM</p>
        </div>
      </div>
    </footer>
  );
}
