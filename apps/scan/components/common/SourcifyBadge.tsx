"use client";

import { ShieldCheck, ShieldAlert } from "lucide-react";
import { useSourcifyStatus, sourcifyContractUrl } from "@/lib/sourcify";
import type { NetworkId } from "@/lib/chain";

interface SourcifyBadgeProps {
  network: NetworkId;
  address: string;
  /** If false, the component renders nothing. Default true. */
  show?: boolean;
  /** If true, also renders a quiet "unverified" badge when not verified. Default false (hides on EOAs / unverified contracts to avoid noise). */
  showUnverified?: boolean;
}

/** Sourcify verification badge. Reads /files/any from the self-hosted Sourcify server.
 *  - perfect: bytecode + metadata match
 *  - partial: bytecode matches but metadata differs (e.g. compiler optimization)
 *  - none: not verified
 */
export function SourcifyBadge({ network, address, show = true, showUnverified = false }: SourcifyBadgeProps) {
  const { match, loading } = useSourcifyStatus(network, address);

  if (!show) return null;
  if (loading) return null; // hide silently while loading; render once we know

  // Hide entirely on EOAs / unverified contracts to avoid noise. Caller can opt into showing.
  if (match === "none" && !showUnverified) return null;

  if (match === "perfect") {
    return (
      <a
        href={sourcifyContractUrl(network, address)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[.12em] rounded-md px-2 py-1 border border-emerald-700/50 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-950/50 transition"
        title="Source code verified on Sourcify (bytecode + metadata exact match)"
      >
        <ShieldCheck className="size-3" />
        verified
      </a>
    );
  }

  if (match === "partial") {
    return (
      <a
        href={sourcifyContractUrl(network, address)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[.12em] rounded-md px-2 py-1 border border-amber-700/50 bg-amber-950/30 text-amber-400 hover:bg-amber-950/50 transition"
        title="Source code partially verified (bytecode matches; metadata differs)"
      >
        <ShieldCheck className="size-3" />
        partial match
      </a>
    );
  }

  // not verified — quiet badge
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[.12em] rounded-md px-2 py-1 border border-neutral-700/50 text-neutral-500"
      title="Source code not yet verified. dApp builders can submit verification at verify.sentrixchain.com"
    >
      <ShieldAlert className="size-3" />
      unverified
    </span>
  );
}
