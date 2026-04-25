import { cn } from '@/lib/utils'

interface ProgressProps {
  value: number // 0–100
  className?: string
  color?: 'blue' | 'gold' | 'green'
  showLabel?: boolean
}

export function Progress({ value, className, color = 'gold', showLabel = false }: ProgressProps) {
  const clamped = Math.min(Math.max(value, 0), 100)

  const colors = {
    blue:  'bg-[var(--gold)]',
    gold:  'bg-[var(--gold)]',
    green: 'bg-emerald-500',
  }

  const glows = {
    blue:  'shadow-[0_0_8px_rgba(200,168,74,0.5)]',
    gold:  'shadow-[0_0_8px_rgba(200,168,74,0.5)]',
    green: 'shadow-[0_0_8px_rgba(16,185,129,0.5)]',
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-1.5 bg-[var(--sf2)] rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', colors[color], glows[color])}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-[var(--tx-d)] tabular-nums min-w-[3rem] text-right">
          {clamped.toFixed(1)}%
        </span>
      )}
    </div>
  )
}
