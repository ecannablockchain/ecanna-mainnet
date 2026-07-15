import { motion } from "framer-motion";

export function StandardsNote() {
  return (
    <section id="standards" className="scroll-mt-24 border-b border-ringline py-14 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-ringline bg-page-2/80 px-6 py-6 sm:px-10 sm:py-8"
        >
          <h2 className="font-display text-lg text-ink sm:text-xl">Compliance & responsible positioning</h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
            <p>
              References to casinos, wagering, or gaming economics describe <strong className="text-ink">technical capabilities</strong>{" "}
              of programmable blockchains — not an offer of gambling services. Operators remain solely responsible for licensing,
              geo-restrictions, consumer protection, and marketing rules in each jurisdiction.
            </p>
            <p>
              On-chain transparency does not replace legal advice. Deploy contracts, custody assets, and promote products only where
              your counsel and regulators approve.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
