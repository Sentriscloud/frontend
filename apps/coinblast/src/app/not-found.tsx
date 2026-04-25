import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h2 className="text-2xl font-bold text-[var(--tx)]">404 — Page Not Found</h2>
      <Link href="/"><Button variant="gold">Go Home</Button></Link>
    </div>
  )
}
