"use client";

import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ManualAddressInput, useEffectiveAddress } from "@sentriscloud/wallet-config";

export default function HomePage() {
  const [showManual, setShowManual] = useState(false);
  const { source, manualAddress, setManualAddress } = useEffectiveAddress("dex");

  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-8 py-6 border-b border-[var(--brd)]">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-semibold tracking-tight" style={{ color: "var(--gold)" }}>
            Sentrix DEX
          </span>
          <span className="text-xs uppercase tracking-widest text-[var(--tx-m)]">v2 · live on chain 7119</span>
        </div>
        <div className="flex flex-col items-end gap-1.5 relative">
          <ConnectButton showBalance={false} accountStatus="address" chainStatus="icon" />
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
              <ManualAddressInput
                namespace="dex"
                placeholder="0x… address"
                onAccept={() => setShowManual(false)}
              />
              {source === "manual" && (
                <button
                  onClick={() => { setManualAddress(null); setShowManual(false); }}
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

      <section className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-xl w-full text-center space-y-6">
          <h1
            className="text-4xl md:text-5xl font-semibold tracking-tight"
            style={{ fontFamily: "Playfair Display, serif" }}
          >
            Native swap is launching soon.
          </h1>
          <p className="text-lg text-[var(--tx-2)] leading-relaxed">
            Sentrix V2 brings UniswapV2-equivalent constant-product AMM contracts to Sentrix
            Chain. WSRX/stable pools seed the canonical price-discovery layer for SRX.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-6 text-sm">
            <Stat label="LP fee" value="0.30%" />
            <Stat label="Chain" value="7119" />
            <Stat label="Symbol" value="SRX" />
          </div>
          <div className="pt-8 text-sm text-[var(--tx-m)]">
            Mainnet deploy gated on the audit + first-pool seed. Connect your wallet to be ready.
          </div>
        </div>
      </section>

      <footer className="px-8 py-6 border-t border-[var(--brd)] text-xs text-[var(--tx-m)] flex justify-between">
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
    <div className="rounded-lg border border-[var(--brd)] bg-[var(--sf)] px-4 py-3">
      <div className="text-xs uppercase tracking-widest text-[var(--tx-m)] mb-1">{label}</div>
      <div className="text-base font-medium" style={{ color: "var(--gold)" }}>
        {value}
      </div>
    </div>
  );
}
