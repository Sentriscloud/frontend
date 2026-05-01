'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWalletStore, useSettingsStore, useNotificationStore, NETWORKS } from '@/lib/store';
import {
  getAddressInfo, getTransactionHistory, listTokens, getTokenBalance,
} from '@/lib/api';
import type { TxHistoryItem, TokenInfo } from '@/types';
import SendSRX from './SendSRX';
import SrxMark from './SrxMark';
import GenerativeAvatar from './GenerativeAvatar';
import AnimatedNumber from './AnimatedNumber';
import NetworkCard from './NetworkCard';
import SendToken from './SendToken';
import TxHistory from './TxHistory';
import TxDetail from './TxDetail';
import Receive from './Receive';
import Settings from './Settings';
import Staking from './Staking';
import AddressBook from './AddressBook';
import Accounts from './Accounts';
import NotificationBell from './NotificationBell';
import BottomNav, { type NavTab } from './BottomNav';
import ComingSoonSheet from './ComingSoonSheet';
import {
  Copy, Check,
  Send, Download, TrendingUp,
  ArrowUpRight, ArrowDownLeft, Coins, Layers, Eye, EyeOff,
  ChevronDown, ArrowLeftRight,
} from 'lucide-react';
import { formatCompactSRX } from '@/lib/amount';
import toast from 'react-hot-toast';

const SENTRI = 100_000_000;
const TOKEN_OP_ADDRESS = '0x0000000000000000000000000000000000000000';
const STAKING_ADDRESS = '0x0000000000000000000000000000000000000100';

type View =
  | { kind: 'main'; tab: NavTab }
  | { kind: 'send' }
  | { kind: 'send-token'; token: TokenInfo }
  | { kind: 'receive' }
  | { kind: 'staking' }
  | { kind: 'addressbook' }
  | { kind: 'accounts' };

interface TokenHolding {
  info: TokenInfo;
  balance: number;
}

