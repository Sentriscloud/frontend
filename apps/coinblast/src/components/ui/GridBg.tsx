export function DotGrid() {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: 'radial-gradient(rgba(200,168,74,.07) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, black, transparent)',
        maskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, black, transparent)',
      }}
    />
  )
}

export function GradientBlur() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/8 blur-[120px]" />
      <div className="absolute top-[30%] right-[-5%] w-[400px] h-[400px] rounded-full bg-cyan-500/6 blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[30%] w-[600px] h-[300px] rounded-full bg-[var(--gold)]/5 blur-[120px]" />
    </div>
  )
}
