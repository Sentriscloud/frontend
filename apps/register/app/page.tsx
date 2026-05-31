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
        reg
      </div>

      <div className="container-page relative">
        <div className="grid grid-cols-1 gap-y-12 md:grid-cols-12 md:gap-x-10">
          <aside className="md:col-span-3 md:pt-6">
            <div className="section-number">REG — Sentrix Validator</div>
            <p className="mono mt-6 max-w-xs text-xs leading-relaxed text-(--color-ink-3)">
              Web wizard to submit{" "}
              <span className="text-(--color-ink-2)">RegisterValidator</span>{" "}
              with WalletConnect. Coming soon. CLI works today.
            </p>
          </aside>

          <div className="md:col-span-9">
            <p className="mono mb-6 text-xs uppercase tracking-[0.2em] text-(--color-emerald-500)">
              Coming soon · Beta in {new Date().getFullYear()}
            </p>
            <h1 className="display-heavy text-(--color-ink) text-[clamp(2.75rem,7.5vw,6.5rem)]">
              Register a
              <br />
              Sentrix validator{" "}
              <span className="display-italic font-medium text-(--color-emerald-500)">
                from your wallet.
              </span>
            </h1>

            <div className="mt-12 grid gap-10 md:grid-cols-12 md:gap-x-10">
              <div className="md:col-span-7 space-y-5 max-w-xl text-base leading-[1.65] text-(--color-ink-2) md:text-lg">
                <p>
                  This page will host a web wizard that walks you through
                  keystore generation, bonding ≥ 15,000 SRX, and broadcasting
                  the <code className="mono">StakingOp::RegisterValidator</code>{" "}
                  transaction with one wallet click.
                </p>
                <p>
                  Until it ships, the CLI path works today and is what active
                  operators use. The deep guide covers hardware spec, systemd
                  unit, keystore handling, and monitoring end-to-end.
                </p>
              </div>

              <aside className="md:col-span-5 space-y-4">
                <div className="rounded-lg border border-(--color-line) p-5">
                  <div className="mono text-[10px] uppercase tracking-[0.18em] text-(--color-ink-3)">
                    Requirements
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-(--color-ink-2)">
                    <li>≥ 15,000 SRX self-stake</li>
                    <li>8 vCPU · 16 GiB RAM · 16 GiB swap · 1 TB NVMe</li>
                    <li>100 Mbit sustained bandwidth</li>
                    <li>Port 30303/tcp inbound</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-(--color-line) p-5">
                  <div className="mono text-[10px] uppercase tracking-[0.18em] text-(--color-ink-3)">
                    Status
                  </div>
                  <p className="mt-3 text-sm text-(--color-ink-2)">
                    Mainnet currently off for stability fixes (SIPs #5/#6).
                    Testnet active — try the flow there first.
                  </p>
                </div>
              </aside>
            </div>

            <div className="mt-14 flex flex-wrap gap-3">
              <Link
                href={site.related.docs}
                className="inline-flex items-center gap-2 rounded-full border border-(--color-emerald-500) bg-(--color-emerald-500) px-6 py-3 text-sm font-medium text-black transition-opacity hover:opacity-85"
              >
                Read the deep guide
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <a
                href={`mailto:${site.email.contact}?subject=Validator+registration+waitlist`}
                className="inline-flex items-center gap-2 rounded-full border border-(--color-line) px-6 py-3 text-sm font-medium text-(--color-ink-2) transition-colors hover:border-(--color-ink-2)"
              >
                Join waitlist
                <ArrowUpRight className="h-4 w-4" />
              </a>
              <Link
                href={site.related.scan}
                className="inline-flex items-center gap-2 rounded-full border border-(--color-line) px-6 py-3 text-sm font-medium text-(--color-ink-2) transition-colors hover:border-(--color-ink-2)"
              >
                See active validators
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
