import { redirect } from "@/i18n/navigation";

export default async function ContractIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/leaderboard/contract/calls", locale });
}
