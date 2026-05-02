"use client";

// Single-page DEX client. wagmi context is supplied by the layout's
// <SentrixPrivyProvider> (Privy + WagmiProvider + QueryClient). No local
// provider re-anchor — Privy's WagmiProvider exposes wagmi context across
// the dynamic boundary cleanly.

import { useChainId } from "wagmi";
import { SwapWidget } from "./SwapWidget";
import { WalletConnect } from "@/components/wallet/WalletConnect";
import { DEX } from "@/lib/contracts";

export function HomeContent() {
  const chainId = useChainId();
  const net: "mainnet" | "testnet" = chainId === 7120 ? "testnet" : "mainnet";
  const cfg = DEX[net];

  return (
    <main className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[var(--bk)]/80 border-b border-[var(--brd)]">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="text-lg sm:text-xl font-semibold tracking-tight truncate"
              style={{ color: "var(--gold)" }}
            >
              Sentrix DEX
            </span>
            <span className="hidden sm:inline text-[10px] uppercase tracking-[.18em] text-[var(--tx-d)]">
              v2 · {net === "testnet" ? "testnet 7120" : "mainnet 7119"}
            </span>
          </div>
          <WalletConnect />
        </div>
      </header>

      <section className="flex-1 max-w-5xl w-full mx-auto px-5 py-10 lg:py-14">
        <div className="grid lg:grid-cols-[1fr_minmax(0,420px)] gap-10 lg:gap-12 items-start">
          {/* Left rail — pitch + verified contracts. Reads like a card stack
              instead of a centered hero so the swap widget is never below
              the fold on a 1366×768 viewport. */}
          <div className="space-y-6">
            <div className="space-y-3">
              <h1
                className="text-3xl md:text-4xl font-semibold tracking-tight leading-[1.05]"
                style={{ fontFamily: "Playfair Display, serif" }}
              >
                Native swap on Sentrix Chain.
              </h1>
              <p className="text-[var(--tx-2)] text-sm leading-relaxed max-w-md">
                UniswapV2-equivalent constant-product AMM. 0.30% LP fee per
                swap. SGC/SRX is the first listed pair — more open as people
                launch + seed.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 max-w-md">
              <Stat label="LP fee" value="0.30%" />
              <Stat label="Chain" value={net === "testnet" ? "7120" : "7119"} />
              <Stat label="Native" value="SRX" />
            </div>

            <ContractAddresses
              factory={cfg.factory}
              router={cfg.router}
              wsrx={cfg.wsrx}
              net={net}
            />

            <p className="text-[12px] text-[var(--tx-d)] max-w-md leading-snug">
              Want to launch your own token? Visit{" "}
              <a
                className="text-[var(--gold)] hover:text-[var(--gold-l)]"
                href="https://coinblast.sentriscloud.com"
              >
                coinblast.sentriscloud.com
              </a>{" "}
              — pay gas, mint a SRC-20, list it here.
            </p>
          </div>

          {/* Right rail — the swap. Sticky on desktop so it stays in view as
              the left rail scrolls. */}
          <div className="lg:sticky lg:top-24 w-full max-w-md justify-self-end">
            <SwapWidget />
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--brd)]">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between gap-4 text-[11px] text-[var(--tx-d)]">
          <span>© Sentrix Labs</span>
          <a href="https://scan.sentrixchain.com" className="hover:text-[var(--gold)] transition-colors">
            scan.sentrixchain.com
          </a>
        </div>
      </footer>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--brd)] bg-[var(--sf)]/60 px-2.5 py-1.5">
      <div className="text-[9px] uppercase tracking-[.18em] text-[var(--tx-d)]">
        {label}
      </div>
      <div className="text-[13px] font-semibold" style={{ color: "var(--gold)" }}>
        {value}
      </div>
    </div>
  );
}

function ContractAddresses({
  factory,
  router,
  wsrx,
  net,
}: {
  factory: `0x${string}`;
  router: `0x${string}`;
  wsrx: `0x${string}`;
  net: "mainnet" | "testnet";
}) {
  const scanBase =
    net === "testnet"
      ? "https://scan.sentrixchain.com/?network=testnet"
      : "https://scan.sentrixchain.com";
  const verifyBase = "https://verify.sentrixchain.com";
  const rows: Array<{ label: string; addr: `0x${string}` }> = [
    { label: "Router", addr: router },
    { label: "Factory", addr: factory },
    { label: "WSRX", addr: wsrx },
  ];
  return (
    <div className="rounded-lg border border-[var(--brd)] bg-[var(--sf)]/40 px-3 py-2.5 space-y-1.5 max-w-md">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[.18em] text-[var(--tx-d)]">
        <span>Verified contracts</span>
        <a
          href={verifyBase}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:text-emerald-300 normal-case tracking-normal text-[10px]"
        >
          Sourcify ↗
        </a>
      </div>
      {rows.map((r) => (
        <div key={r.addr} className="flex items-center justify-between text-[11px] gap-2">
          <span className="text-[var(--tx-m)] shrink-0">{r.label}</span>
          <a
            href={`${scanBase}/address/${r.addr}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[var(--tx)] hover:text-[var(--gold)] truncate"
            title={r.addr}
          >
            {r.addr.slice(0, 6)}…{r.addr.slice(-4)}
          </a>
        </div>
      ))}
    </div>
  );
}
