"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle, AlertCircle, Loader, ExternalLink, Wallet } from "lucide-react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  formatEther,
  http,
} from "viem";
import { SENTRIX_MAINNET, AIRDROP_CONTRACT_ADDRESS } from "@/lib/chain";
import { MERKLE_AIRDROP_ABI } from "@/lib/airdrop-abi";
import { EMPTY_BUNDLE, fetchProofsClient, lookupEntry, type ProofsBundle } from "@/lib/proofs";

type Status =
  | "loading-proofs"
  | "no-wallet"
  | "wrong-network"
  | "not-connected"
  | "not-eligible"
  | "already-claimed"
  | "deadline-passed"
  | "swept"
  | "ready"
  | "claiming"
  | "success"
  | "error";

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const publicClient = createPublicClient({
  chain: SENTRIX_MAINNET,
  transport: http(),
});

export function ClaimWidget() {
  const [bundle, setBundle] = useState<ProofsBundle>(EMPTY_BUNDLE);
  const [account, setAccount] = useState<`0x${string}` | "">("");
  const [chainId, setChainId] = useState<number | null>(null);
  const [contractClaimed, setContractClaimed] = useState<boolean | null>(null);
  const [contractDeadline, setContractDeadline] = useState<bigint | null>(null);
  const [contractSwept, setContractSwept] = useState<boolean | null>(null);
  const [txHash, setTxHash] = useState<string>("");
  const [status, setStatus] = useState<Status>("loading-proofs");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // ── Load proofs.json on mount ────────────────────────────
  useEffect(() => {
    fetchProofsClient().then(setBundle);
  }, []);

  // ── Wallet detection + chain change listener ────────────
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) {
      setStatus("no-wallet");
      return;
    }
    const onChainChanged = (...args: unknown[]) => {
      const cid = args[0];
      const id =
        typeof cid === "string"
          ? parseInt(cid, 16)
          : typeof cid === "number"
            ? cid
            : null;
      setChainId(id);
    };
    const onAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0];
      const addr =
        Array.isArray(accounts) && typeof accounts[0] === "string"
          ? (accounts[0] as `0x${string}`)
          : "";
      setAccount(addr);
    };
    window.ethereum.on?.("chainChanged", onChainChanged);
    window.ethereum.on?.("accountsChanged", onAccountsChanged);
    return () => {
      window.ethereum?.removeListener?.("chainChanged", onChainChanged);
      window.ethereum?.removeListener?.("accountsChanged", onAccountsChanged);
    };
  }, []);

  // ── Pull on-chain claim state once we have an account ──
  useEffect(() => {
    if (!account || !AIRDROP_CONTRACT_ADDRESS) return;
    let cancelled = false;
    (async () => {
      try {
        const [claimed, deadline, swept] = await Promise.all([
          publicClient.readContract({
            address: AIRDROP_CONTRACT_ADDRESS as `0x${string}`,
            abi: MERKLE_AIRDROP_ABI,
            functionName: "claimed",
            args: [account],
          }),
          publicClient.readContract({
            address: AIRDROP_CONTRACT_ADDRESS as `0x${string}`,
            abi: MERKLE_AIRDROP_ABI,
            functionName: "claimDeadline",
          }),
          publicClient.readContract({
            address: AIRDROP_CONTRACT_ADDRESS as `0x${string}`,
            abi: MERKLE_AIRDROP_ABI,
            functionName: "swept",
          }),
        ]);
        if (cancelled) return;
        setContractClaimed(claimed as boolean);
        setContractDeadline(deadline as bigint);
        setContractSwept(swept as boolean);
      } catch (e) {
        // Most likely cause: contract not deployed yet (env var unset or
        // wrong address). Surface generically — the status-machine below
        // shows "deploy pending" copy when AIRDROP_CONTRACT_ADDRESS is "".
        console.warn("[claim] read failed:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account]);

  // ── Eligibility lookup (pure, derives from bundle + account) ──
  const entry = useMemo(() => lookupEntry(bundle, account || ""), [bundle, account]);

  // ── Status reducer — recomputes whenever any input shifts ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.ethereum) {
      setStatus("no-wallet");
      return;
    }
    if (bundle.eligible_count === 0) {
      setStatus("loading-proofs");
      return;
    }
    if (!account) {
      setStatus("not-connected");
      return;
    }
    if (chainId !== null && chainId !== SENTRIX_MAINNET.id) {
      setStatus("wrong-network");
      return;
    }
    if (!entry) {
      setStatus("not-eligible");
      return;
    }
    if (contractSwept === true) {
      setStatus("swept");
      return;
    }
    if (
      contractDeadline !== null &&
      contractDeadline > 0n &&
      BigInt(Math.floor(Date.now() / 1000)) > contractDeadline
    ) {
      setStatus("deadline-passed");
      return;
    }
    if (contractClaimed === true) {
      setStatus("already-claimed");
      return;
    }
    if (status === "claiming" || status === "success") return;
    setStatus("ready");
  }, [
    bundle.eligible_count,
    account,
    chainId,
    entry,
    contractClaimed,
    contractDeadline,
    contractSwept,
    status,
  ]);

  async function connect() {
    if (!window.ethereum) return;
    setErrorMsg("");
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      const addr = (accounts[0] ?? "") as `0x${string}`;
      setAccount(addr);
      const cidHex = (await window.ethereum.request({ method: "eth_chainId" })) as string;
      setChainId(parseInt(cidHex, 16));
    } catch (e) {
      setErrorMsg((e as Error).message ?? "Wallet connection rejected");
    }
  }

  async function switchNetwork() {
    if (!window.ethereum) return;
    setErrorMsg("");
    const hexId = `0x${SENTRIX_MAINNET.id.toString(16)}`;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexId }],
      });
    } catch (e) {
      const err = e as { code?: number; message?: string };
      // 4902 = network not yet added to the wallet — push it in.
      if (err.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: hexId,
                chainName: SENTRIX_MAINNET.name,
                nativeCurrency: SENTRIX_MAINNET.nativeCurrency,
                rpcUrls: [...SENTRIX_MAINNET.rpcUrls.default.http],
                blockExplorerUrls: [SENTRIX_MAINNET.blockExplorers.default.url],
              },
            ],
          });
        } catch (e2) {
          setErrorMsg((e2 as Error).message ?? "Add-network rejected");
        }
      } else {
        setErrorMsg(err.message ?? "Network switch rejected");
      }
    }
  }

  async function claim() {
    if (!entry || !account || !window.ethereum || !AIRDROP_CONTRACT_ADDRESS) return;
    setStatus("claiming");
    setErrorMsg("");
    setTxHash("");
    try {
      const wallet = createWalletClient({
        account,
        chain: SENTRIX_MAINNET,
        transport: custom(window.ethereum),
      });
      const hash = await wallet.writeContract({
        address: AIRDROP_CONTRACT_ADDRESS as `0x${string}`,
        abi: MERKLE_AIRDROP_ABI,
        functionName: "claim",
        args: [BigInt(entry.amount), entry.proof as `0x${string}`[]],
      });
      setTxHash(hash);

      // Wait for inclusion. publicClient (HTTP) polls the public RPC.
      await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });

      setStatus("success");
      setContractClaimed(true);
    } catch (e) {
      setStatus("error");
      setErrorMsg((e as Error).message ?? "Claim failed");
    }
  }

  // ── Render ───────────────────────────────────────────────
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
          Contract not yet deployed. Phase 1 launches post-Chainlist listing — see
          <a
            className="ml-1 underline"
            href="https://github.com/sentrix-labs/sentrix/blob/main/docs/tokenomics/AIRDROP_MECHANICS.md"
            target="_blank"
            rel="noopener noreferrer"
          >
            AIRDROP_MECHANICS
          </a>
          .
        </div>
      )}

      {status === "loading-proofs" && (
        <Stage
          icon={<Loader className="w-4 h-4 animate-spin-slow" />}
          tone="muted"
          msg="Loading eligibility list…"
        />
      )}

      {status === "no-wallet" && (
        <Stage
          icon={<AlertCircle className="w-4 h-4" />}
          tone="muted"
          msg="No EVM wallet detected. Install MetaMask, Rabby, or any EIP-1193 wallet to check eligibility."
        />
      )}

      {status === "not-connected" && (
        <button
          onClick={connect}
          className="w-full py-3 rounded-xl font-semibold text-[14px] bg-[var(--gold)] text-[#3a2a0e] hover:bg-[var(--gold-l)] transition-colors flex items-center justify-center gap-2"
        >
          <Wallet className="w-4 h-4" /> Connect Wallet
        </button>
      )}

      {status === "wrong-network" && (
        <div className="space-y-3">
          <Stage
            icon={<AlertCircle className="w-4 h-4 text-[var(--orange)]" />}
            tone="warn"
            msg={`Switch to Sentrix Mainnet (chain ID ${SENTRIX_MAINNET.id}). Connected wallet is on chain ${chainId}.`}
          />
          <button
            onClick={switchNetwork}
            className="w-full py-3 rounded-xl font-semibold text-[14px] bg-[var(--gold)] text-[#3a2a0e] hover:bg-[var(--gold-l)]"
          >
            Switch to Sentrix
          </button>
        </div>
      )}

      {status === "not-eligible" && (
        <Stage
          icon={<AlertCircle className="w-4 h-4 text-[var(--tx-d)]" />}
          tone="muted"
          msg={`${shortAddr(account)} is not in the Phase 1 eligibility list. Phase 1 rewards testnet activity that satisfied the snapshot criteria — see the criteria in the public AIRDROP_MECHANICS doc.`}
        />
      )}

      {status === "already-claimed" && (
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

      {status === "ready" && entry && (
        <div className="space-y-3">
          <div className="text-[13px] text-[var(--tx-m)]">
            Connected: <span className="font-mono text-[var(--tx)]">{shortAddr(account)}</span>
          </div>
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
            className="w-full py-3 rounded-xl font-semibold text-[14px] bg-[var(--gold)] text-[#3a2a0e] hover:bg-[var(--gold-l)]"
          >
            Claim {formatEther(BigInt(entry.amount))} SRX
          </button>
        </div>
      )}

      {status === "claiming" && (
        <Stage
          icon={<Loader className="w-4 h-4 animate-spin-slow text-[var(--gold)]" />}
          tone="muted"
          msg="Submitting claim — confirm in your wallet, then we wait for finalization."
        />
      )}

      {status === "success" && (
        <Stage
          icon={<CheckCircle className="w-4 h-4 text-[var(--green)]" />}
          tone="ok"
          msg={
            <>
              Claimed. {entry ? formatEther(BigInt(entry.amount)) : ""} SRX has landed at{" "}
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
            msg={errorMsg || "Claim failed — try again."}
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
