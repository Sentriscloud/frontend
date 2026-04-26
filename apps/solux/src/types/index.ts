export interface ChainInfo {
  height: number;
  total_blocks: number;
  total_minted_srx: number;
  max_supply_srx: number;
  total_burned_srx: number;
  mempool_size: number;
  active_validators: number;
  deployed_tokens: number;
  chain_id: number;
  next_block_reward_srx: number;
}

export interface AddressInfo {
  address: string;
  balance_sentri: number;
  balance_srx: number;
  nonce: number;
}

export interface TokenBalance {
  contract: string;
  address: string;
  balance: number;
}

export interface TokenInfo {
  contract_address: string;
  name: string;
  symbol: string;
  decimals: number;
  total_supply: number;
  max_supply: number;
  owner: string;
  holders: number;
}

export interface TxHistoryItem {
  txid: string;
  direction: 'in' | 'out' | 'reward';
  from: string;
  to: string;
  amount: number;
  fee: number;
  block_index: number;
  block_timestamp: number;
}

export interface TokenOp {
  op: 'deploy' | 'transfer' | 'burn' | 'mint' | 'approve';
  contract?: string;
  to?: string;
  amount?: number;
  name?: string;
  symbol?: string;
  decimals?: number;
  supply?: number;
  spender?: string;
}
