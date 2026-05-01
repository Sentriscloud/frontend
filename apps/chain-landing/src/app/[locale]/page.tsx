"use client";

import { ScrollProgress } from "@/components/ui/scroll-progress";
import { Navbar } from "@/components/sections/navbar";
import { Hero } from "@/components/sections/hero";
import { Ticker } from "@/components/sections/ticker";
import { LiveChain } from "@/components/sections/live-chain";
import { Stats } from "@/components/sections/stats";
import { About } from "@/components/sections/about";
import { Features } from "@/components/sections/features";
import { Tokens } from "@/components/sections/tokens";
import { Tokenomics } from "@/components/sections/tokenomics";
import { Ecosystem } from "@/components/sections/ecosystem";
import { SRC20 } from "@/components/sections/src20";
import { Architecture } from "@/components/sections/architecture";
import { Api } from "@/components/sections/api";
import { Security } from "@/components/sections/security";
import { Roadmap } from "@/components/sections/roadmap";
import { Validators } from "@/components/sections/validators";
import { Developers } from "@/components/sections/developers";
import { CTA } from "@/components/sections/cta";
import { Footer } from "@/components/sections/footer";
import { Divider } from "@/components/sections/section-header";

export default function Home() {
  return (
    <div className="bg-[var(--bk)]">
      <ScrollProgress />
      <Navbar />
      <Hero />
      <Ticker />
      <LiveChain />
      <Stats />
      <About />
      <Features />
      <Divider />
      <Tokens />
      <Tokenomics />
      <Ecosystem />
      <Divider />
      <SRC20 />
      <Architecture />
      <Divider />
      <Api />
      <Divider />
      <Security />
      <Divider />
      <Roadmap />
      <Divider />
      <Validators />
      <Divider />
      <Developers />
      <Divider />
      <CTA />
      <Footer />
    </div>
  );
}
