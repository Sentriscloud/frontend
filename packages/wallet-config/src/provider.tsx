"use client";

// React provider that wraps an app tree with the four pieces RainbowKit
// needs: WagmiProvider, QueryClientProvider, RainbowKitProvider, and the
// theme. Apps import <SentrixWalletProvider> in their root layout and
// don't have to think about the stack again.

import { ReactNode, useState } from "react";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createSentrixWalletConfig, type SentrixWalletConfigOptions } from "./wagmi";

import "@rainbow-me/rainbowkit/styles.css";

interface ProviderProps extends SentrixWalletConfigOptions {
  children: ReactNode;
}

// Sentrix gold-on-black theme. Matches the design tokens already used
// across faucet/scan/airdrop globals.css. RainbowKit's `darkTheme()`
// helper accepts an `accentColor` plus a `borderRadius`, so we pin both
// to Sentrix brand values rather than the default Rainbow blue.
const sentrixTheme = darkTheme({
  accentColor: "#f4c75e", // --gold
  accentColorForeground: "#3a2a0e", // dark gold-bg foreground
  borderRadius: "medium",
  fontStack: "system",
  overlayBlur: "small",
});

export function SentrixWalletProvider({ children, ...opts }: ProviderProps) {
  // Memoize once per mount — recreating the config on every render would
  // tear down WalletConnect sessions on each re-render (very bad UX).
  const [config] = useState(() => createSentrixWalletConfig(opts));
  // QueryClient must also be stable across renders.
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={sentrixTheme} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
