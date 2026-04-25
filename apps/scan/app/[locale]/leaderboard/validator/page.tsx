import { redirect } from "@/i18n/navigation";

export default async function ValidatorIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/leaderboard/validator/stake", locale });
}
