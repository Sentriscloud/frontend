import type { NextConfig } from "next";
import { withSentrixDefaults } from "@sentriscloud/wallet-config/next-config";

const nextConfig: NextConfig = withSentrixDefaults({
  // TODO: drop once the React 19 / react-compiler lint sweep lands.
  // Next.js 15.5.15 + eslint-plugin-react-hooks bumped enforcement of
  // react-hooks/set-state-in-effect + react-compiler memoization rules;
  // pre-existing components surface violations that need component-by-
  // component refactors. Build-time bypass keeps deploys unblocked while
  // the refactor PR is in flight; lint still runs in CI on PRs.
  eslint: { ignoreDuringBuilds: true },
});

export default nextConfig;
