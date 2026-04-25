import { redirect } from "@/i18n/navigation";

export default async function WhaleIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/leaderboard/whale/recent", locale });
}
