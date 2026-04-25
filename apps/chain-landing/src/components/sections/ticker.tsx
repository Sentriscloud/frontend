import { TICKER_ITEMS } from "@/data/content";

export function Ticker() {
  const items = TICKER_ITEMS.map((item) => {
    const [label, value] = item.split("|");
    return { label, value };
  });
  const doubled = [...items, ...items];

  return (
    <div className="relative border-y border-[var(--brd)] py-3.5 overflow-hidden bg-gradient-to-r from-[var(--sf)] via-[var(--sf2)] to-[var(--sf)]">
      {/* Lamp glow behind ticker */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 40% 100% at 50% 50%, rgba(200,168,74,.04) 0%, transparent 70%)" }} />

      <div className="relative flex gap-[60px] animate-[ticker-scroll_35s_linear_infinite] whitespace-nowrap">
        {doubled.map((item, i) => (
          <div key={i} className="flex items-center gap-3 font-mono text-[11px] text-[var(--tx-d)] shrink-0 tracking-[.08em]">
            <span className="w-[3px] h-[3px] bg-[var(--gold)] rounded-full opacity-50" />
            {item.label} <span className="text-[var(--gold)]">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
