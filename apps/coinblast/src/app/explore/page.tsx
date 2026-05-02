'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { TokenCard } from '@/components/token/TokenCard'
import { MOCK_TOKENS } from '@/lib/mock-data'
import { useDeployedTokens } from '@/lib/useDeployedTokens'
import { useDeployedCurves } from '@/lib/useDeployedCurves'
import { mergeStaticAndDeployed } from '@/lib/token-registry'
import type { Token } from '@/types'
import { Search, X as XIcon } from 'lucide-react'

// Tab labels mirror src/app/page.tsx exactly so users don't see two
// different filter vocabularies for the same set of coins. The only
// thing Explore adds on top of the homepage is the explicit sort
// dropdown (homepage tabs imply sort; Explore lets you crosscut).
type Tab = 'hot' | 'new' | 'movers' | 'graduating' | 'graduated'
type SortKey = 'marketCap' | 'volume' | 'new' | 'progress'

const TABS: { key: Tab; label: string }[] = [
  { key: 'hot', label: '🔥 Hot' },
  { key: 'new', label: '✨ New' },
  { key: 'movers', label: '🚀 Movers' },
  { key: 'graduating', label: '📈 Graduating' },
  { key: 'graduated', label: '✅ Graduated' },
]

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'marketCap', label: 'Market Cap' },
  { key: 'volume', label: '24h Volume' },
  { key: 'new', label: 'Newest' },
  { key: 'progress', label: 'Near Graduation' },
]

function tabFilter(t: Token, tab: Tab): boolean {
  switch (tab) {
    case 'hot':
    case 'new':
    case 'movers':
      return !t.isWarned
    case 'graduating':
      return !t.isGraduated && t.progress >= 50
    case 'graduated':
      return t.isGraduated
  }
}

function matchesQuery(t: Token, q: string): boolean {
  if (!q) return true
  return (
    t.name.toLowerCase().includes(q) ||
    t.symbol.toLowerCase().includes(q) ||
    t.address.toLowerCase().includes(q) ||
    t.creator.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q)
  )
}

export default function ExplorePage() {
  const [tab, setTab] = useState<Tab>('hot')
  const [sort, setSort] = useState<SortKey>('marketCap')
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  // ⌘K / Ctrl+K shortcut — matches the homepage so users build muscle
  // memory across both pages.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isModK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'
      if (!isModK) return
      e.preventDefault()
      searchRef.current?.focus()
      searchRef.current?.select()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const { tokens: deployed } = useDeployedTokens()
  const { curves } = useDeployedCurves()
  const merged = useMemo(
    () => mergeStaticAndDeployed(MOCK_TOKENS, deployed, 7119, curves),
    [deployed, curves],
  )

  const tokens = useMemo(() => {
    const lowerQuery = query.trim().toLowerCase()
    let list = merged.filter((t) => tabFilter(t, tab))
    if (lowerQuery) list = list.filter((t) => matchesQuery(t, lowerQuery))
    if (sort === 'marketCap') list = [...list].sort((a, b) => b.marketCap - a.marketCap)
    if (sort === 'volume') list = [...list].sort((a, b) => b.volume24h - a.volume24h)
    if (sort === 'new') list = [...list].sort((a, b) => b.createdAt - a.createdAt)
    if (sort === 'progress') list = [...list].sort((a, b) => b.progress - a.progress)
    return list
  }, [merged, tab, sort, query])

  return (
    <div className="max-w-7xl mx-auto px-4 pt-[96px] pb-10">
      {/* Search — same compact pill as the homepage so users see
          one search-bar pattern across the app. */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--tx-d)] pointer-events-none" />
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tokens... ⌘K"
          aria-label="Search tokens"
          className="w-full bg-[var(--sf)] border border-[var(--brd)] rounded-full pl-9 pr-9 py-2 text-sm text-[var(--tx)] placeholder:text-[var(--tx-d)] focus:outline-none focus:border-[var(--brd2)] focus:ring-1 focus:ring-[var(--brd2)] transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              searchRef.current?.focus()
            }}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--tx-d)] hover:text-[var(--tx)] transition-colors"
          >
            <XIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tabs + sort row. Tabs match the homepage exactly; sort
          dropdown is the explore-only crosscut. */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-1 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                tab === t.key
                  ? 'bg-[var(--gold)] text-[var(--bk)]'
                  : 'bg-[var(--sf)] border border-[var(--brd)] text-[var(--tx-d)] hover:border-[var(--brd2)] hover:text-[var(--tx)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort tokens"
          className="bg-[var(--sf)] border border-[var(--brd)] rounded-full px-3 py-1.5 text-xs text-[var(--tx)] focus:outline-none focus:border-[var(--brd2)] cursor-pointer"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              Sort: {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* 4-column grid (5 at xl) */}
      {tokens.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {tokens.map((token) => (
            <TokenCard key={token.address} token={token} />
          ))}
        </div>
      ) : (
        <div className="text-center py-24">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-[var(--tx)] font-semibold">No coins found</p>
          <p className="text-[var(--tx-m)] text-sm mt-1">Try a different search or tab</p>
        </div>
      )}
    </div>
  )
}
