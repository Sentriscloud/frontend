import { ArrowUpRight } from "lucide-react";

import { products, statusLabels, type Product } from "@/content/products";
import { cn } from "@/lib/utils";
import { SectionHeading } from "../ui/section-heading";
import { ScrollReveal } from "../scroll-reveal";

export function Products() {
  return (
    <section id="products" className="py-24 md:py-32">
      <div className="container-page">
        <ScrollReveal>
          <SectionHeading
            eyebrow="Products"
            title="Four surfaces, one ecosystem."
            description="Every SentrisCloud product touches Sentrix Chain. They share primitives, brand, and the goal of making a Layer 1 actually usable."
          />
        </ScrollReveal>

        <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-(--color-line) bg-(--color-line) md:grid-cols-2 lg:mt-20">
          {products.map((product, i) => (
            <ScrollReveal key={product.slug} delay={i * 0.05} className="bg-(--color-canvas)">
              <ProductCard product={product} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: Product }) {
  const Icon = product.icon;
  const isLive = product.status === "live";
  const isLinkable = product.href !== "#";

  const content = (
    <div className="group flex h-full flex-col gap-6 p-8 transition-colors hover:bg-(--color-canvas-2) md:p-10">
      <div className="flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-(--color-line) bg-(--color-canvas-2) text-(--color-emerald-500) transition-colors group-hover:border-(--color-emerald-700)">
          <Icon size={20} />
        </div>
        <StatusBadge status={product.status} />
      </div>

      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-medium tracking-tight text-(--color-ink) md:text-2xl">
            {product.name}
          </h3>
          {isLinkable && product.external ? (
            <ArrowUpRight
              size={16}
              className="text-(--color-ink-4) transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-(--color-emerald-500)"
            />
          ) : null}
        </div>
        <p className="mt-2 text-sm text-(--color-ink-3)">{product.tagline}</p>
        <p className="mt-4 text-sm leading-relaxed text-(--color-ink-2)">{product.description}</p>
      </div>

      <div className="mt-auto pt-2">
        {isLive ? (
          <span className="inline-flex items-center gap-2 text-xs text-(--color-emerald-400)">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-(--color-emerald-500) opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-(--color-emerald-500)" />
            </span>
            Live now
          </span>
        ) : (
          <span className="text-xs text-(--color-ink-4)">{statusLabels[product.status]}</span>
        )}
      </div>
    </div>
  );

  if (isLinkable && product.external) {
    return (
      <a href={product.href} target="_blank" rel="noreferrer" className="block h-full">
        {content}
      </a>
    );
  }

  return content;
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
        "rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em]",
        styles[status],
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
