import { cookies } from "next/headers";
import { fetchHomeBundle } from "@/lib/api";
import type { NetworkId } from "@/lib/chain";
import { HomeContent } from "./HomeContent";

// DECISION: server-render the home shell with real numbers already filled in. Without this the
// browser arrives, mounts ~10 polling hooks, and waits 700–1500 ms (worse on Starlink-grade
// links) before skeletons swap to data — the "loadingnya lama banget" symptom. fetchHomeBundle
// runs everything in parallel with a 1.5 s per-call ceiling so a slow upstream can't stall the
// page beyond the user's patience window; anything that times out comes back as null and falls
// back to the regular skeleton-then-data path on the client.
export default async function HomePage() {
  const cookieStore = await cookies();
  const stored = cookieStore.get("sentrix-network")?.value;
  const network: NetworkId = stored === "testnet" ? "testnet" : "mainnet";
  const initial = await fetchHomeBundle(network, 1500);
  return <HomeContent initial={initial} />;
}
