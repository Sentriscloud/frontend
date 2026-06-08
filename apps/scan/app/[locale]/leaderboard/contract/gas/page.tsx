import { redirect } from "@/i18n/navigation";

// See calls/page.tsx — the old gas-ranked tab had no backing data. Redirect
// to the pioneers ordering so old links/bookmarks still resolve.
export default async function ContractGasRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/leaderboard/contract/pioneers", locale });
}
