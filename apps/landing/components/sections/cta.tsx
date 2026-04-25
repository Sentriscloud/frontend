import { ArrowUpRight } from "lucide-react";

/**
 * CTA — closing section. One primary contact card (corner-lines hover),
 * supporting utility rows for source / chain / security disclosures.
 * No inline-email-in-paragraph trick; visual hierarchy is explicit.
 */
export function Cta() {
  return (
    <section id="about" className="relative overflow-hidden py-32 md:py-44">
      {/* Backdrop numeral — quiet editorial signature */}
      <div
        aria-hidden
        className="backdrop-numeral pointer-events-none absolute -top-16 right-[-3vw] hidden select-none text-[34rem] md:block lg:-top-24 lg:text-[40rem]"
      >
        05
      </div>

      <div className="container-page relative">
        <div className="grid grid-cols-1 gap-y-12 md:grid-cols-12 md:gap-x-10">
          <aside className="md:col-span-3 md:pt-6">
            <div className="section-number">05 — Closing</div>
            <p className="mono mt-6 max-w-xs text-xs leading-relaxed text-(--color-ink-3)">
              Talk to us about products, partnerships, or running a validator —
              one inbox handles all of it.
            </p>
          </aside>

          <div className="md:col-span-9">
            <h2 className="display-heavy text-(--color-ink) text-[clamp(2.75rem,7vw,6.5rem)]">
              Build, validate,
              <br />
              or{" "}
              <span className="display-italic font-medium text-(--color-emerald-500)">
                partner
              </span>{" "}
              with us.
            </h2>

            <p className="mt-10 max-w-xl text-base leading-[1.7] text-(--color-ink-3) md:text-lg">
              Mostly we just want the chain to be useful. If you&apos;re
              building on Sentrix, validating it, or want to ship something
              together — start here.
            </p>

            <div className="mt-16 grid gap-y-10 md:grid-cols-12 md:gap-x-10">
              {/* Primary contact card */}
              <a
                href="mailto:contact@sentriscloud.com"
                className="corner-lines group relative block overflow-hidden border border-(--color-line) bg-(--color-canvas-2)/50 p-8 transition-colors hover:border-(--color-gold)/50 md:col-span-7 md:p-10"
              >
                <span className="cl-bl" aria-hidden />
                <span className="cl-br" aria-hidden />
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-(--color-emerald-500) opacity-[0.05] blur-3xl transition-opacity duration-500 group-hover:opacity-[0.1]"
                />
                <div className="relative flex items-start justify-between gap-6">
                  <div>
                    <span className="mono text-[10px] uppercase tracking-[0.22em] text-(--color-ink-4)">
                      Primary contact
                    </span>
                    <div
                      className="mono mt-4 text-lg text-(--color-emerald-400) md:text-xl"
                      style={{ fontFeatureSettings: '"ss02", "tnum"' }}
                    >
                      contact@sentriscloud.com
                    </div>
                    <p className="mt-4 max-w-xs text-xs leading-relaxed text-(--color-ink-3)">
                      Replies within 48 hours · EN / ID
                    </p>
                  </div>
                  <ArrowUpRight
                    size={18}
                    className="shrink-0 text-(--color-ink-4) transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-(--color-emerald-400)"
                  />
                </div>
              </a>

              {/* Utility links */}
              <dl className="md:col-span-5 flex flex-col justify-center gap-0 md:pl-2">
                <UtilityRow
                  label="Source"
                  value="github.com/Sentriscloud"
                  href="https://github.com/Sentriscloud"
                  external
                />
                <UtilityRow
                  label="Chain"
                  value="sentrixchain.com"
                  href="https://sentrixchain.com"
                  external
                />
                <UtilityRow
                  label="Security"
                  value="security@sentriscloud.com"
                  href="mailto:security@sentriscloud.com"
                />
              </dl>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function UtilityRow({
  label,
  value,
  href,
  external,
}: {
  label: string;
  value: string;
  href: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className="group flex items-baseline justify-between gap-4 border-b border-(--color-line) py-4 transition-colors first:border-t hover:border-(--color-emerald-700)/40"
    >
      <dt className="mono text-[10px] uppercase tracking-[0.22em] text-(--color-ink-4)">
        {label}
      </dt>
      <dd className="mono flex items-center gap-2 text-xs text-(--color-ink-2) transition-colors group-hover:text-(--color-emerald-400) md:text-sm">
        <span>{value}</span>
        <ArrowUpRight
          size={12}
          className="text-(--color-ink-4) transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-(--color-emerald-400)"
        />
      </dd>
    </a>
  );
}
