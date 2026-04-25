"use client";

import { useRef, useState, useCallback } from "react";

export function GlowCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [inside, setInside] = useState(false);

  const handleMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseEnter={() => setInside(true)}
      onMouseLeave={() => setInside(false)}
      className={`relative overflow-hidden ${className || ""}`}
    >
      {/* Multi-color gradient border glow that follows cursor */}
      <div
        className="absolute -inset-px rounded-[inherit] pointer-events-none transition-opacity duration-400"
        style={{
          opacity: inside ? 1 : 0,
          background: `radial-gradient(350px circle at ${pos.x}px ${pos.y}px, rgba(122,184,200,.12), rgba(167,139,250,.08), rgba(200,168,74,.06), transparent 60%)`,
        }}
      />
      {/* Inner content bg */}
      <div className="relative z-[1] h-full">{children}</div>
    </div>
  );
}
