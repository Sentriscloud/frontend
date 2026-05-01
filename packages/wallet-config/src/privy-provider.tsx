"use client";

// Privy-based wallet provider. Replaces SentrixWalletProvider (RainbowKit)
// for apps that want social login (Google / Twitter / email) alongside
// external wallet connect. wagmi hooks (useAccount / useReadContract /
// useWriteContract / useWaitForTransactionReceipt) all keep working — we
// use @privy-io/wagmi's WagmiProvider so Privy's embedded + connected
// wallets register as wagmi connectors automatically.
//
// Solux stays as a peer button outside this provider's modal — Privy
// doesn't know about Sentrix-native wallets, and we keep the postMessage
// popup-bridge flow we already shipped.
//
// dex still uses SentrixWalletProvider (RainbowKit). Both providers are
// exported from this package; the consuming app picks one in its layout.

import { ReactNode, useState } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
// Import WagmiProvider from `wagmi` directly (NOT `@privy-io/wagmi`).
// pnpm resolves `@privy-io/wagmi`'s wagmi peer to a different instance
// than the one apps consume directly, so a WagmiProvider exported from
// `@privy-io/wagmi` sets context on a different wagmi instance — apps
// calling `useAccount` from `wagmi` then can't find that context and
// throw `WagmiProviderNotFoundError`. Importing WagmiProvider directly
// from `wagmi` puts the context on the same instance the apps use.
// `createConfig` from `@privy-io/wagmi` is still needed for the Privy
// connector wiring; the config object itself is plain data and crosses
// the instance boundary fine.
import { WagmiProvider } from "wagmi";
import { createConfig } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "viem";
import { SENTRIX_MAINNET, SENTRIX_TESTNET } from "./chain";

// Privy App IDs are sent to the client on every auth call — they're not
// secrets, so a baked-in default is fine. An app can still override per-
// environment via NEXT_PUBLIC_PRIVY_APP_ID without a code change.
const DEFAULT_PRIVY_APP_ID = "cmonc8o7p006p0ckyld5gc6kk";

export interface SentrixPrivyProviderOptions {
  appId?: string;
  // mainnet-only locks the user into 7119; default is mainnet + testnet
  // (mainnet first → Privy treats it as the default chain).
  mainnetOnly?: boolean;
  // Logo shown at the top of the Privy modal. Optional.
  logo?: string;
}

interface ProviderProps extends SentrixPrivyProviderOptions {
  children: ReactNode;
}

export function SentrixPrivyProvider({
  children,
  appId,
  mainnetOnly = false,
  logo,
}: ProviderProps) {
  const resolvedAppId =
    appId ??
    (typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_PRIVY_APP_ID
      : undefined) ??
    DEFAULT_PRIVY_APP_ID;

  const chains = mainnetOnly
    ? ([SENTRIX_MAINNET] as const)
    : ([SENTRIX_MAINNET, SENTRIX_TESTNET] as const);

  // Stable across renders — recreating the wagmi config tears down active
  // wallet sessions, and recreating the QueryClient blows the cache.
  // ssr:true keeps Next.js's static-export step from blowing up when
  // child pages (e.g. faucet's /mainnet, /testnet) call wagmi hooks
  // before the client provider has mounted; wagmi serves a noop config
  // during prerender and hydrates the real one client-side.
  const [wagmiConfig] = useState(() =>
    createConfig({
      chains,
      transports: {
        [SENTRIX_MAINNET.id]: http(),
        [SENTRIX_TESTNET.id]: http(),
      },
      ssr: true,
    }),
  );
  const [queryClient] = useState(() => new QueryClient());

  return (
    <PrivyProvider
      appId={resolvedAppId}
      config={{
        // Login surfaces — the four the user signed off on. "wallet"
        // covers MetaMask / Rabby / Brave / WalletConnect via Privy's
        // built-in connector list.
        loginMethods: ["email", "google", "twitter", "wallet"],
        // Sentrix gold-on-black to match the rest of the app shell.
        appearance: {
          theme: "dark",
          accentColor: "#f4c75e",
          showWalletLoginFirst: false,
          ...(logo ? { logo } : {}),
        },
        // Auto-mint a Privy embedded wallet for users who sign in via
        // social/email and don't already have one. MPC-managed by Privy
        // (not on-device); good enough for launchpad-style flows but
        // worth knowing for self-custody copy. Sentrix is EVM-only, so
        // only the ethereum side is configured.
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
        defaultChain: SENTRIX_MAINNET,
        supportedChains: [...chains],
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
