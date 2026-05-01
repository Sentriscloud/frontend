"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "../../../i18n/navigation";
import type { Locale } from "../../../i18n/routing";

const LOCALES: Locale[] = ["en", "id"];

export function LocaleToggle() {
  const locale = useLocale() as Locale;
  const t = useTranslations("locale");
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label={t("switchLabel")}
      className="flex items-center rounded-full border border-[var(--brd2)] bg-transparent overflow-hidden"
    >
      {LOCALES.map((l) => {
        const active = l === locale;
        return (
          <button
            key={l}
            type="button"
            disabled={pending || active}
            onClick={() => {
              startTransition(() => {
                router.replace(pathname, { locale: l });
              });
            }}
            aria-pressed={active}
            className={`px-2.5 py-1 text-[10px] font-normal tracking-[.12em] uppercase font-sans transition-colors ${
              active
                ? "bg-[rgba(200,168,74,.12)] text-[var(--gold)]"
                : "text-[var(--tx-d)] hover:text-[var(--gold)]"
            }`}
          >
            {t(l)}
          </button>
        );
      })}
    </div>
  );
}
