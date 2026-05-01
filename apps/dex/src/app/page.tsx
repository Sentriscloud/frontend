"use client";

import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { ManualAddressInput, SoluxConnectButton, useEffectiveAddress } from "@sentriscloud/wallet-config";
import { SwapWidget } from "./SwapWidget";

export default function HomePage() {
  const [showManual, setShowManual] = useState(false);
  const { source, manualAddress, setManualAddress } = useEffectiveAddress("dex");
  const { isConnected } = useAccount();

  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-5 border-b border-[var(--brd)]">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-semibold tracking-tight" style={{ color: "var(--gold)" }}>
            Sentrix DEX
          </span>
          <span className="text-xs uppercase tracking-widest text-[var(--tx-m)]">v2 · live on chain 7119</span>
        </div>
        <div className="flex flex-col items-end gap-1.5 relative">
          <ConnectButton showBalance={false} accountStatus="address" chainStatus="icon" />
          {!isConnected && <SoluxConnectButton namespace="dex" />}
          <button
            onClick={() => setShowManual(!showManual)}
            className="text-[10px] text-[var(--tx-d)] hover:text-[var(--tx-m)] underline underline-offset-2"
          >
            {source === "manual" && manualAddress
              ? `watching ${manualAddress.slice(0, 6)}…${manualAddress.slice(-4)} (clear)`
              : "or watch any address"}
          </button>
          {showManual && (
            <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-[var(--sf)] border border-[var(--brd)] rounded-xl shadow-xl p-3">
              <p className="text-[10px] uppercase tracking-widest text-[var(--tx-m)] mb-2">Watch any address</p>
              <ManualAddressInput namespace="dex" placeholder="0x… address" onAccept={() => setShowManual(false)} />
              {source === "manual" && (
                <button
                  onClick={() => {
                    setManualAddress(null);
                    setShowManual(false);
                  }}
                  className="mt-2 text-[11px] text-red-400 hover:text-red-300 underline"
                >
                  Stop watching
                </button>
              )}
              <p className="text-[10px] text-[var(--tx-d)] mt-2 leading-snug">
                View-only. To swap you still need a connected wallet.
              </p>
            </div>
          )}
        </div>
      </header>

      <section className="flex-1 flex flex-col items-center justify-start px-6 py-12 gap-8">
        <div className="text-center max-w-xl">
          <h1
            className="text-3xl md:text-4xl font-semibold tracking-tight mb-3"
            style={{ fontFamily: "Playfair Display, serif" }}
          >
            Native swap on Sentrix Chain.
          </h1>
          <p className="text-[var(--tx-2)] leading-relaxed text-sm">
            UniswapV2-equivalent constant-product AMM. 0.30% LP fee per swap. SGC/SRX is the
            first listed pair — more open as people launch + seed.
          </p>
        </div>

        <SwapWidget />

        <div className="grid grid-cols-3 gap-3 w-full max-w-md text-xs">
          <Stat label="LP fee" value="0.30%" />
          <Stat label="Chain" value="7119" />
          <Stat label="Native token" value="SRX" />
        </div>

        <p className="text-center text-[11px] text-[var(--tx-d)] max-w-md leading-snug">
          Want to launch your own token? Visit{" "}
          <a className="text-[var(--gold)] hover:text-[var(--gold-l)]" href="https://coinblast.sentriscloud.com">
            coinblast.sentriscloud.com
          </a>{" "}
          — pay gas, mint a SRC-20, list it here.
        </p>
      </section>

      <footer className="px-6 py-5 border-t border-[var(--brd)] text-xs text-[var(--tx-m)] flex justify-between">
        <span>© Sentrix Labs</span>
        <a href="https://scan.sentrixchain.com" className="hover:text-[var(--gold)] transition-colors">
          scan.sentrixchain.com
        </a>
      </footer>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--brd)] bg-[var(--sf)] px-3 py-2 text-center">
      <div className="text-[10px] uppercase tracking-widest text-[var(--tx-m)] mb-0.5">{label}</div>
      <div className="text-sm font-medium" style={{ color: "var(--gold)" }}>
        {value}
      </div>
    </div>
  );
}
