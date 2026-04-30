"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, FileCode, Copy, ExternalLink } from "lucide-react";
import { useSourcifyFiles, partitionSourceFiles, sourcifyContractUrl, type SourcifyFile } from "@/lib/sourcify";
import type { NetworkId } from "@/lib/chain";
import { DetailCard } from "./DetailCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SourcifyViewerProps {
  network: NetworkId;
  address: string;
}

// DECISION: Etherscan-style "Contract" tab — left rail of file names,
// right pane of source code. We don't pull in shiki / prismjs (too heavy
// for one tab); instead we render with monospace + line numbers + a
// modest accent gradient. If a real syntax highlighter ever lands it
// drops in at the `<code>` element without changing the layout shape.
//
// The metadata.json file is hidden from the file rail — readers want
// Solidity source, not a JSON dump of the ABI. We expose the ABI as a
// separate "ABI" toggle below the file viewer when the consumer wants
// to copy it for ethers.js / viem / wagmi.

export function SourcifyViewer({ network, address }: SourcifyViewerProps) {
  const { files, status, loading } = useSourcifyFiles(network, address);
  const { source, metadata } = useMemo(() => partitionSourceFiles(files), [files]);
  const abi = useMemo(() => parseAbiFromMetadata(metadata), [metadata]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [showAbi, setShowAbi] = useState(false);

  if (loading) {
    return (
      <DetailCard title="Verified Source">
        <div className="space-y-2 py-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-48 w-full" />
        </div>
      </DetailCard>
    );
  }

  if (status === "none" || source.length === 0) {
    return (
      <DetailCard title="Verified Source">
        <div className="py-3 text-sm text-muted-foreground space-y-2">
          <p>No verified source available for this contract.</p>
          <p className="text-xs">
            Verify it yourself by submitting source + metadata to{" "}
            <a
              href="https://verify.sentrixchain.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--gold)] hover:underline"
            >
              verify.sentrixchain.com
            </a>
            {" "}— or run{" "}
            <code className="font-mono text-xs px-1 py-0.5 rounded bg-muted">
              forge verify-contract --verifier sourcify --verifier-url https://verify.sentrixchain.com ...
            </code>
            .
          </p>
        </div>
      </DetailCard>
    );
  }

  const activeFile = source[activeIdx] ?? source[0];

  return (
    <DetailCard
      title={
        <span className="inline-flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          Verified Source
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            ({status === "full" ? "exact match" : "partial match"} — {source.length} file{source.length === 1 ? "" : "s"})
          </span>
        </span>
      }
      action={
        <a
          href={sourcifyContractUrl(network, address)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-[var(--gold)] hover:underline"
        >
          Open on Sourcify <ExternalLink className="h-3 w-3" />
        </a>
      }
    >
      <div className="grid gap-3 lg:grid-cols-[200px_1fr] py-2">
        {/* File rail */}
        <nav className="flex flex-col text-xs gap-0.5 overflow-y-auto max-h-96 lg:border-r lg:border-border/60 lg:pr-2">
          {source.map((f, i) => (
            <button
              key={f.path}
              onClick={() => setActiveIdx(i)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1.5 rounded text-left font-mono truncate",
                i === activeIdx
                  ? "bg-[color-mix(in_oklab,var(--gold)_12%,transparent)] text-[var(--gold)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
              title={f.name}
            >
              <FileCode className="h-3 w-3 shrink-0" />
              <span className="truncate">{f.name}</span>
            </button>
          ))}
        </nav>

        {/* Source pane */}
        <div className="min-w-0">
          <SourceCode file={activeFile} />
        </div>
      </div>

      {abi && (
        <div className="border-t border-border/60 pt-3 mt-2">
          <button
            onClick={() => setShowAbi((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
          >
            <FileCode className="h-3 w-3" />
            {showAbi ? "Hide" : "Show"} ABI ({abi.length} entries)
          </button>
          {showAbi && (
            <div className="mt-2 relative">
              <CopyButton text={JSON.stringify(abi, null, 2)} />
              <pre className="text-[11px] font-mono bg-muted/40 rounded p-3 overflow-x-auto max-h-72">
                {JSON.stringify(abi, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </DetailCard>
  );
}

function SourceCode({ file }: { file: SourcifyFile }) {
  const lines = file.content.split(/\r?\n/);
  const digits = String(lines.length).length;

  return (
    <div className="relative rounded-md border border-border/60 bg-muted/30 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 text-[11px] text-muted-foreground border-b border-border/60 bg-muted/40">
        <span className="font-mono truncate">{file.name}</span>
        <CopyButton text={file.content} />
      </div>
      <div className="overflow-x-auto">
        <pre className="text-[12px] font-mono leading-relaxed py-2">
          {lines.map((line, i) => (
            <div key={i} className="flex gap-4 px-3 hover:bg-muted/40 transition-colors">
              <span className="text-muted-foreground/60 select-none text-right shrink-0" style={{ width: `${digits}ch` }}>
                {i + 1}
              </span>
              <code className="whitespace-pre flex-1">{line || " "}</code>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
    >
      <Copy className="h-3 w-3" />
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

interface AbiEntry {
  type: string;
  name?: string;
  inputs?: Array<{ name: string; type: string }>;
  outputs?: Array<{ name: string; type: string }>;
  stateMutability?: string;
}

function parseAbiFromMetadata(metadataFile: SourcifyFile | null): AbiEntry[] | null {
  if (!metadataFile) return null;
  try {
    const meta = JSON.parse(metadataFile.content);
    return Array.isArray(meta?.output?.abi) ? meta.output.abi : null;
  } catch {
    return null;
  }
}
