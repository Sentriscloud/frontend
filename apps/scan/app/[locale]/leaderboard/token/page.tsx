import { redirect } from "@/i18n/navigation";

export default async function TokenIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/leaderboard/token/holders", locale });
}
