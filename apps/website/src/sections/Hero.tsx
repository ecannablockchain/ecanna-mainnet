import { site } from "../config";
import { AddToWallet } from "../components/AddToWallet";

export function Hero() {
  return (
    <section className="site-hero border-b border-white/10">
      <div className="mx-auto max-w-6xl px-4 pb-14 pt-24 sm:px-6 sm:pb-16 sm:pt-28 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:items-end lg:gap-12">
          <div>
            <p className="font-mono text-xs text-brand-300">chainId 4111</p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {site.chainName}
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400 sm:text-base">{site.tagline}</p>
            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
              <a href={site.explorerUrl} target="_blank" rel="noreferrer" className="hero-btn hero-btn-primary">
                Explorer
              </a>
              <AddToWallet variant="hero" />
              <a href={site.dashboardUrl} target="_blank" rel="noreferrer" className="hero-btn hero-btn-outline">
                Dashboard
              </a>
            </div>
          </div>

          <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-white/10 bg-white/10 lg:mt-0">
            {[
              { k: "Chain ID", v: "4111" },
              { k: "Block time", v: "~3s" },
              { k: "Token", v: site.nativeSymbol },
              { k: "VM", v: "EVM" },
            ].map((row) => (
              <div key={row.k} className="bg-[#0a2540]/90 px-4 py-3.5">
                <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{row.k}</dt>
                <dd className="mt-0.5 font-mono text-sm text-white">{row.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
