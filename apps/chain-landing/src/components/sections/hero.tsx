"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Spotlight } from "@/components/ui/spotlight";
import { TextGenerate } from "@/components/ui/text-generate";
import { Button } from "@/components/ui/button";
import { DotGrid } from "@/components/ui/grid-bg";

const HeroScene = dynamic(() => import("@/components/3d/hero-scene").then(m => m.HeroScene), { ssr: false });

export function Hero() {
  const t = useTranslations("hero");
  return (
    <Spotlight className="relative min-h-screen overflow-hidden">
      <HeroScene />
      <DotGrid className="z-1 opacity-40" />

      {/* Grid overlay */}
      <div className="hero-grid-overlay absolute inset-0 z-1 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(200,168,74,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(200,168,74,.018) 1px,transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse 80% 80% at 60% 45%,rgba(0,0,0,.5),transparent)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 60% 45%,rgba(0,0,0,.5),transparent)",
        }}
      />

      {/* Gradient fade */}
      <div className="hero-fade-overlay absolute inset-0 z-1 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 70% 40%,rgba(200,168,74,.04) 0%,transparent 70%),radial-gradient(ellipse 40% 60% at 30% 70%,rgba(200,168,74,.025) 0%,transparent 60%),linear-gradient(180deg,rgba(12,12,16,.5) 0%,rgba(12,12,16,.05) 35%,transparent 50%,rgba(12,12,16,.4) 80%,var(--bk) 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-2 min-h-screen flex flex-col justify-end px-6 md:px-[60px] pb-20 pointer-events-none [&>*]:pointer-events-auto">
        <div className="flex items-center gap-3.5 mb-7 anim-hero-1 opacity-0">
          <span className="w-8 h-px bg-[var(--gold)]" />
          <span className="w-1.5 h-1.5 bg-[var(--green)] rounded-full animate-[pulse-live_2s_infinite]" />
          <span className="w-8 h-px bg-[var(--gold)]" />
        </div>

        <h1 className="font-serif text-[clamp(42px,7vw,90px)] font-light leading-[.92] tracking-[.08em] text-[var(--gold)] mb-5 pr-[.08em] anim-hero-2 opacity-0">
          SENTRI<span className="text-[var(--gold-l)] font-normal">X</span>
        </h1>

        <p className="font-serif italic text-[clamp(18px,2.4vw,28px)] font-light text-[var(--tx)] mb-7 anim-hero-3 opacity-0 max-w-[640px] leading-[1.3]">
          {t("tagline")}
        </p>

        <TextGenerate
          text={t("body")}
          className="text-base text-[var(--tx-m)] max-w-[560px] leading-[1.7] font-light mb-11"
        />

        <div className="flex gap-4 flex-wrap anim-hero-4 opacity-0">
          <Button href="https://scan.sentrixchain.com" target="_blank">{t("ctaExplore")}</Button>
          <Button href="#developers" variant="secondary">{t("ctaBuild")}</Button>
          <Button href="https://t.me/SentrixChain" variant="secondary">{t("ctaCommunity")}</Button>
        </div>
      </div>
    </Spotlight>
  );
}
