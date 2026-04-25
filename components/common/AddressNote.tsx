"use client";

import { useState, useEffect } from "react";
import { StickyNote, Check, X, Pencil } from "lucide-react";

const STORAGE_KEY = "sentrix-address-notes";

function readAll(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeAll(obj: Record<string, string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}

// DECISION: address notes are a localStorage-backed private label (Solscan parity).
// Users often visit the same addresses ("my cold wallet", "exchange deposit", "team multisig")
// and the global label registry only covers known-public entities. Notes stay on-device,
// never leave the browser — no server round-trip.
export function AddressNote({ address }: { address: string }) {
  const key = address.toLowerCase();
  const [note, setNote] = useState<string>("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const all = readAll();
    setNote(all[key] ?? "");
    setHydrated(true);
  }, [key]);

  function save() {
    const all = readAll();
    const trimmed = draft.trim();
    if (trimmed) all[key] = trimmed;
    else delete all[key];
    writeAll(all);
    setNote(trimmed);
    setEditing(false);
  }

  function cancel() {
    setDraft(note);
    setEditing(false);
  }

  if (!hydrated) return null;

  if (editing) {
    return (
      <div className="flex items-center gap-2 bg-[var(--card)] border border-[var(--gold)]/30 rounded-lg p-2">
        <StickyNote className="h-3.5 w-3.5 text-[var(--gold)] shrink-0" />
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          placeholder="Private note for this address"
          maxLength={48}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--tx-d)]"
        />
        <button onClick={save} aria-label="Save note" className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-[var(--gold)]/10 text-[var(--gold)]">
          <Check className="h-3.5 w-3.5" />
        </button>
        <button onClick={cancel} aria-label="Cancel" className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  if (note) {
    return (
      <button
        onClick={() => { setDraft(note); setEditing(true); }}
        className="flex items-center gap-2 bg-[color-mix(in_oklab,var(--gold)_6%,transparent)] border border-[var(--gold)]/20 rounded-lg px-3 py-2 hover:border-[var(--gold)]/40 transition-colors group w-full text-left"
      >
        <StickyNote className="h-3.5 w-3.5 text-[var(--gold)] shrink-0" />
        <span className="text-sm text-[var(--gold-l)] flex-1 truncate">{note}</span>
        <Pencil className="h-3 w-3 text-[var(--tx-d)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </button>
    );
  }

  return (
    <button
      onClick={() => { setDraft(""); setEditing(true); }}
      className="inline-flex items-center gap-1.5 text-xs font-mono tracking-[.1em] uppercase text-[var(--tx-d)] hover:text-[var(--gold)] transition-colors"
    >
      <StickyNote className="h-3 w-3" />
      Add private note
    </button>
  );
}
