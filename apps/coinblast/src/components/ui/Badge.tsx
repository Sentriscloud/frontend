import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'blue' | 'gold' | 'green' | 'red' | 'gray' | 'warn'
  className?: string
}

export function Badge({ children, variant = 'blue', className }: BadgeProps) {
  const variants = {
    blue:  'bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--brd2)]',
    gold:  'bg-[var(--gold)]/15 text-[var(--gold-l)] border-[var(--gold)]/30',
    green: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    red:   'bg-red-500/15 text-red-400 border-red-500/25',
    gray:  'bg-white/5 text-[var(--tx-d)] border-white/10',
    warn:  'bg-orange-500/15 text-orange-400 border-orange-500/25',
  }

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border tracking-wide',
      variants[variant],
      className
    )}>
      {children}
    </span>
  )
}
