import { notFound } from "next/navigation";

// DECISION: Next.js App Router doesn't render the segment's not-found.tsx on unmatched URL
// paths by default — it bubbles up to the root. This catch-all makes every unmatched
// /:locale/* URL trigger notFound() inside the [locale] tree, so the branded, i18n-aware
// app/[locale]/not-found.tsx takes over. Documented by next-intl maintainers as the
// idiomatic locale-scoped 404 pattern on App Router.
export default function CatchAllNotFound() {
  notFound();
}
