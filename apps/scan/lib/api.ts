import { getApiUrl, type NetworkId } from "./chain";

// DECISION: Backend amounts are in "sentri" (1 SRX = 1e8 sentri). The UI displays SRX.
// All fetchers do the conversion at the edge so downstream code can treat numbers as SRX.
const SENTRI_PER_SRX = 100_000_000;
const toSrx = (sentri: number): number => sentri / SENTRI_PER_SRX;

// DECISION: timeout is bounded by an AbortController. Default 8s for client polls (matches the
// browser's typical idle timeout). SSR callers should pass a tight value (e.g. 1500ms) so a
// slow upstream cannot stall page render past the user's patience window.
async function apiFetch<T>(network: NetworkId, path: string, timeoutMs = 8000): Promise<T | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const base = getApiUrl(network);
    const res = await fetch(`${base}${path}`, { cache: "no-store", signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export interface ChainInfo {
  total_blocks: number;
  height: number;
  total_minted_srx: number;
  total_burned_srx: number;
  mempool_size: number;
  active_validators: number;
  deployed_tokens: number;
  next_block_reward_srx: number;
  // TODO(api): needs /chain/stats to return cumulative tx count. Optional until backend ships.
  total_transactions?: number;
}

export interface BlockData {
  index: number;
  hash: string;
  previous_hash: string;
  timestamp: string;
  validator: string;
  validator_name?: string;
  transactions: TransactionData[];
  /** Only populated by the LIST endpoint (/chain/blocks); detail endpoint returns transactions[]. */
  tx_count?: number;
  merkle_root: string;
  nonce: number;
  difficulty: number;
}

export interface TransactionData {
  id: string;
  from: string;
  to: string;
  amount: number;
  fee: number;
  timestamp: string;
  nonce: number;
  signature: string;
  tx_type?: string;
  status?: string;
  gas_used?: number;
  gas_price?: number;
  input_data?: string;
  contract_address?: string;
  block_height?: number;
}

export interface ValidatorData {
  address: string;
  name: string;
  status?: string;
  is_active?: boolean;
  registered_at?: number;
  blocks_produced?: number;
  stake?: number;
  commission?: number;
  uptime?: number;
  rewards_earned?: number;
}

export interface AccountBalance {
  address: string;
  balance: number;
  nonce: number;
  tx_count?: number;
}

interface RawAccountBalance {
  address: string;
  balance?: number;
  balance_srx?: number;
  balance_sentri?: number;
  nonce?: number;
}

interface RawAccountInfo {
  address: string;
  balance_srx?: number;
  balance_sentri?: number;
  nonce?: number;
  tx_count?: { window_tx_count?: number; is_partial?: boolean; window_start_block?: number };
}

export interface TokenData {
  contract_address: string;
  name: string;
  symbol: string;
  decimals: number;
  total_supply: number;
  owner: string;
  holders?: number;
  transfers?: number;
}

export interface TopHolder {
  rank: number;
  address: string;
  balance: number;
  share: number;
  label?: string;
  tx_count?: number;
}

export interface TokenHolder {
  address: string;
  balance: number;
  share: number;
}

export interface TokenTransfer {
  tx_hash: string;
  from: string;
  to: string;
  amount: number;
  timestamp: number;
  block_height?: number;
}

export interface DailyStat {
  date: string;
  blocks: number;
  transactions: number;
}

export function fetchChainInfo(network: NetworkId) {
  return apiFetch<ChainInfo>(network, "/chain/info");
}

export function fetchBlock(network: NetworkId, index: number) {
  return apiFetch<BlockData>(network, `/chain/blocks/${index}`);
}

export async function fetchLatestBlocks(network: NetworkId, count = 10) {
  const res = await apiFetch<{ blocks: BlockData[] }>(network, `/chain/blocks?limit=${count}`);
  return res?.blocks ?? [];
}

// DECISION: backend /transactions/{txid} wraps the tx in { block_hash, block_index,
// block_timestamp, transaction: {...} }. Flatten here so downstream code sees a single
// TransactionData with block_height, and sentri → SRX amount/fee conversion applied.
interface RawTxDetail {
  block_hash?: string;
  block_index?: number;
  block_timestamp?: number;
  transaction?: {
    txid?: string;
    from_address?: string;
    to_address?: string;
    amount?: number;
    fee?: number;
    timestamp?: number;
    nonce?: number;
    signature?: string;
    public_key?: string;
    data?: string;
    chain_id?: number;
  };
}

function normalizeTx(raw: RawTxDetail): TransactionData | null {
  const tx = raw.transaction;
  if (!tx) return null;
  return {
    id: tx.txid ?? "",
    from: tx.from_address ?? "",
    to: tx.to_address ?? "",
    amount: toSrx(tx.amount ?? 0),
    fee: toSrx(tx.fee ?? 0),
    timestamp: String(tx.timestamp ?? raw.block_timestamp ?? 0),
    nonce: tx.nonce ?? 0,
    signature: tx.signature ?? "",
    input_data: tx.data,
    block_height: raw.block_index,
  };
}

export async function fetchTransaction(network: NetworkId, txId: string): Promise<TransactionData | null> {
  const res = await apiFetch<RawTxDetail>(network, `/transactions/${txId}`);
  if (!res) return null;
  return normalizeTx(res);
}

// DECISION: /transactions returns raw chain rows — txid/from/to/amount in sentri,
// block_timestamp, is_coinbase flag — not the TransactionData shape the UI expects.
// Normalize here so Home / Latest Transactions doesn't render "Invalid Date" etc.
interface RawListedTx {
  txid: string;
  from: string;
  to: string;
  amount: number;
  fee: number;
  block_index: number;
  block_timestamp: number;
  timestamp?: number;
  is_coinbase?: boolean;
  status?: string;
}

export async function fetchLatestTransactions(network: NetworkId, count = 10) {
  const res = await apiFetch<{ transactions: RawListedTx[] } | RawListedTx[]>(
    network,
    `/transactions?limit=${count}`,
  );
  if (!res) return [];
  const rows = Array.isArray(res) ? res : (res.transactions ?? []);
  return rows.map((t): TransactionData => ({
    id: t.txid,
    from: t.from,
    to: t.to,
    amount: toSrx(t.amount ?? 0),
    fee: toSrx(t.fee ?? 0),
    timestamp: String(t.timestamp ?? t.block_timestamp ?? 0),
    nonce: 0,
    signature: "",
    block_height: t.block_index,
    status: (t.status as TransactionData["status"]) ?? "confirmed",
    tx_type: t.is_coinbase ? "coinbase" : undefined,
  }));
}

// DECISION: use /address/{addr}/info which returns balance_srx, nonce, and a windowed tx_count.
// Falls back to /accounts/{addr}/balance if the info endpoint is missing.
export async function fetchAccountBalance(network: NetworkId, address: string): Promise<AccountBalance | null> {
  const info = await apiFetch<RawAccountInfo>(network, `/address/${address}/info`);
  if (info) {
    return {
      address: info.address,
      balance: info.balance_srx ?? (info.balance_sentri ? toSrx(info.balance_sentri) : 0),
      nonce: info.nonce ?? 0,
      tx_count: info.tx_count?.window_tx_count,
    };
  }
  const bal = await apiFetch<RawAccountBalance>(network, `/accounts/${address}/balance`);
  if (!bal) return null;
  return {
    address: bal.address,
    balance: bal.balance ?? bal.balance_srx ?? 0,
    nonce: bal.nonce ?? 0,
  };
}

interface RawHistoryItem {
  txid: string;
  from: string;
  to: string;
  amount: number;
  fee: number;
  block_index: number;
  block_timestamp: number;
  direction?: "in" | "out" | "self";
}

// DECISION: backend path is /address/{addr}/history (not /accounts/...), uses offset-based
// pagination. Mapping: txid→id, block_index→block_height, sentri→SRX conversion. Page size 20.
export async function fetchAccountHistory(
  network: NetworkId,
  address: string,
  page = 1,
  limit = 20,
): Promise<TransactionData[]> {
  const offset = (page - 1) * limit;
  const res = await apiFetch<{ transactions: RawHistoryItem[] }>(
    network,
    `/address/${address}/history?limit=${limit}&offset=${offset}`,
  );
  if (!res?.transactions) return [];
  return res.transactions.map((t) => ({
    id: t.txid,
    from: t.from,
    to: t.to,
    amount: toSrx(t.amount),
    fee: toSrx(t.fee),
    timestamp: String(t.block_timestamp),
    nonce: 0,
    signature: "",
    block_height: t.block_index,
  }));
}

export async function fetchValidators(network: NetworkId) {
  const res = await apiFetch<{ validators: ValidatorData[] } | ValidatorData[]>(network, "/validators");
  if (!res) return [];
  const list = Array.isArray(res) ? res : (res.validators ?? []);
  return list.map((v) => ({
    ...v,
    status: v.status ?? (v.is_active === false ? "inactive" : "active"),
  }));
}

export async function fetchTokens(network: NetworkId) {
  const res = await apiFetch<{ tokens: TokenData[] } | TokenData[]>(network, "/tokens");
  if (!res) return [];
  return Array.isArray(res) ? res : (res.tokens ?? []);
}

export function fetchToken(network: NetworkId, address: string) {
  return apiFetch<TokenData>(network, `/tokens/${address}`);
}

// ── New endpoints wired from existing backend routes ──────────────────────
interface RawRichlistEntry {
  address: string;
  balance_sentri?: number;
  balance_srx?: number;
  percent_of_supply?: number;
}

export async function fetchRichlist(network: NetworkId, limit = 100): Promise<TopHolder[]> {
  const res = await apiFetch<{ holders: RawRichlistEntry[] }>(network, `/richlist?limit=${limit}`);
  if (!res?.holders) return [];
  return res.holders.map((h, i) => ({
    rank: i + 1,
    address: h.address,
    balance: h.balance_srx ?? (h.balance_sentri ? toSrx(h.balance_sentri) : 0),
    share: h.percent_of_supply ?? 0,
  }));
}

interface RawTokenHolder {
  address: string;
  balance?: number;
  balance_sentri?: number;
  percent?: number;
  percent_of_supply?: number;
}

export async function fetchTokenHolders(
  network: NetworkId,
  contract: string,
  limit = 50,
): Promise<TokenHolder[]> {
  const res = await apiFetch<{ holders: RawTokenHolder[] }>(
    network,
    `/tokens/${contract}/holders?limit=${limit}`,
  );
  if (!res?.holders) return [];
  return res.holders.map((h) => ({
    address: h.address,
    balance: h.balance ?? h.balance_sentri ?? 0,
    share: h.percent ?? h.percent_of_supply ?? 0,
  }));
}

interface RawTokenTrade {
  txid?: string;
  tx_hash?: string;
  from: string;
  to: string;
  amount: number;
  timestamp?: number;
  block_timestamp?: number;
  block_index?: number;
}

export async function fetchTokenTrades(
  network: NetworkId,
  contract: string,
  page = 1,
  limit = 20,
): Promise<TokenTransfer[]> {
  const offset = (page - 1) * limit;
  const res = await apiFetch<{ trades: RawTokenTrade[] }>(
    network,
    `/tokens/${contract}/trades?limit=${limit}&offset=${offset}`,
  );
  if (!res?.trades) return [];
  return res.trades.map((t) => ({
    tx_hash: t.txid ?? t.tx_hash ?? "",
    from: t.from,
    to: t.to,
    amount: t.amount,
    timestamp: t.timestamp ?? t.block_timestamp ?? 0,
    block_height: t.block_index,
  }));
}

export async function fetchDailyStats(network: NetworkId): Promise<DailyStat[]> {
  const res = await apiFetch<DailyStat[]>(network, "/stats/daily");
  return res ?? [];
}

// ── /chain/performance — live TPS + block time series from backend ──────────
export interface PerformancePoint {
  timestamp: number;
  tps: number;
  block_time_sec: number;
  block_count: number;
  tx_count: number;
}

export interface ChainPerformance {
  range: string;
  total_blocks: number;
  total_tx: number;
  avg_tps: number;
  peak_tps: number;
  points: PerformancePoint[];
}

export async function fetchChainPerformance(
  network: NetworkId,
  range: "1m" | "5m" | "15m" | "1h" | "24h" = "1h",
): Promise<ChainPerformance | null> {
  return apiFetch<ChainPerformance>(network, `/chain/performance?range=${range}`);
}

// ── /accounts/{addr}/tokens — SRC-20 holdings ───────────────────────────────
export interface AccountTokenHolding {
  contract_address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: number;
}

interface RawAccountTokenHolding {
  contract_address: string;
  contract?: string;
  symbol?: string;
  name?: string;
  decimals?: number;
  balance?: number;
  balance_raw?: number;
}

export async function fetchAccountTokens(network: NetworkId, address: string): Promise<AccountTokenHolding[]> {
  const res = await apiFetch<{ tokens: RawAccountTokenHolding[] }>(network, `/accounts/${address}/tokens`);
  if (!res?.tokens) return [];
  return res.tokens.map((t) => ({
    contract_address: t.contract_address ?? t.contract ?? "",
    symbol: t.symbol ?? "",
    name: t.name ?? "",
    decimals: t.decimals ?? 0,
    balance: t.balance ?? t.balance_raw ?? 0,
  }));
}

// ── /validators/{addr}/rewards ──────────────────────────────────────────────
export interface ValidatorReward {
  block_height: number;
  timestamp: number;
  amount: number;
}

export async function fetchValidatorRewards(
  network: NetworkId,
  address: string,
  page = 1,
  limit = 20,
): Promise<{ rewards: ValidatorReward[]; hasMore: boolean }> {
  const res = await apiFetch<{ rewards: ValidatorReward[]; pagination?: { has_more?: boolean } }>(
    network,
    `/validators/${address}/rewards?page=${page}&limit=${limit}`,
  );
  return { rewards: res?.rewards ?? [], hasMore: res?.pagination?.has_more ?? false };
}

// ── /validators/{addr}/blocks-over-time ─────────────────────────────────────
export interface ValidatorBlocksPoint {
  timestamp: number;
  count: number;
}

export async function fetchValidatorBlocksOverTime(
  network: NetworkId,
  address: string,
  range: "1h" | "24h" | "7d" = "1h",
): Promise<ValidatorBlocksPoint[]> {
  const res = await apiFetch<{ points: ValidatorBlocksPoint[] }>(
    network,
    `/validators/${address}/blocks-over-time?range=${range}`,
  );
  return res?.points ?? [];
}

// ── /validators/{addr}/delegators (DPoS) ────────────────────────────────────
export interface ValidatorDelegator {
  address: string;
  amount_srx: number;
  shares?: number;
}

export async function fetchValidatorDelegators(
  network: NetworkId,
  address: string,
): Promise<{ delegators: ValidatorDelegator[]; total: number; total_srx: number }> {
  const res = await apiFetch<{
    delegators: Array<{ address: string; amount_sentri?: number; amount_srx?: number; shares?: number }>;
    total?: number;
    total_delegated_srx?: number;
  }>(network, `/validators/${address}/delegators`);
  if (!res) return { delegators: [], total: 0, total_srx: 0 };
  return {
    delegators: (res.delegators ?? []).map((d) => ({
      address: d.address,
      amount_srx: d.amount_srx ?? (d.amount_sentri ? toSrx(d.amount_sentri) : 0),
      shares: d.shares,
    })),
    total: res.total ?? 0,
    total_srx: res.total_delegated_srx ?? 0,
  };
}

// ── /mempool ─────────────────────────────────────────────────────────────────
export interface MempoolSnapshot {
  size: number;
  transactions: Array<{
    txid?: string;
    from_address?: string;
    to_address?: string;
    amount?: number;
    fee?: number;
    timestamp?: number;
  }>;
}

export async function fetchMempool(network: NetworkId): Promise<MempoolSnapshot> {
  const res = await apiFetch<MempoolSnapshot>(network, "/mempool");
  return res ?? { size: 0, transactions: [] };
}

// ── /epoch/current ──────────────────────────────────────────────────────────
export interface EpochInfo {
  epoch_number: number;
  start_height: number;
  end_height: number;
  total_blocks_produced: number;
  total_rewards: number;
  total_staked: number;
}

export async function fetchCurrentEpoch(network: NetworkId): Promise<EpochInfo | null> {
  return apiFetch<EpochInfo>(network, "/epoch/current");
}

// ── /sentrix_status ─────────────────────────────────────────────────────────
export interface ChainStatus {
  chain_id: number;
  consensus: "PoA" | "BFT" | "DPoS" | string;
  native_token: string;
  uptime_seconds: number;
  version: { version: string; build: string };
  sync_info: {
    earliest_block_height: number;
    latest_block_height: number;
    latest_block_hash: string;
    latest_block_time: number;
    syncing: boolean;
  };
  validators: { active_count: number };
}

export async function fetchChainStatus(network: NetworkId): Promise<ChainStatus | null> {
  return apiFetch<ChainStatus>(network, "/sentrix_status");
}

// ── JSON-RPC: eth_getLogs for event history ─────────────────────────────────
export interface EventLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  blockHash: string;
  transactionHash: string;
  transactionIndex: number;
  logIndex: number;
  removed: boolean;
}

interface RawEventLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  blockHash: string;
  transactionHash: string;
  transactionIndex: string;
  logIndex: string;
  removed?: boolean;
}

