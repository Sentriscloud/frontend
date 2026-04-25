// DECISION: tiny zero-dep CSV builder + download trigger. Kept out of any UI component so
// buttons across the app (address history, token transfers, validator rewards) can share it.
//
// Rules:
//  - Escape fields that contain ", ,, or newline (RFC 4180).
//  - Always include a header row.
//  - Filename is caller-provided; we don't append the date so the caller can compose it.

function escapeCell(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv<T extends Record<string, unknown>>(rows: T[], columns: Array<keyof T & string>): string {
  const header = columns.map(escapeCell).join(",");
  const body = rows.map((r) => columns.map((c) => escapeCell(r[c])).join(",")).join("\n");
  return `${header}\n${body}\n`;
}

export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>, columns: string[]) {
  if (typeof window === "undefined" || !rows.length) return;
  const csv = toCsv(rows, columns);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
