import { getChainSnapshot } from "@/lib/chain";
import { formatNumber } from "@/lib/utils";

/**
 * Stats — single editorial ribbon. The latest block leads (it's the live
 * proof the chain is up); everything else flanks it as quiet metadata.
 */
export async function Stats() {
  const snapshot = await getChainSnapshot();

  const isLive = snapshot.status === "live";
  const fetchedAt = new Date(snapshot.fetchedAt).toISOString().slice(11, 19);

  return (
    <section
      aria-label="Live mainnet status"
      className="border-y border-(--color-line) bg-(--color-canvas-2)/30"
    >
      <div className="container-page py-14 md:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:items-end md:gap-x-10">
          {/* Featured: latest block */}
          <div className="md:col-span-7">
            <div className="flex items-center gap-3 text-(--color-emerald-400)">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-(--color-emerald-500) opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-(--color-emerald-500)" />
              </span>
              <span className="mono text-[11px] uppercase tracking-[0.18em]">
                {isLive ? "Mainnet · live" : "Mainnet · sync warming"}
              </span>
            </div>
            <div className="mt-5 flex items-baseline gap-4">
              <span className="mono text-(--color-ink-4) text-2xl">#</span>
              <span
                className="display tabular-nums text-(--color-ink) text-[clamp(3rem,8vw,6.5rem)]"
                style={{ fontFeatureSettings: '"lnum", "tnum"' }}
              >
                {isLive ? formatNumber(snapshot.blockHeight) : "—"}
              </span>
            </div>
            <p className="mt-2 text-sm text-(--color-ink-3)">
              Latest block on Sentrix Chain mainnet
              <span className="mono mx-2 text-(--color-ink-4)">·</span>
              <span className="mono text-(--color-ink-4)">
                fetched {fetchedAt} UTC
              </span>
            </p>
          </div>

          {/* Sidebar: quiet metadata */}
          <dl className="md:col-span-5 grid grid-cols-2 gap-x-8 gap-y-6 md:gap-x-12">
            <Datum k="Block time" v="≤ 500 ms" hint="Proof of Eternity" />
            <Datum k="Native token" v="SRX" hint="Max supply 210 M" />
            <Datum k="Chain ID" v="7119" hint="EVM-compatible" />
            <Datum k="Validators" v="3 + 1" hint="Mainnet · testnet" />
          </dl>
        </div>
      </div>
    </section>
  );
}

function Datum({ k, v, hint }: { k: string; v: string; hint: string }) {
  return (
    <div>
      <dt className="mono text-[10px] uppercase tracking-[0.18em] text-(--color-ink-4)">
        {k}
      </dt>
      <dd className="mono mt-2 text-xl text-(--color-ink) tabular-nums">{v}</dd>
      <dd className="mt-1 text-xs text-(--color-ink-3)">{hint}</dd>
    </div>
  );
}
