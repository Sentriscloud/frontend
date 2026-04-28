"use client";

import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "./section-header";

const SRC20_COLORS = [
  { accent: "var(--cyan)", bg: "rgba(122,184,200,.06)", border: "rgba(122,184,200,.15)" },
  { accent: "var(--orange)", bg: "rgba(251,146,60,.06)", border: "rgba(251,146,60,.15)" },
  { accent: "var(--purple)", bg: "rgba(167,139,250,.06)", border: "rgba(167,139,250,.15)" },
  { accent: "var(--green)", bg: "rgba(126,200,164,.06)", border: "rgba(126,200,164,.15)" },
];

const SRC20_FEATURES = [
  {
    icon: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
    title: "Instant Deployment",
    desc: "Deploy your token in seconds via CLI or REST API. One command, done.",
  },
  {
    icon: <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />,
    title: "Gas in SRX",
    desc: "Every SRC-20 transaction pays gas in SRX — driving constant demand for the native coin.",
  },
  {
    icon: <><path d="M16 18l6-6-6-6" /><path d="M8 6l-6 6 6 6" /></>,
    title: "ERC-20 Parity",
    desc: "transfer, approve, transferFrom, allowance, balanceOf, mint, burn. Full compatibility.",
  },
  {
    icon: <><circle cx="12" cy="12" r="10" /><path d="M8 12h8" /><path d="M12 8v8" /></>,
    title: "Permissionless",
    desc: "Anyone with SRX can deploy a token. No approval needed, no gatekeepers.",
  },
];

export function SRC20() {
  return (
    <section id="src20" className="src20-section py-[120px] px-6 md:px-[60px] border-t border-b border-[var(--brd)]">
      <Reveal>
        <SectionHeader tag="Token Standard" title="SRC-20" titleEm="." subtitle="The Sentrix token standard. Deploy your own token on Sentrix Chain — permissionless, instant, and gas-efficient." />
      </Reveal>

      <Reveal delay={0.15}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
        {/* Code Block */}
        <div className="group relative bg-gradient-to-br from-[var(--sf)] to-[var(--bk)] border border-[var(--brd)] p-8 overflow-hidden rounded-2xl hover:border-[rgba(167,139,250,.15)] transition-all duration-500">
          <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[50px]" style={{ background: "var(--purple)" }} />
          <span className="absolute top-3.5 right-4 font-mono text-[8px] tracking-[.2em] px-2 py-1 rounded-md" style={{ color: "var(--teal)", border: "1px solid rgba(45,212,191,.15)", background: "rgba(45,212,191,.05)" }}>SRC-20</span>
          <pre className="font-mono text-[12px] leading-[1.9] text-[var(--tx-m)] overflow-x-auto">
            <code>
              <span className="text-[var(--tx-d)]"># Deploy your SRC-20 token</span>{"\n\n"}
              <span className="text-[var(--purple)]">sentrix</span> token deploy \{"\n"}
              {"  "}--name <span className="text-[var(--green)]">&quot;My Token&quot;</span> \{"\n"}
              {"  "}--symbol <span className="text-[var(--green)]">MTK</span> \{"\n"}
              {"  "}--supply <span className="text-[var(--orange)]">1_000_000_000</span> \{"\n"}
              {"  "}--decimals <span className="text-[var(--orange)]">18</span> \{"\n"}
              {"  "}--deployer-key <span className="text-[var(--orange)]">PRIVATE_KEY</span> \{"\n"}
              {"  "}--fee <span className="text-[var(--orange)]">100000</span>{"\n\n"}
              <span className="text-[var(--tx-d)]"># Result</span>{"\n"}
              <span className="text-[var(--cyan)]">Contract:</span> <span className="text-[var(--green)]">SRC20_2be9edc653...</span>{"\n"}
              <span className="text-[var(--cyan)]">Symbol:</span>   <span className="text-[var(--green)]">MTK</span>{"\n"}
              <span className="text-[var(--cyan)]">Supply:</span>   <span className="text-[var(--orange)]">1,000,000,000 MTK</span>{"\n"}
              <span className="text-[var(--cyan)]">Status:</span>   <span className="text-[var(--green)]">Deployed</span>
            </code>
          </pre>
        </div>

        {/* Feature Cards */}
        <div className="flex flex-col gap-3">
          {SRC20_FEATURES.map((f, i) => {
            const c = SRC20_COLORS[i];
            return (
              <div key={i} className="group flex gap-4.5 p-5 border transition-all duration-500 hover:bg-gradient-to-br hover:from-[var(--sf)] hover:to-[var(--sf2)] relative overflow-hidden rounded-xl hover:border-transparent"
                style={{ borderColor: "var(--brd)" }}>
                <span className="absolute left-0 top-0 bottom-0 w-0.5 opacity-0 group-hover:opacity-60 transition-opacity duration-500"
                  style={{ background: c.accent }} />
                <div className="absolute -top-8 -left-8 w-16 h-16 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[25px]"
                  style={{ background: c.accent }} />
                <div className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg transition-all duration-500 group-hover:scale-110"
                  style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    {f.icon}
                  </svg>
                </div>
                <div>
                  <div className="text-[14px] font-medium mb-1.5 transition-colors duration-300 group-hover:text-[var(--tx)]">{f.title}</div>
                  <div className="text-[12px] text-[var(--tx-d)] leading-[1.65] font-light">{f.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </Reveal>
    </section>
  );
}
