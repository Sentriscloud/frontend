'use client'
import { useState, useMemo } from 'react'
import { TokenCard } from '@/components/token/TokenCard'
import { MOCK_TOKENS } from '@/lib/mock-data'
import { useDeployedTokens } from '@/lib/useDeployedTokens'
import { mergeStaticAndDeployed } from '@/lib/token-registry'
import type { Token } from '@/types'
import { Search } from 'lucide-react'

type Filter = 'all' | 'new' | 'trending' | 'graduating' | 'graduated'
type SortKey = 'marketCap' | 'volume' | 'new' | 'progress'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'new', label: '🆕 New' },
  { key: 'trending', label: '🔥 Trending' },
  { key: 'graduating', label: '🎓 Graduating' },
  { key: 'graduated', label: '✅ Graduated' },
]

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'marketCap', label: 'Market Cap' },
  { key: 'volume', label: '24h Volume' },
  { key: 'new', label: 'Newest' },
  { key: 'progress', label: 'Near Graduation' },
]

export default function ExplorePage() {
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<SortKey>('marketCap')
  const [search, setSearch] = useState('')

  const { tokens: deployed } = useDeployedTokens()
  const merged = useMemo(() => mergeStaticAndDeployed(MOCK_TOKENS, deployed), [deployed])

  const tokens = useMemo(() => {
    let list: Token[] = [...merged]
    if (filter === 'new') list = list.filter((t) => t.createdAt === 0 || Date.now() / 1000 - t.createdAt < 86400)
    if (filter === 'trending') list = list.sort((a, b) => b.volume24h - a.volume24h).slice(0, 10)
    if (filter === 'graduating') list = list.filter((t) => !t.isGraduated && t.progress >= 50)
    if (filter === 'graduated') list = list.filter((t) => t.isGraduated)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        t.symbol.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      )
    }
    if (sort === 'marketCap') list = [...list].sort((a, b) => b.marketCap - a.marketCap)
    if (sort === 'volume') list = [...list].sort((a, b) => b.volume24h - a.volume24h)
    if (sort === 'new') list = [...list].sort((a, b) => b.createdAt - a.createdAt)
    if (sort === 'progress') list = [...list].sort((a, b) => b.progress - a.progress)
    return list
  }, [merged, filter, sort, search])

  return (
    <div className="max-w-7xl mx-auto px-4 pt-[96px] pb-10">

      {/* Search bar — prominent at top */}
      <div className="relative max-w-xl mx-auto mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--tx-d)]" />
        <input
          type="text"
          placeholder="Search coins by name, symbol or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[var(--sf)] border border-[var(--brd)] rounded-xl pl-11 pr-4 py-3 text-sm text-[var(--tx)] placeholder:text-[var(--tx-d)] focus:outline-none focus:border-[var(--gold)] transition-colors"
        />
      </div>

      {/* Filters + sort row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                filter === f.key
                  ? 'bg-[var(--gold)] text-[var(--bk)]'
                  : 'bg-[var(--sf)] border border-[var(--brd)] text-[var(--tx-d)] hover:border-[var(--brd2)] hover:text-[var(--tx)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl px-3 py-1.5 text-xs text-[var(--tx)] focus:outline-none focus:border-[var(--gold)] cursor-pointer"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Count */}
      <p className="text-xs text-[var(--tx-d)] mb-4">{tokens.length} coin{tokens.length !== 1 ? 's' : ''}</p>

      {/* 4-column grid */}
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
          <p className="text-[var(--tx-m)] text-sm mt-1">Try a different search or filter</p>
        </div>
      )}
    </div>
  )
}
