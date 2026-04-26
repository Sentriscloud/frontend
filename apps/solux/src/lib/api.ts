import axios from 'axios';
import type { ChainInfo, AddressInfo, TokenBalance, TokenInfo, TxHistoryItem } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://103.150.92.25:8545';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

export async function getChainInfo(): Promise<ChainInfo> {
  const res = await api.get('/chain/info');
  return res.data;
}

export async function getAddressInfo(address: string): Promise<AddressInfo> {
  const res = await api.get(`/accounts/${address}/balance`);
  return res.data;
}

export async function getNonce(address: string): Promise<number> {
  const res = await api.get(`/accounts/${address}/nonce`);
  return res.data?.nonce ?? 0;
}

export async function getTokenBalance(contract: string, address: string): Promise<TokenBalance> {
  const res = await api.get(`/tokens/${contract}/balance/${address}`);
  return res.data;
}

export async function getTokenInfo(contract: string): Promise<TokenInfo> {
  const res = await api.get(`/tokens/${contract}`);
  return res.data;
}

export async function sendTransaction(tx: object): Promise<{ success: boolean; txid?: string; error?: string }> {
  const res = await api.post('/transactions', { transaction: tx });
  return res.data;
}

export async function getTransactionHistory(address: string, limit = 20): Promise<{ transactions: TxHistoryItem[] }> {
  const res = await api.get(`/address/${address}/history?limit=${limit}&offset=0`);
  return res.data;
}
