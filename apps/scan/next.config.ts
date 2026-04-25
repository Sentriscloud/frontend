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
