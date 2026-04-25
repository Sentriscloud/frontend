// DECISION: single primitive for leaderboard rank medals so every ranking page across the app
// (accounts, tokens, validators, contracts, whales) uses the same gold/silver/bronze treatment
// instead of each page reinventing its own swatch.
//
// Visual spec:
//   #1 → gold gradient (Playfair-heavy, subtle glow, gold ring)
//   #2 → silver gradient (ring)
//   #3 → bronze gradient (ring)
//   4+ → neutral mono pill
export function RankBadge({ rank, className = "" }: { rank: number; className?: string }) {
  const style =
    rank === 1
      ? "bg-gradient-to-br from-[#F0D080] to-[#C8A84A] text-[#2A2010] shadow-[0_0_12px_-2px_rgba(200,168,74,.5)] ring-1 ring-[#F0D080]/60 font-serif font-semibold"
      : rank === 2
        ? "bg-gradient-to-br from-[#E5E7EB] to-[#9CA3AF] text-[#1F2937] ring-1 ring-[#E5E7EB]/60 font-serif font-semibold"
        : rank === 3
          ? "bg-gradient-to-br from-[#D4A574] to-[#8B5A2B] text-[#FFF7ED] ring-1 ring-[#D4A574]/60 font-serif font-semibold"
          : "bg-muted text-muted-foreground font-mono";

  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] ${style} ${className}`}>
      {rank}
    </span>
  );
}
