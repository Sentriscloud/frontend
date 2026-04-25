import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { footerLinks } from "@/content/nav";
import { site } from "@/content/site";
import { Logo } from "../ui/logo";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-(--color-line-2) bg-(--color-canvas)">
      <div className="container-page py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <Link href="/" className="inline-flex items-center gap-3" aria-label="SentrisCloud home">
              <Logo size={28} />
              <span className="text-base font-medium tracking-tight text-(--color-ink)">SentrisCloud</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-(--color-ink-3)">
              {site.tagline}
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs text-(--color-ink-4)">
              <a href={`mailto:${site.email.contact}`} className="hover:text-(--color-ink-2)">
                {site.email.contact}
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 md:col-span-8 md:grid-cols-3">
            <FooterColumn title="Products" links={footerLinks.products} />
            <FooterColumn title="Ecosystem" links={footerLinks.ecosystem} />
            <FooterColumn title="Company" links={footerLinks.company} />
          </div>
        </div>

        <div className="mt-16 flex flex-col-reverse items-start gap-4 border-t border-(--color-line-2) pt-8 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-(--color-ink-4)">
            © {year} SentrisCloud. All rights reserved.
          </p>
          <p className="data text-xs text-(--color-ink-4)">
            Built on{" "}
            <a
              href={site.related.chain}
              target="_blank"
              rel="noreferrer"
              className="text-(--color-emerald-400) hover:text-(--color-emerald-300)"
            >
              Sentrix Chain
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: readonly { label: string; href: string; external?: boolean }[];
}) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-[0.18em] text-(--color-ink-4)">{title}</h3>
      <ul className="mt-5 space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              {...(link.external ? { target: "_blank", rel: "noreferrer" } : {})}
              className="group inline-flex items-center gap-1 text-sm text-(--color-ink-2) transition-colors hover:text-(--color-ink)"
            >
              {link.label}
              {link.external ? (
                <ArrowUpRight
                  size={12}
                  className="text-(--color-ink-4) transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              ) : null}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
