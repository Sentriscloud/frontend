import { ArrowUpRight } from "lucide-react";

import { products, statusLabels, type Product } from "@/content/products";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "../scroll-reveal";

export function Products() {
  // Hero product: most prominent / most-shipped. Others form the supporting roster.
  const featured = products.find((p) => p.slug === "scan") ?? products[0]!;
  const others = products.filter((p) => p.slug !== featured.slug);

  return (
    <section id="products" className="py-28 md:py-36">
      <div className="container-page">
        <header className="grid grid-cols-1 gap-y-8 md:grid-cols-12 md:gap-x-10">
          <div className="md:col-span-3">
            <div className="section-number">02 — Products</div>
          </div>
          <div className="md:col-span-9">
            <h2 className="display max-w-3xl text-(--color-ink) text-[clamp(2.5rem,6vw,5rem)]">
              Four surfaces.
              <br />
              <span className="display-italic text-(--color-emerald-500)">
                One ecosystem.
              </span>
            </h2>
            <p className="mt-8 max-w-xl text-base leading-relaxed text-(--color-ink-3)">
              Each product runs on Sentrix Chain. They share primitives, brand,
              and the goal of making a Layer&nbsp;1 actually usable.
            </p>
          </div>
        </header>

        {/* Featured product */}
        <ScrollReveal className="mt-20 md:mt-28">
          <FeaturedCard product={featured} />
        </ScrollReveal>

        {/* Roster — compact rows, no card-grid clutter */}
        <ul className="mt-16 divide-y divide-(--color-line)">
          {others.map((product, i) => (
            <ScrollReveal key={product.slug} delay={i * 0.04}>
              <ProductRow product={product} />
            </ScrollReveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FeaturedCard({ product }: { product: Product }) {
  const isLinkable = product.href !== "#";
  const Wrapper: React.ElementType = isLinkable ? "a" : "div";
  const wrapperProps = isLinkable
    ? { href: product.href, target: "_blank", rel: "noreferrer" }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className="corner-lines group relative block overflow-hidden border border-(--color-line) bg-(--color-canvas-2)/50 p-10 transition-colors hover:border-(--color-gold)/50 md:p-16"
    >
      <span className="cl-bl" aria-hidden />
      <span className="cl-br" aria-hidden />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-(--color-emerald-500) opacity-[0.06] blur-3xl"
      />
      <div className="grid grid-cols-1 gap-y-10 md:grid-cols-12 md:gap-x-12">
        <div className="md:col-span-7">
          <div className="flex items-center gap-3">
            <StatusBadge status={product.status} />
            <span className="mono text-[10px] uppercase tracking-[0.18em] text-(--color-ink-4)">
              Featured · explorer
            </span>
          </div>
          <h3 className="display mt-6 text-(--color-ink) text-4xl md:text-5xl lg:text-6xl">
            {product.name}
          </h3>
          <p className="mt-5 text-base leading-relaxed text-(--color-ink-2) md:text-lg">
            {product.description}
          </p>
          <div className="mt-10 inline-flex items-baseline gap-3 text-sm text-(--color-emerald-400)">
            <span className="link-underline pb-1">Open SentrixScan</span>
            <ArrowUpRight
              size={14}
              className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </div>
        </div>

        {/* Right column — quiet feature list, no icons */}
        <ul className="md:col-span-5 mt-2 space-y-4 self-end border-l border-(--color-line) pl-8">
          <FeatureBullet>Block, tx, address & validator views</FeatureBullet>
          <FeatureBullet>Live mainnet + testnet networks</FeatureBullet>
          <FeatureBullet>Smart search across heights & hashes</FeatureBullet>
          <FeatureBullet>SRC-20 token registry</FeatureBullet>
        </ul>
      </div>
    </Wrapper>
  );
}

function FeatureBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm text-(--color-ink-2)">
      <span className="mt-1.5 inline-block h-1 w-3 shrink-0 bg-(--color-emerald-500)" />
      <span>{children}</span>
    </li>
  );
}

function ProductRow({ product }: { product: Product }) {
  const isLinkable = product.href !== "#";
  const Wrapper: React.ElementType = isLinkable ? "a" : "div";
  const wrapperProps = isLinkable
    ? { href: product.href, target: "_blank", rel: "noreferrer" }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        "group flex items-baseline gap-6 py-7 md:gap-10",
        isLinkable && "transition-colors hover:bg-(--color-canvas-2)/30",
      )}
    >
      <span className="mono w-10 shrink-0 text-[10px] tabular-nums text-(--color-ink-4)">
        0{products.findIndex((p) => p.slug === product.slug) + 1}
      </span>
      <div className="flex-1 grid grid-cols-12 items-baseline gap-x-6">
        <h3 className="display col-span-12 text-(--color-ink) text-2xl md:col-span-4 md:text-3xl">
          {product.name}
        </h3>
        <p className="col-span-12 mt-2 text-sm text-(--color-ink-3) md:col-span-6 md:mt-0">
          {product.tagline}
        </p>
        <div className="col-span-12 mt-3 flex items-center gap-3 md:col-span-2 md:mt-0 md:justify-end">
          <StatusBadge status={product.status} />
          {isLinkable ? (
            <ArrowUpRight
              size={14}
              className="text-(--color-ink-4) transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-(--color-emerald-400)"
            />
          ) : null}
        </div>
      </div>
    </Wrapper>
  );
}

function StatusBadge({ status }: { status: Product["status"] }) {
  const styles = {
    live: "border-(--color-emerald-700) bg-(--color-emerald-900)/40 text-(--color-emerald-300)",
    beta: "border-(--color-line) bg-(--color-canvas-2) text-(--color-ink-2)",
    "in-development": "border-(--color-line) bg-(--color-canvas-2) text-(--color-ink-3)",
    planned: "border-(--color-line) bg-(--color-canvas-2) text-(--color-ink-4)",
  } as const;

  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em]",
        styles[status],
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
