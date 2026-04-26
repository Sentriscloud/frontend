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

// ── Staking types (Voyager DPoS) ────────────────────────────
export interface StakingValidator {
  address: string;
  self_stake: number;
  total_delegated: number;
  total_stake: number;
  commission_rate: number;       // basis points (e.g. 500 = 5%)
  is_jailed: boolean;
  is_tombstoned: boolean;
  is_active: boolean;
  blocks_signed: number;
  blocks_missed: number;
  pending_rewards: number;        // sentri pending claim by validator
}

export interface StakingValidatorList {
  validators: StakingValidator[];
  active_count: number;
  total_count: number;
}

export interface Delegation {
  validator: string;
  amount: number;
  height: number;
}

export interface DelegationList {
  delegator: string;
  delegations: Delegation[];
  count: number;
}

export interface UnbondingEntry {
  validator: string;
  amount: number;
  completion_height: number;
}

export interface UnbondingList {
  delegator: string;
  unbonding: UnbondingEntry[];
  count: number;
}

// ── Token list ──────────────────────────────────────────────
export interface TokenListEntry {
  contract: string;
  name: string;
  symbol: string;
  decimals: number;
  total_supply: number;
}

export interface TokenList {
  tokens: TokenListEntry[];
  total: number;
}

// ── Transaction detail ──────────────────────────────────────
// Server returns the full Transaction struct under txid lookup
export interface FullTransaction {
  txid: string;
  from_address: string;
  to_address: string;
  amount: number;
  fee: number;
  nonce: number;
  data: string;
  timestamp: number;
  chain_id: number;
  signature: string;
  public_key: string;
  block_index?: number;
  block_timestamp?: number;
  // Some APIs wrap the tx; flatten to one shape
  block?: { index: number; timestamp: number };
}

export interface FinalizedHeight {
  finalized_height: number;
  tip_height?: number;
}
