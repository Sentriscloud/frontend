'use client';

import { useEffect, useState } from 'react';
import type { TxHistoryItem, FullTransaction } from '@/types';
import { getTransactionDetail, getFinalizedHeight } from '@/lib/api';
import { useSettingsStore } from '@/lib/store';
import { useEscape } from '@/lib/useEscape';
import { X, Copy, Check, ExternalLink, ArrowUpRight, ArrowDownLeft, Coins, Layers } from 'lucide-react';

const TOKEN_OP_ADDRESS = '0x0000000000000000000000000000000000000000';
const STAKING_ADDRESS = '0x0000000000000000000000000000000000000100';
const SENTRI = 100_000_000;

export default function TxDetail({
  tx,
  onClose,
  walletAddress,
}: {
  tx: TxHistoryItem;
  onClose: () => void;
  walletAddress: string | null;
}) {
  const [full, setFull] = useState<FullTransaction | null>(null);
  const [finalized, setFinalized] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const { hideBalances } = useSettingsStore();
  const mask = (s: string) => hideBalances ? '••••' : s;
  useEscape(true, onClose);

  useEffect(() => {
    getTransactionDetail(tx.txid).then(setFull).catch(() => {});
    getFinalizedHeight().then((fh) => setFinalized(fh.finalized_height ?? null)).catch(() => {});
  }, [tx.txid]);

  const isTokenOp = tx.to === TOKEN_OP_ADDRESS && tx.direction === 'out';
  const isStaking = tx.to.toLowerCase() === STAKING_ADDRESS;
  const isReward  = tx.direction === 'reward';
  const isOut     = tx.direction === 'out';

  const Icon  = isTokenOp ? Layers : isStaking ? Coins : isReward ? Coins : isOut ? ArrowUpRight : ArrowDownLeft;
  const tone  = isTokenOp ? 'gold' : isStaking ? 'gold' : isReward ? 'gold' : isOut ? 'red' : 'green';
  const label = isTokenOp ? 'Token operation' : isStaking ? 'Staking' : isReward ? 'Block reward' : isOut ? 'Sent' : 'Received';

  const blockHeight = full?.block_index ?? full?.block?.index ?? tx.block_index;
  const blockTimestamp = full?.block_timestamp ?? full?.block?.timestamp ?? tx.block_timestamp;
  const isFinalized = finalized !== null && blockHeight !== undefined && finalized >= blockHeight;

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const fmt = (sentri: number) => (sentri / SENTRI).toLocaleString(undefined, { maximumFractionDigits: 8 });

  // Decode StakingOp / TokenOp from data field
  let opLabel: string | null = null;
  if (full?.data) {
    try {
      const parsed = JSON.parse(full.data);
      if (parsed.op) {
        opLabel = String(parsed.op).replace(/_/g, ' ');
      }
    } catch { /* not JSON */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70">
      <div className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden bg-[var(--sf)] border border-[var(--brd)] animate-fade-up max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 sticky top-0 bg-[var(--sf)] z-10">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              tone === 'gold'  ? 'bg-[var(--gold-bg)]' :
              tone === 'red'   ? 'bg-[var(--red-bg)]'  :
                                  'bg-[var(--green-bg)]'
            }`}>
              <Icon className={`w-4 h-4 ${
                tone === 'gold'  ? 'text-[var(--gold)]' :
                tone === 'red'   ? 'text-[var(--red)]'  :
                                    'text-[var(--green)]'
              }`} />
            </span>
            <div className="min-w-0">
              <div className="eyebrow">Transaction</div>
              <h2 className="font-serif text-lg text-[var(--tx)] leading-tight">{label}</h2>
              {opLabel && (
                <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--gold)] mt-0.5 capitalize">
                  {opLabel}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--sf-2)] transition-colors -mr-1 shrink-0">
            <X className="w-4 h-4 text-[var(--tx-m)]" />
          </button>
        </div>

        {/* Amount hero */}
        <div className="px-5 pb-4">
          <div className={`text-3xl font-serif tab-num ${
            tone === 'gold'  ? 'text-[var(--gold)]' :
            tone === 'red'   ? 'text-[var(--red)]'  :
                                'text-[var(--green)]'
          }`}>
            {hideBalances ? '••••' : `${isOut || isTokenOp ? '−' : '+'}${fmt(isTokenOp ? tx.fee : tx.amount)}`}
          </div>
          <div className="text-xs font-mono text-[var(--tx-d)] mt-1">SRX</div>
        </div>

        {/* Status pill */}
        {blockHeight !== undefined && (
          <div className="px-5 pb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--bk-2)] border border-[var(--brd)]">
              <span className={`w-1.5 h-1.5 rounded-full ${isFinalized ? 'bg-[var(--green)]' : 'bg-[var(--gold)] animate-pulse-live'}`} />
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--tx-2)]">
                {isFinalized ? 'Finalized' : 'In block — confirming'}
              </span>
              <span className="text-[10px] font-mono text-[var(--tx-d)]">
                #{blockHeight.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Detail rows */}
        <div className="px-5 pb-5 space-y-4">
          <Field label="From"        value={tx.from}                    fullValue={tx.from}                    youAre={walletAddress}        copy={copy} copied={copied === 'from'} copyKey="from" />
          <Field label="To"          value={tx.to}                      fullValue={tx.to}                      youAre={walletAddress}        copy={copy} copied={copied === 'to'} copyKey="to" />
          <Field label="Amount"      value={`${mask(fmt(tx.amount))} SRX`}    mono />
          <Field label="Network fee" value={`${mask(fmt(tx.fee))} SRX`}       mono />
          {full && (
            <>
              <Field label="Nonce"     value={String(full.nonce)}          mono />
              <Field label="Chain ID"  value={String(full.chain_id)}        mono />
              <Field label="Timestamp" value={new Date((blockTimestamp ?? full.timestamp) * 1000).toLocaleString()} mono />
              <Field label="Txid"      value={tx.txid}                       fullValue={tx.txid} copy={copy} copied={copied === 'txid'} copyKey="txid" />
              {full.data && full.data.length > 0 && (
                <div>
                  <div className="eyebrow mb-1.5">Data</div>
                  <pre className="text-[10px] font-mono break-all whitespace-pre-wrap bg-[var(--bk-2)] border border-[var(--brd)] rounded-lg p-3 text-[var(--tx-2)] max-h-32 overflow-y-auto">
                    {(() => { try { return JSON.stringify(JSON.parse(full.data), null, 2); } catch { return full.data; } })()}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer link */}
        <div className="px-5 pb-5">
          <a
            href={`https://sentrix-api.sentriscloud.com/transactions/${tx.txid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider bg-[var(--bk-2)] border border-[var(--brd)] text-[var(--tx-m)] hover:text-[var(--gold)] hover:border-[var(--gold-bg-s)] transition-colors"
          >
            View raw on chain <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, value, fullValue, copy, copied, copyKey, mono, youAre,
}: {
  label: string;
  value: string;
  fullValue?: string;
  copy?: (text: string, key: string) => void;
  copied?: boolean;
  copyKey?: string;
  mono?: boolean;
  youAre?: string | null;
}) {
  const isYou = youAre && fullValue && fullValue.toLowerCase() === youAre.toLowerCase();
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="eyebrow">{label}</div>
        {copy && fullValue && copyKey && (
          <button onClick={() => copy(fullValue, copyKey)} className="text-[10px] font-mono uppercase tracking-wider flex items-center gap-1 text-[var(--gold)] hover:text-[var(--gold-l)] transition-colors">
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
      <p className={`text-xs break-all ${mono === false ? '' : 'font-mono'} text-[var(--tx)]`}>
        {value}
        {isYou && (
          <span className="ml-1.5 text-[9px] font-mono uppercase tracking-wider text-[var(--gold)] align-middle">
            (you)
          </span>
        )}
      </p>
    </div>
  );
}
