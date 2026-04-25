'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWalletStore } from '@/lib/store';
import { getAddressInfo, getTokenBalance, getTokenInfo } from '@/lib/api';
import { formatAmount } from '@/lib/amount';
import SendSRX from './SendSRX';
import SendSNTX from './SendSNTX';
import TxHistory from './TxHistory';
import Receive from './Receive';
import AssetSelect from './AssetSelect';
import ComingSoon from './ComingSoon';
import {
  Copy, Check, RefreshCw, LogOut,
  Send, Download, ArrowLeftRight, TrendingUp, CreditCard,
  ArrowUpRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

const SNTX_CONTRACT = process.env.NEXT_PUBLIC_SNTX_CONTRACT || '';
const SENTRI = 100_000_000;

type View = 'main' | 'send-select' | 'send-srx' | 'send-sntx' | 'receive' | 'history' | 'coming-soon';

export default function Dashboard() {
  const { address, clearWallet } = useWalletStore();
  const [srxBalance, setSrxBalance] = useState<number>(0);
  const [sntxBalance, setSntxBalance] = useState<number>(0);
  const [sntxDecimals, setSntxDecimals] = useState<number>(0);
  const [sntxSymbol, setSntxSymbol] = useState<string>('SNTX');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<View>('main');
  const [comingSoonLabel, setComingSoonLabel] = useState('');

  useEffect(() => {
    if (!SNTX_CONTRACT) return;
    getTokenInfo(SNTX_CONTRACT).then((info) => {
      setSntxDecimals(info.decimals);
      setSntxSymbol(info.symbol || 'SNTX');
    }).catch(() => { /* keep defaults */ });
  }, []);

  const fetchBalances = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const [addrInfo, tokenInfo] = await Promise.all([
        getAddressInfo(address).catch(() => null),
        SNTX_CONTRACT ? getTokenBalance(SNTX_CONTRACT, address).catch(() => null) : null,
      ]);
      setSrxBalance(addrInfo?.balance_sentri ?? Math.round((addrInfo?.balance_srx ?? 0) * SENTRI));
      setSntxBalance(tokenInfo?.balance ?? 0);
    } catch {
      toast.error('Failed to fetch balances');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { fetchBalances(); }, [fetchBalances]);

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success('Address copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const truncate = (s: string) => s.slice(0, 10) + '...' + s.slice(-6);
  const srxDisplay = (srxBalance / SENTRI).toLocaleString(undefined, { maximumFractionDigits: 4 });
  const sntxDisplay = formatAmount(sntxBalance, sntxDecimals);

  const openComingSoon = (label: string) => {
    setComingSoonLabel(label);
    setView('coming-soon');
  };

  if (view === 'send-select') {
    return (
      <AssetSelect
        onBack={() => setView('main')}
        onSelect={(a) => setView(a === 'srx' ? 'send-srx' : 'send-sntx')}
        srxBalance={srxBalance}
        sntxBalance={sntxBalance}
        sntxDecimals={sntxDecimals}
        sntxSymbol={sntxSymbol}
      />
    );
  }
  if (view === 'send-srx') return <SendSRX onBack={() => { setView('main'); fetchBalances(); }} />;
  if (view === 'send-sntx') return <SendSNTX onBack={() => { setView('main'); fetchBalances(); }} decimals={sntxDecimals} symbol={sntxSymbol} />;
  if (view === 'receive') return <Receive onBack={() => setView('main')} />;
  if (view === 'history') return <TxHistory onBack={() => setView('main')} />;
  if (view === 'coming-soon') return <ComingSoon feature={comingSoonLabel} onBack={() => setView('main')} />;

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ background: '#F8FAFC' }}>
      <div className="w-full max-w-sm space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>
            Sentrix<span style={{ color: '#10b981' }}>.</span>
          </h1>
          <div className="flex items-center gap-1">
            <button
              onClick={fetchBalances}
              disabled={loading}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
              style={{ background: '#F1F5F9' }}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} style={{ color: '#94A3B8' }} />
            </button>
            <button
              onClick={clearWallet}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
              style={{ background: '#F1F5F9' }}
            >
              <LogOut className="w-4 h-4" style={{ color: '#94A3B8' }} />
            </button>
          </div>
        </div>

        {/* Address */}
        <button
          onClick={copyAddress}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all active:scale-[0.98]"
          style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #E2E8F0' }}
        >
          <span className="text-sm font-mono" style={{ color: '#64748B' }}>
            {address ? truncate(address) : ''}
          </span>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: copied ? '#ECFDF5' : '#F1F5F9' }}>
            {copied ? <Check className="w-4 h-4" style={{ color: '#10b981' }} /> : <Copy className="w-4 h-4" style={{ color: '#94A3B8' }} />}
          </div>
        </button>

        {/* Total Balance */}
        <div
          className="rounded-3xl p-6 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #7c3aed 100%)', boxShadow: '0 12px 32px rgba(16,185,129,0.35)' }}
        >
          <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div className="relative z-10">
            <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Total Balance</p>
            <p className="text-white text-4xl font-extrabold mt-1 leading-tight">
              {loading ? '—' : srxDisplay}
            </p>
            <p className="text-white/80 text-sm mt-1 font-semibold">SRX</p>
          </div>
        </div>

        {/* Action Row */}
        <div className="grid grid-cols-5 gap-2">
          <ActionBtn icon={<Send className="w-4 h-4" />} label="Send" onClick={() => setView('send-select')} active />
          <ActionBtn icon={<Download className="w-4 h-4" />} label="Receive" onClick={() => setView('receive')} active />
          <ActionBtn icon={<ArrowLeftRight className="w-4 h-4" />} label="Swap" onClick={() => openComingSoon('Swap')} />
          <ActionBtn icon={<TrendingUp className="w-4 h-4" />} label="Stake" onClick={() => openComingSoon('Stake')} />
          <ActionBtn icon={<CreditCard className="w-4 h-4" />} label="Buy" onClick={() => openComingSoon('Buy')} />
        </div>

        {/* My Assets */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #E2E8F0' }}>
          <div className="px-5 py-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#64748B' }}>My Assets</h3>
          </div>
          <button
            onClick={() => setView('send-srx')}
            className="w-full flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-slate-50/50"
            style={{ borderBottom: '1px solid #F1F5F9' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white" style={{ background: 'linear-gradient(135deg, #10b981, #0d9488)' }}>S</div>
              <div className="text-left">
                <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>SRX</p>
                <p className="text-xs" style={{ color: '#94A3B8' }}>Sentrix Native</p>
              </div>
            </div>
            <p className="text-sm font-bold" style={{ color: '#0F172A' }}>{loading ? '—' : srxDisplay}</p>
          </button>
          <button
            onClick={() => setView('send-sntx')}
            className="w-full flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-slate-50/50"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>{sntxSymbol[0]}</div>
              <div className="text-left">
                <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>{sntxSymbol}</p>
                <p className="text-xs" style={{ color: '#94A3B8' }}>Sentrix Token</p>
              </div>
            </div>
            <p className="text-sm font-bold" style={{ color: '#0F172A' }}>{loading ? '—' : sntxDisplay}</p>
          </button>
        </div>

        {/* History */}
        <button
          onClick={() => setView('history')}
          className="w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] group"
          style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #E2E8F0' }}
        >
          <span className="text-sm font-semibold" style={{ color: '#64748B' }}>Transaction History</span>
          <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" style={{ color: '#CBD5E1' }} />
        </button>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, active }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl transition-all active:scale-95"
      style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #E2E8F0' }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{
          background: active ? 'linear-gradient(135deg, #10b981, #06b6d4)' : '#F1F5F9',
          color: active ? '#FFFFFF' : '#94A3B8',
          boxShadow: active ? '0 4px 12px rgba(16,185,129,0.3)' : 'none',
        }}
      >
        {icon}
      </div>
      <span className="text-[11px] font-semibold" style={{ color: active ? '#0F172A' : '#94A3B8' }}>{label}</span>
    </button>
  );
}
