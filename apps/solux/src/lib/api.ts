import axios, { AxiosError } from 'axios';
import type {
  ChainInfo, AddressInfo, TokenBalance, TokenInfo, TxHistoryItem,
  StakingValidatorList, DelegationList, UnbondingList, TokenList,
  FullTransaction, FinalizedHeight,
} from '@/types';
import { getActiveNetwork } from './store';

// Lazy axios instance — rewrites baseURL on every request based on active
// network from the settings store. Toggling Mainnet/Testnet in Settings
// makes the next API call hit the new endpoint with no app reload.
//
// Timeout chosen to balance: chain RPC p99 stays well under 2s on healthy
// nodes; 15s tolerates one slow round-trip without leaving the user staring
// at a forever-spinner if a node is hung.
export const api = axios.create({
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  config.baseURL = getActiveNetwork().apiUrl;
  return config;
});

function extractApiError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError && err.response) {
    const data = err.response.data;
    if (typeof data === 'string' && data.trim()) return data;
    if (data && typeof data === 'object') {
      const candidate = data.error ?? data.message ?? data.detail ?? data.reason;
      if (typeof candidate === 'string' && candidate.trim()) return candidate;
      try { return JSON.stringify(data); } catch { /* ignore */ }
    }
    return `${fallback} (HTTP ${err.response.status})`;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

// ── Chain ──────────────────────────────────────────────────
export async function getChainInfo(): Promise<ChainInfo> {
  const res = await api.get('/chain/info');
  return res.data;
}

export async function getFinalizedHeight(): Promise<FinalizedHeight> {
  const res = await api.get('/chain/finalized-height');
  return res.data;
}

// ── Accounts ───────────────────────────────────────────────
export async function getAddressInfo(address: string): Promise<AddressInfo> {
  const res = await api.get(`/accounts/${address}/balance`);
  return res.data;
}

export async function getNonce(address: string): Promise<number> {
  const res = await api.get(`/accounts/${address}/nonce`);
  return res.data?.nonce ?? 0;
}

// ── Tokens ─────────────────────────────────────────────────
export async function listTokens(): Promise<TokenList> {
  const res = await api.get('/tokens');
  return res.data;
}

export async function getTokenBalance(contract: string, address: string): Promise<TokenBalance> {
  const res = await api.get(`/tokens/${contract}/balance/${address}`);
  return res.data;
}

export async function getTokenInfo(contract: string): Promise<TokenInfo> {
  const res = await api.get(`/tokens/${contract}`);
  return res.data;
}

// ── Transactions ──────────────────────────────────────────
export async function sendTransaction(tx: object): Promise<{ success: boolean; txid?: string; error?: string }> {
  try {
    const res = await api.post('/transactions', { transaction: tx });
    return res.data;
  } catch (err) {
    return { success: false, error: extractApiError(err, 'Transaction rejected') };
  }
}

export async function getTransactionHistory(address: string, limit = 20): Promise<{ transactions: TxHistoryItem[] }> {
  const res = await api.get(`/address/${address}/history?limit=${limit}&offset=0`);
  return res.data;
}

export async function getTransactionDetail(txid: string): Promise<FullTransaction | null> {
  try {
    const res = await api.get(`/transactions/${txid}`);
    // The /transactions/<txid> REST endpoint returns the wrapped shape:
    //   { block_hash, block_index, block_timestamp, transaction: {...inner...} }
    // FullTransaction declares fields at the top level (txid, nonce, chain_id, …)
    // so flatten the inner `transaction` object onto the outer response. Without
    // this, TxDetail's `Field value={String(full.nonce)}` rendered the literal
    // string "undefined" because nonce + chain_id only existed under `transaction`.
    const data = res.data;
    if (data && typeof data === 'object' && 'transaction' in data && data.transaction) {
      return { ...data, ...data.transaction };
    }
    return data;
  } catch (err) {
    if (err instanceof AxiosError && err.response?.status === 404) return null;
    throw err;
  }
}

export async function getMempool(): Promise<{ size: number; transactions: FullTransaction[] }> {
  const res = await api.get('/mempool');
  return res.data;
}

// ── Staking (Voyager DPoS) ────────────────────────────────
export async function getStakingValidators(): Promise<StakingValidatorList> {
  const res = await api.get('/staking/validators');
  return res.data;
}

export async function getDelegations(address: string): Promise<DelegationList> {
  const res = await api.get(`/staking/delegations/${address}`);
  return res.data;
}

export async function getUnbonding(address: string): Promise<UnbondingList> {
  const res = await api.get(`/staking/unbonding/${address}`);
  return res.data;
}
