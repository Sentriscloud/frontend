import { redirect } from "@/i18n/navigation";

// `calls`/`gas` were the old "rank by call count / gas" tabs, but the indexer
// never tracked those aggregates — the pages crashed on the missing fields.
// Kept as a redirect so old links/bookmarks land on the contracts list.
export default async function ContractCallsRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/leaderboard/contract/recent", locale });
}
