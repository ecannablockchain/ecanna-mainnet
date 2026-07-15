import { site } from "../config";

export function Build() {
  return (
    <section id="build" className="scroll-mt-20 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="site-hero overflow-hidden rounded-lg border border-white/10 px-8 py-10 sm:px-12 sm:py-12">
          <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">Go to production</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Deploy contracts, verify source, and point users to the live explorer at{" "}
            <span className="font-mono text-brand-200">{site.explorerUrl}</span>.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={site.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-500"
            >
              View explorer
            </a>
            <a
              href={site.dashboardUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-white/25 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              Open dashboard
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