export async function fetchEventLogs(
  network: NetworkId,
  address: string,
  fromBlock: number | "earliest" = "earliest",
  toBlock: number | "latest" = "latest",
): Promise<EventLog[]> {
  const base = (network === "testnet"
    ? (process.env.NEXT_PUBLIC_TESTNET_API || "https://testnet-api.sentriscloud.com")
    : (process.env.NEXT_PUBLIC_MAINNET_API || "https://sentrix-api.sentriscloud.com"));
  const fromHex = typeof fromBlock === "number" ? `0x${fromBlock.toString(16)}` : fromBlock;
  const toHex = typeof toBlock === "number" ? `0x${toBlock.toString(16)}` : toBlock;
  try {
    const res = await fetch(`${base}/rpc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getLogs",
        params: [{ address, fromBlock: fromHex, toBlock: toHex }],
        id: 1,
      }),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const body = await res.json();
    if (body?.error) return [];
    return (body?.result ?? []).map((l: RawEventLog) => ({
      address: l.address,
      topics: l.topics,
      data: l.data,
      blockNumber: parseInt(l.blockNumber, 16),
      blockHash: l.blockHash,
      transactionHash: l.transactionHash,
      transactionIndex: parseInt(l.transactionIndex, 16),
      logIndex: parseInt(l.logIndex, 16),
      removed: l.removed ?? false,
    }));
  } catch {
    return [];
  }
}

// ── /accounts/top (real richlist with tx_count) ─────────────────────────────
export async function fetchAccountsTop(network: NetworkId, limit = 100): Promise<TopHolder[]> {
  const res = await apiFetch<{
    accounts: Array<{ address: string; balance_srx: number; percentage: number; tx_count?: number; name?: string | null }>;
  }>(network, `/accounts/top?limit=${limit}`);
  if (!res?.accounts) return [];
  return res.accounts.map((a, i) => ({
    rank: i + 1,
    address: a.address,
    balance: a.balance_srx ?? 0,
    share: a.percentage ?? 0,
    label: a.name ?? undefined,
    tx_count: a.tx_count,
  }));
}

// ── SSR home bundle ─────────────────────────────────────────────────────────
// DECISION: gather everything the home shell needs in one parallel fetch with a tight per-call
// timeout, so the server can hand the browser a fully-painted page instead of a skeleton that
// has to wait for ~10 client-side fetches over Starlink-grade latency. Anything that times out
// comes back as null and the client polling hooks resolve it shortly after hydration.
export interface HomeBundle {
  stats: ChainInfo | null;
  blocks: BlockData[] | null;
  txs: TransactionData[] | null;
  status: ChainStatus | null;
  mempool: MempoolSnapshot | null;
  epoch: EpochInfo | null;
  performance: ChainPerformance | null;
}

export async function fetchHomeBundle(network: NetworkId, timeoutMs = 1500): Promise<HomeBundle> {
  const [stats, blocksRaw, txsRaw, status, mempool, epoch, performance] = await Promise.all([
    apiFetch<ChainInfo>(network, "/chain/info", timeoutMs),
    apiFetch<{ blocks: BlockData[] }>(network, "/chain/blocks?limit=10", timeoutMs),
    apiFetch<{ transactions: Array<{ txid: string; from: string; to: string; amount: number; fee: number; block_index: number; block_timestamp: number; timestamp?: number; is_coinbase?: boolean; status?: string }> } | Array<{ txid: string; from: string; to: string; amount: number; fee: number; block_index: number; block_timestamp: number; timestamp?: number; is_coinbase?: boolean; status?: string }>>(network, "/transactions?limit=10", timeoutMs),
    apiFetch<ChainStatus>(network, "/sentrix_status", timeoutMs),
    apiFetch<MempoolSnapshot>(network, "/mempool", timeoutMs),
    apiFetch<EpochInfo>(network, "/epoch/current", timeoutMs),
    apiFetch<ChainPerformance>(network, "/chain/performance?range=1h", timeoutMs),
  ]);

  const blocks = blocksRaw?.blocks ?? null;
  const txsArr = !txsRaw ? null : (Array.isArray(txsRaw) ? txsRaw : (txsRaw.transactions ?? []));
  const txs: TransactionData[] | null = txsArr === null ? null : txsArr.map((t) => ({
    id: t.txid,
    from: t.from,
    to: t.to,
    amount: toSrx(t.amount ?? 0),
    fee: toSrx(t.fee ?? 0),
    timestamp: String(t.timestamp ?? t.block_timestamp ?? 0),
    nonce: 0,
    signature: "",
    block_height: t.block_index,
    status: (t.status as TransactionData["status"]) ?? "confirmed",
    tx_type: t.is_coinbase ? "coinbase" : undefined,
  }));

  return { stats, blocks, txs, status, mempool: mempool ?? null, epoch, performance };
}
