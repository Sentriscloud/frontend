'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useWalletStore, useSettingsStore, useNonceStore, NETWORKS } from '@/lib/store';
import {
  getStakingValidators, getDelegations, getUnbonding, getNonce,
  sendTransaction, getAddressInfo, getTransactionDetail, getFinalizedHeight,
} from '@/lib/api';
import { signTransaction } from '@/lib/crypto';
import { parseSRXToSentri, sentriToSRX, formatCompactSRX, SENTRI, MIN_FEE, AmountOverflowError } from '@/lib/amount';
import { useEscape } from '@/lib/useEscape';
import { useLatestFinalized } from '@/lib/ws';

function deriveWsUrl(apiUrl: string): string {
  const u = new URL(apiUrl);
  const host = u.host.replace(/^api\./, 'rpc.').replace(/^testnet-api\./, 'testnet-rpc.');
  return `wss://${host}/ws`;
}
import type { StakingValidator, Delegation, UnbondingEntry } from '@/types';
import {
  ArrowLeft, Coins, TrendingUp, Lock, Loader2, Check, X, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const STAKING_ADDRESS = '0x0000000000000000000000000000000000000100';
const PENDING_TIMEOUT_MS = 60 * 60 * 1000;

// Module-scope cache for staking data per address+network. Same pattern as
// TxHistory.tsx + Dashboard.tsx — keeps validators / delegations / unbonding
// visible across refetch on transient API errors. 2026-05-07: closes
// "staking page kadang kosong" — fetchAll was setting all three lists to
// [] when ANY of the four parallel fetches errored, leaving the page
// empty during chain recovery windows.
type StakingCache = {
  validators: StakingValidator[];
  delegations: Delegation[];
  unbonding: UnbondingEntry[];
};
const stakingCache = new Map<string, StakingCache>();

type TxStatus = 'pending' | 'in-block' | 'finalized' | 'expired' | 'orphaned';

interface PendingTx {
  txid: string;
  label: string;
  status: TxStatus;
  blockHeight: number | null;
  startedAt: number;
}

type Sheet =
  | { kind: 'none' }
  | { kind: 'delegate'; validator: StakingValidator }
  | { kind: 'undelegate'; validator: StakingValidator; current: number };

export default function Staking({ onBack, inline = false }: { onBack?: () => void; inline?: boolean }) {
  const { address, privateKey, watchOnly } = useWalletStore();
  const { hideBalances, network } = useSettingsStore();
  const { bumpNonce, getLocalNext } = useNonceStore();
  const net = NETWORKS[network];
  const CHAIN_ID = net.chainId;
  const mask = (s: string) => hideBalances ? '••••' : s;

  const [validators, setValidators] = useState<StakingValidator[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [unbonding, setUnbonding] = useState<UnbondingEntry[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<Sheet>({ kind: 'none' });
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingTx | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const txNetworkRef = useRef<string | null>(null);
  // WS subscription to sentrix_finalized — see SendToken.tsx for the
  // same pattern. Once a staking tx is in a block, the WS event flips
  // status to 'finalized' instantly without waiting for the 1.5s tick.
  const wsFinalized = useLatestFinalized(deriveWsUrl(net.apiUrl));

  const fetchAll = useCallback(async () => {
    if (!address) return;
    const cacheKey = `${network}-${address}`;
    const cached = stakingCache.get(cacheKey);

    // Show cached data immediately if available — no flash to empty
    // during refetch. Cache miss → render starts empty (existing
    // initial state).
    if (cached !== undefined) {
      setValidators(cached.validators);
      setDelegations(cached.delegations);
      setUnbonding(cached.unbonding);
    }
    setLoading(true);
    try {
      const [v, d, u, info] = await Promise.all([
        getStakingValidators().catch(() => null),
        getDelegations(address).catch(() => null),
        getUnbonding(address).catch(() => null),
        getAddressInfo(address).catch(() => null),
      ]);
      // Only overwrite each list when its fetch actually succeeded —
      // otherwise keep the cached/previous value so a transient API
      // error during chain recovery doesn't blank the page.
      const newValidators = v?.validators;
      const newDelegations = d?.delegations;
      const newUnbonding = u?.unbonding;

      if (newValidators !== undefined) setValidators(newValidators);
      if (newDelegations !== undefined) setDelegations(newDelegations);
      if (newUnbonding !== undefined) setUnbonding(newUnbonding);
      setBalance(info?.balance_sentri ?? Math.round((info?.balance_srx ?? 0) * SENTRI));

      // Update cache with the most recent state we've shown — combines
      // freshly-fetched (if success) with cached (if fetch failed for that
      // particular endpoint) so partial-success refresh still caches.
      stakingCache.set(cacheKey, {
        validators: newValidators ?? cached?.validators ?? [],
        delegations: newDelegations ?? cached?.delegations ?? [],
        unbonding: newUnbonding ?? cached?.unbonding ?? [],
      });
    } finally {
      setLoading(false);
    }
  }, [address, network]);

  // fetchAll resets stale state synchronously before async fetch — same
  // pattern as Dashboard. Lint suppression is for that intentional reset.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchAll(); }, [fetchAll, network]);

  // ── Pending tx tracker — polls until finalized or expires ────────────
  // Capture pending.txid + pending.startedAt as effect-scoped locals so
  // exhaustive-deps stays clean without re-firing on every status flip
  // (which would restart the poll mid-flight and lose the in-block
  // state). The effect re-fires only when a NEW pending tx starts.
  const pendingTxid = pending?.txid;
  const pendingStartedAt = pending?.startedAt;
  useEffect(() => {
    if (!pendingTxid || pendingStartedAt === undefined) return;
    const stopPolling = () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };

    if (txNetworkRef.current && txNetworkRef.current !== network) {
      setPending((p) => (p ? { ...p, status: 'orphaned' } : p));
      stopPolling();
      return;
    }
    txNetworkRef.current = network;

    const poll = async () => {
      if (Date.now() - pendingStartedAt > PENDING_TIMEOUT_MS) {
        setPending((p) => (p && p.status === 'pending' ? { ...p, status: 'expired' } : p));
        stopPolling();
        return;
      }
      try {
        const detail = await getTransactionDetail(pendingTxid);
        if (!detail) return;
        const blockIdx = detail.block_index ?? detail.block?.index;
        if (typeof blockIdx === 'number') {
          setPending((p) => (p ? { ...p, status: 'in-block', blockHeight: blockIdx } : p));
          // Refresh staking data once tx hits a block (apply has run)
          fetchAll();
          try {
            const fh = await getFinalizedHeight();
            if ((fh.finalized_height ?? 0) >= blockIdx) {
              setPending((p) => (p ? { ...p, status: 'finalized' } : p));
              stopPolling();
              // Auto-dismiss banner after a short pause so user notices it
              setTimeout(() => setPending(null), 4000);
            }
          } catch { /* keep polling */ }
        }
      } catch { /* keep polling */ }
    };

    poll();
    pollRef.current = setInterval(poll, 1500);
    return stopPolling;
  }, [pendingTxid, pendingStartedAt, fetchAll, network]);

  // WS fast-path: when sentrix_finalized advances past the staking tx's
  // block, mark finalized immediately. The 1.5s poll stays as backup.
  useEffect(() => {
    if (!pending || pending.status !== 'in-block' || !pending.blockHeight || wsFinalized === null) return;
    if (wsFinalized >= pending.blockHeight) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPending((p) => (p ? { ...p, status: 'finalized' } : p));
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      setTimeout(() => setPending(null), 4000);
    }
  }, [wsFinalized, pending]);

  const totalDelegated = delegations.reduce((s, d) => s + d.amount, 0);
  const totalUnbonding = unbonding.reduce((s, u) => s + u.amount, 0);

  // Active validators sorted by total stake desc
  const activeValidators = [...validators]
    .filter((v) => v.is_active)
    .sort((a, b) => b.total_stake - a.total_stake);

  const truncate = (s: string) => s.slice(0, 6) + '…' + s.slice(-4);

  // Send a staking-op transaction. amount field semantics differ per op:
  //   Delegate: tx.amount = amount (escrowed via authority::escrow_to_validator)
  //   Undelegate / ClaimRewards: tx.amount = 0
  const sendStakingTx = async (
    op: object,
    txAmount: number,
    label: string,
    successMsg: string,
  ): Promise<boolean> => {
    if (watchOnly) {
      toast.error('Watch-only wallet cannot sign');
      return false;
    }
    if (!address || !privateKey) {
      toast.error('No wallet loaded');
      return false;
    }
    setBusy(true);
    try {
      const serverNonce = await getNonce(address);
      const localNext = getLocalNext(network, address);
      const nonce = localNext !== null && localNext > serverNonce ? localNext : serverNonce;
      const timestamp = Math.floor(Date.now() / 1000);
      const data = JSON.stringify(op);
      const fromLower = address.toLowerCase();

      const payload = {
        from: fromLower, to: STAKING_ADDRESS, amount: txAmount, fee: MIN_FEE,
        nonce, data, timestamp, chain_id: CHAIN_ID,
      };
      const { signature, txid, public_key: publicKey } = await signTransaction(payload, privateKey);
      const result = await sendTransaction({
        txid, from_address: fromLower, to_address: STAKING_ADDRESS,
        amount: txAmount, fee: MIN_FEE, nonce, data, timestamp,
        chain_id: CHAIN_ID, signature, public_key: publicKey,
      });

      if (result.success) {
        bumpNonce(network, address, nonce);
        toast.success(successMsg);
        setPending({
          txid,
          label,
          status: 'pending',
          blockHeight: null,
          startedAt: Date.now(),
        });
        return true;
      }
      toast.error(result.error || 'Transaction rejected', { duration: 8000 });
      return false;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed', { duration: 8000 });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleDelegate = async (validator: string, amountSentri: number) => {
    const ok = await sendStakingTx(
      { op: 'delegate', validator, amount: amountSentri },
      amountSentri,
      `Delegating to ${truncate(validator)}`,
      'Delegate broadcast',
    );
    if (ok) setSheet({ kind: 'none' });
  };

  const handleUndelegate = async (validator: string, amountSentri: number) => {
    const ok = await sendStakingTx(
      { op: 'undelegate', validator, amount: amountSentri },
      0,
      `Undelegating from ${truncate(validator)}`,
      'Undelegation broadcast',
    );
    if (ok) setSheet({ kind: 'none' });
  };

  const handleClaimRewards = async () => {
    await sendStakingTx(
      { op: 'claim_rewards' },
      0,
      'Claiming rewards',
      'Claim broadcast',
    );
  };

  return (
    <div className={`flex justify-center px-5 ${inline ? 'pt-6 pb-32' : 'min-h-screen py-8'}`}>
      <div className="w-full max-w-sm">
        {!inline && onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 mb-6 text-[13px] text-[var(--tx-m)] hover:text-[var(--tx)] transition-colors animate-fade-up"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        )}

        <div className="mb-6 animate-fade-up delay-1">
          <h1 className="text-[22px] font-bold text-[var(--tx)]">Stake SRX</h1>
          <p className="text-[13px] text-[var(--tx-m)] mt-2 leading-relaxed">
            Delegate to a validator to earn block rewards. Unbonding takes one epoch to release.
          </p>
        </div>

        {watchOnly && (
          <div className="mb-5 rounded-lg p-3 flex items-center gap-2 bg-[var(--gold-bg)] border border-[var(--gold-bg-s)]">
            <AlertCircle className="w-3.5 h-3.5 text-[var(--gold)] shrink-0" />
            <p className="text-[11px] text-[var(--tx-2)]">
              Watch-only wallet — staking is read-only.
            </p>
          </div>
        )}

        {pending && (
          <PendingBanner
            pending={pending}
            onDismiss={() => setPending(null)}
          />
        )}

        {/* Your delegations summary. Compact-format the totals so they
            never overflow the half-width column. Tooltip shows exact. */}
        <div className="luxe-card relative rounded-2xl p-6 mb-5 overflow-hidden animate-fade-up delay-2">
          <div aria-hidden className="gold-orb" style={{ top: '-120px', right: '-100px', width: '180px', height: '180px' }} />
          <div className="grid grid-cols-2 gap-6 relative">
            <div className="min-w-0">
              <div className="text-[12px] text-[var(--tx-m)] font-medium mb-2">Delegated</div>
              <div
                className="flex items-baseline gap-1.5 max-w-full overflow-hidden"
                title={hideBalances ? undefined : `${sentriToSRX(totalDelegated)} SRX`}
              >
                <span className="text-[28px] font-bold text-[var(--tx)] tab-num leading-none truncate" style={{ letterSpacing: '-0.02em' }}>
                  {hideBalances ? '••••' : formatCompactSRX(totalDelegated / SENTRI)}
                </span>
                <span className="text-[13px] font-bold text-[var(--gold)] shrink-0">SRX</span>
              </div>
            </div>
            <div className="border-l border-[var(--brd)] pl-6 min-w-0">
              <div className="text-[12px] text-[var(--tx-m)] font-medium mb-2">Unbonding</div>
              <div
                className="flex items-baseline gap-1.5 max-w-full overflow-hidden"
                title={hideBalances ? undefined : `${sentriToSRX(totalUnbonding)} SRX`}
              >
                <span className="text-[28px] font-bold text-[var(--tx)] tab-num leading-none truncate" style={{ letterSpacing: '-0.02em' }}>
                  {hideBalances ? '••••' : formatCompactSRX(totalUnbonding / SENTRI)}
                </span>
                <span className="text-[13px] font-bold text-[var(--tx-d)] shrink-0">SRX</span>
              </div>
            </div>
          </div>
        </div>

        {/* Your delegations list */}
        {delegations.length > 0 && (
          <section className="mb-5 animate-fade-up delay-3">
            <h2 className="text-[15px] font-semibold text-[var(--tx)] mb-2 px-1">Your delegations</h2>
            <div className="rounded-xl bg-[var(--sf)] border border-[var(--brd)] divide-y divide-[var(--brd)] overflow-hidden">
              {delegations.map((d) => {
                const v = validators.find((x) => x.address.toLowerCase() === d.validator.toLowerCase());
                return (
                  <div key={d.validator} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[var(--tx)] font-mono">{truncate(d.validator)}</p>
                      <p className="text-[10px] font-mono text-[var(--tx-d)] mt-0.5">
                        Since block #{d.height.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right shrink-0 mr-2">
                      <p className="text-sm font-mono tab-num text-[var(--gold)]">
                        {mask(sentriToSRX(d.amount))}
                      </p>
                      <p className="text-[9px] font-mono uppercase tracking-wider text-[var(--tx-d)] mt-0.5">SRX</p>
                    </div>
                    {!watchOnly && v && (
                      <button
                        onClick={() => setSheet({ kind: 'undelegate', validator: v, current: d.amount })}
                        className="text-[10px] font-mono uppercase tracking-wider px-2 py-1.5 rounded-md bg-[var(--bk-2)] border border-[var(--brd)] text-[var(--tx-2)] hover:bg-[var(--sf-2)] transition-colors"
                      >
                        Unstake
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Unbonding queue */}
        {unbonding.length > 0 && (
          <section className="mb-5 animate-fade-up delay-3">
            <h2 className="text-[15px] font-semibold text-[var(--tx)] mb-2 px-1">Unbonding</h2>
            <div className="rounded-xl bg-[var(--sf)] border border-[var(--brd)] divide-y divide-[var(--brd)] overflow-hidden">
              {unbonding.map((u, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm text-[var(--tx)] font-mono">{truncate(u.validator)}</p>
                    <p className="text-[10px] font-mono text-[var(--tx-d)] mt-0.5">
                      Unlocks at block #{u.completion_height.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono tab-num text-[var(--tx-2)]">
                      {mask(sentriToSRX(u.amount))}
                    </p>
                    <p className="text-[9px] font-mono uppercase tracking-wider text-[var(--tx-d)] mt-0.5">SRX</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Claim rewards */}
        {!watchOnly && delegations.length > 0 && (
          <button
            onClick={handleClaimRewards}
            disabled={busy}
            className="w-full mb-5 py-3 rounded-lg text-sm font-semibold bg-[var(--gold-bg)] border border-[var(--gold-bg-s)] text-[var(--gold)] hover:bg-[var(--gold-bg-s)] transition-colors active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 animate-fade-up delay-3"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
            Claim rewards
          </button>
        )}

        {/* Validator list */}
        <section className="animate-fade-up delay-4">
          <div className="flex items-baseline justify-between mb-2 px-1">
            <h2 className="text-[15px] font-semibold text-[var(--tx)]">Validators</h2>
            <span className="text-[12px] text-[var(--tx-m)]">{activeValidators.length} active</span>
          </div>
          <div className="rounded-xl bg-[var(--sf)] border border-[var(--brd)] overflow-hidden">
            {loading ? (
              <div className="p-10 text-center">
                <div className="w-7 h-7 rounded-full mx-auto mb-3 animate-spin border-2 border-[var(--brd)] border-t-[var(--gold)]" />
                <p className="text-xs font-mono uppercase tracking-wider text-[var(--tx-d)]">Loading</p>
              </div>
            ) : activeValidators.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm text-[var(--tx-2)]">No active validators</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--brd)]">
                {activeValidators.map((v) => {
                  const uptimeRatio = v.blocks_signed + v.blocks_missed > 0
                    ? v.blocks_signed / (v.blocks_signed + v.blocks_missed)
                    : 1;
                  const uptimePct = (uptimeRatio * 100).toFixed(1);
                  const commissionPct = (v.commission_rate / 100).toFixed(2);
                  return (
                    <button
                      key={v.address}
                      onClick={() => !watchOnly && setSheet({ kind: 'delegate', validator: v })}
                      disabled={watchOnly}
                      className={`w-full text-left px-4 py-3 transition-colors ${
                        !watchOnly ? 'hover:bg-[var(--sf-2)]' : 'cursor-default'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <p className="text-sm text-[var(--tx)] font-mono">{truncate(v.address)}</p>
                          {v.is_jailed && (
                            <span className="inline-block text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--red-bg)] text-[var(--red)] mt-1">
                              Jailed
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0" title={`${sentriToSRX(v.total_stake)} SRX`}>
                          <p className="text-[13px] font-mono font-semibold tab-num text-[var(--gold)]">
                            {formatCompactSRX(v.total_stake / SENTRI)}
                          </p>
                          <p className="text-[11px] text-[var(--tx-d)] mt-0.5">
                            SRX staked
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-mono">
                        <span className="text-[var(--tx-d)]">
                          Uptime <span className="text-[var(--tx-2)] tab-num">{uptimePct}%</span>
                        </span>
                        <span className="text-[var(--tx-d)]">·</span>
                        <span className="text-[var(--tx-d)]">
                          Commission <span className="text-[var(--tx-2)] tab-num">{commissionPct}%</span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Delegate sheet */}
      {sheet.kind === 'delegate' && (
        <DelegateSheet
          validator={sheet.validator}
          balance={balance}
          busy={busy}
          onClose={() => setSheet({ kind: 'none' })}
          onSubmit={handleDelegate}
        />
      )}

      {/* Undelegate sheet */}
      {sheet.kind === 'undelegate' && (
        <UndelegateSheet
          validator={sheet.validator}
          current={sheet.current}
          busy={busy}
          onClose={() => setSheet({ kind: 'none' })}
          onSubmit={handleUndelegate}
        />
      )}
    </div>
  );
}

function DelegateSheet({
  validator, balance, busy, onClose, onSubmit,
}: {
  validator: StakingValidator;
  balance: number | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (validator: string, amountSentri: number) => void;
}) {
  useEscape(true, onClose);
  const [amount, setAmount] = useState('');
  let amountSentri = 0;
  let amountError: string | null = null;
  if (amount) {
    try { amountSentri = parseSRXToSentri(amount); }
    catch (e) { amountError = e instanceof AmountOverflowError ? e.message : 'Invalid amount'; }
  }
  const max = balance !== null ? Math.max(0, balance - MIN_FEE) : 0;
  const overBalance = balance !== null && amountSentri + MIN_FEE > balance;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70">
      <div className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden bg-[var(--sf)] border border-[var(--brd)] animate-fade-up max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <div className="text-[12px] font-medium text-[var(--tx-m)]">Delegate</div>
            <h2 className="font-serif text-lg text-[var(--tx)] truncate">
              {validator.address.slice(0, 10)}…
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--sf-2)]">
            <X className="w-4 h-4 text-[var(--tx-m)]" />
          </button>
        </div>
        <div className="px-5 pb-5 space-y-4">
          <div className="rounded-lg bg-[var(--bk-2)] border border-[var(--brd)] divide-y divide-[var(--brd)]">
            <Row label="Total stake" value={`${sentriToSRX(validator.total_stake)} SRX`} />
            <Row label="Commission" value={`${(validator.commission_rate / 100).toFixed(2)}%`} />
            <Row label="Blocks signed" value={validator.blocks_signed.toLocaleString()} />
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label className="text-[13px] font-medium text-[var(--tx-2)]">Amount</label>
              <span className="text-[10px] font-mono text-[var(--tx-d)]">
                Available <span className="text-[var(--gold)]">{balance !== null ? sentriToSRX(balance) : '—'}</span> SRX
              </span>
            </div>
            <div className="relative">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                type="text"
                inputMode="decimal"
                className="w-full rounded-lg p-3.5 pr-16 text-base font-mono bg-[var(--bk-2)] border border-[var(--brd)] text-[var(--tx)] placeholder:text-[var(--tx-d)] focus:outline-none focus:border-[var(--gold-d)] transition-colors"
              />
              <button
                onClick={() => max > 0 && setAmount(sentriToSRX(max))}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono uppercase tracking-wider px-2.5 py-1.5 rounded-md bg-[var(--gold-bg)] border border-[var(--gold-bg-s)] text-[var(--gold)] hover:bg-[var(--gold-bg-s)] transition-colors"
              >
                Max
              </button>
            </div>
          </div>

          <button
            onClick={() => onSubmit(validator.address, amountSentri)}
            disabled={busy || !amountSentri || overBalance || !!amountError}
            className="w-full py-3 rounded-lg text-sm font-semibold bg-[var(--gold)] text-[var(--bk)] hover:bg-[var(--gold-l)] transition-colors active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing…</> : <><TrendingUp className="w-4 h-4" /> Delegate</>}
          </button>
          {amountError && (
            <p className="text-[11px] text-[var(--red)] text-center">{amountError}</p>
          )}
          {overBalance && (
            <p className="text-[11px] text-[var(--red)] text-center">Insufficient balance (incl. fee)</p>
          )}
        </div>
      </div>
    </div>
  );
}

function UndelegateSheet({
  validator, current, busy, onClose, onSubmit,
}: {
  validator: StakingValidator;
  current: number;
  busy: boolean;
  onClose: () => void;
  onSubmit: (validator: string, amountSentri: number) => void;
}) {
  useEscape(true, onClose);
  const [amount, setAmount] = useState('');
  let amountSentri = 0;
  let amountError: string | null = null;
  if (amount) {
    try { amountSentri = parseSRXToSentri(amount); }
    catch (e) { amountError = e instanceof AmountOverflowError ? e.message : 'Invalid amount'; }
  }
  const overCurrent = amountSentri > current;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70">
      <div className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden bg-[var(--sf)] border border-[var(--brd)] animate-fade-up">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <div className="text-[12px] font-medium text-[var(--tx-m)]">Undelegate</div>
            <h2 className="font-serif text-lg text-[var(--tx)] truncate">
              {validator.address.slice(0, 10)}…
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--sf-2)]">
            <X className="w-4 h-4 text-[var(--tx-m)]" />
          </button>
        </div>
        <div className="px-5 pb-5 space-y-4">
          <div className="rounded-lg p-3 bg-[var(--gold-bg)] border border-[var(--gold-bg-s)]">
            <p className="text-xs text-[var(--tx-2)] leading-relaxed">
              Funds enter an unbonding queue and unlock at the next epoch boundary. They earn no rewards while unbonding.
            </p>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label className="text-[13px] font-medium text-[var(--tx-2)]">Amount to unstake</label>
              <span className="text-[10px] font-mono text-[var(--tx-d)]">
                Currently <span className="text-[var(--gold)]">{sentriToSRX(current)}</span> SRX
              </span>
            </div>
            <div className="relative">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                type="text"
                inputMode="decimal"
                className="w-full rounded-lg p-3.5 pr-16 text-base font-mono bg-[var(--bk-2)] border border-[var(--brd)] text-[var(--tx)] placeholder:text-[var(--tx-d)] focus:outline-none focus:border-[var(--gold-d)] transition-colors"
              />
              <button
                onClick={() => setAmount(sentriToSRX(current))}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono uppercase tracking-wider px-2.5 py-1.5 rounded-md bg-[var(--gold-bg)] border border-[var(--gold-bg-s)] text-[var(--gold)] hover:bg-[var(--gold-bg-s)] transition-colors"
              >
                All
              </button>
            </div>
          </div>

          <button
            onClick={() => onSubmit(validator.address, amountSentri)}
            disabled={busy || !amountSentri || overCurrent || !!amountError}
            className="w-full py-3 rounded-lg text-sm font-semibold bg-[var(--red)] text-white hover:opacity-90 transition-opacity active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing…</> : <><Lock className="w-4 h-4" /> Queue undelegation</>}
          </button>
          {amountError && (
            <p className="text-[11px] text-[var(--red)] text-center">{amountError}</p>
          )}
          {overCurrent && (
            <p className="text-[11px] text-[var(--red)] text-center">Cannot exceed current delegation</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PendingBanner({
  pending, onDismiss,
}: {
  pending: PendingTx; onDismiss: () => void;
}) {
  const expired = pending.status === 'expired';
  const orphaned = pending.status === 'orphaned';
  const error = expired || orphaned;
  const finalized = pending.status === 'finalized';

  const containerClass = error
    ? 'rounded-lg p-3 mb-5 bg-[var(--red-bg)] border border-[var(--red)]/30'
    : 'rounded-lg p-3 mb-5 bg-[var(--gold-bg)] border border-[var(--gold-bg-s)]';

  const dot = (
    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
      finalized ? 'bg-[var(--gold)]' :
      error     ? 'bg-[var(--red)]' :
                  'bg-[var(--gold-bg-s)]'
    }`}>
      {finalized
        ? <Check className="w-3 h-3 text-[var(--bk)]" />
        : error
          ? <span className="text-[10px] font-bold text-white">!</span>
          : <span className="w-2 h-2 rounded-full bg-[var(--gold)] animate-pulse-live" />}
    </div>
  );

  const status =
    orphaned               ? 'Network changed — pinned to previous chain' :
    expired                ? 'Expired — never landed' :
    finalized              ? `Finalized at #${pending.blockHeight}` :
    pending.status === 'in-block' ? `In block #${pending.blockHeight}` :
                                     'Awaiting block';

  return (
    <div className={containerClass}>
      <div className="flex items-center gap-2.5">
        {dot}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--tx)] font-medium truncate">{pending.label}</p>
          <p className={`text-[10px] font-mono uppercase tracking-wider mt-0.5 ${
            error ? 'text-[var(--red)]' : 'text-[var(--gold)]'
          }`}>
            {status}
          </p>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[var(--sf-2)] transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5 text-[var(--tx-m)]" />
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline px-4 py-2.5">
      <span className="text-[11px] uppercase tracking-wider font-mono text-[var(--tx-m)]">{label}</span>
      <span className="text-xs font-mono tab-num text-[var(--tx-2)]">{value}</span>
    </div>
  );
}
