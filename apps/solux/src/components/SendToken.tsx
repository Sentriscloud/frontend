'use client';

import { useState, useEffect, useRef } from 'react';
import { useWalletStore, useAddressBookStore, useSettingsStore, useNonceStore, NETWORKS } from '@/lib/store';
import { NetworkBadge } from './SendSRX';
import {
  getNonce, sendTransaction, getTokenBalance, getTransactionDetail, getFinalizedHeight,
  getAddressInfo,
} from '@/lib/api';
import { signTransaction, isValidAddress } from '@/lib/crypto';
import { parseAmount as parseTokenAmount, formatAmount as formatTokenAmount, SENTRI, MIN_FEE, AmountOverflowError } from '@/lib/amount';
import { useEscape } from '@/lib/useEscape';
import type { TokenInfo } from '@/types';
import { ArrowLeft, Loader2, Check, Clipboard, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

const TOKEN_OP_ADDRESS = '0x0000000000000000000000000000000000000000';

type TxStatus = 'pending' | 'in-block' | 'finalized' | 'expired' | 'orphaned';

const PENDING_TIMEOUT_MS = 60 * 60 * 1000;

export default function SendToken({
  token, onBack,
}: {
  token: TokenInfo;
  onBack: () => void;
}) {
  const { address, privateKey, watchOnly } = useWalletStore();
  const { entries: addressBook } = useAddressBookStore();
  const { hideBalances, network } = useSettingsStore();
  const { bumpNonce, getLocalNext } = useNonceStore();
  const net = NETWORKS[network];
  const CHAIN_ID = net.chainId;
  const [toAddress, setToAddress] = useState('');
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [txid, setTxid] = useState('');
  const [txStatus, setTxStatus] = useState<TxStatus>('pending');
  const [txBlockHeight, setTxBlockHeight] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  // SRX balance — required to pay the MIN_FEE since SRC-20 transfers are
  // submitted as a regular tx whose `fee` field debits SRX, not the token.
  const [srxBalanceSentri, setSrxBalanceSentri] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const txNetworkRef = useRef<string | null>(null);

  useEscape(showConfirm, () => setShowConfirm(false));
  useEscape(showBookPicker, () => setShowBookPicker(false));

  useEffect(() => {
    if (!address) return;
    setTokenBalance(null);
    setSrxBalanceSentri(null);
    getTokenBalance(token.contract_address, address)
      .then((b) => setTokenBalance(b.balance))
      .catch(() => setTokenBalance(null));
    getAddressInfo(address)
      .then((info) => {
        const bal = info?.balance_sentri ?? Math.round((info?.balance_srx ?? 0) * SENTRI);
        setSrxBalanceSentri(bal);
      })
      .catch(() => setSrxBalanceSentri(null));
  }, [address, token.contract_address, network]);

  useEffect(() => {
    if (!txid) return;
    setTxStatus('pending');
    setTxBlockHeight(null);
    const startedAt = Date.now();
    const stopPolling = () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
    if (txNetworkRef.current && txNetworkRef.current !== network) {
      setTxStatus('orphaned');
      stopPolling();
      return;
    }
    txNetworkRef.current = network;
    const poll = async () => {
      if (Date.now() - startedAt > PENDING_TIMEOUT_MS) {
        setTxStatus((s) => s === 'pending' ? 'expired' : s);
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
          try {
            const fh = await getFinalizedHeight();
            if ((fh.finalized_height ?? 0) >= blockIdx) {
              setTxStatus('finalized');
              stopPolling();
            }
          } catch {}
        }
      } catch {}
    };
    poll();
    pollRef.current = setInterval(poll, 1500);
    return stopPolling;
  }, [txid, network]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setToAddress(text.trim());
    } catch {}
  };

  const loadMax = () => {
    if (tokenBalance === null) return;
    setAmount(formatTokenAmount(tokenBalance, token.decimals));
  };

  let amountRaw = 0;
  let amountError: string | null = null;
  if (amount) {
    try { amountRaw = parseTokenAmount(amount, token.decimals); }
    catch (e) { amountError = e instanceof AmountOverflowError ? e.message : 'Invalid amount'; }
  }
  const balanceDisplay = tokenBalance !== null
    ? (hideBalances ? '••••' : formatTokenAmount(tokenBalance, token.decimals))
    : '—';
  const feeDisplay = (MIN_FEE / SENTRI).toLocaleString(undefined, { maximumFractionDigits: 8 });

  const recipientLabel = (() => {
    if (!toAddress) return null;
    return addressBook.find((x) => x.address === toAddress.toLowerCase())?.label;
  })();

  const handleSend = () => {
    if (watchOnly) {
      toast.error('Watch-only wallet cannot send');
      return;
    }
    if (!address || !privateKey) return;
    if (!isValidAddress(toAddress)) { toast.error('Invalid recipient'); return; }
    if (toAddress.toLowerCase() === address.toLowerCase()) { toast.error('Cannot send to self'); return; }
    if (amountError) { toast.error(amountError, { duration: 6000 }); return; }
    if (!amountRaw || amountRaw <= 0) { toast.error('Enter a valid amount'); return; }
    if (tokenBalance !== null && amountRaw > tokenBalance) {
      toast.error(`Insufficient ${token.symbol}`);
      return;
    }
    if (srxBalanceSentri !== null && srxBalanceSentri < MIN_FEE) {
      toast.error(`Need ${(MIN_FEE / SENTRI).toLocaleString(undefined, { maximumFractionDigits: 8 })} SRX for fee`, { duration: 6000 });
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
      const nonce = localNext !== null && localNext > serverNonce ? localNext : serverNonce;
      const timestamp = Math.floor(Date.now() / 1000);
      const fromLower = address.toLowerCase();
      const tokenOp = {
        op: 'transfer',
        contract: token.contract_address,
        to: toAddress.toLowerCase(),
        amount: amountRaw,
      };
      const data = JSON.stringify(tokenOp);
      const payload = {
        from: fromLower, to: TOKEN_OP_ADDRESS, amount: 0, fee: MIN_FEE,
        nonce, data, timestamp, chain_id: CHAIN_ID,
      };
      const { signature, txid: computedTxid, public_key: publicKey } =
        await signTransaction(payload, privateKey);

      const result = await sendTransaction({
        txid: computedTxid, from_address: fromLower, to_address: TOKEN_OP_ADDRESS,
        amount: 0, fee: MIN_FEE, nonce, data, timestamp,
        chain_id: CHAIN_ID, signature, public_key: publicKey,
      });

      if (result.success) {
        bumpNonce(network, address, nonce);
        setTxid(computedTxid);
        toast.success(`${token.symbol} broadcast`);
        getTokenBalance(token.contract_address, address)
          .then((b) => setTokenBalance(b.balance))
          .catch(() => {});
      } else {
        toast.error(result.error || 'Transaction rejected', { duration: 8000 });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed', { duration: 8000 });
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setTxid(''); setToAddress(''); setAmount('');
    setTxStatus('pending'); setTxBlockHeight(null);
  };

  return (
    <div className="min-h-screen flex justify-center px-5 py-8">
      <div className="w-full max-w-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-2 mb-6 text-xs font-mono uppercase tracking-wider text-[var(--tx-m)] hover:text-[var(--tx)] transition-colors animate-fade-up"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <div className="mb-6 animate-fade-up delay-1">
          <div className="eyebrow">SRC-20 transfer</div>
          <h1 className="font-serif text-3xl text-[var(--tx)] mt-1">
            Send <span className="text-[var(--gold)]">{token.symbol}</span>
          </h1>
          <p className="text-xs font-mono text-[var(--tx-d)] mt-1.5 truncate">
            {token.contract_address}
          </p>
        </div>

        <div className="space-y-4 animate-fade-up delay-2">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="eyebrow">Recipient</label>
              {addressBook.length > 0 && (
                <button onClick={() => setShowBookPicker(true)} className="text-[10px] font-mono uppercase tracking-wider text-[var(--gold)] hover:text-[var(--gold-l)] flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> Book
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
              <button onClick={handlePaste} aria-label="Paste" className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md flex items-center justify-center bg-[var(--sf-2)] hover:bg-[var(--sf-3)] transition-colors">
                <Clipboard className="w-3.5 h-3.5 text-[var(--tx-m)]" />
              </button>
            </div>
            {recipientLabel && (
              <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--gold)] mt-1.5">↳ {recipientLabel}</p>
            )}
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label className="eyebrow">Amount</label>
              <span className="text-[10px] font-mono text-[var(--tx-d)]">
                Balance <span className="text-[var(--gold)]">{balanceDisplay}</span> {token.symbol}
              </span>
            </div>
            <div className="relative">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                type="text"
                inputMode="decimal"
                className="w-full rounded-lg p-3.5 pr-16 text-base font-mono bg-[var(--sf)] border border-[var(--brd)] text-[var(--tx)] placeholder:text-[var(--tx-d)] focus:outline-none focus:border-[var(--gold-d)] transition-colors"
              />
              <button onClick={loadMax} className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono uppercase tracking-wider px-2.5 py-1.5 rounded-md bg-[var(--gold-bg)] border border-[var(--gold-bg-s)] text-[var(--gold)] hover:bg-[var(--gold-bg-s)] transition-colors">
                Max
              </button>
            </div>
          </div>

          <div className="rounded-lg bg-[var(--bk-2)] border border-[var(--brd)] divide-y divide-[var(--brd)]">
            <div className="flex justify-between items-baseline px-4 py-2.5">
              <span className="text-[11px] text-[var(--tx-m)]">Network fee</span>
              <span className="text-xs font-mono text-[var(--tx-2)] tab-num">{feeDisplay} SRX</span>
            </div>
          </div>

          {txid ? (
            <div className="space-y-3">
              {(() => {
                const error = txStatus === 'expired' || txStatus === 'orphaned';
                return (
                  <div className={`rounded-lg p-4 ${
                    error
                      ? 'bg-[var(--red-bg)] border border-[var(--red)]/30'
                      : 'bg-[var(--gold-bg)] border border-[var(--gold-bg-s)]'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        txStatus === 'finalized' ? 'bg-[var(--gold)]' :
                        error                    ? 'bg-[var(--red)]'  :
                                                    'bg-[var(--gold-bg-s)]'
                      }`}>
                        {txStatus === 'finalized'
                          ? <Check className="w-3 h-3 text-[var(--bk)]" />
                          : error
                            ? <span className="text-[10px] font-bold text-white">!</span>
                            : <span className="w-2 h-2 rounded-full bg-[var(--gold)] animate-pulse-live" />}
                      </div>
                      <span className={`text-xs font-mono uppercase tracking-wider ${
                        error ? 'text-[var(--red)]' : 'text-[var(--gold)]'
                      }`}>
                        {txStatus === 'orphaned' ? 'Network changed — pinned to previous chain' :
                         txStatus === 'expired'  ? 'Expired — never landed in a block' :
                         txStatus === 'pending'  ? 'Broadcast — awaiting block' :
                         txStatus === 'in-block' ? `In block #${txBlockHeight} — confirming` :
                                                    `Finalized at block #${txBlockHeight}`}
                      </span>
                    </div>
                    {txStatus === 'expired' && (
                      <p className="text-[11px] text-[var(--tx-2)] mb-2 leading-relaxed">
                        The chain dropped this from the mempool after one hour. Submit a new transaction to retry.
                      </p>
                    )}
                    {txStatus === 'orphaned' && (
                      <p className="text-[11px] text-[var(--tx-2)] mb-2 leading-relaxed">
                        Switch back to verify status, or submit a fresh transaction here.
                      </p>
                    )}
                    <p className={`text-[11px] font-mono break-all ${
                      error ? 'text-[var(--red)]' : 'text-[var(--gold-l)]'
                    }`}>
                      {txid.slice(0, 22)}…{txid.slice(-10)}
                    </p>
                  </div>
                );
              })()}
              <button onClick={resetForm} className="w-full py-3 rounded-lg text-sm font-medium bg-[var(--sf)] border border-[var(--brd)] text-[var(--tx-2)] hover:bg-[var(--sf-2)] transition-colors active:scale-[0.99]">
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
          <div className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden bg-[var(--sf)] border border-[var(--brd)] animate-fade-up">
            <div className="px-5 pt-5 pb-2">
              <div className="eyebrow mb-1">Confirm</div>
              <h3 className="font-serif text-xl text-[var(--tx)]">Review &amp; sign</h3>
            </div>
            <div className="px-5 pb-5 space-y-3">
              <NetworkBadge network={network} chainId={CHAIN_ID} label={net.label} accent={net.accent} />
              <div>
                <div className="eyebrow mb-1">To</div>
                <p className="text-xs font-mono break-all text-[var(--tx)]">{toAddress}</p>
                {recipientLabel && (
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--gold)] mt-1">{recipientLabel}</p>
                )}
              </div>
              <div className="rounded-lg bg-[var(--bk-2)] border border-[var(--brd)] divide-y divide-[var(--brd)]">
                <div className="flex justify-between items-baseline px-4 py-2.5">
                  <span className="text-[11px] uppercase tracking-wider font-mono text-[var(--tx-m)]">Amount</span>
                  <span className="text-xs font-mono tab-num text-[var(--tx-2)]">{amount} {token.symbol}</span>
                </div>
                <div className="flex justify-between items-baseline px-4 py-2.5">
                  <span className="text-[11px] uppercase tracking-wider font-mono text-[var(--tx-m)]">Fee</span>
                  <span className="text-xs font-mono tab-num text-[var(--tx-2)]">{feeDisplay} SRX</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 rounded-lg text-sm font-medium bg-[var(--bk-2)] border border-[var(--brd)] text-[var(--tx-2)] hover:bg-[var(--sf-2)] transition-colors active:scale-[0.99]">
                Cancel
              </button>
              <button onClick={handleConfirmedSend} className="flex-1 py-3 rounded-lg text-sm font-semibold bg-[var(--gold)] text-[var(--bk)] hover:bg-[var(--gold-l)] transition-colors active:scale-[0.99]">
                Confirm &amp; sign
              </button>
            </div>
          </div>
        </div>
      )}

      {showBookPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70">
          <div className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden bg-[var(--sf)] border border-[var(--brd)] animate-fade-up max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <div className="eyebrow">Address book</div>
                <h2 className="font-serif text-lg text-[var(--tx)]">Pick recipient</h2>
              </div>
              <button onClick={() => setShowBookPicker(false)} className="text-[10px] font-mono uppercase tracking-wider text-[var(--tx-m)]">Close</button>
            </div>
            <div className="divide-y divide-[var(--brd)]">
              {addressBook.map((e) => (
                <button key={e.address} onClick={() => { setToAddress(e.address); setShowBookPicker(false); }} className="w-full text-left px-5 py-3 hover:bg-[var(--sf-2)]">
                  <p className="text-sm text-[var(--tx)]">{e.label}</p>
                  <p className="text-[11px] font-mono text-[var(--tx-d)] mt-0.5 truncate">{e.address}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
