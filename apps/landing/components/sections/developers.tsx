import { ArrowUpRight } from "lucide-react";
import { ScrollReveal } from "../scroll-reveal";

const repos = [
  {
    name: "sentriscloud/frontend",
    role: "User-facing TS apps",
    href: "https://github.com/Sentriscloud/frontend",
  },
  {
    name: "sentrix-labs/sentrix",
    role: "Chain core (Rust)",
    href: "https://github.com/sentrix-labs/sentrix",
  },
  {
    name: "sentrix-labs/brand-kit",
    role: "Logos, marks, guidelines",
    href: "https://github.com/sentrix-labs/brand-kit",
  },
  {
    name: "sentrix-labs",
    role: "Protocol foundation org",
    href: "https://github.com/sentrix-labs",
  },
];

const codeSample = `# Latest block from Sentrix Chain mainnet
curl https://rpc.sentrixchain.com/rpc \\
  -H 'content-type: application/json' \\
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_blockNumber",
    "params": [],
    "id": 1
  }'`;

export function Developers() {
  return (
    <section
      id="developers"
      className="border-y border-(--color-line) bg-(--color-canvas-2)/30 py-28 md:py-36"
    >
      <div className="container-page">
        <header className="grid grid-cols-1 gap-y-8 md:grid-cols-12 md:gap-x-10">
          <div className="md:col-span-3">
            <div className="section-number">04 — Builders</div>
          </div>
          <div className="md:col-span-9">
            <h2 className="display max-w-3xl text-(--color-ink) text-[clamp(2.5rem,6vw,5rem)]">
              Open by{" "}
              <span className="display-italic text-(--color-emerald-500)">
                default.
              </span>
            </h2>
            <p className="mt-8 max-w-xl text-base leading-relaxed text-(--color-ink-3)">
              EVM-compatible JSON-RPC, viem-ready, and every product on
              GitHub. Clone, fork, run a validator, ship something.
            </p>
          </div>
        </header>

        <div className="mt-16 grid grid-cols-1 gap-x-10 gap-y-12 md:mt-20 md:grid-cols-12">
          {/* Left: code snippet — proof, not decoration */}
          <ScrollReveal className="md:col-span-7">
            <figure className="overflow-hidden rounded-2xl border border-(--color-line) bg-(--color-canvas)">
              <figcaption className="flex items-center justify-between border-b border-(--color-line) px-5 py-3">
                <span className="mono text-[10px] uppercase tracking-[0.18em] text-(--color-ink-4)">
                  Try it now · curl
                </span>
                <span className="mono text-[10px] tracking-[0.14em] text-(--color-emerald-400)">
                  EVM · chain 7119
                </span>
              </figcaption>
              <pre className="mono overflow-x-auto p-6 text-[13px] leading-[1.7] text-(--color-ink-2)">
                <code>
                  <Prompt />
                  {codeSample.split("\n").map((line, i) => (
                    <div key={i}>
                      {line.startsWith("#") ? (
                        <span className="text-(--color-ink-4)">{line}</span>
                      ) : (
                        line
                      )}
                    </div>
                  ))}
                </code>
              </pre>
            </figure>
          </ScrollReveal>

          {/* Right: repo list */}
          <ScrollReveal className="md:col-span-5" delay={0.1}>
            <ul className="divide-y divide-(--color-line)">
              {repos.map((repo) => (
                <li key={repo.name}>
                  <a
                    href={repo.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-baseline justify-between gap-4 py-5 transition-colors hover:text-(--color-emerald-400)"
                  >
                    <div>
                      <div className="mono text-sm text-(--color-ink) group-hover:text-(--color-emerald-400)">
                        {repo.name}
                      </div>
                      <div className="mt-1 text-xs text-(--color-ink-3)">
                        {repo.role}
                      </div>
                    </div>
                    <ArrowUpRight
                      size={14}
                      className="text-(--color-ink-4) transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-(--color-emerald-400)"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

function Prompt() {
  // Render a `$` shell prompt before the multiline command for visual cue.
  return null;
}
