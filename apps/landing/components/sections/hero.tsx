import Link from "next/link";
import { ArrowDown } from "lucide-react";

/**
 * Hero — editorial type-led, asymmetric. No grid background, no eyebrow tag,
 * no double CTA. The headline does the work; everything else is supporting.
 */
export function Hero() {
  return (
    <section className="relative pt-36 pb-28 md:pt-44 md:pb-40">
      <div className="container-page">
        <div className="grid grid-cols-1 gap-y-12 md:grid-cols-12 md:gap-x-10">
          {/* Left margin: section number + standfirst */}
          <aside className="md:col-span-3 md:pt-8">
            <div className="section-number">01 — Sentriscloud</div>
            <p className="mono mt-6 max-w-xs text-xs leading-relaxed text-(--color-ink-3)">
              The user-facing layer of Sentrix Chain. Maintained from{" "}
              <span className="text-(--color-ink-2)">Indonesia</span>, deployed
              for everyone.
            </p>
          </aside>

          {/* Headline column */}
          <div className="md:col-span-9">
            <h1 className="display text-(--color-ink) text-[clamp(3rem,9vw,8rem)]">
              The chain
              <br />
              has products
              <br />
              <span className="display-italic text-(--color-emerald-500)">now.</span>
            </h1>

            <div className="mt-12 grid gap-10 md:grid-cols-12 md:gap-x-10">
              <p className="md:col-span-7 max-w-xl text-base leading-relaxed text-(--color-ink-2) md:text-lg">
                Most Layer&nbsp;1s ship a node and call the work done.
                We build the explorers, wallets, faucets and exchanges
                that make Sentrix Chain something people actually use —
                not just something validators run.
              </p>

              <div className="md:col-span-5 md:flex md:justify-end md:items-end">
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
