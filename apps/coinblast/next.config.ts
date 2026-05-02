import type { NextConfig } from "next";
import { withSentrixDefaults } from "@sentriscloud/wallet-config/next-config";

const nextConfig: NextConfig = withSentrixDefaults({});

export default nextConfig;
