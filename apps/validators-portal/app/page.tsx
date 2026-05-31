import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { site } from "@/content/site";

export const revalidate = 3600;

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden pt-32 pb-24 md:pt-40 md:pb-32">
      <div
        aria-hidden
        className="backdrop-numeral pointer-events-none absolute -top-12 right-[-4vw] hidden select-none text-[36rem] md:block lg:-top-20 lg:text-[42rem]"
      >
        val
      </div>

      <div className="container-page relative">
        <div className="grid grid-cols-1 gap-y-12 md:grid-cols-12 md:gap-x-10">
          <aside className="md:col-span-3 md:pt-6">
            <div className="section-number">VAL — Sentrix Validators</div>
            <p className="mono mt-6 max-w-xs text-xs leading-relaxed text-(--color-ink-3)">
              Browse the active set, see who&apos;s online, delegate{" "}
              <span className="text-(--color-ink-2)">SRX</span> with one
              wallet click. Coming soon.
            </p>
          </aside>

          <div className="md:col-span-9">
            <p className="mono mb-6 text-xs uppercase tracking-[0.2em] text-(--color-emerald-500)">
              Coming soon · Beta in {new Date().getFullYear()}
            </p>
            <h1 className="display-heavy text-(--color-ink) text-[clamp(2.75rem,7.5vw,6.5rem)]">
              The Sentrix
              <br />
              validator{" "}
              <span className="display-italic font-medium text-(--color-emerald-500)">
                directory.
              </span>
            </h1>

            <div className="mt-12 grid gap-10 md:grid-cols-12 md:gap-x-10">
              <div className="md:col-span-7 space-y-5 max-w-xl text-base leading-[1.65] text-(--color-ink-2) md:text-lg">
                <p>
                  Today Sentrix validators show up as 40-character hex
                  addresses with no moniker layer — fine for a tight initial
                  set, awkward for a real delegator audience.
                </p>
                <p>
                  This portal will fix that: validators register a moniker,
                  publish a pitch, and delegators pick + delegate with one
                  wallet click. Read the raw list on Scan in the meantime.
                </p>
              </div>

              <aside className="md:col-span-5 space-y-4">
                <div className="rounded-lg border border-(--color-line) p-5">
                  <div className="mono text-[10px] uppercase tracking-[0.18em] text-(--color-ink-3)">
                    Planned features
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-(--color-ink-2)">
                    <li>Directory: moniker, commission, uptime, stake</li>
                    <li>Per-validator profile + delegator pitch</li>
                    <li>WalletConnect delegate / undelegate / claim</li>
                    <li>Live block-signing stream</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-(--color-line) p-5">
                  <div className="mono text-[10px] uppercase tracking-[0.18em] text-(--color-ink-3)">
                    Live now
                  </div>
                  <p className="mt-3 text-sm text-(--color-ink-2)">
                    Scan already lists validators read-only at{" "}
                    <Link
                      href={site.related.scan}
                      className="underline decoration-(--color-line) hover:text-(--color-ink)"
                    >
                      scan.sentrixchain.com/validators
                    </Link>
                    .
                  </p>
                </div>
              </aside>
            </div>

            <div className="mt-14 flex flex-wrap gap-3">
              <Link
                href={site.related.scan}
                className="inline-flex items-center gap-2 rounded-full border border-(--color-emerald-500) bg-(--color-emerald-500) px-6 py-3 text-sm font-medium text-black transition-opacity hover:opacity-85"
              >
                Browse validators on Scan
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <a
                href={`mailto:${site.email.contact}?subject=Validator+directory+waitlist`}
                className="inline-flex items-center gap-2 rounded-full border border-(--color-line) px-6 py-3 text-sm font-medium text-(--color-ink-2) transition-colors hover:border-(--color-ink-2)"
              >
                Join waitlist
                <ArrowUpRight className="h-4 w-4" />
              </a>
              <Link
                href={site.related.register}
                className="inline-flex items-center gap-2 rounded-full border border-(--color-line) px-6 py-3 text-sm font-medium text-(--color-ink-2) transition-colors hover:border-(--color-ink-2)"
              >
                Register a validator
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <footer className="mt-32 border-t border-(--color-line) pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-(--color-ink-3)">
            <p className="mono">© Sentrix Labs · permissionless validator set</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <Link href={site.related.chain} className="hover:text-(--color-ink-2)">
                sentrixchain.com
              </Link>
              <Link href={site.related.docs} className="hover:text-(--color-ink-2)">
                docs
              </Link>
              <Link href={site.related.scan} className="hover:text-(--color-ink-2)">
                scan
              </Link>
              <a href={`mailto:${site.email.contact}`} className="hover:text-(--color-ink-2)">
                {site.email.contact}
              </a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
