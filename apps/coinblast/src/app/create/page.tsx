'use client'
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useWalletStore } from '@/store/wallet'
import { GRADUATION_THRESHOLD } from '@/lib/bonding-curve'
import { formatNumber } from '@/lib/utils'
import { Rocket, AlertTriangle, Globe, Send, MessageSquare, ChevronDown, Upload, Settings2 } from 'lucide-react'

const REQUIRED_SRX = 1

interface FormData {
  name: string
  symbol: string
  description: string
  imageUrl: string
  totalSupply: string
  kParam: number
  website: string
  twitter: string
  telegram: string
  discord: string
}

export default function CreatePage() {
  const { isConnected, connect } = useWalletStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showSocials, setShowSocials] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [form, setForm] = useState<FormData>({
    name: '',
    symbol: '',
    description: '',
    imageUrl: '',
    totalSupply: '1000000000',
    kParam: 0.5,
    website: '',
    twitter: '',
    telegram: '',
    discord: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }))

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setForm((p) => ({ ...p, imageUrl: url }))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setForm((p) => ({ ...p, imageUrl: url }))
  }

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {}
    if (!form.name.trim()) errs.name = 'Required'
    if (!form.symbol.trim()) errs.symbol = 'Required'
    else if (form.symbol.length < 2 || form.symbol.length > 8) errs.symbol = '2–8 characters'
    else if (!/^[A-Z0-9]+$/.test(form.symbol.toUpperCase())) errs.symbol = 'Letters and numbers only'
    if (showAdvanced) {
      const supply = parseInt(form.totalSupply)
      if (!supply || supply < 1_000 || supply > 1_000_000_000_000)
        errs.totalSupply = 'Between 1,000 and 1,000,000,000,000'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = () => {
    if (!isConnected) { connect(); return }
    if (!validate()) return
    setSubmitted(true)
  }

  const supply = parseInt(form.totalSupply) || 1_000_000_000

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-[96px] pb-20 text-center">
        <div className="w-20 h-20 bg-[var(--gold)]/15 border border-[var(--brd2)] rounded-full flex items-center justify-center mx-auto mb-6 animate-glow-pulse">
          <Rocket className="w-10 h-10 text-[var(--gold)]" />
        </div>
        <h2 className="text-3xl font-black text-[var(--tx)] mb-3">Almost there!</h2>
        <p className="text-[var(--tx-m)] mb-6 leading-relaxed">
          Contracts deploy in the Voyager update. Your coin{' '}
          <span className="text-[var(--tx)] font-semibold">{form.name} ({form.symbol.toUpperCase()})</span>{' '}
          is queued and will launch as soon as the launchpad goes live.
        </p>
        <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-5 text-left mb-6 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-[var(--tx-d)]">Name</span><span className="text-[var(--tx)]">{form.name}</span></div>
          <div className="flex justify-between"><span className="text-[var(--tx-d)]">Symbol</span><span className="text-[var(--tx)] font-mono">{form.symbol.toUpperCase()}</span></div>
          <div className="flex justify-between"><span className="text-[var(--tx-d)]">Supply</span><span className="text-[var(--tx)]">{formatNumber(supply, 0)}</span></div>
          <div className="flex justify-between"><span className="text-[var(--tx-d)]">Launch fee</span><span className="text-[var(--gold)]">1 SRX (burned)</span></div>
        </div>
        <Button variant="secondary" onClick={() => setSubmitted(false)}>← Back to form</Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-[96px] pb-16">
      {/* Title */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-black text-[var(--tx)]">Launch a Coin</h1>
        <p className="text-[var(--tx-m)] mt-1 text-sm">
          Fill the form · pay 1 SRX · coin goes live instantly
        </p>
      </div>

      <div className="space-y-5">

        {/* Centered 200×200 image upload */}
        <div className="flex flex-col items-center gap-3">
          <div
            className={`relative w-[200px] h-[200px] rounded-2xl border-2 border-dashed cursor-pointer transition-all overflow-hidden ${
              isDragging
                ? 'border-[var(--gold)] bg-[var(--gold)]/10 scale-[1.02]'
                : previewUrl
                  ? 'border-[var(--brd2)] bg-[var(--sf2)]'
                  : 'border-[var(--brd2)] bg-[var(--sf)] hover:border-[var(--gold)] hover:bg-[var(--sf2)]'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-center px-4">
                <Upload className="w-8 h-8 text-[var(--tx-d)]" />
                <p className="text-xs text-[var(--tx-d)] leading-relaxed">
                  Drag & drop<br />or click to upload
                </p>
                <p className="text-[10px] text-[var(--tx-d)]/60">PNG, JPG, GIF, SVG</p>
              </div>
            )}
            {previewUrl && (
              <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                <p className="text-xs text-white font-medium">Change image</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <p className="text-[10px] text-[var(--tx-d)]">Coin image (optional, 1:1 recommended)</p>
        </div>

        {/* Coin name */}
        <Input
          label="Coin name *"
          placeholder="Name your coin"
          value={form.name}
          onChange={set('name')}
          error={errors.name}
        />

        {/* Symbol */}
        <Input
          label="Ticker symbol *"
          placeholder="e.g. DOGE"
          value={form.symbol}
          onChange={(e) => setForm((p) => ({ ...p, symbol: e.target.value.toUpperCase() }))}
          error={errors.symbol}
          hint="2–8 characters, uppercase only"
        />

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--tx-m)]">
            Description <span className="text-[var(--tx-d)] font-normal">(Optional)</span>
          </label>
          <textarea
            placeholder="What's this coin about?"
            value={form.description}
            onChange={set('description')}
            rows={3}
            className="w-full bg-[var(--sf)] border border-[var(--brd)] rounded-xl px-3 py-2.5 text-sm text-[var(--tx)] placeholder:text-[var(--tx-d)] focus:outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/20 resize-none transition-colors"
          />
          {!form.description && (
            <p className="flex items-center gap-1 text-xs text-orange-400">
              <AlertTriangle className="w-3 h-3" /> No description = warning label on your coin
            </p>
          )}
        </div>

        {/* Social links */}
        <div className="border border-[var(--brd)] rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowSocials((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-[var(--tx-m)] hover:text-[var(--tx)] hover:bg-[var(--sf2)] transition-colors"
          >
            <span>Social Links <span className="text-[var(--tx-d)]">(Optional)</span></span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showSocials ? 'rotate-180' : ''}`} />
          </button>
          {showSocials && (
            <div className="px-4 pb-4 space-y-3 border-t border-[var(--brd)] pt-3">
              <Input placeholder="https://yourproject.com" value={form.website} onChange={set('website')} prefix={<Globe className="w-3.5 h-3.5" />} hint="Website" />
              <Input placeholder="https://twitter.com/yourproject" value={form.twitter} onChange={set('twitter')} prefix={<span className="text-xs font-bold">𝕏</span>} hint="Twitter / X" />
              <Input placeholder="https://t.me/yourproject" value={form.telegram} onChange={set('telegram')} prefix={<Send className="w-3.5 h-3.5" />} hint="Telegram" />
              <Input placeholder="https://discord.gg/yourproject" value={form.discord} onChange={set('discord')} prefix={<MessageSquare className="w-3.5 h-3.5" />} hint="Discord" />
            </div>
          )}
        </div>

        {/* Advanced settings */}
        <div className="border border-[var(--brd)] rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-[var(--tx-m)] hover:text-[var(--tx)] hover:bg-[var(--sf2)] transition-colors"
          >
            <span className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Advanced Settings
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>
          {showAdvanced && (
            <div className="px-4 pb-4 space-y-5 border-t border-[var(--brd)] pt-4">
              <Input
                label="Total Supply"
                placeholder="1000000000"
                value={form.totalSupply}
                onChange={set('totalSupply')}
                error={errors.totalSupply}
                hint="Default: 1,000,000,000 — range: 1K to 1T"
              />

              {/* Bonding curve K slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-[var(--tx-m)]">
                    Curve Steepness (K)
                  </label>
                  <span className="font-mono text-sm text-[var(--gold)]">{form.kParam.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="2.0"
                  step="0.05"
                  value={form.kParam}
                  onChange={(e) => setForm((p) => ({ ...p, kParam: parseFloat(e.target.value) }))}
                  className="w-full accent-[var(--gold)] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[var(--tx-d)]">
                  <span>Flatter (cheaper early)</span>
                  <span>Steeper (more price action)</span>
                </div>
                <div className="bg-[var(--sf2)] rounded-lg px-3 py-2 text-xs text-[var(--tx-d)]">
                  Price formula: <span className="font-mono text-[var(--tx-m)]">P = 0.0001 × (1 + {form.kParam.toFixed(2)} × sold/supply)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fee summary */}
        <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-4 flex items-center justify-between text-sm">
          <div className="space-y-0.5">
            <p className="text-[var(--tx)] font-semibold">Launch fee</p>
            <p className="text-xs text-[var(--tx-d)]">100% burned on Sentrix Chain</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-[var(--gold)]">{REQUIRED_SRX} SRX</p>
            <p className="text-xs text-[var(--tx-d)]">Graduates at {formatNumber(GRADUATION_THRESHOLD)} SRX mcap</p>
          </div>
        </div>

        {/* Launch button */}
        <Button variant="gold" size="lg" className="w-full" onClick={handleSubmit}>
          <Rocket className="w-4 h-4" />
          {!isConnected ? 'Connect Wallet to Launch' : `Launch ${form.symbol || 'Coin'} — Pay 1 SRX`}
        </Button>

        {!isConnected && (
          <p className="text-xs text-center text-[var(--tx-d)]">MetaMask · Sentrix Chain ID 7119</p>
        )}
      </div>
    </div>
  )
}
