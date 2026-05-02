"use client";

// Mounted-gate wrapper: HomeContent calls a stack of wagmi hooks that need
// the WagmiProvider + browser globals to be live. Static prerender threads
// neither, so we render nothing on the server pass and swap in the real
// content after `useEffect` runs on the client. Keeps the production build
// from tripping `WagmiProviderNotFoundError` / `indexedDB is not defined`.

import dynamic from "next/dynamic";

const HomeContent = dynamic(() => import("./HomeContent").then((m) => m.HomeContent), {
  ssr: false,
});

export function ClientShell() {
  return <HomeContent />;
}
