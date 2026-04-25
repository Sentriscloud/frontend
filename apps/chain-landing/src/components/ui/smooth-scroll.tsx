"use client";

import { useEffect } from "react";
import Lenis from "lenis";

export function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.6,
      easing: (t) => {
        // Custom ease-out quint for ultra-smooth deceleration
        return 1 - Math.pow(1 - t, 5);
      },
      smoothWheel: true,
      touchMultiplier: 1.5,
      wheelMultiplier: 0.8,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => lenis.destroy();
  }, []);

  return null;
}
