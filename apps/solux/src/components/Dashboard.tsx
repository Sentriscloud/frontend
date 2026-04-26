'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWalletStore, useSettingsStore, useNotificationStore, NETWORKS } from '@/lib/store';
import {
  getAddressInfo, getTransactionHistory, listTokens, getTokenBalance,
} from '@/lib/api';
import type { TxHistoryItem, TokenInfo } from '@/types';
import SendSRX from './SendSRX';
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
  ChevronDown, Zap, ArrowLeftRight, Plus,
} from 'lucide-react';
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
  const { address, watchOnly, mnemonic, activeIndex, clearWallet } = useWalletStore();
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

  // Auto-lock idle timer
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (autoLockMinutes <= 0) return;
    const reset = () => {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      lockTimerRef.current = setTimeout(() => {
        clearWallet();
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
  }, [autoLockMinutes, clearWallet]);

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
  const avatarChar = address ? address.slice(2, 3).toUpperCase() : 'S';

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
    <div className="min-h-screen flex justify-center px-5 pt-6 pb-28">
      <div className="w-full max-w-sm">
        {/* ── Account header ────────────────────────────── */}
        <header className="flex items-center justify-between mb-5 animate-fade-up">
          <button
            onClick={() => mnemonic && setView({ kind: 'accounts' })}
            disabled={!mnemonic}
            className="flex items-center gap-2.5 group"
            aria-label="Switch account"
          >
            <span className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--gold-bg)] border border-[var(--gold-bg-s)] text-[var(--gold)] font-mono font-bold text-sm">
              {avatarChar}
            </span>
            <div className="text-left">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-[var(--tx)]">
                  Account {activeIndex + 1}
                </span>
                {mnemonic && (
                  <ChevronDown className="w-3 h-3 text-[var(--tx-d)] group-hover:text-[var(--gold)] transition-colors" />
                )}
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--tx-d)]">
                {watchOnly ? 'Watching' : 'Self-custody'}
              </span>
            </div>
          </button>
          <div className="flex items-center gap-1.5">
            <NotificationBell />
          </div>
        </header>

        {/* ── Balance hero ──────────────────────────────── */}
        <div className="corner-lines relative mb-5 rounded-2xl bg-[var(--sf)] border border-[var(--brd)] overflow-hidden animate-fade-up delay-1">
          {/* Hex-grid texture overlay */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none opacity-60"
            style={{
              backgroundImage:
                'radial-gradient(circle at 50% 0%, rgba(200,168,74,0.10) 0%, transparent 60%), radial-gradient(circle at 1px 1px, rgba(255,255,255,0.025) 1px, transparent 0)',
              backgroundSize: 'auto, 18px 18px',
            }}
          />

          <div className="relative px-6 pt-5 pb-5">
            {/* Top row: zap + name + network · eye */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--gold-bg)] border border-[var(--gold-bg-s)] text-[var(--gold)]">
                  <Zap className="w-4 h-4" fill="currentColor" />
                </span>
                <div>
                  <div className="font-serif text-base text-[var(--tx)] leading-tight">Solux</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      net.accent === 'teal' ? 'bg-[#2dd4bf]' : 'bg-[var(--green)]'
                    }`} />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--tx-d)]">
                      SRX {net.label}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setHideBalances(!hideBalances)}
                aria-label={hideBalances ? 'Show balances' : 'Hide balances'}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--bk-2)]/60 border border-[var(--brd)] hover:bg-[var(--sf-2)] transition-colors"
              >
                {hideBalances
                  ? <EyeOff className="w-3.5 h-3.5 text-[var(--tx-m)]" />
                  : <Eye className="w-3.5 h-3.5 text-[var(--tx-m)]" />}
              </button>
            </div>

            {/* Total balance */}
            <div className="eyebrow mb-2">Total balance</div>
            <div className="flex items-baseline gap-2 mb-5">
              {loading || srxBalance === null ? (
                <span className="skeleton h-10 w-36" />
              ) : (
                <span className="font-serif text-4xl text-[var(--tx)] tab-num leading-none">
                  {hideBalances ? '••••••' : formatBalance(srxBalance)}
                </span>
              )}
              <span className="font-mono text-sm text-[var(--gold)] tracking-wider">SRX</span>
            </div>

            {/* Address pill */}
            <button
              onClick={copyAddress}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bk-2)]/60 border border-[var(--brd)] hover:bg-[var(--sf-2)] transition-colors"
            >
              <span className="flex items-center gap-2 text-xs font-mono text-[var(--tx-2)]">
                {copied
                  ? <Check className="w-3 h-3 text-[var(--gold)]" />
                  : <Copy className="w-3 h-3 text-[var(--tx-d)]" />}
                {address ? truncate(address) : '—'}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--gold)]">
                {copied ? 'Copied' : 'Copy'}
              </span>
            </button>
          </div>
        </div>

        {/* ── Action grid ─ 5 buttons match mockup ───── */}
        <div className="grid grid-cols-5 gap-1.5 mb-6 animate-fade-up delay-2">
          <ActionBtn
            icon={<Send className="w-4 h-4" />}
            label="Send"
            onClick={() => setView({ kind: 'send' })}
            disabled={watchOnly}
          />
          <ActionBtn
            icon={<Download className="w-4 h-4" />}
            label="Receive"
            onClick={() => setView({ kind: 'receive' })}
          />
          <ActionBtn
            icon={<ArrowLeftRight className="w-4 h-4" />}
            label="Swap"
            onClick={() => setComingSoon({
              feature: 'Token swaps',
              description: 'Cross-asset swaps will land once a Sentrix DEX goes live. Until then, you can trade SRX on partner exchanges.',
              eta: 'Q2 2026',
            })}
            soon
          />
          <ActionBtn
            icon={<TrendingUp className="w-4 h-4" />}
            label="Stake"
            onClick={() => setView({ kind: 'staking' })}
          />
          <ActionBtn
            icon={<Plus className="w-4 h-4" />}
            label="Buy"
            onClick={() => setComingSoon({
              feature: 'Buy SRX with fiat',
              description: 'Fiat onramp via MoonPay or Ramp. We are evaluating partners and KYC requirements for Indonesian users.',
              eta: 'Q3 2026',
            })}
            soon
          />
        </div>

        {/* ── My assets ─────────────────────────────────── */}
        <section className="mb-6 animate-fade-up delay-3">
          <div className="flex items-center justify-between mb-3">
            <div className="eyebrow">My assets</div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--tx-d)]">
              {1 + tokens.length} total
            </span>
          </div>
          <div className="rounded-xl bg-[var(--sf)] border border-[var(--brd)] divide-y divide-[var(--brd)] overflow-hidden">
            {/* SRX (always shown) */}
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--gold-bg)] border border-[var(--gold-bg-s)] text-[var(--gold)] shrink-0">
                  <Zap className="w-4 h-4" fill="currentColor" />
                </span>
                <div>
                  <p className="text-sm font-medium text-[var(--tx)]">SRX</p>
                  <p className="text-[10px] font-mono text-[var(--tx-d)] mt-0.5 uppercase tracking-wider">
                    Sentrix native
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono tab-num text-[var(--tx)]">
                  {loading || srxBalance === null
                    ? '—'
                    : hideBalances ? '••••' : formatBalance(srxBalance)}
                </p>
                <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--gold)] mt-0.5">
                  SRX
                </p>
              </div>
            </div>

            {/* SRC-20 tokens */}
            {tokens.map((t) => (
              <button
                key={t.info.contract_address}
                onClick={() => !watchOnly && setView({ kind: 'send-token', token: t.info })}
                disabled={watchOnly}
                className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors text-left ${
                  !watchOnly ? 'hover:bg-[var(--sf-2)]' : 'cursor-default'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--gold-bg)] border border-[var(--gold-bg-s)] text-[var(--gold)] shrink-0">
                    <Layers className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-[var(--tx)]">{t.info.symbol}</p>
                    <p className="text-[10px] font-mono text-[var(--tx-d)] mt-0.5 truncate max-w-[120px] uppercase tracking-wider">
                      {t.info.name || 'SRC-20'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono tab-num text-[var(--tx)]">
                    {hideBalances ? '••••' : formatTokenBal(t.balance, t.info.decimals)}
                  </p>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--tx-d)] mt-0.5">
                    {t.info.symbol}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── Recent activity ──────────────────────────── */}
        <section className="animate-fade-up delay-4">
          <div className="flex items-center justify-between mb-3">
            <div className="eyebrow">Recent activity</div>
            {recent.length > 0 && (
              <button
                onClick={() => setView({ kind: 'main', tab: 'activity' })}
                className="text-[10px] font-mono uppercase tracking-wider text-[var(--gold)] hover:text-[var(--gold-l)] transition-colors flex items-center gap-1"
              >
                See all <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="rounded-xl bg-[var(--sf)] border border-[var(--brd)] overflow-hidden">
            {loading ? (
              <div className="p-6 text-center text-xs text-[var(--tx-d)] font-mono">Loading…</div>
            ) : recent.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm text-[var(--tx-m)]">No activity yet</p>
                <p className="text-[11px] text-[var(--tx-d)] mt-1">
                  {watchOnly ? 'Watching for incoming transactions' : 'Send or receive SRX to begin'}
                </p>
              </div>
            ) : (
              recent.map((tx, i) => {
                const isTokenOp = tx.to === TOKEN_OP_ADDRESS && tx.direction === 'out';
                const isStaking = tx.to.toLowerCase() === STAKING_ADDRESS;
                const isReward = tx.direction === 'reward';
                const isOut = tx.direction === 'out';
                const amt = isTokenOp ? tx.fee : tx.amount;
                return (
                  <button
                    key={tx.txid}
                    onClick={() => setSelectedTx(tx)}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--sf-2)] transition-colors text-left"
                    style={{ borderTop: i === 0 ? 'none' : '1px solid var(--brd)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isReward || isStaking || isTokenOp ? 'bg-[var(--gold-bg)]' :
                        isOut    ? 'bg-[var(--red-bg)]'  :
                                   'bg-[var(--green-bg)]'
                      }`}>
                        {isStaking ? <Coins className="w-4 h-4 text-[var(--gold)]" /> :
                         isTokenOp ? <Layers className="w-4 h-4 text-[var(--gold)]" /> :
                         isReward  ? <Coins className="w-4 h-4 text-[var(--gold)]" /> :
                         isOut     ? <ArrowUpRight className="w-4 h-4 text-[var(--red)]" /> :
                                     <ArrowDownLeft className="w-4 h-4 text-[var(--green)]" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--tx)]">
                          {isStaking ? 'Staking' : isTokenOp ? 'Token op' : isReward ? 'Block reward' : isOut ? 'Sent SRX' : 'Received SRX'}
                        </p>
                        <p className="text-[10px] font-mono text-[var(--tx-d)] mt-0.5">
                          {isOut ? `To ${truncate(tx.to)}` : `From ${truncate(tx.from)}`} · {timeAgo(tx.block_timestamp)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-mono tab-num ${
                        isReward || isStaking || isTokenOp ? 'text-[var(--gold)]' :
                        isOut    ? 'text-[var(--red)]'  :
                                   'text-[var(--green)]'
                      }`}>
                        {hideBalances ? '••••' : `${isOut || isTokenOp ? '−' : '+'}${(amt / SENTRI).toLocaleString(undefined, { maximumFractionDigits: 4 })}`}
                      </p>
                      <p className="text-[9px] text-[var(--tx-d)] font-mono uppercase tracking-wider mt-0.5">
                        {isTokenOp ? 'fee · srx' : 'srx'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>
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
  icon, label, onClick, disabled, soon,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  soon?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`relative flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border transition-all active:scale-[0.97] group ${
        soon
          ? 'bg-[var(--bk-2)] border-[var(--brd)] cursor-not-allowed'
          : disabled
            ? 'bg-[var(--sf)] border-[var(--brd)] opacity-50 cursor-not-allowed'
            : 'bg-[var(--sf)] border-[var(--brd-s)] hover:bg-[var(--sf-2)] hover:border-[var(--gold)]'
      }`}
    >
      {soon && (
        <span className="absolute top-1 right-1 text-[7px] font-mono uppercase tracking-wider px-1 py-0.5 rounded bg-[var(--gold)] text-[var(--bk)] leading-none font-bold">
          Soon
        </span>
      )}
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border ${
        soon ? 'bg-[var(--sf)] border-[var(--brd)] text-[var(--tx-m)]' :
                'bg-[var(--gold-bg)] border-[var(--gold-bg-s)] text-[var(--gold)] group-hover:bg-[var(--gold-bg-s)]'
      }`}>
        {icon}
      </span>
      <span className={`text-[10px] font-mono uppercase tracking-wider transition-colors ${
        soon ? 'text-[var(--tx-d)]' : 'text-[var(--tx-2)] group-hover:text-[var(--tx)]'
      }`}>
        {label}
      </span>
    </button>
  );
}
