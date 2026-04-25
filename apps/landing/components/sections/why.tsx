import { values } from "@/content/values";
import { SectionHeading } from "../ui/section-heading";
import { ScrollReveal } from "../scroll-reveal";

export function Why() {
  return (
    <section id="why" className="py-24 md:py-32">
      <div className="container-page">
        <ScrollReveal>
          <SectionHeading
            eyebrow="Why SentrisCloud"
            title="A Layer 1 isn't enough — products are."
            description="Most chains ship a node and call it done. We ship the surfaces people actually touch, so the chain has somewhere to be useful from day one."
          />
        </ScrollReveal>

        <div className="mt-16 grid gap-8 md:grid-cols-3 lg:mt-20">
          {values.map((value, i) => {
            const Icon = value.icon;
            return (
              <ScrollReveal key={value.title} delay={i * 0.08}>
                <article className="hairline group flex h-full flex-col rounded-2xl bg-(--color-canvas-2)/30 p-8">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-(--color-line) bg-(--color-canvas) text-(--color-emerald-400)">
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-8 text-lg font-medium tracking-tight text-(--color-ink)">
                    {value.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-(--color-ink-3)">
                    {value.description}
                  </p>
                </article>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
