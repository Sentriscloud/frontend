import { ArrowUpRight } from "lucide-react";

/**
 * CTA — closing editorial line, not a hero-card-with-buttons. Single direct
 * email link; the work is the closing punctuation.
 */
export function Cta() {
  return (
    <section id="about" className="py-32 md:py-44">
      <div className="container-page">
        <div className="grid grid-cols-1 gap-y-10 md:grid-cols-12 md:gap-x-10">
          <div className="md:col-span-3">
            <div className="section-number">05 — Closing</div>
          </div>
          <div className="md:col-span-9">
            <p className="display max-w-4xl text-(--color-ink) text-[clamp(2.25rem,5.5vw,4.5rem)] leading-[1.05]">
              Build, validate, or partner with us.{" "}
              <span className="text-(--color-ink-3)">
                Mostly we just want the chain to be useful.
              </span>{" "}
              <a
                href="mailto:hello@sentriscloud.com"
                className="link-underline group inline-flex items-center gap-3 text-(--color-emerald-400) hover:text-(--color-emerald-300)"
              >
                <span className="display-italic">
                  hello@sentriscloud.com
                </span>
                <ArrowUpRight
                  size={20}
                  className="transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"
                />
              </a>
            </p>

            <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4 text-sm text-(--color-ink-3)">
              <a
                href="https://github.com/Sentriscloud"
                target="_blank"
                rel="noreferrer"
                className="link-underline pb-0.5 hover:text-(--color-ink)"
              >
                GitHub
              </a>
              <a
                href="https://sentrixchain.com"
                target="_blank"
                rel="noreferrer"
                className="link-underline pb-0.5 hover:text-(--color-ink)"
              >
                Sentrix Chain
              </a>
              <a
                href="mailto:security@sentriscloud.com"
                className="link-underline pb-0.5 hover:text-(--color-ink)"
              >
                security@sentriscloud.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
