"use client";

import { useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import * as Sentry from "@sentry/nextjs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function PageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold">{t("error.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("error.description")}</p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button onClick={reset} size="sm">{t("common.try_again")}</Button>
            <Link
              href="/"
              className="inline-flex items-center justify-center h-7 px-2.5 text-[0.8rem] font-medium rounded-[min(var(--radius-md),12px)] border border-border hover:bg-muted transition-colors"
            >
              {t("common.go_home")}
            </Link>
          </div>
          {error.digest && (
            <p className="text-xs text-muted-foreground font-mono pt-2">{t("error.error_id", { id: error.digest })}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
