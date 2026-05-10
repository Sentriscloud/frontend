"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle, AlertCircle, Loader, ExternalLink, Wallet } from "lucide-react";
import { formatEther } from "viem";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import {
  SENTRIX_MAINNET,
  ManualAddressInput,
  SoluxConnectButton,
  useEffectiveAddress,
} from "@sentriscloud/wallet-config";

import { AIRDROP_CONTRACT_ADDRESS } from "@/lib/chain";
import { MERKLE_AIRDROP_ABI } from "@/lib/airdrop-abi";
import { EMPTY_BUNDLE, lookupEntry, type ProofsBundle } from "@/lib/proofs";

type Status =
  | "loading-proofs"
  | "proofs-error"
  | "no-contract"
  | "not-connected"
  | "wrong-network"
  | "not-eligible"
  | "already-claimed"
  | "deadline-passed"
  | "swept"
  | "ready"
  | "claiming"
  | "success"
  | "error";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function ClaimWidget() {
  const [bundle, setBundle] = useState<ProofsBundle>(EMPTY_BUNDLE);
  // Override only for transient outcomes that can't be derived from props
  // (i.e. the refetch-then-collide path inside claim() that detects another
  // tab landed the claim first). Everything else flows through the derived
  // status useMemo below.
  const [statusOverride, setStatusOverride] = useState<Status | null>(null);
  // Distinguish "still fetching" from "fetch failed/empty" — without
  // this, a missing or HTTP-errored proofs.json leaves the widget stuck
  // at "Loading eligibility list..." forever, since EMPTY_BUNDLE has
  // eligible_count: 0.
  const [proofsLoaded, setProofsLoaded] = useState(false);
  const [proofsError, setProofsError] = useState<string | null>(null);

  // ── Privy login trigger + Sentrix wallet state ────────────
  // The outer SentrixPrivyProvider (in app/layout.tsx) mounts both Privy
  // and Privy's wagmi adapter, so wagmi context is available all the
  // way down. No more local WagmiProvider hack — this widget is a
  // plain consumer now.
  const { ready: isPrivyReady, authenticated, login } = usePrivy();
  const { address: account, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  // Manual-address mode: a visitor can paste a 0x… into the box and check
  // eligibility WITHOUT connecting a wallet. `viewAddress` is what drives
  // the proof lookup + display state. The actual claim() tx still requires
  // a connected wallet because msg.sender has to match the proof's address.
  const { address: viewAddress, source: addrSource } = useEffectiveAddress("airdrop");

  // ── Load proofs.json on mount ────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetch("/proofs.json", { cache: "force-cache" })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setProofsError(`proofs.json returned HTTP ${res.status}`);
          setProofsLoaded(true);
          return;
        }
        try {
          const json = (await res.json()) as ProofsBundle;
          setBundle(json);
        } catch {
          setProofsError("proofs.json was malformed JSON");
        } finally {
          setProofsLoaded(true);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setProofsError(
          err instanceof Error ? `Failed to load proofs.json: ${err.message}` : "Failed to load proofs.json",
        );
        setProofsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── On-chain claim state (only when contract address is set) ──
  // Uses `viewAddress` so manual-mode can see whether the queried address
  // already claimed without needing a connected wallet.
  const contractEnabled = Boolean(AIRDROP_CONTRACT_ADDRESS) && Boolean(viewAddress);
  const { data: contractClaimed, refetch: refetchClaimed } = useReadContract({
    address: AIRDROP_CONTRACT_ADDRESS as `0x${string}` | undefined,
    abi: MERKLE_AIRDROP_ABI,
    functionName: "claimed",
    args: viewAddress ? [viewAddress] : undefined,
    query: { enabled: contractEnabled },
  });
  const { data: contractDeadline } = useReadContract({
    address: AIRDROP_CONTRACT_ADDRESS as `0x${string}` | undefined,
    abi: MERKLE_AIRDROP_ABI,
    functionName: "claimDeadline",
    query: { enabled: contractEnabled },
  });
  const { data: contractSwept } = useReadContract({
    address: AIRDROP_CONTRACT_ADDRESS as `0x${string}` | undefined,
    abi: MERKLE_AIRDROP_ABI,
    functionName: "swept",
    query: { enabled: contractEnabled },
  });

  // ── Eligibility lookup (pure, derives from bundle + view address) ──
  const entry = useMemo(
    () => lookupEntry(bundle, viewAddress ?? ""),
    [bundle, viewAddress],
  );

  // ── Claim tx hooks ───────────────────────────────────────
  const { writeContract, data: txHash, error: writeError, isPending: isWriting, reset: resetWrite } =
    useWriteContract();
  const { isLoading: isMining, isSuccess: isMined } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // ── Status (derived from props in render) ────────────────
  // React 19 / react-hooks/set-state-in-effect: deriving state in a
  // useEffect-then-setState reducer is the textbook anti-pattern. The
  // status is a pure function of props/queries; computing it inline
  // avoids the cascading-render warning and removes a 17-dep array.
  // statusOverride is the only piece of state we actually keep — for
  // the refetch-then-collide branch inside claim() that needs to latch
  // a transient "already-claimed" verdict before contract state has
  // propagated through useReadContract.
  const status: Status = useMemo(() => {
    if (statusOverride) return statusOverride;
    if (!AIRDROP_CONTRACT_ADDRESS) return "no-contract";
    if (!proofsLoaded) return "loading-proofs";
    if (proofsError) return "proofs-error";
    // Loaded successfully but bundle is empty — pre-deploy or wrong
    // bundle shipped. Treat as no-contract-style soft-error.
    if (bundle.eligible_count === 0) return "proofs-error";
    // No connected wallet AND no manual address → prompt to connect/enter
    if (!isConnected && addrSource !== "manual") return "not-connected";
    // Manually-entered address: skip wrong-network/account checks (they
    // only apply when we have a real connected wallet that could claim).
    if (addrSource === "manual") {
      if (!entry) return "not-eligible";
      if (contractClaimed === true) return "already-claimed";
      // Otherwise just show the eligibility info (still needs connect to claim)
      return "ready";
    }
    if (!account) return "not-connected";
    if (chainId !== undefined && chainId !== SENTRIX_MAINNET.id) return "wrong-network";
    if (!entry) return "not-eligible";
    if (contractSwept === true) return "swept";
    if (
      typeof contractDeadline === "bigint" &&
      contractDeadline > 0n &&
      // eslint-disable-next-line
      BigInt(Math.floor(Date.now() / 1000)) > contractDeadline
    ) {
      return "deadline-passed";
    }
    if (contractClaimed === true || isMined) return "success";
    if (isMining || isWriting) return "claiming";
    if (writeError) return "error";
    return "ready";
  }, [
    statusOverride,
    bundle.eligible_count,
    proofsLoaded,
    proofsError,
    isConnected,
    account,
    addrSource,
    chainId,
    entry,
    contractClaimed,
    contractDeadline,
    contractSwept,
    isWriting,
    isMining,
    isMined,
    writeError,
  ]);

  async function claim() {
    if (!entry || !account || !AIRDROP_CONTRACT_ADDRESS) return;
    // Double-click guard + race against another tab claiming first.
    if (isWriting || isMining) return;
    // Refetch claimed state immediately before write — local
    // contractClaimed can be stale (multi-tab, slow polling). If a
    // sibling tab already landed the claim, we want to surface
    // "already-claimed" rather than fire a doomed second tx.
    try {
      const fresh = await refetchClaimed();
      if (fresh.data === true) {
        setStatusOverride("already-claimed");
        return;
      }
    } catch {
      // RPC hiccup — fall through. The contract itself rejects
      // double-claims on-chain; we just lose the friendly UI message.
    }
    resetWrite();
    writeContract({
      address: AIRDROP_CONTRACT_ADDRESS as `0x${string}`,
      abi: MERKLE_AIRDROP_ABI,
      functionName: "claim",
      args: [BigInt(entry.amount), entry.proof as `0x${string}`[]],
    });
  }

  return (
    <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-2xl p-6 max-w-md w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[14px] font-semibold text-[var(--tx)]">Phase 1 — Testnet Heroes</h2>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[rgba(244,199,94,0.10)] text-[var(--gold)] tracking-[.15em]">
          1,000,000 SRX
        </span>
      </div>

      {!AIRDROP_CONTRACT_ADDRESS && (
        <div className="mb-4 px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/8 text-amber-200/90 text-[12px]">
          Contract not yet deployed. Phase 1 launches when the operator triggers — see{" "}
          <a
            className="underline"
            href="https://github.com/sentrix-labs/sentrix/blob/main/docs/tokenomics/AIRDROP_MECHANICS.md"
            target="_blank"
            rel="noopener noreferrer"
          >
            AIRDROP_MECHANICS
          </a>
          .
        </div>
      )}

      {/* Privy login covers email + Google + Twitter + external wallets.
          Solux stays as a peer button for users who want the Sentrix-
          native popup wallet. Manual-address input below is unchanged —
          a visitor can check eligibility for any 0x… without signing in.
          Claim itself still needs a real connection (msg.sender check). */}
      <div className="mb-2 flex justify-center">
        {isConnected && account ? (
          <span className="px-3 py-1.5 rounded-full bg-[var(--bk-2)] border border-[var(--brd)] text-[var(--tx)] font-mono text-[12px]">
            {shortAddr(account)}
          </span>
        ) : (
          <button
            onClick={() => isPrivyReady && login()}
            disabled={!isPrivyReady}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--gold)] text-[#3a2a0e] hover:bg-[var(--gold-l)] text-[13px] font-semibold disabled:opacity-50"
          >
            <Wallet className="w-3.5 h-3.5" />
            {authenticated ? "Continue" : "Sign in"}
          </button>
        )}
      </div>
      {!isConnected && (
        <div className="mb-4 flex justify-center">
          <SoluxConnectButton namespace="airdrop" />
        </div>
      )}
      <div className="mb-4">
        <details className="text-[11px] text-[var(--tx-m)]">
          <summary className="cursor-pointer hover:text-[var(--tx-2)] select-none">
            Or check eligibility for any address (view-only)
          </summary>
          <div className="mt-2">
            <ManualAddressInput namespace="airdrop" placeholder="0x… address — view-only" />
            {addrSource === "manual" && (
              <p className="mt-1.5 text-[10.5px] text-amber-300/80 leading-snug">
                Showing state for the manually entered address. To <em>claim</em> you still need
                to connect that wallet — the contract enforces <code>msg.sender</code> matches.
              </p>
            )}
          </div>
        </details>
      </div>

      {status === "loading-proofs" && (
        <Stage
          icon={<Loader className="w-4 h-4 animate-spin-slow" />}
          tone="muted"
          msg="Loading eligibility list…"
        />
      )}

      {status === "proofs-error" && (
        <Stage
          icon={<AlertCircle className="w-4 h-4 text-[var(--orange)]" />}
          tone="warn"
          msg={
            proofsError ??
            "Eligibility list is empty — Phase 1 may not have shipped yet, or the proofs file is missing."
          }
        />
      )}

      {status === "not-connected" && (
        <Stage
          icon={<AlertCircle className="w-4 h-4 text-[var(--tx-d)]" />}
          tone="muted"
          msg="Connect your wallet to check eligibility."
        />
      )}

      {status === "wrong-network" && (
        <div className="space-y-3">
          <Stage
            icon={<AlertCircle className="w-4 h-4 text-[var(--orange)]" />}
            tone="warn"
            msg={`Switch to Sentrix Chain (chain ID ${SENTRIX_MAINNET.id}). Connected wallet is on chain ${chainId}.`}
          />
          <button
            onClick={() => switchChain({ chainId: SENTRIX_MAINNET.id })}
            className="w-full py-3 rounded-xl font-semibold text-[14px] bg-[var(--gold)] text-[#3a2a0e] hover:bg-[var(--gold-l)]"
          >
            Switch to Sentrix
          </button>
        </div>
      )}

      {status === "not-eligible" && account && (
        <Stage
          icon={<AlertCircle className="w-4 h-4 text-[var(--tx-d)]" />}
          tone="muted"
          msg={`${shortAddr(account)} is not in the Phase 1 eligibility list. Phase 1 rewards testnet activity that satisfied the snapshot criteria — see the criteria in the public AIRDROP_MECHANICS doc.`}
        />
      )}

      {status === "already-claimed" && account && (
        <Stage
          icon={<CheckCircle className="w-4 h-4 text-[var(--green)]" />}
          tone="ok"
          msg={`Already claimed. ${entry ? formatEther(BigInt(entry.amount)) : "?"} SRX has been delivered to ${shortAddr(account)}.`}
        />
      )}

      {status === "deadline-passed" && (
        <Stage
          icon={<AlertCircle className="w-4 h-4 text-[var(--red)]" />}
          tone="error"
          msg="Phase 1 claim window has closed. Unclaimed SRX returns to the Strategic Reserve at sweep."
        />
      )}

      {status === "swept" && (
        <Stage
          icon={<AlertCircle className="w-4 h-4 text-[var(--red)]" />}
          tone="error"
          msg="Phase 1 has been swept. Any unclaimed allocation has been returned to the Strategic Reserve."
        />
      )}

      {status === "ready" && entry && account && (
        <div className="space-y-3">
          <div className="bg-[var(--bk-2)] border border-[var(--brd)] rounded-xl p-4">
            <p className="text-[11px] text-[var(--tx-d)] uppercase tracking-[.18em] mb-1">
              Allocation
            </p>
            <p className="text-[28px] font-serif text-[var(--gold)] leading-none">
              {formatEther(BigInt(entry.amount))} SRX
            </p>
            <p className="text-[11px] text-[var(--tx-d)] mt-2">
              Snapshot height {bundle.snapshot_height} · index #{entry.index}
            </p>
          </div>
          <button
            onClick={claim}
            disabled={!AIRDROP_CONTRACT_ADDRESS || isWriting || isMining}
            className="w-full py-3 rounded-xl font-semibold text-[14px] bg-[var(--gold)] text-[#3a2a0e] hover:bg-[var(--gold-l)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--gold)]"
          >
            Claim {formatEther(BigInt(entry.amount))} SRX
          </button>
        </div>
      )}

      {status === "claiming" && (
        <Stage
          icon={<Loader className="w-4 h-4 animate-spin-slow text-[var(--gold)]" />}
          tone="muted"
          msg={
            isMining
              ? "Claim sent — waiting for finalization…"
              : "Submitting claim — confirm in your wallet."
          }
        />
      )}

      {status === "success" && entry && account && (
        <Stage
          icon={<CheckCircle className="w-4 h-4 text-[var(--green)]" />}
          tone="ok"
          msg={
            <>
              Claimed. {formatEther(BigInt(entry.amount))} SRX has landed at{" "}
              <span className="font-mono">{shortAddr(account)}</span>.
              {txHash && (
                <a
                  className="ml-2 inline-flex items-center gap-1 text-[var(--green)] underline"
                  href={`${SENTRIX_MAINNET.blockExplorers.default.url}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  view tx <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </>
          }
        />
      )}

      {status === "error" && (
        <div className="space-y-3">
          <Stage
            icon={<AlertCircle className="w-4 h-4 text-[var(--red)]" />}
            tone="error"
            msg={writeError?.message ?? "Claim failed — try again."}
          />
          <button
            onClick={claim}
            className="w-full py-2.5 rounded-xl font-semibold text-[13px] bg-[var(--bk-2)] text-[var(--tx)] hover:bg-[var(--brd)] transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-[var(--brd)] text-[11px] text-[var(--tx-d)] space-y-1">
        <p>
          Eligible: <span className="font-mono">{bundle.eligible_count.toLocaleString()}</span>{" "}
          wallets
        </p>
        <p className="font-mono break-all">root: {bundle.merkle_root}</p>
      </div>
    </div>
  );
}

function Stage({
  icon,
  tone,
  msg,
}: {
  icon: React.ReactNode;
  tone: "muted" | "ok" | "warn" | "error";
  msg: React.ReactNode;
}) {
  const toneClass =
    tone === "ok"
      ? "border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.10)] text-[var(--green)]"
      : tone === "warn"
        ? "border-[rgba(244,199,94,0.25)] bg-[rgba(244,199,94,0.08)] text-[var(--tx)]"
        : tone === "error"
          ? "border-[rgba(248,113,113,0.25)] bg-[rgba(248,113,113,0.08)] text-[var(--red)]"
          : "border-[var(--brd)] bg-[var(--bk-2)] text-[var(--tx-m)]";
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${toneClass}`}>
      <div className="shrink-0 mt-0.5">{icon}</div>
      <p className="text-[13px] leading-snug">{msg}</p>
    </div>
  );
}
