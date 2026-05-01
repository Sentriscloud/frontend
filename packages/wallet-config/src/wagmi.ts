// Shared wagmi/RainbowKit configuration. Each Sentrix frontend imports
// this and wraps its app tree with <SentrixWalletProvider>; the provider
// component is in `./provider.tsx` (separate file because it pulls in
// React component code that pure config consumers don't need).
//
// WalletConnect project ID:
//   - Required by RainbowKit for the WalletConnect transport (covers
//     300+ mobile wallets via QR).
//   - Set per-app via NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in the build
//     env. We default to a placeholder during local dev so the page
//     still renders; production builds MUST override.
//   - Free to register at https://cloud.reown.com (formerly WalletConnect
//     Cloud). One project ID can serve multiple Sentrix apps.

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  okxWallet,
  trustWallet,
  rabbyWallet,
  phantomWallet,
  walletConnectWallet,
  coinbaseWallet,
  injectedWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { http } from "viem";
import { SENTRIX_CHAINS, SENTRIX_MAINNET, SENTRIX_TESTNET } from "./chain";

const FALLBACK_WC_PROJECT_ID = "00000000000000000000000000000000";

function readProjectId(): string {
  const id =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) ||
    "";
  if (!id) {
    if (typeof window !== "undefined") {
      // Surface the misconfiguration in the browser console — the app
      // still mounts but WalletConnect QR scanning won't work until a
      // real project ID is wired in.
      console.warn(
        "[wallet-config] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set; " +
          "WalletConnect transport will run in placeholder mode. " +
          "Get a free ID at https://cloud.reown.com.",
      );
    }
    return FALLBACK_WC_PROJECT_ID;
  }
  return id;
}

export interface SentrixWalletConfigOptions {
  /** App display name shown to wallets in the connect modal. */
  appName: string;
  /** Optional app icon URL shown in the connect modal. */
  appIcon?: string;
  /** Optional app description shown in the connect modal. */
  appDescription?: string;
  /** Optional app URL shown in the connect modal. */
  appUrl?: string;
  /**
   * Restrict to mainnet only (e.g. claim apps that should only ever
   * touch chain 7119). Defaults to false — both 7119 and 7120 surface
   * in the chain switcher.
   */
  mainnetOnly?: boolean;
  /** Override WalletConnect project ID (default reads from env). */
  projectIdOverride?: string;
}

export function createSentrixWalletConfig(opts: SentrixWalletConfigOptions) {
  const projectId = opts.projectIdOverride ?? readProjectId();
  const chains = opts.mainnetOnly ? ([SENTRIX_MAINNET] as const) : SENTRIX_CHAINS;

  return getDefaultConfig({
    appName: opts.appName,
    appDescription: opts.appDescription ?? "Sentrix Chain",
    appUrl: opts.appUrl ?? "https://sentrixchain.com",
    appIcon: opts.appIcon,
    projectId,
    // The wallet list per the spec — explicit ordering is the order
    // they show up in the modal. RainbowKit's wallet detection auto-
    // hides wallets that aren't installed (via `injected` group), so
    // these all show up regardless of which extension the user has.
    wallets: [
      {
        groupName: "Recommended",
        wallets: [
          metaMaskWallet,
          okxWallet,
          trustWallet,
          rabbyWallet,
          phantomWallet,
          walletConnectWallet,
        ],
      },
      {
        groupName: "Other",
        wallets: [coinbaseWallet, injectedWallet],
      },
    ],
    chains: chains as unknown as readonly [
      (typeof SENTRIX_CHAINS)[number],
      ...(typeof SENTRIX_CHAINS)[number][],
    ],
    transports: {
      [SENTRIX_MAINNET.id]: http(SENTRIX_MAINNET.rpcUrls.default.http[0]),
      [SENTRIX_TESTNET.id]: http(SENTRIX_TESTNET.rpcUrls.default.http[0]),
    },
    ssr: true,
  });
}

export type SentrixWalletConfig = ReturnType<typeof createSentrixWalletConfig>;
