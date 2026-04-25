'use client'
import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { motion } from 'framer-motion'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const base = 'relative inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer overflow-hidden'

    const variants = {
      primary:   'bg-[var(--gold)] text-[var(--bk)] hover:bg-[var(--gold-l)]',
      secondary: 'bg-transparent border border-[var(--brd2)] text-[var(--tx)] hover:border-[var(--gold)] hover:text-[var(--gold-l)]',
      ghost:     'hover:bg-[var(--sf)] text-[var(--tx-m)] hover:text-[var(--tx)]',
      danger:    'bg-red-600 hover:bg-red-500 text-white rounded-full',
      gold:      'bg-[var(--gold)] text-[var(--bk)] hover:bg-[var(--gold-l)] font-bold',
    }

    const sizes = {
      sm: 'px-4 py-1.5 text-xs tracking-wide',
      md: 'px-5 py-2 text-sm tracking-wide',
      lg: 'px-7 py-3 text-sm tracking-widest uppercase',
    }

    const showShine = variant === 'primary' || variant === 'gold'

    return (
      <motion.button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
        {...(props as React.ComponentProps<typeof motion.button>)}
      >
        {showShine && (
          <span
            className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-20deg] bg-white/20 group-hover:animate-[shine-sweep_0.6s_ease]"
            aria-hidden
          />
        )}
        {loading && (
          <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
        {children}
      </motion.button>
    )
  }
)
Button.displayName = 'Button'

export { Button }
