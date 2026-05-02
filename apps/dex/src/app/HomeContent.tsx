"use client";

import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId } from "wagmi";
import { Copy, Check } from "lucide-react";
import { ManualAddressInput, SoluxConnectButton, useEffectiveAddress } from "@sentriscloud/wallet-config";
import { SwapWidget } from "./SwapWidget";
import { DEX } from "@/lib/contracts";

export function HomeContent() {
  const [showManual, setShowManual] = useState(false);
  const [copiedManual, setCopiedManual] = useState(false);
  const { source, manualAddress, setManualAddress } = useEffectiveAddress("dex");
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const net: "mainnet" | "testnet" = chainId === 7120 ? "testnet" : "mainnet";
  const cfg = DEX[net];

  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-5 border-b border-[var(--brd)]">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-semibold tracking-tight" style={{ color: "var(--gold)" }}>
            Sentrix DEX
          </span>
          <span className="text-xs uppercase tracking-widest text-[var(--tx-m)]">
            v2 · {net === "testnet" ? "testnet (chain 7120)" : "mainnet (chain 7119)"}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1.5 relative">
          <ConnectButton showBalance={false} accountStatus="address" chainStatus="icon" />
          {!isConnected && <SoluxConnectButton namespace="dex" />}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowManual(!showManual)}
              className="text-[10px] text-[var(--tx-d)] hover:text-[var(--tx-m)] underline underline-offset-2"
            >
              {source === "manual" && manualAddress
                ? `watching ${manualAddress.slice(0, 6)}…${manualAddress.slice(-4)} (clear)`
                : "or watch any address"}
            </button>
            {source === "manual" && manualAddress && (
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(manualAddress);
                    setCopiedManual(true);
                    setTimeout(() => setCopiedManual(false), 2000);
                  } catch {
                    /* clipboard blocked — silent */
                  }
                }}
                className="h-4 w-4 inline-flex items-center justify-center text-[var(--tx-d)] hover:text-[var(--tx-m)] transition-colors"
                title="Copy watched address"
                aria-label="Copy watched address"
              >
                {copiedManual ? (
                  <Check className="h-3 w-3 text-[var(--gold)]" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            )}
          </div>
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
          <Stat label="Chain" value={net === "testnet" ? "7120" : "7119"} />
          <Stat label="Native token" value="SRX" />
        </div>

        {/* Verifiable contract addresses — anti-phishing affordance. A user
            can cross-check the router + factory on Scan + Sourcify before
            signing. Sourcify badge confirms the bytecode at this address
            matches a known-good Solidity build. */}
        <ContractAddresses
          factory={cfg.factory}
          router={cfg.router}
          wsrx={cfg.wsrx}
          net={net}
        />

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
    net === "testnet" ? "https://scan.sentrixchain.com/?network=testnet" : "https://scan.sentrixchain.com";
  const verifyBase = "https://verify.sentrixchain.com";
  const rows: Array<{ label: string; addr: `0x${string}` }> = [
    { label: "Router", addr: router },
    { label: "Factory", addr: factory },
    { label: "WSRX", addr: wsrx },
  ];
  return (
    <div className="w-full max-w-md rounded-lg border border-[var(--brd)] bg-[var(--sf)]/50 px-3 py-2.5 space-y-1.5">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-[var(--tx-m)]">
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
