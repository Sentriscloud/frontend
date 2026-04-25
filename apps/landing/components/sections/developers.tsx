import { ArrowUpRight, Code2, GitBranch, Package, Wrench } from "lucide-react";
import { SectionHeading } from "../ui/section-heading";
import { ScrollReveal } from "../scroll-reveal";

const resources = [
  {
    title: "Frontend monorepo",
    description: "All TypeScript apps in one workspace. Clone once, develop everything.",
    icon: GitBranch,
    href: "https://github.com/Sentriscloud/frontend",
  },
  {
    title: "Brand kit",
    description: "Logos, marks, and guidelines for SentrisCloud, Sentrix Labs, and Sentrix Chain.",
    icon: Package,
    href: "https://github.com/sentrix-labs/brand-kit",
  },
  {
    title: "Chain core (Rust)",
    description: "The Sentrix Chain Layer 1 implementation. PoE consensus, EVM-compatible.",
    icon: Code2,
    href: "https://github.com/sentrix-labs/sentrix",
  },
  {
    title: "Sentrix Labs",
    description: "Protocol foundation: SDKs, RFCs, contracts, and integration tooling.",
    icon: Wrench,
    href: "https://github.com/sentrix-labs",
  },
];

export function Developers() {
  return (
    <section
      id="developers"
      className="border-y border-(--color-line-2) bg-(--color-canvas-2)/30 py-24 md:py-32"
    >
      <div className="container-page">
        <ScrollReveal>
          <SectionHeading
            eyebrow="For builders"
            title="Open by default."
            description="Every product, SDK, and brand asset is on GitHub. Clone it, fork it, run a validator, ship something."
          />
        </ScrollReveal>

        <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-(--color-line) bg-(--color-line) md:grid-cols-2 lg:mt-20 lg:grid-cols-4">
          {resources.map((r, i) => {
            const Icon = r.icon;
            return (
              <ScrollReveal
                key={r.title}
                delay={i * 0.04}
                className="bg-(--color-canvas)"
              >
                <a
                  href={r.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex h-full flex-col p-7 transition-colors hover:bg-(--color-canvas-2) md:p-8"
                >
                  <div className="flex items-start justify-between">
                    <Icon
                      size={20}
                      className="text-(--color-emerald-400) transition-colors group-hover:text-(--color-emerald-300)"
                    />
                    <ArrowUpRight
                      size={14}
                      className="text-(--color-ink-4) transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-(--color-emerald-400)"
                    />
                  </div>
                  <h3 className="mt-8 text-base font-medium tracking-tight text-(--color-ink)">
                    {r.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-(--color-ink-3)">
                    {r.description}
                  </p>
                </a>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
