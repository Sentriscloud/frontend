import { fetchHomeBundle } from "@/lib/api";
import { readServerNetwork } from "@/lib/network-server";
import { HomeContent } from "./HomeContent";

// DECISION: server-render the home shell with real numbers already filled in. Without this the
// browser arrives, mounts ~10 polling hooks, and waits 700–1500 ms (worse on Starlink-grade
// links) before skeletons swap to data — the "loadingnya lama banget" symptom. fetchHomeBundle
// runs everything in parallel with a 1.5 s per-call ceiling so a slow upstream can't stall the
// page beyond the user's patience window; anything that times out comes back as null and falls
// back to the regular skeleton-then-data path on the client.
//
// Network detection: uses readServerNetwork() so the host pins testnet on
// scan-testnet.sentrixchain.com. Used to read the cookie only — first paint
// served mainnet blocks under the testnet host until client hydrate caught
// up and re-polled. Centralising the logic keeps every server page coherent.
export default async function HomePage() {
  const network = await readServerNetwork();
  const initial = await fetchHomeBundle(network, 1500);
  return <HomeContent initial={initial} />;
}
