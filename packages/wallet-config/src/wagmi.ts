// Shared wagmi/RainbowKit configuration. Each Sentrix frontend imports
// this and wraps its app tree with <SentrixWalletProvider>; the provider
// component is in `./provider.tsx`.
//
// Why we don't use RainbowKit's `getDefaultConfig`:
//   getDefaultConfig wires WalletConnect transport AND pulls in Reown's
//   AppKit unconditionally. AppKit runs a module-level init that calls
//   useConfig outside the React WagmiProvider tree, which throws
//   WagmiProviderNotFoundError on hydration of statically-rendered pages
//   (broke airdrop.sentrixchain.com — see #189). It also reaches for
//   indexedDB at config-creation time, which doesn't exist on the
//   server, so SSR crashed with `ReferenceError: indexedDB is not defined`.
//
// The fix: build the wagmi config manually with createConfig +
// connectorsForWallets. We only list injected-style wallets (MetaMask,
// Rabby, Phantom, Coinbase, etc.) — none of those pull AppKit. Solux
// signing covers the "no extension" case via the popup signer in
// solux-signer.tsx, so dropping WC scan-via-QR is acceptable until a
// real Reown project ID lands.

import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  okxWallet,
  trustWallet,
  rabbyWallet,
  phantomWallet,
  coinbaseWallet,
  injectedWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { SENTRIX_CHAINS, SENTRIX_MAINNET, SENTRIX_TESTNET } from "./chain";

// Even though we never use the WC transport, RainbowKit's wallet
// definitions import a projectId during connectorsForWallets. They
// won't fire any network call without an explicit user action, so a
// placeholder is fine. Real value can land via env when needed.
const FALLBACK_WC_PROJECT_ID = "00000000000000000000000000000000";

function readProjectId(): string {
  return (
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) ||
    FALLBACK_WC_PROJECT_ID
  );
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

  // Order = the order they show up in the modal. RainbowKit's injected-
  // detection auto-grays wallets that aren't installed.
  const connectors = connectorsForWallets(
    [
      {
        groupName: "Recommended",
        wallets: [metaMaskWallet, okxWallet, trustWallet, rabbyWallet, phantomWallet],
      },
      {
        groupName: "Other",
        wallets: [coinbaseWallet, injectedWallet],
      },
    ],
    {
      appName: opts.appName,
      appDescription: opts.appDescription ?? "Sentrix Chain",
      appUrl: opts.appUrl ?? "https://sentrixchain.com",
      appIcon: opts.appIcon,
      projectId,
    },
  );

  return createConfig({
    chains: chains as unknown as readonly [
      (typeof SENTRIX_CHAINS)[number],
      ...(typeof SENTRIX_CHAINS)[number][],
    ],
    connectors,
    transports: {
      [SENTRIX_MAINNET.id]: http(SENTRIX_MAINNET.rpcUrls.default.http[0]),
      [SENTRIX_TESTNET.id]: http(SENTRIX_TESTNET.rpcUrls.default.http[0]),
    },
    ssr: true,
  });
}

export type SentrixWalletConfig = ReturnType<typeof createSentrixWalletConfig>;
