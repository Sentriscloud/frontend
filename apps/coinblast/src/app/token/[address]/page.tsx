import { notFound } from 'next/navigation'
import { MOCK_TOKENS, MOCK_HOLDERS, MOCK_TRADES } from '@/lib/mock-data'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { BondingCurveChart } from '@/components/token/BondingCurveChart'
import { BuySellWidget } from '@/components/token/BuySellWidget'
import { formatAddress, formatNumber, formatPrice, formatTimestamp, formatSRX } from '@/lib/utils'
import { GRADUATION_THRESHOLD } from '@/lib/bonding-curve'
import { ExternalLink, ShieldCheck, AlertTriangle, TrendingUp, Users, BarChart2, Globe, Send, MessageSquare } from 'lucide-react'
import Link from 'next/link'

interface Props {
  params: Promise<{ address: string }>
}

export default async function TokenDetailPage({ params }: Props) {
  const { address } = await params
  const token = MOCK_TOKENS.find((t) => t.address === address)

  if (!token) notFound()

  const soldPct = ((token.tokensSold / token.totalSupply) * 100).toFixed(1)

  return (
    <div className="max-w-7xl mx-auto px-4 pt-[96px] pb-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--tx-d)] mb-6">
        <Link href="/explore" className="hover:text-[var(--gold)] transition-colors">Explore</Link>
        <span>/</span>
        <span className="text-[var(--tx-m)]">{token.symbol}</span>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-8">
        {/* Left column */}
        <div className="space-y-8">

          {/* Token header */}
          <div className="flex items-start gap-4">
            <img
              src={token.imageUrl}
              alt={token.name}
              className="w-16 h-16 rounded-xl bg-[var(--sf2)] shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-2xl font-black text-[var(--tx)]">{token.name}</h1>
                <span className="text-[var(--tx-d)] font-mono text-lg">{token.symbol}</span>
                {token.isVerified && (
                  <Badge variant="blue"><ShieldCheck className="w-3 h-3" /> Verified</Badge>
                )}
                {token.isWarned && (
                  <Badge variant="warn"><AlertTriangle className="w-3 h-3" /> Warning</Badge>
                )}
                {token.isGraduated && (
                  <Badge variant="green"><TrendingUp className="w-3 h-3" /> Graduated</Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-[var(--tx-d)] flex-wrap">
                <span>by {formatAddress(token.creator, 6)}</span>
                <span>·</span>
                <span>Created {formatTimestamp(token.createdAt)}</span>
                <Link
                  href={`${process.env.NEXT_PUBLIC_EXPLORER_URL ?? 'https://scan.sentrixchain.com'}/address/${token.address}`}
                  target="_blank"
                  className="flex items-center gap-1 hover:text-[var(--gold)] transition-colors"
                >
                  Explorer <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {/* Social links */}
              {(token.website || token.twitter || token.telegram || token.discord) && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {token.website && (
                    <Link href={token.website} target="_blank"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--sf)] border border-[var(--brd)] text-xs text-[var(--tx-d)] hover:text-[var(--gold)] hover:border-[var(--brd2)] transition-all">
                      <Globe className="w-3 h-3" /> Website
                    </Link>
                  )}
                  {token.twitter && (
                    <Link href={token.twitter} target="_blank"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--sf)] border border-[var(--brd)] text-xs text-[var(--tx-d)] hover:text-[var(--gold)] hover:border-[var(--brd2)] transition-all">
                      <span className="text-[10px] font-bold leading-none">𝕏</span> Twitter
                    </Link>
                  )}
                  {token.telegram && (
                    <Link href={token.telegram} target="_blank"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--sf)] border border-[var(--brd)] text-xs text-[var(--tx-d)] hover:text-[var(--gold)] hover:border-[var(--brd2)] transition-all">
                      <Send className="w-3 h-3" /> Telegram
                    </Link>
                  )}
                  {token.discord && (
                    <Link href={token.discord} target="_blank"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--sf)] border border-[var(--brd)] text-xs text-[var(--tx-d)] hover:text-[var(--gold)] hover:border-[var(--brd2)] transition-all">
                      <MessageSquare className="w-3 h-3" /> Discord
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Price', value: formatPrice(token.price), icon: <BarChart2 className="w-4 h-4 text-[var(--gold)]" /> },
              { label: 'Market Cap', value: formatSRX(token.marketCap), icon: <TrendingUp className="w-4 h-4 text-[var(--gold-l)]" /> },
              { label: '24h Volume', value: formatSRX(token.volume24h), icon: <BarChart2 className="w-4 h-4 text-emerald-400" /> },
              { label: 'Holders', value: MOCK_HOLDERS.length.toString(), icon: <Users className="w-4 h-4 text-[var(--tx-m)]" /> },
            ].map((s) => (
              <div key={s.label} className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  {s.icon}
                  <span className="text-xs text-[var(--tx-d)]">{s.label}</span>
                </div>
                <p className="text-[var(--tx)] font-bold text-sm">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Graduation progress */}
          {!token.isGraduated && (
            <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[var(--tx)] text-sm">Graduation Progress</h3>
                <span className="text-[var(--gold)] font-bold">{token.progress.toFixed(1)}%</span>
              </div>
              <Progress value={token.progress} color="gold" showLabel />
              <div className="flex items-center justify-between mt-3 text-xs text-[var(--tx-d)]">
                <span>Current: {formatSRX(token.marketCap)} mcap</span>
                <span>Goal: {formatNumber(GRADUATION_THRESHOLD)} SRX mcap</span>
              </div>
              <p className="text-xs text-[var(--tx-d)] mt-2">
                {formatSRX(Math.max(0, GRADUATION_THRESHOLD - token.marketCap))} remaining to auto-list on Sentrix DEX
              </p>
            </div>
          )}

          {/* Bonding curve chart */}
          <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--tx)]">Bonding Curve</h3>
              <span className="text-xs text-[var(--tx-d)]">{soldPct}% sold</span>
            </div>
            <BondingCurveChart token={token} />
          </div>

          {/* Description */}
          {token.description && (
            <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-5">
              <h3 className="font-semibold text-[var(--tx)] mb-3">About</h3>
              <p className="text-[var(--tx-m)] text-sm leading-relaxed">{token.description}</p>
            </div>
          )}

          {/* Token info */}
          <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-5">
            <h3 className="font-semibold text-[var(--tx)] mb-4">Token Info</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Contract Address', value: token.address, mono: true },
                { label: 'Total Supply', value: formatNumber(token.totalSupply, 0), mono: false },
                { label: 'Tokens Sold', value: `${formatNumber(token.tokensSold, 0)} (${soldPct}%)`, mono: false },
                { label: 'Creator', value: formatAddress(token.creator, 8), mono: true },
                { label: 'Chain', value: 'Sentrix Chain (ID: 7119)', mono: false },
              ].map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-4">
                  <span className="text-[var(--tx-d)] shrink-0">{row.label}</span>
                  <span className={`text-[var(--tx)] text-right truncate max-w-[200px] ${row.mono ? 'font-mono text-xs' : ''}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Holders */}
          <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-5">
            <h3 className="font-semibold text-[var(--tx)] mb-4">Top Holders</h3>
            <div className="space-y-3">
              {MOCK_HOLDERS.map((holder, i) => (
                <div key={holder.address} className="flex items-center gap-3">
                  <span className="text-[var(--tx-d)] text-xs w-4 text-right">{i + 1}</span>
                  <span className="font-mono text-xs text-[var(--tx-m)] flex-1 truncate">
                    {formatAddress(holder.address, 6)}
                  </span>
                  <div className="flex-1">
                    <Progress value={holder.percentage} color="gold" />
                  </div>
                  <span className="text-xs text-[var(--tx-d)] w-12 text-right">{holder.percentage.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent trades */}
          <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-5">
            <h3 className="font-semibold text-[var(--tx)] mb-4">Recent Trades</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[var(--tx-d)] text-xs border-b border-[var(--brd)]">
                    <th className="text-left pb-2">Type</th>
                    <th className="text-right pb-2">SRX</th>
                    <th className="text-right pb-2">Tokens</th>
                    <th className="text-right pb-2">By</th>
                    <th className="text-right pb-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_TRADES.map((trade) => (
                    <tr key={trade.txHash} className="border-b border-[var(--brd)]/50 hover:bg-[var(--sf2)]">
                      <td className="py-2.5">
                        <span className={`font-semibold ${trade.type === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {trade.type === 'buy' ? '▲ BUY' : '▼ SELL'}
                        </span>
                      </td>
                      <td className="text-right text-[var(--tx)] py-2.5">{formatNumber(trade.srxAmount, 2)}</td>
                      <td className="text-right text-[var(--tx-m)] py-2.5">{formatNumber(trade.tokenAmount, 0)}</td>
                      <td className="text-right font-mono text-xs text-[var(--tx-d)] py-2.5">
                        {formatAddress(trade.address)}
                      </td>
                      <td className="text-right text-[var(--tx-d)] text-xs py-2.5">
                        {formatTimestamp(trade.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column — Buy/Sell */}
        <div className="space-y-4">
          <BuySellWidget token={token} />

          {/* Warning card */}
          {token.isWarned && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                <span className="text-orange-400 font-semibold text-sm">Warning</span>
              </div>
              <p className="text-orange-300 text-xs leading-relaxed">
                This token has no description. Exercise caution — do your own research before trading.
              </p>
            </div>
          )}

          {/* Fee info */}
          <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-4 text-xs space-y-2 text-[var(--tx-d)]">
            <p className="font-semibold text-[var(--tx)] text-sm mb-3">Fee Structure</p>
            <div className="flex justify-between">
              <span>Trading fee</span><span className="text-[var(--tx)]">1%</span>
            </div>
            <div className="flex justify-between">
              <span>Fee distribution</span><span className="text-[var(--tx)]">50% burn / 50% Ecosystem</span>
            </div>
            <div className="flex justify-between">
              <span>Graduation threshold</span><span className="text-[var(--gold)]">69,000 SRX mcap</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
