import { ScrollReveal } from "../scroll-reveal";

/**
 * Why — manifesto-style. Drop the icon-card grid; render as three editorial
 * paragraphs with prominent first letters. More opinion, less template.
 */
const tenets = [
  {
    title: "Products, not just protocol.",
    body: `Most Layer 1s ship a node and call the work done. The chain
    becomes infrastructure looking for someone else to make it useful.
    We chose the harder path: ship the explorer, the wallet, the
    faucet, the exchange — so the chain has somewhere to be useful
    from day one.`,
  },
  {
    title: "Built on what we operate.",
    body: `We don't ride someone else's settlement layer. Sentrix Chain
    is a native Layer 1 with sub-second blocks and instant finality,
    operated by us, used by us. When a product breaks, we can fix the
    protocol underneath it. No vendor in the middle.`,
  },
  {
    title: "Open to the people who'll grow it.",
    body: `External validators onboard in 2026. SDKs, brand assets, and
    tooling are public. Every product lives on GitHub. We grow the
    network as much as we grow the product — because a chain without
    other voices is a private database with extra steps.`,
  },
];

export function Why() {
  return (
    <section id="why" className="py-28 md:py-36">
      <div className="container-page">
        <header className="grid grid-cols-1 gap-y-8 md:grid-cols-12 md:gap-x-10">
          <div className="md:col-span-3">
            <div className="section-number">03 — Position</div>
          </div>
          <div className="md:col-span-9">
            <h2 className="display max-w-3xl text-(--color-ink) text-[clamp(2.5rem,6vw,5rem)]">
              A chain isn&apos;t enough.
              <br />
              <span className="display-italic text-(--color-emerald-500)">
                Products are.
              </span>
            </h2>
          </div>
        </header>

        <div className="mt-16 grid grid-cols-1 gap-y-16 md:mt-24 md:grid-cols-12 md:gap-x-10 md:gap-y-24">
          {tenets.map((tenet, i) => (
            <ScrollReveal
              key={tenet.title}
              delay={i * 0.06}
              className="md:col-span-12"
            >
              <article className="grid grid-cols-1 gap-y-6 md:grid-cols-12 md:gap-x-10">
                <div className="md:col-span-3">
                  <span className="mono text-xs tracking-[0.18em] text-(--color-ink-4)">
                    {String(i + 1).padStart(2, "0")} / 03
                  </span>
                  <h3 className="display mt-4 text-(--color-ink) text-2xl md:text-3xl lg:text-4xl">
                    {tenet.title}
                  </h3>
                </div>
                <p className="dropcap md:col-span-8 md:col-start-5 max-w-2xl text-base leading-[1.7] text-(--color-ink-2) md:text-lg">
                  {tenet.body}
                </p>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
