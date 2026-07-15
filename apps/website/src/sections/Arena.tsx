import { motion } from "framer-motion";

const modes = [
  {
    title: "Raid-ready throughput",
    body: "Design for bursts: token drops, tournaments, and market events where every millisecond of mempool clarity counts.",
    icon: "⚡",
  },
  {
    title: "Parc fermé compliance",
    body: "Rules are public: contract verification, decoded calls, and transfer trails your risk team can actually trace.",
    icon: "🏁",
  },
  {
    title: "VIP table economics",
    body: "Treasury logic, supply, and roles visible on-chain — the same transparency high-stakes finance expects from a cage.",
    icon: "◆",
  },
];

export function Arena() {
  return (
    <section id="arena" className="scroll-mt-24 border-b border-ringline bg-page-2/50 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-racing">Arena</p>
          <h2 className="mt-3 font-display text-3xl font-normal tracking-tight text-ink sm:text-4xl">
            Built for experiences that demand edge
          </h2>
          <p className="mt-4 text-lg text-muted">
            From competitive play to institutional flow — one chain, three philosophies we engineered into the stack.
          </p>
        </motion.div>

        <ul className="mt-14 grid gap-5 md:grid-cols-3">
          {modes.map((m, i) => (
            <motion.li
              key={m.title}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-panel group rounded-2xl p-7 transition hover:border-racing/35 hover:shadow-lg hover:shadow-racing/10"
            >
              <span className="text-3xl" aria-hidden>
                {m.icon}
              </span>
              <h3 className="mt-4 font-display text-lg text-ink">{m.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{m.body}</p>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