export default function Dashboard() {
  const { address, watchOnly, mnemonic, activeIndex, lock } = useWalletStore();
  const { hideBalances, autoLockMinutes, network, setHideBalances } = useSettingsStore();
  const { push: pushNotif } = useNotificationStore();
  const net = NETWORKS[network];
  const lastSeenTxidsRef = useRef<Set<string>>(new Set());
  const [srxBalance, setSrxBalance] = useState<number | null>(null);
  const [recent, setRecent] = useState<TxHistoryItem[]>([]);
  const [tokens, setTokens] = useState<TokenHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<View>({ kind: 'main', tab: 'home' });
  const [selectedTx, setSelectedTx] = useState<TxHistoryItem | null>(null);
  const [comingSoon, setComingSoon] = useState<{ feature: string; description: string; eta?: string } | null>(null);

  // Auto-lock idle timer. Watch-only wallets skip — there's no key to
  // protect, locking would just kick the user back to setup for no reason.
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (autoLockMinutes <= 0 || watchOnly) return;
    const reset = () => {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      lockTimerRef.current = setTimeout(() => {
        lock();
        toast.success('Wallet auto-locked');
      }, autoLockMinutes * 60_000);
    };
    const events: Array<keyof DocumentEventMap> = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((e) => document.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => document.removeEventListener(e, reset));
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    };
  }, [autoLockMinutes, lock, watchOnly]);

  const fetchAll = useCallback(async () => {
    if (!address) return;
    // Clear stale state so the previous network's data doesn't flash while
    // the new network's request is in flight.
    setSrxBalance(null);
    setRecent([]);
    setTokens([]);
    setLoading(true);
    try {
      const [info, hist, tokenList] = await Promise.all([
        getAddressInfo(address).catch(() => null),
        getTransactionHistory(address, 4).catch(() => ({ transactions: [] })),
        listTokens().catch(() => ({ tokens: [], total: 0 })),
      ]);
      setSrxBalance(info?.balance_sentri ?? Math.round((info?.balance_srx ?? 0) * SENTRI));
      const newRecent = hist?.transactions ?? [];

      // Detect new inbound txs since last fetch — push notifications.
      // First-load skipped (lastSeenTxidsRef empty = treat as known baseline)
      // so user doesn't get spammed with history on wallet open.
      if (lastSeenTxidsRef.current.size > 0 && address) {
        for (const tx of newRecent) {
          if (lastSeenTxidsRef.current.has(tx.txid)) continue;
          if (tx.direction === 'in' && tx.amount > 0) {
            pushNotif(address, {
              kind: 'tx-received',
              title: 'Received SRX',
              body: `From ${tx.from.slice(0, 6)}…${tx.from.slice(-4)}`,
              amount: tx.amount,
              txid: tx.txid,
              blockHeight: tx.block_index,
            });
          } else if (tx.direction === 'reward') {
            pushNotif(address, {
              kind: 'staking',
              title: 'Block reward',
              amount: tx.amount,
              txid: tx.txid,
              blockHeight: tx.block_index,
            });
          }
        }
      }
      lastSeenTxidsRef.current = new Set(newRecent.map((t) => t.txid));
      setRecent(newRecent);

      if (tokenList.tokens.length > 0) {
        const balances = await Promise.all(
          tokenList.tokens.map(async (t) => {
            try {
              const b = await getTokenBalance(t.contract, address);
              if (b.balance > 0) {
                const info: TokenInfo = {
                  contract_address: t.contract,
                  name: t.name,
                  symbol: t.symbol,
                  decimals: t.decimals,
                  total_supply: t.total_supply,
                  max_supply: 0,
                  owner: '',
                  holders: 0,
                };
                return { info, balance: b.balance } as TokenHolding;
              }
            } catch { /* ignore */ }
            return null;
          })
        );
        setTokens(balances.filter((b): b is TokenHolding => b !== null));
      } else {
        setTokens([]);
      }
    } catch {
      toast.error('Failed to fetch wallet data');
    } finally {
      setLoading(false);
    }
  }, [address, pushNotif]);

  useEffect(() => { fetchAll(); }, [fetchAll, network]);

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success('Address copied');
    setTimeout(() => setCopied(false), 1800);
  };

  const truncate = (s: string) => s.slice(0, 6) + '…' + s.slice(-4);

  const formatBalance = (sentri: number) => {
    const srx = sentri / SENTRI;
    return srx.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  const formatTokenBal = (raw: number, decimals: number) => {
    const div = 10 ** decimals;
    return (raw / div).toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  const timeAgo = (ts: number) => {
    const diff = Math.floor(Date.now() / 1000) - ts;
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  // Deep flows replace the whole screen (no bottom nav).
  if (view.kind === 'send')         return <SendSRX  onBack={() => { setView({ kind: 'main', tab: 'home' }); fetchAll(); }} />;
  if (view.kind === 'send-token')   return <SendToken token={view.token} onBack={() => { setView({ kind: 'main', tab: 'home' }); fetchAll(); }} />;
  if (view.kind === 'receive')      return <Receive  onBack={() => setView({ kind: 'main', tab: 'home' })} />;
  if (view.kind === 'staking')      return <Staking onBack={() => { setView({ kind: 'main', tab: 'home' }); fetchAll(); }} />;
  if (view.kind === 'addressbook')  return <AddressBook onBack={() => setView({ kind: 'main', tab: 'settings' })} />;
  if (view.kind === 'accounts')     return <Accounts onBack={() => { setView({ kind: 'main', tab: 'home' }); fetchAll(); }} />;
  // Note: 'settings' is now an inline tab (not deep flow) — handled below.

  const activeTab = view.tab;

  // Avatar initial — first non-0x char of address, or 'S'
  // Reusable nav shared across tabs
  const navProps = {
    onTab: (t: NavTab) => setView({ kind: 'main', tab: t }),
    onSocial: () => setComingSoon({
      feature: 'Social tab',
      description: 'In-wallet community feed, contacts, and on-chain identities. Sentrix Social layer is being scoped — will tie into validator badges and reputation.',
      eta: 'Q4 2026',
    }),
  };

  const tabComingSoonOverlay = (
    <ComingSoonSheet
      open={!!comingSoon}
      onClose={() => setComingSoon(null)}
      feature={comingSoon?.feature ?? ''}
      description={comingSoon?.description}
      eta={comingSoon?.eta}
    />
  );

  // Activity / Settings tabs render their own components inline.
  if (activeTab === 'activity') {
    return (
      <>
        <TxHistory inline />
        <BottomNav active="activity" {...navProps} />
        {tabComingSoonOverlay}
      </>
    );
  }
  if (activeTab === 'settings') {
    return (
      <>
        <Settings
          inline
          onOpenAccounts={() => setView({ kind: 'accounts' })}
          onOpenAddressBook={() => setView({ kind: 'addressbook' })}
        />
        <BottomNav active="settings" {...navProps} />
        {tabComingSoonOverlay}
      </>
    );
  }

  return (
    <div className="min-h-screen flex justify-center px-5 pt-5 pb-32">
      <div className="w-full max-w-sm">
        {/* ── Account header ────────────────────────────── */}
        <header className="flex items-center justify-between mb-6 animate-fade-up">
          <button
            onClick={() => mnemonic && setView({ kind: 'accounts' })}
            disabled={!mnemonic}
            className="flex items-center gap-3 group"
            aria-label="Switch account"
          >
            <span className="rounded-full overflow-hidden ring-1 ring-[var(--brd)]" style={{ width: 40, height: 40 }}>
              <GenerativeAvatar address={address} size={40} />
            </span>
            <div className="text-left flex items-center gap-1">
              <span className="text-[15px] font-medium text-[var(--tx)]">
                Account {activeIndex + 1}
              </span>
              {mnemonic && (
                <ChevronDown className="w-4 h-4 text-[var(--tx-m)] group-hover:text-[var(--gold)] transition-colors" />
              )}
            </div>
          </button>
          <NotificationBell />
        </header>

        {/* ── Balance hero ──────────────────────────────── */}
        <div className="luxe-card relative mb-6 rounded-[24px] overflow-hidden animate-fade-up delay-1">
          <div aria-hidden className="gold-orb" />

          <div className="relative px-6 pt-6 pb-6">
            {/* Top label row */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] text-[var(--tx-m)] font-medium">Total balance</span>
              <button
                onClick={() => setHideBalances(!hideBalances)}
                aria-label={hideBalances ? 'Show balances' : 'Hide balances'}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--tx-m)] hover:text-[var(--tx)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
              >
                {hideBalances
                  ? <EyeOff className="w-4 h-4" />
                  : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Hero amount — bigger, dramatic, with SRX unit inline. The
                value tweens (cubic-out 900ms) on every change so refresh
                / unlock / network-switch reveals roll in instead of
                snapping. No USD placeholder; "≈ — USD" reads as broken
                until prices wire up. */}
            {loading || srxBalance === null ? (
              <div className="mb-6">
                <span className="skeleton h-[66px] w-56 block" />
              </div>
            ) : (
              <div
                className="flex items-baseline gap-2.5 mb-6 max-w-full overflow-hidden"
                title={hideBalances ? undefined : `${formatBalance(srxBalance)} SRX`}
              >
                {hideBalances ? (
                  <span
                    className="text-[64px] tab-num leading-none text-[var(--tx)] truncate"
                    style={{ fontWeight: 800, letterSpacing: '-0.04em' }}
                  >
                    ••••••
                  </span>
                ) : (
                  <AnimatedNumber
                    value={srxBalance / SENTRI}
                    // Compact ≥10K (10K / 12.5M / 1.2B etc) so the hero
                    // never overflows the card. Full localised number stays
                    // accessible via the wrapper div's `title` tooltip.
                    format={formatCompactSRX}
                    className="text-[64px] tab-num leading-none text-[var(--tx)] truncate"
                    style={{ fontWeight: 800, letterSpacing: '-0.04em' }}
                  />
                )}
                <span className="text-[20px] font-bold text-[var(--gold)] tracking-tight shrink-0">SRX</span>
              </div>
            )}

            {/* Address + network in a single quiet row */}
            <div className="flex items-center justify-between">
              <button
                onClick={copyAddress}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-mono bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.12)] text-[var(--tx-2)] hover:text-[var(--gold-l)] transition-colors"
              >
                {copied
                  ? <Check className="w-3 h-3 text-[var(--gold)]" />
                  : <Copy className="w-3 h-3" />}
                {address ? truncate(address) : '—'}
              </button>
              <span className="status-pill">
                <span className={`dot ${
                  net.accent === 'teal' ? 'bg-[#2dd4bf]' : ''
                }`} />
                {net.label}
              </span>
            </div>
          </div>
        </div>

        {/* ── Action row — gold-intensity graded, not rainbow tinted ───
            Send (primary, full gold-fill) > Receive (outline gold ring) >
            Stake (ghost) > Swap (muted soon). Visual hierarchy without
            color confetti — same brand-coding pattern Phantom uses on
            its action row but adapted to a single accent. */}
        <div className="grid grid-cols-4 gap-2 mb-7 animate-fade-up delay-2">
          <ActionBtn
            variant="primary"
            icon={<Send className="w-5 h-5" strokeWidth={2.25} />}
            label="Send"
            onClick={() => setView({ kind: 'send' })}
            disabled={watchOnly}
          />
          <ActionBtn
            variant="outline"
            icon={<Download className="w-5 h-5" strokeWidth={2.25} />}
            label="Receive"
            onClick={() => setView({ kind: 'receive' })}
          />
          <ActionBtn
            variant="ghost"
            icon={<TrendingUp className="w-5 h-5" />}
            label="Stake"
            onClick={() => setView({ kind: 'staking' })}
          />
          <ActionBtn
            variant="ghost"
            icon={<ArrowLeftRight className="w-5 h-5" />}
            label="Swap"
            onClick={() => {
              // SentrixV2 DEX deployed 2026-05-01. Solux doesn't have its own
              // swap UI yet — bounce to the dedicated dex app for now.
              if (typeof window !== 'undefined') {
                window.open('https://dex.sentrixchain.com', '_blank', 'noopener,noreferrer');
              }
            }}
          />
        </div>

        {/* ── Assets ─────────────────────────────────── */}
        <section className="mb-7 animate-fade-up delay-3">
          <div className="flex items-baseline justify-between mb-3 px-1">
            <h2 className="text-[16px] font-semibold text-[var(--tx)]">Assets</h2>
            <span className="text-[12px] text-[var(--tx-m)]">
              {1 + tokens.length} {1 + tokens.length === 1 ? 'token' : 'tokens'}
            </span>
          </div>
          <div className="rounded-2xl bg-[var(--sf)] border border-[var(--brd)] divide-y divide-[var(--brd)] overflow-hidden">
            {/* SRX (always shown) */}
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <span className="token-mark text-[var(--gold)]">
                  <SrxMark className="w-7 h-7" />
                </span>
                <div>
                  <p className="text-[15px] font-semibold text-[var(--tx)]">SRX</p>
                  <p className="text-[12px] text-[var(--tx-m)]">Sentrix Chain</p>
                </div>
              </div>
              <p
                className="text-[15px] font-semibold tab-num text-[var(--tx)] shrink-0 pl-3"
                title={loading || srxBalance === null || hideBalances
                  ? undefined
                  : `${formatBalance(srxBalance)} SRX`}
              >
                {loading || srxBalance === null
                  ? '—'
                  : hideBalances ? '••••' : formatCompactSRX(srxBalance / SENTRI)}
              </p>
            </div>

            {/* SRC-20 tokens */}
            {tokens.map((t) => (
              <button
                key={t.info.contract_address}
                onClick={() => !watchOnly && setView({ kind: 'send-token', token: t.info })}
                disabled={watchOnly}
                className={`w-full flex items-center justify-between px-4 py-4 transition-colors text-left ${
                  !watchOnly ? 'hover:bg-[rgba(255,255,255,0.03)]' : 'cursor-default'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="token-mark text-[var(--gold)]">
                    <Layers className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-[var(--tx)]">{t.info.symbol}</p>
                    <p className="text-[12px] text-[var(--tx-m)] truncate max-w-[140px]">
                      {t.info.name || 'SRC-20'}
                    </p>
                  </div>
                </div>
                <p
                  className="text-[15px] font-semibold tab-num text-[var(--tx)] shrink-0 pl-3"
                  title={hideBalances ? undefined : formatTokenBal(t.balance, t.info.decimals)}
                >
                  {hideBalances ? '••••' : formatCompactSRX(t.balance / Math.pow(10, t.info.decimals))}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* ── Activity ──────────────────────────── */}
        <section className="animate-fade-up delay-4">
          <div className="flex items-baseline justify-between mb-3 px-1">
            <h2 className="text-[16px] font-semibold text-[var(--tx)]">Activity</h2>
            {recent.length > 0 && (
              <button
                onClick={() => setView({ kind: 'main', tab: 'activity' })}
                className="text-[12px] font-medium text-[var(--gold)] hover:text-[var(--gold-l)] transition-colors"
              >
                See all
              </button>
            )}
          </div>

          {loading ? (
            <p className="px-1 py-8 text-center text-[12px] text-[var(--tx-d)]">Loading…</p>
          ) : recent.length === 0 ? (
            <div className="rounded-2xl bg-[var(--sf)] border border-[var(--brd)] py-10 text-center relative overflow-hidden">
              {/* Soft brand watermark — large translucent rhombus floating
                  in the background to keep the empty state from feeling
                  blank. Pointer-events disabled so it doesn't intercept clicks. */}
              <div aria-hidden className="absolute -top-6 -right-8 w-32 h-32 text-[var(--gold)] opacity-[0.06] pointer-events-none">
                <SrxMark className="w-full h-full" />
              </div>
              <div className="relative w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center bg-[var(--gold-bg)] text-[var(--gold)]">
                <SrxMark className="w-6 h-6" />
              </div>
              <p className="relative text-[14px] text-[var(--tx)] font-semibold">No activity yet</p>
              <p className="relative text-[12px] text-[var(--tx-m)] mt-1">
                {watchOnly ? 'Watching for incoming transactions' : 'Send or receive to get started'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {recent.map((tx) => {
                const isTokenOp = tx.to === TOKEN_OP_ADDRESS && tx.direction === 'out';
                const isStaking = tx.to.toLowerCase() === STAKING_ADDRESS;
                const isReward = tx.direction === 'reward';
                const isOut = tx.direction === 'out';
                const amt = isTokenOp ? tx.fee : tx.amount;
                const tone =
                  isReward || isStaking || isTokenOp ? 'gold' :
                  isOut ? 'red' : 'green';
                const discTint =
                  tone === 'gold' ? '' :
                  tone === 'red'  ? 'tint-red' : 'tint-green';
                const label = isStaking ? 'Staking' :
                              isTokenOp ? 'Token op' :
                              isReward ? 'Reward' :
                              isOut ? 'Sent' : 'Received';
                return (
                  <button
                    key={tx.txid}
                    onClick={() => setSelectedTx(tx)}
                    className="w-full flex items-center justify-between px-2 py-3 rounded-xl hover:bg-[rgba(255,255,255,0.04)] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`action-disc ${discTint}`} style={{ width: 40, height: 40 }}>
                        {isStaking ? <Coins className="w-[18px] h-[18px]" /> :
                         isTokenOp ? <Layers className="w-[18px] h-[18px]" /> :
                         isReward  ? <Coins className="w-[18px] h-[18px]" /> :
                         isOut     ? <ArrowUpRight className="w-[18px] h-[18px]" /> :
                                     <ArrowDownLeft className="w-[18px] h-[18px]" />}
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-[var(--tx)]">{label}</p>
                        <p className="text-[12px] text-[var(--tx-m)] mt-0.5">
                          {timeAgo(tx.block_timestamp)} · {truncate(isOut ? tx.to : tx.from)}
                        </p>
                      </div>
                    </div>
                    <p className={`text-[14px] font-semibold tab-num ${
                      tone === 'gold' ? 'text-[var(--gold)]' :
                      tone === 'red'  ? 'text-[var(--red)]'  :
                                        'text-[var(--green)]'
                    }`}>
                      {hideBalances ? '••••' : `${isOut || isTokenOp ? '−' : '+'}${(amt / SENTRI).toLocaleString(undefined, { maximumFractionDigits: 4 })}`}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <NetworkCard />
      </div>

      {selectedTx && (
        <TxDetail tx={selectedTx} onClose={() => setSelectedTx(null)} walletAddress={address} />
      )}

      <BottomNav active="home" {...navProps} />
      {tabComingSoonOverlay}
    </div>
  );
}

function ActionBtn({
  icon, label, onClick, disabled, soon, variant = 'ghost',
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  soon?: boolean;
  variant?: 'primary' | 'outline' | 'ghost';
}) {
  // primary = full gold-fill, outline = gold ring, ghost = dim chrome.
  // soon overrides everything to muted.
  const discClass = soon ? 'muted' : variant;
  return (
    <button
      onClick={disabled || soon ? undefined : onClick}
      disabled={disabled}
      className="action-tile"
    >
      <span className={`action-disc ${discClass}`}>
        {icon}
        {soon && (
          <span
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 rounded-full text-[8px] font-bold uppercase tracking-wider"
            style={{ background: 'var(--bk)', color: 'var(--tx-d)', border: '1px solid var(--brd)' }}
          >
            Soon
          </span>
        )}
      </span>
      <span className={`text-[12px] font-semibold ${soon ? 'text-[var(--tx-d)]' : 'text-[var(--tx)]'}`}>
        {label}
      </span>
    </button>
  );
}
