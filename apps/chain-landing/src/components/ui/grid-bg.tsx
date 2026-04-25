"use client";

export function DotGrid({ className }: { className?: string }) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none ${className || ""}`}
      style={{
        backgroundImage: "radial-gradient(rgba(200,168,74,.07) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
        maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black, transparent)",
        WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black, transparent)",
      }}
    />
  );
}

export function GradientBlur({ className }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className || ""}`}>
      <div className="absolute top-[15%] left-[10%] w-[400px] h-[400px] rounded-full opacity-[.04]" style={{ background: "var(--purple)", filter: "blur(120px)" }} />
      <div className="absolute top-[40%] right-[5%] w-[350px] h-[350px] rounded-full opacity-[.03]" style={{ background: "var(--cyan)", filter: "blur(100px)" }} />
      <div className="absolute bottom-[15%] left-[30%] w-[300px] h-[300px] rounded-full opacity-[.03]" style={{ background: "var(--gold)", filter: "blur(100px)" }} />
    </div>
  );
}
