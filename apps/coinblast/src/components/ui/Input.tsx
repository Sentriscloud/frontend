import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef, ReactNode } from 'react'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string
  hint?: string
  error?: string
  suffix?: string
  prefix?: ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, suffix, prefix, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-[var(--tx-m)]">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3 text-sm text-[var(--tx-d)]">{prefix}</span>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full bg-[var(--sf)] border border-[var(--brd)] rounded-xl px-3 py-2.5 text-sm text-[var(--tx)]',
              'placeholder:text-[var(--tx-d)]',
              'focus:outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/20',
              'transition-colors duration-150',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              prefix && 'pl-8',
              suffix && 'pr-16',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
              className
            )}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3 text-sm text-[var(--tx-d)] font-medium">{suffix}</span>
          )}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {hint && !error && <p className="text-xs text-[var(--tx-d)]">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
