import Link from "next/link";
import { ArrowDown } from "lucide-react";

/**
 * Hero — editorial type-led, asymmetric. No grid background, no eyebrow tag,
 * no double CTA. The headline does the work; everything else is supporting.
 * Backdrop numeral provides a quiet editorial signature without the AI-grid feel.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-24 md:pt-40 md:pb-32">
      {/* Editorial backdrop numeral — sits behind headline, barely there */}
      <div
        aria-hidden
        className="backdrop-numeral pointer-events-none absolute -top-12 right-[-4vw] hidden select-none text-[36rem] md:block lg:-top-20 lg:text-[42rem]"
      >
        01
      </div>

      <div className="container-page relative">
        <div className="grid grid-cols-1 gap-y-12 md:grid-cols-12 md:gap-x-10">
          {/* Left margin: section number + standfirst */}
          <aside className="md:col-span-3 md:pt-6">
            <div className="section-number">01 — SentrisCloud</div>
            <p className="mono mt-6 max-w-xs text-xs leading-relaxed text-(--color-ink-3)">
              The user-facing layer of{" "}
              <span className="text-(--color-ink-2)">Sentrix Chain</span> —
              explorers, wallets, faucets, and exchanges. Built to be used, not
              just shipped.
            </p>
          </aside>

          {/* Headline column */}
          <div className="md:col-span-9">
            <h1 className="display-heavy text-(--color-ink) text-[clamp(3.25rem,9.5vw,8.5rem)]">
              The chain
              <br />
              has products
              <br />
              <span className="display-italic font-medium text-(--color-emerald-500)">
                now.
              </span>
            </h1>

            <div className="mt-12 grid gap-10 md:grid-cols-12 md:gap-x-10">
              <p className="md:col-span-7 max-w-xl text-base leading-[1.65] text-(--color-ink-2) md:text-lg">
                Most Layer&nbsp;1s ship a node and call the work done.
                We build the explorers, wallets, faucets and exchanges
                that make Sentrix Chain something people actually use —
                not just something validators run.
              </p>

              <div className="md:col-span-5 md:flex md:items-end md:justify-end">
                <Link
                  href="#products"
                  className="group inline-flex items-baseline gap-3 text-sm text-(--color-ink-2) transition-colors hover:text-(--color-emerald-400)"
                >
                  <span className="link-underline pb-1">See what we ship</span>
                  <ArrowDown
                    size={14}
                    className="transition-transform group-hover:translate-y-0.5"
                  />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
