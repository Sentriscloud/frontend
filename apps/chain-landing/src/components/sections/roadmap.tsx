"use client";

import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "./section-header";
import { ROADMAP } from "@/data/content";

export function Roadmap() {
  return (
    <section id="roadmap" className="py-[120px] px-6 md:px-[60px]">
      <Reveal>
      <SectionHeader
        tag="Roadmap"
        title="The path"
        titleEm="forward."
        subtitle="From permissioned PoA to fully decentralized public chain. Progressive decentralization done right."
      />
      </Reveal>

      <div className="flex flex-col max-w-[800px] mt-[60px]">
        {ROADMAP.map((r, i) => (
          <Reveal key={i} delay={i * 0.08}>
          <div
            className="grid grid-cols-[80px_1px_1fr] md:grid-cols-[140px_1px_1fr] gap-x-5 md:gap-x-10 pb-12 last:pb-0"
          >
            {/* Phase label */}
            <div className="font-mono text-[11px] text-[var(--gold)] tracking-[.1em] text-right pt-1">
              {r.phase}
            </div>

            {/* Timeline line + dot */}
            <div className="bg-[var(--brd)] relative">
              <div className={`absolute top-[6px] left-1/2 -translate-x-1/2 w-[9px] h-[9px] rounded-full ${
                r.status === "done"
                  ? "bg-[var(--gold)] shadow-[0_0_14px_rgba(200,168,74,.4)]"
                  : r.status === "active"
                  ? "bg-[var(--green)] shadow-[0_0_14px_rgba(126,200,164,.4)] animate-[pulse-live_2s_infinite]"
                  : "bg-transparent border-[1.5px] border-[var(--gold-dk)]"
              }`} />
            </div>

            {/* Content */}
            <div>
              <span className={`inline-block font-mono text-[9px] tracking-[.15em] uppercase px-2.5 py-1 rounded-sm mb-3 ${
                r.status === "done"
                  ? "text-[var(--green)] bg-[rgba(126,200,164,.06)] border border-[rgba(126,200,164,.12)]"
                  : r.status === "active"
                  ? "text-[var(--cyan)] bg-[rgba(122,184,200,.06)] border border-[rgba(122,184,200,.12)]"
                  : "text-[var(--tx-d)] bg-[rgba(88,86,106,.06)] border border-[rgba(88,86,106,.12)]"
              }`}>
                {r.statusText}
              </span>

              <h3 className="text-[17px] font-medium mb-2 tracking-[.02em]">
                {r.title}
              </h3>

              <ul className="flex flex-col gap-1.5">
                {r.items.map((item, j) => (
                  <li key={j} className="text-[13px] text-[var(--tx-m)] font-light flex items-center gap-2.5">
                    <span className="w-1 h-1 bg-[var(--brd2)] rounded-full shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
