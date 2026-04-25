'use client'
import { useWalletStore } from '@/store/wallet'
import { Button } from '@/components/ui/Button'
import { formatAddress } from '@/lib/utils'
import { Wallet, ChevronDown, LogOut, Copy } from 'lucide-react'
import { useState } from 'react'

export function WalletConnect() {
  const { address, isConnected, isConnecting, error, connect, disconnect } = useWalletStore()
  const [showMenu, setShowMenu] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyAddress = async () => {
    if (!address) return
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isConnected && address) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 px-3 py-1.5 bg-[var(--gold)]/10 hover:bg-[var(--gold)]/15 rounded-full border border-[var(--brd2)] transition-colors text-sm"
        >
          <div className="w-2 h-2 bg-emerald-400 rounded-full" />
          <span className="text-[var(--tx)] font-mono text-xs hidden sm:block">
            {formatAddress(address)}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-[var(--tx-d)]" />
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-full mt-2 z-50 w-52 bg-[var(--sf)] border border-[var(--brd)] rounded-xl shadow-xl p-1">
              <div className="px-3 py-2 border-b border-[var(--brd)] mb-1">
                <p className="text-xs text-[var(--tx-d)]">Connected</p>
                <p className="text-xs font-mono text-[var(--tx)] truncate">{address}</p>
              </div>
              <button
                onClick={copyAddress}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--tx-m)] hover:text-[var(--tx)] hover:bg-[var(--sf2)] rounded-lg transition-colors"
              >
                <Copy className="w-4 h-4" />
                {copied ? 'Copied!' : 'Copy Address'}
              </button>
              <button
                onClick={() => { disconnect(); setShowMenu(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="primary"
        size="sm"
        onClick={connect}
        loading={isConnecting}
        className="gap-2"
      >
        <Wallet className="w-4 h-4" />
        <span className="hidden sm:block">Connect Wallet</span>
        <span className="sm:hidden">Connect</span>
      </Button>
      {error && (
        <p className="text-xs text-red-400 max-w-[200px] text-right">{error}</p>
      )}
    </div>
  )
}
