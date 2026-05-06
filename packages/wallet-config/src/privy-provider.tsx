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
// Import BOTH WagmiProvider + createConfig from @privy-io/wagmi.
// Privy's WagmiProvider wires its embedded-wallet connectors into
// wagmi's connector registry on mount — without it, Privy auth
// succeeds but `useAccount()` never sees the embedded wallet
// (symptom: "logged in but UI still shows Sign in", reported
// 2026-05-06). The earlier workaround imported WagmiProvider from
// `wagmi` directly to dodge a `WagmiProviderNotFoundError` caused by
// pnpm resolving two physical wagmi instances (one for apps, one
// for @privy-io/wagmi's peer tree). The proper fix is at the
// package level: `dedupe-peer-dependents: true` in
// `pnpm-workspace.yaml` collapses the two virtualized instances
// into one shared physical install. With dedupe in place,
// importing WagmiProvider from @privy-io/wagmi sets context on the
// same wagmi instance the apps consume — both context lookup and
// connector visibility work.
import { WagmiProvider, createConfig } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "viem";
import { SENTRIX_MAINNET, SENTRIX_TESTNET } from "./chain";

// Privy App IDs are sent to the client on every auth call — they're not
// secrets, so a baked-in default is fine. An app can still override per-
// environment via NEXT_PUBLIC_PRIVY_APP_ID without a code change.
//
// Bumped 2026-05-03 from cmonc8o7p... ("Sentrix Labs", first try) to
// cmoq3mw8o... ("Sentrix Chain", second try) — first app's mode wasn't
// reachable from the dashboard UI to fix; second app is the live one.
const DEFAULT_PRIVY_APP_ID = "cmoq3mw8o006v0dl5k99ds3oi";

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
        // Login surfaces. Must be a subset of methods enabled on the
        // Privy dashboard. Operator can extend the dashboard list
        // (Google / Twitter / Passkey) and we just add the matching
        // string here — runtime ordering of methods follows this array.
        loginMethods: ["email", "google", "twitter", "wallet"],
        // Sentrix gold-on-black to match the rest of the app shell.
        appearance: {
          theme: "dark",
          accentColor: "#f4c75e",
          showWalletLoginFirst: false,
          ...(logo ? { logo } : {}),
        },
        // Embedded wallet config is set on the dashboard
        // (create_on_login: users-without-wallets). Removed from client
        // 2026-05-03 — coinblast bootstrap was hitting
        // /apps/{id}/embedded-wallets?caid=... with 403, which kept
        // Privy SDK stuck pre-ready forever. Server-side config still
        // applies on actual login.
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
