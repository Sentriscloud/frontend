import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // DECISION: output:"standalone" was removed — it breaks `next start` on Next 15.5.15 with
  // the routes-manifest.json shape emitted when middleware + i18n + metadata routes are present
  // ("routesManifest.dataRoutes is not iterable"). Service is launched via `pnpm start` behind
  // systemd + Nginx, so standalone mode adds no value here.
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    // DECISION: optimize tree-shaking for lucide-react. Excluded recharts because it interacts
    // badly with Turbopack 15.5 optimizePackageImports (seen a build hang in this repo).
    optimizePackageImports: ["lucide-react"],
  },
  // EIP-3091 compliance — wallets and chain registries deeplink via the
  // singular `/block` and `/token` paths. Our app canonical routes are
  // plural (`/blocks/[height]`, `/tokens/[addr]`). The /tx/ and /address/
  // routes already match EIP-3091 because they're singular AND match the
  // existing app structure (the i18n middleware redirects them to
  // /en/tx/<hash> etc which serves 200 — that satisfies the spec).
  //
  // The two paths that genuinely 404 today and break EIP-3091:
  //   /block/<n>   — singular form not in app, need redirect to /blocks/<n>
  //   /token/<a>   — singular form not in app, need redirect to /tokens/<a>
  //
  // Permanent 308 redirects + locale prefix to engage the i18n middleware
  // cleanly. Also handles inside-locale variants
  // (`/en/block/<n>` → `/en/blocks/<n>`) for completeness.
  async redirects() {
    return [
      { source: "/block/:height", destination: "/en/blocks/:height", permanent: true },
      { source: "/token/:addr", destination: "/en/tokens/:addr", permanent: true },
      { source: "/:locale(en|id)/block/:height", destination: "/:locale/blocks/:height", permanent: true },
      { source: "/:locale(en|id)/token/:addr", destination: "/:locale/tokens/:addr", permanent: true },
    ];
  },
  // Suppress webpack "Critical dependency: the request of a dependency
  // is an expression" warnings from Sentry's transitive OpenTelemetry
  // chain — `@opentelemetry/instrumentation` and `require-in-the-middle`
  // both use `require(variable)` patterns that webpack can't statically
  // analyze. These are reachable only on dynamic OTel registration paths
  // we never trigger; the warnings are pure static-analysis noise.
  webpack: (cfg) => {
    cfg.ignoreWarnings = [
      ...((cfg.ignoreWarnings as Array<RegExp | { module?: RegExp; message?: RegExp }>) ?? []),
      {
        module: /node_modules\/(\.pnpm\/)?(@opentelemetry\/instrumentation|require-in-the-middle|@prisma\/instrumentation)/,
        message: /Critical dependency/,
      },
    ];
    return cfg;
  },
};

const withIntl = withNextIntl(nextConfig);

export default process.env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(withIntl, {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      widenClientFileUpload: true,
      sourcemaps: { disable: false },
      disableLogger: true,
    })
  : withIntl;
