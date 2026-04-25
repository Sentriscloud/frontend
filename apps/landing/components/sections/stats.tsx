import { getChainSnapshot } from "@/lib/chain";
import { formatNumber } from "@/lib/utils";
import { ScrollReveal } from "../scroll-reveal";

/**
 * Server component fetching real mainnet stats from Sentrix Chain RPC.
 * Cached for 60s via Next route segment config (in page.tsx).
 */
export async function Stats() {
  const snapshot = await getChainSnapshot();

  const items = [
    {
      label: "Latest block",
      value: snapshot.status === "live" ? `#${formatNumber(snapshot.blockHeight)}` : "—",
      hint: snapshot.status === "live" ? "Mainnet" : "Mainnet · sync warming",
    },
    {
      label: "Block time",
      value: "≤ 500 ms",
      hint: "Proof of Eternity (PoE)",
    },
    {
      label: "Native token",
      value: "SRX",
      hint: "Max supply 210 M · 8 decimals",
    },
    {
      label: "Chain ID",
      value: "7119",
      hint: "EVM-compatible · viem ready",
    },
  ];

  return (
    <section className="relative border-y border-(--color-line-2) bg-(--color-canvas-2)/40 py-16 md:py-20">
      <div className="container-page">
        <ScrollReveal>
          <span className="eyebrow">Live · mainnet</span>
        </ScrollReveal>
        <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-(--color-line) bg-(--color-line) md:grid-cols-4">
          {items.map((item, i) => (
            <ScrollReveal
              key={item.label}
              delay={i * 0.05}
              className="bg-(--color-canvas) px-6 py-8 md:px-8 md:py-10"
            >
              <div className="text-xs uppercase tracking-[0.18em] text-(--color-ink-4)">
                {item.label}
              </div>
              <div className="data mt-3 text-2xl text-(--color-ink) md:text-3xl">
                {item.value}
              </div>
              <div className="mt-2 text-xs text-(--color-ink-3)">{item.hint}</div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
