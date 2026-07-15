import { motion } from "framer-motion";
import { site } from "../config";
import { token20Label } from "../lib/chainBranding";

const T20 = token20Label();

const pillars = [
  {
    title: "Gaming & live ops",
    subtitle: "Authoritative game state",
    body:
      "Match outcomes, seasonal ladders, and cross-title entitlements can be anchored on an EVM-compatible chain so players, studios, and leagues share one verifiable timeline. Low-latency design choices and indexed telemetry (via ECNASCAN) make it practical to debug disputes the same way race engineers replay telemetry laps.",
    bullets: ["Signed state transitions", "Auditable season resets", "Third-party spectator proofs"],
    accent: "border-hud/35 bg-hud/5",
     iconPath: "/Gamingliveops.svg", 

  },
  {
    title: "Casino & wagering tech",
    subtitle: "Provable rules, transparent settlement",
    body:
      "Randomness commitments, payout logic, and reserve movements can be published on-chain so regulators, platform partners, and players read the same rulebook. This does not replace licensing or jurisdiction — it strengthens operational transparency where your counsel approves on-chain disclosure.",
    bullets: ["Deterministic settlement paths", "Explorer-grade receipt history", "Partner audit workflows"],
    accent: "border-gold/40 bg-gold/5",
      iconPath: "/CasinowageringTech.svg",

  },
  {
    title: "Marketplaces & digital goods",
    subtitle: "Ownership that travels with the asset",
    body:
      "NFTs, tickets, passes, and in-game items benefit from composable standards: list on secondary markets, bundle with DeFi primitives, or gate experiences with smart contracts. {native} fees and contract verification on ECNASCAN help market operators show provenance without hiding behind opaque databases.",
    bullets: [`${T20}-style portability`, "Royalty & fee transparency", "Contract source verification"],
    accent: "border-racing/35 bg-racing/5",
     iconPath: "/Marketplacesdigitalgoods.svg"
  },
  {
    title: "Motorsport & Formula One–style ops",
    subtitle: "Telemetry, timing, trust",
      iconPath: "/MotorsportFormula.svg",
    body:
      "High-stakes series run on split-second decisions. A dedicated chain can carry timing proofs, credential checks for garage access, sponsor activations, and fan rewards — always with a public block explorer as the neutral replay. Think of blocks as sector times: predictable cadence, immutable order, and a broadcast everyone can verify.",
    bullets: ["Immutable ordering for contested events", "Fan & partner reward rails", "Operational dashboards + on-chain receipts"],
    accent: "border-hud/25 border-racing/20 bg-gradient-to-br from-hud/5 to-racing/5",
  },
];

export function BlockchainVerticals() {
  return (
    <section id="verticals" className="scroll-mt-24 border-b border-ringline py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-racing">Why blockchain here</p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            Utilities for <span className="text-gradient-race">gaming, casinos, marketplaces</span>, and the grid
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            {site.chainName} is general-purpose EVM infrastructure. The same ledger that powers tokens and DeFi also supports
            experiences where trust, timing, and transparency matter — from arena-scale games to pit-lane operations and regulated
            wagering platforms (where permitted).
          </p>
        </motion.div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2 utilities-cards">
          {pillars.map((p, i) => (
            <motion.article
              key={p.title}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className={`glass-panel rounded-2xl border p-7 ${p.accent}`}
            >

                <img 
                  src={p.iconPath} 
                  alt="" 
                  className="icon-utilities" 
                  aria-hidden="true"
                />





              <h3 className="font-display text-xl text-ink">{p.title}</h3>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-hud">{p.subtitle}</p>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                {p.body.replace(/\{native\}/g, site.nativeSymbol)}
              </p>
              <ul className="mt-5 space-y-2 border-t border-ringline pt-5 text-sm text-ink">
                {p.bullets.map((b) => (
                  <li key={b} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-racing" aria-hidden />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mx-auto mt-14 max-w-3xl rounded-2xl border border-ringline bg-card/80 px-6 py-5 text-center text-sm leading-relaxed text-muted"
        >
          <strong className="text-ink">How this fits together:</strong> wallets hold keys; contracts encode rules; the chain orders
          outcomes; ECNASCAN indexes the evidence. Your product UX stays fast — the blockchain is the shared source of truth when
          stakeholders need to agree.
        </motion.div>
      </div>
    </section>
  );
}
