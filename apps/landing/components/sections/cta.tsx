import { ArrowUpRight } from "lucide-react";
import { ScrollReveal } from "../scroll-reveal";

export function Cta() {
  return (
    <section id="about" className="py-24 md:py-36">
      <div className="container-page">
        <ScrollReveal>
          <div className="relative isolate overflow-hidden rounded-3xl border border-(--color-emerald-700)/40 bg-gradient-to-br from-(--color-emerald-900)/40 via-(--color-canvas) to-(--color-canvas) px-8 py-16 md:px-16 md:py-24">
            <div
              aria-hidden
              className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-(--color-emerald-500) opacity-10 blur-3xl"
            />
            <span className="eyebrow">Get involved</span>
            <h2 className="display mt-6 max-w-3xl text-4xl text-(--color-ink) md:text-5xl lg:text-6xl">
              Build, validate, or partner with SentrisCloud.
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-(--color-ink-2) md:text-lg">
              External validators onboard in 2026. Builders are welcome any time. Partners and exchanges — let&apos;s talk.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="mailto:hello@sentriscloud.com"
                className="inline-flex items-center gap-2 rounded-full bg-(--color-emerald-500) px-7 py-3.5 text-sm font-medium text-(--color-canvas) transition-transform duration-200 hover:-translate-y-0.5"
              >
                hello@sentriscloud.com
                <ArrowUpRight size={14} />
              </a>
              <a
                href="https://github.com/Sentriscloud"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-(--color-line) px-7 py-3.5 text-sm font-medium text-(--color-ink-2) transition-colors hover:border-(--color-emerald-700) hover:text-(--color-ink)"
              >
                See the code
                <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
