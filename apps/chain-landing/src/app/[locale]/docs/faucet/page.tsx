import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";

export const metadata: Metadata = {
  title: "Sentrix Faucet — How to use",
  description:
    "How to claim free SRX from the Sentrix Faucet. Testnet for builders, mainnet for new-wallet onboarding. Rate limits, captcha, troubleshooting.",
};

export default function FaucetDocsPage() {
  return (
    <div className="bg-[var(--bk)] min-h-screen">
      <Navbar />

      <article className="mx-auto max-w-3xl px-5 pt-32 pb-24 md:pt-40">
        {/* Eyebrow */}
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--tx-d)] mb-4">
          Docs · Faucet
        </p>

        {/* Title */}
        <h1 className="font-serif text-4xl md:text-5xl text-[var(--tx)] leading-[1.1] tracking-tight">
          How to use the{" "}
          <span className="text-[var(--gold)]">Sentrix Faucet</span>
        </h1>

        <p className="mt-6 text-base md:text-lg leading-relaxed text-[var(--tx-m)] max-w-2xl">
          The faucet hands out small amounts of SRX so you can interact with
          Sentrix Chain without paying for gas first. There are two modes —
          one for builders, one for end-users — with different drips and
          different protections.
        </p>

        {/* Two-mode comparison */}
        <Section title="Two faucets, one site">
          <div className="grid gap-4 md:grid-cols-2 mt-6">
            <ModeCard
              tone="testnet"
              network="Testnet"
              chainId="7120"
              audience="Builders, CI, integration tests"
              drip="10 SRX"
              cooldown="24 hours per IP + per address"
              captcha="None"
              note="Tokens have no real value. Use freely for development."
            />
            <ModeCard
              tone="mainnet"
              network="Mainnet"
              chainId="7119"
              audience="New users who just made a wallet"
              drip="Tiny (gas-only)"
              cooldown="One claim per address, ever"
              captcha="Required (Cloudflare Turnstile)"
              note="Real SRX. Sized to cover a few transactions, not to fund a wallet."
            />
          </div>
        </Section>

        {/* Step-by-step */}
        <Section title="How to claim">
          <ol className="mt-6 space-y-5 text-[var(--tx-l)]">
            <Step n={1} title="Have a wallet">
              Any EVM-compatible wallet works (MetaMask, Rabby, Frame, Sentrix
              Solux). You only need the address — no signature, no connect.
            </Step>
            <Step n={2} title="Pick the right faucet">
              Open{" "}
              <Anchor href="https://faucet.sentrixchain.com">
                faucet.sentrixchain.com
              </Anchor>
              . The header shows the current network. Make sure it matches the
              chain you actually want to use.
            </Step>
            <Step n={3} title="Paste your address">
              Paste the full <span className="font-mono text-[var(--gold)]">0x…</span>{" "}
              address (40 hex characters). The page validates the format
              before submitting.
            </Step>
            <Step n={4} title="Solve the captcha (mainnet only)">
              On the mainnet leg, complete the Cloudflare Turnstile challenge.
              It&apos;s privacy-friendly and usually clears in a second
              without interaction.
            </Step>
            <Step n={5} title="Click request">
              The site signs the transaction server-side and broadcasts to a
              Sentrix node. Once confirmed, you&apos;ll see the transaction
              hash with a link to{" "}
              <Anchor href="https://scan.sentrixchain.com">
                SentrixScan
              </Anchor>
              .
            </Step>
          </ol>
        </Section>

        {/* Rate limits */}
        <Section title="Rate limits">
          <p className="mt-4 text-[var(--tx-l)]">
            Limits are enforced server-side by both IP address and wallet
            address. The stricter of the two wins:
          </p>
          <ul className="mt-4 space-y-2 text-[var(--tx-m)]">
            <Bullet>
              <strong className="text-[var(--tx)]">Testnet:</strong> 1 claim
              per IP per 24h, 1 claim per address per 24h.
            </Bullet>
            <Bullet>
              <strong className="text-[var(--tx)]">Mainnet:</strong> 1 claim
              per address ever (lifetime). IP rate limit on top to slow
              automated harvesting.
            </Bullet>
            <Bullet>
              The browser also stores a <span className="font-mono">last_claim</span>{" "}
              timestamp in <span className="font-mono">localStorage</span> so
              you see a live cooldown countdown — but the server is the
              source of truth.
            </Bullet>
          </ul>
        </Section>

        {/* Why captcha */}
        <Section title="Why mainnet has a captcha">
          <p className="mt-4 text-[var(--tx-l)]">
            Mainnet drips are real value. Without friction, a single attacker
            running a sybil farm could drain the faucet wallet across thousands
            of fresh addresses in minutes. Cloudflare Turnstile adds a passive
            challenge that&apos;s invisible to most humans but rejects most
            automated traffic.
          </p>
          <p className="mt-3 text-[var(--tx-m)]">
            Testnet has no captcha because the tokens are worthless and devs
            need scriptable access for CI.
          </p>
        </Section>

        {/* Network details */}
        <Section title="Network details">
          <div className="mt-6 rounded-2xl border border-[var(--brd)] bg-[var(--sf)] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--sf2)]">
                <tr className="text-left">
                  <Th>Field</Th>
                  <Th>Mainnet</Th>
                  <Th>Testnet</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--brd)]">
                <Row label="Chain ID" mainnet="7119" testnet="7120" />
                <Row label="Native token" mainnet="SRX" testnet="SRX (test)" />
                <Row label="EVM" mainnet="revm 38" testnet="revm 38" />
                <Row
                  label="Faucet drip"
                  mainnet="Gas-only"
                  testnet="10 SRX"
                />
                <Row
                  label="Captcha"
                  mainnet="Required"
                  testnet="None"
                />
                <Row
                  label="Cooldown"
                  mainnet="1 / address (lifetime)"
                  testnet="1 / address / 24h"
                />
              </tbody>
            </table>
          </div>
        </Section>

        {/* Troubleshooting */}
        <Section title="Troubleshooting">
          <dl className="mt-6 space-y-6">
            <Trouble q="Invalid wallet address">
              The faucet expects exactly <span className="font-mono">0x</span>{" "}
              followed by 40 hex characters (
              <span className="font-mono">0-9</span>,{" "}
              <span className="font-mono">a-f</span>). No checksum required —
              upper or lower case both work.
            </Trouble>
            <Trouble q="Rate limit error even though I never claimed">
              Your IP may be shared (mobile network, VPN, NAT). Try from a
              different network. On mainnet, an address that&apos;s already
              been used won&apos;t qualify regardless of IP.
            </Trouble>
            <Trouble q="Captcha keeps failing">
              Disable aggressive privacy extensions (uBlock filter lists, hard
              tracking-protection modes) and reload. Cloudflare Turnstile is
              privacy-friendly but some custom blocklists still flag it.
            </Trouble>
            <Trouble q='"Sentrix node unreachable"'>
              The faucet talks to a Sentrix node over JSON-RPC. If the node is
              syncing, restarting, or under load, you may see this transiently —
              wait ~30 seconds and retry.
            </Trouble>
            <Trouble q="Transaction sent but balance hasn't appeared">
              Click the transaction link to{" "}
              <Anchor href="https://scan.sentrixchain.com">
                SentrixScan
              </Anchor>{" "}
              and confirm it was included. Wallets vary in how aggressively
              they refresh balances — some need a manual reload.
            </Trouble>
          </dl>
        </Section>

        {/* Footer note */}
        <div className="mt-20 pt-10 border-t border-[var(--brd)]">
          <p className="text-sm text-[var(--tx-m)]">
            Faucet is operated by SentrisCloud. Source on{" "}
            <Anchor href="https://github.com/Sentriscloud/frontend/tree/main/apps/faucet">
              GitHub
            </Anchor>
            . Issues or abuse reports →{" "}
            <Anchor href="mailto:security@sentriscloud.com">
              security@sentriscloud.com
            </Anchor>
            .
          </p>
          <Link
            href="/"
            className="inline-block mt-6 text-sm text-[var(--gold)] hover:text-[var(--gold-l)] transition-colors"
          >
            ← Back to Sentrix Chain
          </Link>
        </div>
      </article>

      <Footer />
    </div>
  );
}

