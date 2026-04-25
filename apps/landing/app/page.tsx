import { Hero } from "@/components/sections/hero";
import { Stats } from "@/components/sections/stats";
import { Products } from "@/components/sections/products";
import { Why } from "@/components/sections/why";
import { Developers } from "@/components/sections/developers";
import { Cta } from "@/components/sections/cta";
import { Footer } from "@/components/sections/footer";

// Revalidate stats every 60s — keeps RPC traffic low while staying fresh.
export const revalidate = 60;

export default function HomePage() {
  return (
    <>
      <Hero />
      <Stats />
      <Products />
      <Why />
      <Developers />
      <Cta />
      <Footer />
    </>
  );
}
