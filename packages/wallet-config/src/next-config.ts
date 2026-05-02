// Shared Next.js webpack workarounds for the transitive-dep noise that
// cascades into every Sentrix frontend through wallet-config's wagmi /
// RainbowKit / Privy / Sentry dependency tree. None of these are bugs in
// our code — they're optional peer-deps from libraries we never call into,
// or `require(variable)` patterns that webpack can't statically resolve.
// Each is silenced surgically (specific module aliases + scoped warning
// regexes) rather than blanket-suppressing webpack's analysis, so a
// genuinely-broken import would still surface.
//
// Sources of the noise:
//   - @react-native-async-storage/async-storage  ← MetaMask SDK (RN platform)
//   - @farcaster/mini-app-solana                  ← Privy (Solana mini-app)
//   - ox/tempo/internal/virtualMasterPool.js      ← viem (Tempo chain config)
//   - @opentelemetry/instrumentation              ← Sentry (server-side OTel)
//
// Usage in an app's next.config.ts:
//
//   import type { NextConfig } from "next";
//   import { withSentrixDefaults } from "@sentriscloud/wallet-config/next-config";
//
//   const nextConfig: NextConfig = withSentrixDefaults({
//     /* app-specific config */
//   });
//
//   export default nextConfig;

import type { NextConfig } from "next";

type WebpackConfig = Parameters<NonNullable<NextConfig["webpack"]>>[0];
type WebpackContext = Parameters<NonNullable<NextConfig["webpack"]>>[1];

export function withSentrixDefaults(config: NextConfig = {}): NextConfig {
  const userWebpack = config.webpack;
  return {
    ...config,
    webpack: (cfg: WebpackConfig, ctx: WebpackContext): WebpackConfig => {
      // Optional native-platform deps webpack should resolve to a no-op.
      // The libraries that import these (MetaMask SDK / Privy) gate them
      // behind runtime checks for React Native or Solana mini-app
      // contexts respectively — in a browser/Node web build they're
      // dead code that webpack should never need to load.
      cfg.resolve = cfg.resolve ?? {};
      cfg.resolve.alias = {
        ...((cfg.resolve.alias as Record<string, string | false>) ?? {}),
        "@react-native-async-storage/async-storage": false,
        "@farcaster/mini-app-solana": false,
      };

      // Scoped "Critical dependency: the request of a dependency is an
      // expression" suppression. These come from `require(variable)`
      // patterns in viem's tempo chain config + OpenTelemetry's
      // instrumentation loader. Both are reachable only on dynamic
      // configuration paths we never trigger; the warnings are pure
      // webpack-static-analysis noise.
      cfg.ignoreWarnings = [
        ...((cfg.ignoreWarnings as Array<RegExp | { module?: RegExp; message?: RegExp }>) ?? []),
        {
          module: /node_modules\/(\.pnpm\/)?(ox|@opentelemetry\/instrumentation)/,
          message: /Critical dependency: the request of a dependency is an expression/,
        },
      ];

      // Hand off to user-provided webpack hook last so app-specific tweaks
      // can override or extend our defaults.
      if (typeof userWebpack === "function") {
        return userWebpack(cfg, ctx);
      }
      return cfg;
    },
  };
}
