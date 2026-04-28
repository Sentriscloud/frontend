'use client';

import { useState, useEffect, useRef } from 'react';
import { useWalletStore, useAddressBookStore, useSettingsStore, useNonceStore, useNotificationStore, NETWORKS } from '@/lib/store';
import {
  getAddressInfo, getNonce, sendTransaction, getTransactionDetail, getFinalizedHeight,
} from '@/lib/api';
import { signTransaction, isValidAddress } from '@/lib/crypto';
import { parseSRXToSentri, sentriToSRX, SENTRI, MIN_FEE, AmountOverflowError } from '@/lib/amount';
import { useEscape } from '@/lib/useEscape';
import { ArrowLeft, Loader2, Check, Copy, Clipboard, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

type TxStatus = 'pending' | 'in-block' | 'finalized' | 'expired' | 'orphaned';

// Match chain MEMPOOL_MAX_AGE_SECS (1h). After this, the chain has dropped
// the tx from mempool and it will not be included. Stop polling.
const PENDING_TIMEOUT_MS = 60 * 60 * 1000;

export default function SendSRX({ onBack }: { onBack: () => void }) {
  const { address, privateKey, watchOnly } = useWalletStore();
  const { entries: addressBook } = useAddressBookStore();
  const { hideBalances, network } = useSettingsStore();
  const { bumpNonce, getLocalNext } = useNonceStore();
  const { push: pushNotif, update: updateNotif } = useNotificationStore();
  const notifIdRef = useRef<string | null>(null);
  const net = NETWORKS[network];
  const CHAIN_ID = net.chainId;
  const [toAddress, setToAddress] = useState('');
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [txid, setTxid] = useState('');
  const [txStatus, setTxStatus] = useState<TxStatus>('pending');
  const [txBlockHeight, setTxBlockHeight] = useState<number | null>(null);
  const [txCopied, setTxCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [balanceSentri, setBalanceSentri] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Pin the network the tx was broadcast on. If user switches mid-tracking,
  // we mark as orphaned (can't poll the new network for an old txid).
  const txNetworkRef = useRef<string | null>(null);
  // Snapshot of amountSentri at broadcast — used by the finalize notification
  // so it shows the correct amount even after resetForm clears `amount` state.
  const broadcastAmountRef = useRef<number>(0);

  useEscape(showConfirm, () => setShowConfirm(false));
  useEscape(showBookPicker, () => setShowBookPicker(false));

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    setBalanceSentri(null); // reset so stale balance from prev network doesn't flash
    getAddressInfo(address)
      .then((info) => {
        if (cancelled) return;
        const bal = info?.balance_sentri ?? Math.round((info?.balance_srx ?? 0) * SENTRI);
        setBalanceSentri(bal);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [address, network]);

  // ── Pending tx tracker — poll until in block + finalized ─────────────
  useEffect(() => {
    if (!txid) return;
    setTxStatus('pending');
    setTxBlockHeight(null);

    const startedAt = Date.now();
    const stopPolling = () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };

    // If user switched network while a tx was tracking, the new API won't
    // know about the old txid. Mark orphaned so we stop confusing them.
    if (txNetworkRef.current && txNetworkRef.current !== network) {
      setTxStatus('orphaned');
      stopPolling();
      return;
    }
    txNetworkRef.current = network;

    const poll = async () => {
      if (Date.now() - startedAt > PENDING_TIMEOUT_MS) {
        setTxStatus((s) => s === 'pending' ? 'expired' : s);
        if (address && notifIdRef.current) {
          updateNotif(address, notifIdRef.current, {
            kind: 'tx-expired',
            title: 'Transaction expired',
            body: 'Never landed in a block — your nonce did not advance',
            read: false,
          });
        }
        stopPolling();
        return;
      }
      try {
        const detail = await getTransactionDetail(txid);
        if (!detail) return;
        const blockIdx = detail.block_index ?? detail.block?.index;
        if (typeof blockIdx === 'number') {
          setTxBlockHeight(blockIdx);
          setTxStatus('in-block');
          if (address && notifIdRef.current) {
            updateNotif(address, notifIdRef.current, {
              kind: 'tx-confirmed',
              title: `In block #${blockIdx.toLocaleString()}`,
              blockHeight: blockIdx,
            });
          }
          try {
            const fh = await getFinalizedHeight();
            if ((fh.finalized_height ?? 0) >= blockIdx) {
              setTxStatus('finalized');
              if (address && notifIdRef.current) {
                updateNotif(address, notifIdRef.current, {
                  kind: 'tx-finalized',
                  title: `Sent ${sentriToSRX(broadcastAmountRef.current)} SRX`,
                  body: `Finalized at block #${blockIdx.toLocaleString()}`,
                  read: false,
                });
              }
              stopPolling();
            }
          } catch { /* keep polling */ }
        }
      } catch { /* keep polling */ }
    };

    poll();
    pollRef.current = setInterval(poll, 1500);
    return stopPolling;
  }, [txid, network]);

  const loadMax = () => {
    if (balanceSentri === null) return;
    const maxSentri = Math.max(0, balanceSentri - MIN_FEE);
    if (maxSentri > 0) setAmount(sentriToSRX(maxSentri));
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setToAddress(text.trim());
    } catch { /* no clipboard access */ }
  };

  const copyTxid = () => {
    navigator.clipboard.writeText(txid);
    setTxCopied(true);
    setTimeout(() => setTxCopied(false), 2000);
  };

  const feeDisplay     = sentriToSRX(MIN_FEE);
  let amountSentri = 0;
  let amountError: string | null = null;
  if (amount) {
    try { amountSentri = parseSRXToSentri(amount); }
    catch (e) { amountError = e instanceof AmountOverflowError ? e.message : 'Invalid amount'; }
  }
  const totalDisplay   = amountSentri > 0 ? sentriToSRX(amountSentri + MIN_FEE) : '0';
  const balanceDisplay = balanceSentri !== null
    ? (hideBalances ? '••••' : sentriToSRX(balanceSentri))
    : '—';

  const resetForm = () => {
    setTxid('');
    setToAddress('');
    setAmount('');
    setTxStatus('pending');
    setTxBlockHeight(null);
  };

  const handleSend = () => {
    if (watchOnly) {
      toast.error('Watch-only wallet cannot send');
      return;
    }
    if (!address || !privateKey) return;
    if (!isValidAddress(toAddress)) {
      toast.error('Invalid recipient address');
      return;
    }
    if (toAddress.toLowerCase() === address.toLowerCase()) {
      toast.error('Cannot send to your own address');
      return;
    }
    if (amountError) {
      toast.error(amountError, { duration: 6000 });
      return;
    }
    if (isNaN(amountSentri) || amountSentri <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (balanceSentri !== null && amountSentri + MIN_FEE > balanceSentri) {
      toast.error(
        `Insufficient balance. Have ${sentriToSRX(balanceSentri)} SRX, need ${sentriToSRX(amountSentri + MIN_FEE)} SRX (incl. fee)`,
        { duration: 6000 },
      );
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmedSend = async () => {
    if (!address || !privateKey) return;
    setShowConfirm(false);
    setSending(true);
    try {
      const serverNonce = await getNonce(address);
      const localNext = getLocalNext(network, address);
      // Use whichever is higher: trust on-chain nonce by default, but if we
      // have a more recent local pending, jump ahead to avoid InvalidNonce.
      const nonce = localNext !== null && localNext > serverNonce ? localNext : serverNonce;
      const timestamp = Math.floor(Date.now() / 1000);

      const toLower = toAddress.toLowerCase();
      const fromLower = address.toLowerCase();

      const payload = {
        from: fromLower, to: toLower, amount: amountSentri, fee: MIN_FEE,
        nonce, data: '', timestamp, chain_id: CHAIN_ID,
      };

      const { signature, txid: computedTxid, public_key: publicKey } =
        await signTransaction(payload, privateKey);

      const result = await sendTransaction({
        txid: computedTxid, from_address: fromLower, to_address: toLower,
        amount: amountSentri, fee: MIN_FEE, nonce, data: '', timestamp,
        chain_id: CHAIN_ID, signature, public_key: publicKey,
      });

      if (result.success) {
        bumpNonce(network, address, nonce);
        broadcastAmountRef.current = amountSentri;
        setTxid(computedTxid);
        toast.success('Transaction broadcast');
        notifIdRef.current = pushNotif(address, {
          kind: 'tx-broadcast',
          title: `Sending ${sentriToSRX(amountSentri)} SRX`,
          body: `To ${toLower.slice(0, 6)}…${toLower.slice(-4)}`,
          amount: amountSentri,
          txid: computedTxid,
        });
        getAddressInfo(address)
          .then((info) => {
            const bal = info?.balance_sentri ?? Math.round((info?.balance_srx ?? 0) * SENTRI);
            setBalanceSentri(bal);
          })
          .catch(() => {});
      } else {
        toast.error(result.error || 'Transaction rejected', { duration: 8000 });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send', { duration: 8000 });
    } finally {
      setSending(false);
    }
  };

  const recipientLabel = (() => {
    if (!toAddress) return null;
    const e = addressBook.find((x) => x.address === toAddress.toLowerCase());
    return e?.label;
  })();

  return (
    <div className="min-h-screen flex justify-center px-5 py-8">
      <div className="w-full max-w-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 mb-6 text-[13px] text-[var(--tx-m)] hover:text-[var(--tx)] transition-colors animate-fade-up"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-[22px] font-bold text-[var(--tx)] mb-6 animate-fade-up delay-1">
          Send SRX
        </h1>

        <div className="space-y-4 animate-fade-up delay-2">
          {/* Recipient */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[13px] font-medium text-[var(--tx-2)]">Recipient</label>
              {addressBook.length > 0 && (
                <button
                  onClick={() => setShowBookPicker(true)}
                  className="text-[12px] font-medium text-[var(--gold)] hover:text-[var(--gold-l)] transition-colors flex items-center gap-1"
                >
                  <BookOpen className="w-3.5 h-3.5" /> Address book
                </button>
              )}
            </div>
            <div className="relative">
              <input
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                placeholder="0x…"
                className="w-full rounded-lg p-3.5 pr-12 text-sm font-mono bg-[var(--sf)] border border-[var(--brd)] text-[var(--tx)] placeholder:text-[var(--tx-d)] focus:outline-none focus:border-[var(--gold-d)] transition-colors"
              />
              <button
                onClick={handlePaste}
                aria-label="Paste from clipboard"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md flex items-center justify-center bg-[var(--sf-2)] hover:bg-[var(--sf-3)] transition-colors"
              >
                <Clipboard className="w-3.5 h-3.5 text-[var(--tx-m)]" />
              </button>
            </div>
            {recipientLabel && (
              <p className="text-[12px] text-[var(--gold)] mt-1.5 font-medium">
                ↳ {recipientLabel}
              </p>
            )}
          </div>

          {/* Amount */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label className="text-[13px] font-medium text-[var(--tx-2)]">Amount</label>
              <span className="text-[12px] text-[var(--tx-m)]">
                Balance <span className="text-[var(--gold)] font-medium">{balanceDisplay}</span> SRX
              </span>
            </div>
            <div className="relative">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                type="text"
                inputMode="decimal"
                className="w-full rounded-xl p-4 pr-16 text-[16px] font-mono bg-[var(--sf)] border border-[var(--brd)] text-[var(--tx)] placeholder:text-[var(--tx-d)] focus:outline-none focus:border-[var(--gold-d)] transition-colors"
              />
              <button
                onClick={loadMax}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-[var(--gold-bg)] text-[var(--gold)] hover:bg-[var(--gold-bg-s)] transition-colors"
              >
                Max
              </button>
            </div>
          </div>

          {/* Fee / total */}
          <div className="rounded-xl bg-[var(--sf)] border border-[var(--brd)] divide-y divide-[var(--brd)]">
            <div className="flex justify-between items-baseline px-4 py-3">
              <span className="text-[13px] text-[var(--tx-m)]">Network fee</span>
              <span className="text-[13px] font-mono text-[var(--tx-2)] tab-num">{feeDisplay} SRX</span>
            </div>
            <div className="flex justify-between items-baseline px-4 py-3">
              <span className="text-[13px] font-medium text-[var(--tx-2)]">Total</span>
              <span className="text-[15px] font-mono font-semibold text-[var(--tx)] tab-num">{totalDisplay} SRX</span>
            </div>
          </div>

          {/* CTA / pending tracker */}
          {txid ? (
            <div className="space-y-3">
              <PendingTracker
                txid={txid}
                status={txStatus}
                blockHeight={txBlockHeight}
                onCopy={copyTxid}
                copied={txCopied}
              />
              <button
                onClick={resetForm}
                className="w-full py-3 rounded-lg text-sm font-medium bg-[var(--sf)] border border-[var(--brd)] text-[var(--tx-2)] hover:bg-[var(--sf-2)] transition-colors active:scale-[0.99]"
              >
                Send another
              </button>
            </div>
          ) : (
            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full py-3.5 rounded-lg text-sm font-semibold bg-[var(--gold)] text-[var(--bk)] hover:bg-[var(--gold-l)] transition-colors active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing & broadcasting…</> : 'Review transaction'}
            </button>
          )}
        </div>
      </div>

      {/* Confirm sheet */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70">
          <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden bg-[var(--sf)] border border-[var(--brd)] animate-fade-up">
            <div className="px-6 pt-6 pb-3">
              <p className="text-[12px] font-medium text-[var(--tx-m)] mb-1">Confirm</p>
              <h3 className="text-[20px] font-bold text-[var(--tx)] tracking-tight">Review &amp; sign</h3>
            </div>
            <div className="px-6 pb-5 space-y-4">
              <NetworkBadge network={network} chainId={CHAIN_ID} label={net.label} accent={net.accent} />
              <div>
                <p className="text-[12px] font-medium text-[var(--tx-m)] mb-1.5">Sending to</p>
                <p className="text-[13px] font-mono break-all text-[var(--tx)]">{toAddress}</p>
                {recipientLabel && (
                  <p className="text-[12px] font-medium text-[var(--gold)] mt-1.5">↳ {recipientLabel}</p>
                )}
              </div>
              <div className="rounded-xl bg-[var(--bk-2)] border border-[var(--brd)] divide-y divide-[var(--brd)]">
                <Row label="Amount" value={`${amount} SRX`} />
                <Row label="Network fee" value={`${feeDisplay} SRX`} />
                <Row label="Total" value={`${totalDisplay} SRX`} bold />
              </div>
            </div>
            <div className="flex gap-2 px-6 pb-6">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3.5 rounded-xl text-[14px] font-semibold bg-[var(--bk-2)] border border-[var(--brd)] text-[var(--tx-2)] hover:bg-[var(--sf-2)] transition-colors active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmedSend}
                className="flex-1 py-3.5 rounded-xl text-[14px] font-semibold bg-[var(--gold)] text-[#3a2a0e] hover:bg-[var(--gold-l)] transition-colors active:scale-[0.98]"
              >
                Confirm &amp; sign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Address book picker */}
      {showBookPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70">
          <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden bg-[var(--sf)] border border-[var(--brd)] animate-fade-up max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-3">
              <h2 className="text-[20px] font-bold text-[var(--tx)] tracking-tight">Pick recipient</h2>
              <button
                onClick={() => setShowBookPicker(false)}
                className="text-[13px] font-medium text-[var(--tx-m)] hover:text-[var(--tx)] transition-colors"
              >
                Close
              </button>
            </div>
            <div className="divide-y divide-[var(--brd)]">
              {addressBook.map((e) => (
                <button
                  key={e.address}
                  onClick={() => { setToAddress(e.address); setShowBookPicker(false); }}
                  className="w-full text-left px-6 py-3.5 hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                >
                  <p className="text-[14px] font-semibold text-[var(--tx)]">{e.label}</p>
                  <p className="text-[12px] font-mono text-[var(--tx-m)] mt-0.5 truncate">{e.address}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PendingTracker({
  txid, status, blockHeight, onCopy, copied,
}: {
  txid: string; status: TxStatus; blockHeight: number | null; onCopy: () => void; copied: boolean;
}) {
  const phases: Array<{ key: 'pending' | 'in-block' | 'finalized'; label: string }> = [
    { key: 'pending',    label: 'Broadcast' },
    { key: 'in-block',   label: 'In block' },
    { key: 'finalized',  label: 'Finalized' },
  ];
  const currentIdx = phases.findIndex((p) => p.key === status);
  const expired = status === 'expired';
  const orphaned = status === 'orphaned';
  const error = expired || orphaned;

  const containerClass = error
    ? 'rounded-2xl p-5 bg-[var(--red-bg)] border border-[var(--red)]/30'
    : 'rounded-2xl p-5 bg-[var(--gold-bg)] border border-[var(--gold-bg-s)]';
  const accent = error ? 'text-[var(--red)]' : 'text-[var(--gold)]';
  const accentLight = error ? 'text-[var(--red)]' : 'text-[var(--gold-l)]';

  return (
    <div className={containerClass}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
          status === 'finalized' ? 'bg-[var(--gold)]' :
          error                  ? 'bg-[var(--red)]' :
                                    'bg-[var(--gold-bg-s)]'
        }`}>
          {status === 'finalized'
            ? <Check className="w-3.5 h-3.5 text-[#3a2a0e]" strokeWidth={3} />
            : error
              ? <span className="text-[12px] font-bold text-white">!</span>
              : <span className="w-2 h-2 rounded-full bg-[var(--gold)] animate-pulse-live" />}
        </div>
        <span className={`text-[13px] font-semibold ${accent}`}>
          {orphaned               ? 'Network changed' :
           expired                ? 'Expired — never landed' :
           status === 'pending'   ? 'Broadcast — awaiting block' :
           status === 'in-block'  ? `In block #${blockHeight}` :
                                    `Finalized at block #${blockHeight}`}
        </span>
      </div>

      {!error && (
        <div className="flex items-center gap-2 mb-4">
          {phases.map((p, i) => (
            <div key={p.key} className="flex-1 flex flex-col gap-1.5">
              <div className={`h-1.5 rounded-full transition-colors ${
                i <= currentIdx ? 'bg-[var(--gold)]' : 'bg-[var(--sf-3)]'
              }`} />
              <span className={`text-[10px] font-medium text-center ${
                i <= currentIdx ? 'text-[var(--gold-l)]' : 'text-[var(--tx-d)]'
              }`}>
                {p.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {expired && (
        <p className="text-[12px] text-[var(--tx-2)] mb-3 leading-relaxed">
          The chain dropped this transaction from the mempool after one hour. Submit a new transaction with the same details to retry — your nonce hasn&apos;t advanced.
        </p>
      )}

      {orphaned && (
        <p className="text-[12px] text-[var(--tx-2)] mb-3 leading-relaxed">
          You switched network while this transaction was tracking. Switch back to the previous chain to verify its status.
        </p>
      )}

      <button onClick={onCopy} className={`flex items-center gap-1.5 text-[12px] font-mono break-all hover:opacity-80 transition-opacity ${accentLight}`}>
        <span className="break-all">{txid.slice(0, 16)}…{txid.slice(-8)}</span>
        {copied ? <Check className="w-3.5 h-3.5 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
      </button>
    </div>
  );
}

export function NetworkBadge({ network, chainId, label, accent }: {
  network: string; chainId: number; label: string; accent: 'gold' | 'teal';
}) {
  const tealClass = 'bg-[rgba(45,212,191,0.10)] border-[rgba(45,212,191,0.3)] text-[#5eead4]';
  const goldClass = 'bg-[var(--gold-bg)] border-[var(--gold-bg-s)] text-[var(--gold)]';
  return (
    <div className={`rounded-lg p-3 flex items-center gap-2 border ${accent === 'teal' ? tealClass : goldClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${accent === 'teal' ? 'bg-[#2dd4bf]' : 'bg-[var(--gold)]'} animate-pulse-live`} />
      <span className="text-[11px] font-mono uppercase tracking-wider">
        Signing on <span className="font-bold">{label}</span>
      </span>
      <span className="ml-auto text-[10px] font-mono opacity-70 tab-num">
        Chain {chainId}
      </span>
      <span className="sr-only">{network}</span>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-baseline px-4 py-2.5">
      <span className="text-[11px] uppercase tracking-wider font-mono text-[var(--tx-m)]">{label}</span>
      <span className={`font-mono tab-num ${bold ? 'text-sm text-[var(--tx)]' : 'text-xs text-[var(--tx-2)]'}`}>
        {value}
      </span>
    </div>
  );
}