/* ── Small components ─────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <h2 className="font-serif text-2xl md:text-3xl text-[var(--tx)] tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ModeCard({
  tone,
  network,
  chainId,
  audience,
  drip,
  cooldown,
  captcha,
  note,
}: {
  tone: "testnet" | "mainnet";
  network: string;
  chainId: string;
  audience: string;
  drip: string;
  cooldown: string;
  captcha: string;
  note: string;
}) {
  const accent =
    tone === "mainnet" ? "text-rose-400 border-rose-500/30" : "text-emerald-400 border-emerald-500/30";
  return (
    <div className="rounded-2xl border border-[var(--brd)] bg-[var(--sf)] p-6">
      <div className="flex items-baseline justify-between">
        <p className={`font-mono text-[10px] uppercase tracking-[0.22em] ${accent.split(" ")[0]}`}>
          {network}
        </p>
        <p className="font-mono text-[10px] text-[var(--tx-d)]">chain {chainId}</p>
      </div>
      <p className="mt-4 text-sm text-[var(--tx-l)]">{audience}</p>
      <dl className="mt-5 space-y-2 text-xs">
        <Datum k="Drip" v={drip} />
        <Datum k="Cooldown" v={cooldown} />
        <Datum k="Captcha" v={captcha} />
      </dl>
      <p className="mt-5 text-xs text-[var(--tx-m)] leading-relaxed">{note}</p>
    </div>
  );
}

function Datum({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[var(--tx-d)] uppercase tracking-[0.14em] text-[10px]">{k}</dt>
      <dd className="text-[var(--tx)] text-right">{v}</dd>
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-5">
      <span className="font-mono text-[var(--gold)] text-sm w-6 shrink-0 pt-1 tabular-nums">
        {String(n).padStart(2, "0")}
      </span>
      <div>
        <h3 className="font-serif text-xl text-[var(--tx)]">{title}</h3>
        <p className="mt-1.5 text-sm text-[var(--tx-m)] leading-relaxed">{children}</p>
      </div>
    </li>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="text-[var(--gold)] mt-2 shrink-0">·</span>
      <span className="text-sm leading-relaxed">{children}</span>
    </li>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--tx-d)] font-medium">
      {children}
    </th>
  );
}

function Row({ label, mainnet, testnet }: { label: string; mainnet: string; testnet: string }) {
  return (
    <tr>
      <td className="px-5 py-3 text-[var(--tx-m)] text-sm">{label}</td>
      <td className="px-5 py-3 text-[var(--tx)] text-sm font-mono">{mainnet}</td>
      <td className="px-5 py-3 text-[var(--tx)] text-sm font-mono">{testnet}</td>
    </tr>
  );
}

function Trouble({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-serif text-lg text-[var(--tx)]">{q}</dt>
      <dd className="mt-1.5 text-sm text-[var(--tx-m)] leading-relaxed">{children}</dd>
    </div>
  );
}

function Anchor({ href, children }: { href: string; children: React.ReactNode }) {
  const isExternal = href.startsWith("http") || href.startsWith("mailto");
  return (
    <a
      href={href}
      {...(isExternal ? { target: "_blank", rel: "noreferrer" } : {})}
      className="text-[var(--gold)] hover:text-[var(--gold-l)] transition-colors underline-offset-2 hover:underline"
    >
      {children}
    </a>
  );
}
