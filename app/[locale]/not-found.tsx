import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations();
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 animate-fade-in">
      <div className="text-center max-w-xl mx-auto space-y-7">
        {/* Rule-dot-rule ornament — same ornament as the home hero */}
        <div className="flex items-center justify-center gap-3">
          <span className="w-10 h-px bg-[var(--gold)]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-pulse-live" />
          <span className="w-10 h-px bg-[var(--gold)]" />
        </div>

        <p className="font-mono text-[11px] tracking-[.22em] uppercase text-[var(--tx-d)]">
          {t("not_found_page.eyebrow")}
        </p>

        {/* Editorial 404 glyph */}
        <h1
          className="font-serif font-light leading-none tracking-[.04em] text-[var(--gold)]"
          style={{ fontSize: "clamp(96px, 14vw, 200px)" }}
        >
          4<span className="text-[var(--gold-l)] font-normal">0</span>4
        </h1>

        <p className="font-serif text-[18px] md:text-[22px] text-[var(--tx-m)] font-light leading-snug">
          {t("not_found_page.title")}
        </p>

        <p className="text-[13px] text-[var(--tx-d)] font-light max-w-sm mx-auto leading-relaxed">
          {t("not_found_page.description")}
        </p>

        <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
          <Link
            href="/"
            className="inline-flex items-center justify-center h-9 px-5 text-[11px] font-medium tracking-[.15em] uppercase rounded-full bg-[var(--gold)] text-[var(--bk)] hover:shadow-[0_0_24px_rgba(200,168,74,.3)] transition-shadow"
          >
            {t("common.go_home")}
          </Link>
          <Link
            href="/blocks"
            className="inline-flex items-center justify-center h-9 px-5 text-[11px] font-medium tracking-[.15em] uppercase rounded-full border border-[var(--brd2)] text-[var(--tx-m)] hover:text-[var(--gold)] hover:border-[var(--gold)] transition-colors"
          >
            {t("not_found_page.browse_blocks")}
          </Link>
        </div>
      </div>
    </div>
  );
}
