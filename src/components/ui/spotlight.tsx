"use client";

import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

export function Spotlight({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`relative overflow-hidden ${className || ""}`}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px z-[1]"
        animate={{ opacity }}
        transition={{ duration: 0.4 }}
        style={{
          background: `radial-gradient(600px circle at ${pos.x}px ${pos.y}px, rgba(200,168,74,.06), transparent 60%)`,
        }}
      />
      {children}
    </div>
  );
}
