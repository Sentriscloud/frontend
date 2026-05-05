import { getApiUrl, type NetworkId } from "./chain";

// DECISION: Backend amounts are in "sentri" (1 SRX = 1e8 sentri). The UI displays SRX.
// All fetchers do the conversion at the edge so downstream code can treat numbers as SRX.
const SENTRI_PER_SRX = 100_000_000;
const toSrx = (sentri: number): number => sentri / SENTRI_PER_SRX;

// Tokenomics-v2 fixed supply cap. Chain returns this in `chain.info.max_supply_srx`
// today (post-fork, Voyager+EVM active), but we lock the constant client-side so
// any upstream regression — e.g. a node serving pre-fork state, or an indexer
// shipping a stale schema — doesn't surface a wrong cap in the UI.
export const MAX_SUPPLY_SRX = 315_000_000;

function normalizeChainInfo(info: ChainInfo | null): ChainInfo | null {
  if (!info) return null;
  info.max_supply_srx = MAX_SUPPLY_SRX;
  return info;
}

// Backend's address index is keyed on the lowercased 0x-prefixed form
// it stores in chain.db. Bare hex (no 0x) is treated as a *different*
// address — `/accounts/4fec…/balance` returns 0 even when the same
// address with the 0x prefix has 8 SRX. Worse, it returns 200 OK so
// the UI shows "balance: 0 SRX" silently. Normalize at the edge so a
// bare-hex URL paste (rare but real) lands on the right row.
function normalizeAddress(a: string): string {
  const lower = a.toLowerCase();
  return lower.startsWith("0x") ? lower : `0x${lower}`;
}

// Reverse of the above for tx hashes — REST `/transactions/<hash>`
// indexes on the bare-hex form, so a 0x-prefixed wallet hash returns
// empty. Strip the prefix before the REST call. JSON-RPC accepts both,
// but the detail page goes through REST, so this is the path that
// matters for the chainlist reviewer's "TX not found" complaint.
function normalizeTxHash(h: string): string {
  const lower = h.toLowerCase();
  return lower.startsWith("0x") ? lower.slice(2) : lower;
}

// DECISION: timeout is bounded by an AbortController. Default 8s for client polls (matches the
// browser's typical idle timeout). SSR callers should pass a tight value (e.g. 1500ms) so a
// slow upstream cannot stall page render past the user's patience window. Endpoints with
// known cold-cache slowness (`/stats/daily`, `/chain/performance` first hit ~25-30 s) override
// to 25 s — see SLOW_TIMEOUT_MS below.
const SLOW_TIMEOUT_MS = 25_000;

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
  // Fork-aware: pre tokenomics-v2 fork = 210M, post-fork = 315M.
  max_supply_srx: number;
  mempool_size: number;
  active_validators: number;
  deployed_tokens: number;
  next_block_reward_srx: number;
  // Backend-computed circulating supply (minted - burnt - locked premine,
  // reading the on-chain locked-state instead of relying on a static
  // PREMINE_TOTAL constant). Optional because the field was added later;
  // the supply page falls back to the manual calc if it's missing.
  circulating_supply_srx?: number;
  // Set on Voyager + EVM-active chains (post-h=579047 mainnet).
  consensus_mode?: "voyager" | "pioneer";
  voyager_activated?: boolean;
  evm_activated?: boolean;
  chain_id?: number;
  // TODO(api): needs /chain/stats to return cumulative tx count. Optional until backend ships.
  total_transactions?: number;
}

export interface BlockJustification {
  height: number;
  round: number;
  block_hash: string;
  precommits: Array<{
    validator: string;
    block_hash: string;
    signature: number[];
    stake_weight: number;
  }>;
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
  /** BFT round at which this block finalised. 0 = first-round happy-path. */
  round?: number;
  /** State root committed in the block hash (post STATE_ROOT_FORK_HEIGHT). */
  state_root?: string | number[] | null;
  /** Precommit-supermajority justification — only populated post-Voyager. */
  justification?: BlockJustification | null;
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
  /**
   * Standard the token is deployed under. `tokenop` = native Sentrix
   * SRC-20 (REST `/tokens` endpoint). `evm` = ERC-20 contract deployed
   * via the canonical TokenFactory (read off-chain from
   * `TokenDeployed` event logs). UI uses this to render a badge so
   * users can distinguish "Sentrix-native vs EVM contract" — they
   * have different audit surfaces and different transfer paths.
   */
  standard?: "tokenop" | "evm";
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

export async function fetchChainInfo(network: NetworkId): Promise<ChainInfo | null> {
  return normalizeChainInfo(await apiFetch<ChainInfo>(network, "/chain/info"));
}

export function fetchBlock(network: NetworkId, index: number) {
  return apiFetch<BlockData>(network, `/chain/blocks/${index}`);
}

export async function fetchLatestBlocks(network: NetworkId, count = 10) {
  const res = await apiFetch<{ blocks: BlockData[] }>(network, `/chain/blocks?limit=${count}`);
  return res?.blocks ?? [];
}

export interface BlocksPage {
  blocks: BlockData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
  };
}

/**
 * Server-paginated block list. Backend exposes `?page=N&limit=M` (limit
 * capped at 100 server-side) over the in-memory CHAIN_WINDOW_SIZE = 1000
 * window. For deeper history users navigate per-block via /chain/blocks/:height
 * or via the indexer's `/blocks` endpoint once that catches up.
 */
export async function fetchBlocksPage(network: NetworkId, page = 0, limit = 50): Promise<BlocksPage> {
  const res = await apiFetch<BlocksPage>(network, `/chain/blocks?page=${page}&limit=${Math.min(limit, 100)}`);
  return (
    res ?? {
      blocks: [],
      pagination: { page, limit, total: 0, has_more: false },
    }
  );
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
  const res = await apiFetch<RawTxDetail>(network, `/transactions/${normalizeTxHash(txId)}`);
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
  const addr = normalizeAddress(address);
  const info = await apiFetch<RawAccountInfo>(network, `/address/${addr}/info`);
  if (info) {
    return {
      address: info.address,
      balance: info.balance_srx ?? (info.balance_sentri ? toSrx(info.balance_sentri) : 0),
      nonce: info.nonce ?? 0,
      tx_count: info.tx_count?.window_tx_count,
    };
  }
  const bal = await apiFetch<RawAccountBalance>(network, `/accounts/${addr}/balance`);
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
    `/address/${normalizeAddress(address)}/history?limit=${limit}&offset=${offset}`,
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

// Backend returns DPoS-shape validators since Voyager activation
// (2026-04-25). Field names differ from the older PoA-era shape this
// scan UI was first written against: total_stake (sentri) instead of
// stake (SRX), commission_rate (basis points) instead of commission
// (%), blocks_signed instead of blocks_produced, pending_rewards
// (sentri) instead of rewards_earned. Translate here so every page
// further down the tree reads canonical, already-converted numbers
// and stops dropping into the "PoA validator" fallback layout.
type RawValidator = ValidatorData & {
  total_stake?: number;
  self_stake?: number;
  total_delegated?: number;
  commission_rate?: number;
  blocks_signed?: number;
  blocks_missed?: number;
  pending_rewards?: number;
  is_jailed?: boolean;
  is_tombstoned?: boolean;
};

export async function fetchValidators(network: NetworkId) {
  // /staking/validators has the rich shape (total_stake, commission_rate,
  // is_jailed, blocks_signed/missed, pending_rewards) — but doesn't carry
  // validator `name`. /validators (the legacy endpoint) has the names but
  // none of the stake data. Fetch both in parallel and merge on address
  // so the UI gets full coverage. Fixed 2026-05-02 after switching to
  // /staking/validators initially dropped the names from the page.
  const [stakingRes, namedRes] = await Promise.all([
    apiFetch<{ validators: RawValidator[] } | RawValidator[]>(network, "/staking/validators"),
    apiFetch<{ validators: RawValidator[] } | RawValidator[]>(network, "/validators"),
  ]);
  if (!stakingRes) return [];
  const stakingList = Array.isArray(stakingRes) ? stakingRes : (stakingRes.validators ?? []);
  const namedList = namedRes
    ? (Array.isArray(namedRes) ? namedRes : (namedRes.validators ?? []))
    : [];
  const nameByAddr = new Map(
    namedList
      .filter((v) => v.address && v.name)
      .map((v) => [v.address.toLowerCase(), v.name]),
  );
  const list = stakingList.map((v) => ({
    ...v,
    name: v.name ?? nameByAddr.get((v.address ?? "").toLowerCase()) ?? "",
  }));
  return list.map((v) => {
    const stake =
      v.stake !== undefined
        ? v.stake
        : v.total_stake !== undefined
          ? toSrx(v.total_stake)
          : undefined;
    const commission =
      v.commission !== undefined
        ? v.commission
        : v.commission_rate !== undefined
          ? v.commission_rate / 100
          : undefined;
    const blocksProduced = v.blocks_produced ?? v.blocks_signed;
    const totalSignable =
      v.blocks_signed !== undefined && v.blocks_missed !== undefined
        ? v.blocks_signed + v.blocks_missed
        : undefined;
    const uptime =
      v.uptime !== undefined
        ? v.uptime
        : totalSignable && totalSignable > 0
          ? ((v.blocks_signed ?? 0) / totalSignable) * 100
          : undefined;
    const rewards =
      v.rewards_earned !== undefined
        ? v.rewards_earned
        : v.pending_rewards !== undefined
          ? toSrx(v.pending_rewards)
          : undefined;
    const status =
      v.status ??
      (v.is_jailed
        ? "jailed"
        : v.is_active === false
          ? "inactive"
          : "active");
    return {
      ...v,
      stake,
      commission,
      uptime,
      blocks_produced: blocksProduced,
      rewards_earned: rewards,
      status,
    };
  });
}

export async function fetchTokens(network: NetworkId) {
  const [native, evm] = await Promise.all([
    fetchNativeTokens(network),
    fetchEvmTokensFromFactory(network),
  ]);
  // Dedupe by contract_address (lowercase). Native takes precedence
  // for any collision because it's the chain's own ledger; EVM events
  // could theoretically be replayed on a fork, so we trust native more.
  const seen = new Set(native.map((t) => t.contract_address.toLowerCase()));
  const merged: TokenData[] = [...native];
  for (const t of evm) {
    if (!seen.has(t.contract_address.toLowerCase())) merged.push(t);
  }
  return merged;
}

async function fetchNativeTokens(network: NetworkId): Promise<TokenData[]> {
  const res = await apiFetch<{ tokens: TokenData[] } | TokenData[]>(network, "/tokens");
  if (!res) return [];
  const list = Array.isArray(res) ? res : (res.tokens ?? []);
  return list.map((t) => ({ ...t, standard: "tokenop" as const }));
}

// Canonical TokenFactory v1.1.0 addresses + deploy blocks (per
// `canonical-contracts/deployments/{7119,7120}.json`). v1.0.0 is still
// on-chain at separate addresses; we intentionally only list v1.1.0
// tokens here so frontends pull the audit-hardened set. Future migration
// (e.g. v1.2.0) just needs to update this map.
//
// We track the deploy block so the chunked eth_getLogs walk below
// doesn't waste range on the empty pre-factory window. Sentrix's
// eth_getLogs caps usable range at well under 64K blocks (silently
// returns empty above ~5K) so we walk the deploy-block → latest
// window in 5000-block chunks. With 1B blocks/yr this caps the
// number of round-trips at ~200K/yr, plenty fast for an explorer.
const TOKEN_FACTORY_V1_1_0: Record<NetworkId, { addr: `0x${string}`; fromBlock: number }> = {
  mainnet: { addr: "0x53C3838e18703c763564Bb983694CF117B33D366", fromBlock: 0x1142da },
  testnet: { addr: "0xaE2a8512f0de635F8E90069e2877098c9e0baEc7", fromBlock: 0x17f57f },
};

const LOGS_CHUNK_SIZE = 5_000;

async function fetchEvmTokensFromFactory(network: NetworkId): Promise<TokenData[]> {
  const cfg = TOKEN_FACTORY_V1_1_0[network];
  if (!cfg) return [];

  // Get the chain tip in hex so we know when to stop.
  const base = network === "testnet"
    ? (process.env.NEXT_PUBLIC_TESTNET_API || "https://testnet-api.sentrixchain.com")
    : (process.env.NEXT_PUBLIC_MAINNET_API || "https://api.sentrixchain.com");
  let tip = 0;
  try {
    const r = await fetch(`${base}/rpc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 }),
      cache: "no-store",
    });
    const body = await r.json();
    if (body?.result) tip = parseInt(body.result, 16);
  } catch {
    return [];
  }
  if (tip === 0) return [];

  const logs: EventLog[] = [];
  for (let from = cfg.fromBlock; from <= tip; from += LOGS_CHUNK_SIZE) {
    const to = Math.min(from + LOGS_CHUNK_SIZE - 1, tip);
    const chunk = await fetchEventLogs(network, cfg.addr, from, to);
    logs.push(...chunk);
  }

  const tokens: TokenData[] = [];
  for (const log of logs) {
    if (!log.topics || log.topics.length !== 3) continue;
    const tokenAddr = "0x" + log.topics[1].slice(-40);
    const ownerAddr = "0x" + log.topics[2].slice(-40);
    // data = ABI-encoded (string name, string symbol, uint256 supply).
    // Strings are dynamic; decode via offset/length walk.
    const data = log.data.startsWith("0x") ? log.data.slice(2) : log.data;
    let name = "";
    let symbol = "";
    let supply = 0;
    try {
      // Layout: offset_name (32B), offset_symbol (32B), supply (32B),
      //         then the two string blobs at their offsets. Each 32-byte
      //         field needs 64 hex chars. Anything shorter = malformed
      //         event data — skip rather than crash with BigInt("0x") or
      //         render binary bytes as DC4/STX/ETX control chars in the UI.
      if (data.length < 192) continue;
      const offName = parseInt(data.slice(0, 64), 16) * 2;
      const offSym = parseInt(data.slice(64, 128), 16) * 2;
      const supplyHex = data.slice(128, 192);
      if (!Number.isFinite(offName) || !Number.isFinite(offSym) || !/^[0-9a-fA-F]{64}$/.test(supplyHex)) continue;
      supply = Number(BigInt("0x" + supplyHex)) / 1e18; // 18-decimal display
      name = decodeAbiString(data, offName);
      symbol = decodeAbiString(data, offSym);
      // If either string came back as binary garbage (e.g. the on-chain
      // symbol slot is uninitialised or the contract emitted bytes that
      // aren't valid UTF-8), drop the entry rather than render DC4/BTH/
      // STX placeholders. A token with an unprintable symbol is unusable
      // in the UI anyway and the user gets a cleaner empty list.
      if (!isPrintable(name) || !isPrintable(symbol)) continue;
    } catch {
      // Skip malformed event — never break the whole page render
      continue;
    }
    tokens.push({
      contract_address: tokenAddr,
      name,
      symbol,
      decimals: 18,
      total_supply: supply,
      owner: ownerAddr,
      standard: "evm",
    });
  }
  return tokens;
}

function decodeAbiString(data: string, offset: number): string {
  if (!Number.isFinite(offset) || offset < 0 || offset + 64 > data.length) return "";
  const lenHex = data.slice(offset, offset + 64);
  const len = parseInt(lenHex, 16);
  if (!Number.isFinite(len) || len < 0 || len > 1024) return ""; // sanity cap
  const start = offset + 64;
  const end = start + len * 2;
  if (end > data.length) return "";
  const bytes = data.slice(start, end);
  let s = "";
  for (let i = 0; i < bytes.length; i += 2) {
    const code = parseInt(bytes.slice(i, i + 2), 16);
    if (Number.isNaN(code)) return "";
    s += String.fromCharCode(code);
  }
  return s;
}

// "Printable enough to render as a token name/symbol." Allows
// ASCII printable + common Latin extended; rejects strings with any
// control characters (which is what produces "DC4"/"STX"/"BTH" in the
// UI when binary data is decoded as if it were UTF-8 string).
function isPrintable(s: string): boolean {
  if (!s || s.length === 0) return false;
  // C0 controls (0-31), DEL (127), C1 controls (128-159), and the
  // Unicode replacement char (U+FFFD) all disqualify the string.
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 32 || c === 127 || (c >= 128 && c <= 159) || c === 0xFFFD) return false;
  }
  return true;
}

export async function fetchToken(network: NetworkId, address: string): Promise<TokenData | null> {
  const addr = normalizeAddress(address);
  // Native first — `/tokens/{addr}` only resolves for native TokenOp.
  const native = await apiFetch<TokenData>(network, `/tokens/${addr}`);
  if (native) return { ...native, standard: "tokenop" };
  // Fall back to ERC-20 read-via-RPC for EVM contracts (TokenFactory-deployed
  // or any other ERC-20). Multicall would be tighter, but per-field calls
  // keep this readable + work without Multicall3 ABI in this file.
  return await fetchEvmTokenFromChain(network, addr);
}

async function fetchEvmTokenFromChain(network: NetworkId, address: string): Promise<TokenData | null> {
  const addr = normalizeAddress(address);
  const base = network === "testnet"
    ? (process.env.NEXT_PUBLIC_TESTNET_API || "https://testnet-api.sentrixchain.com")
    : (process.env.NEXT_PUBLIC_MAINNET_API || "https://api.sentrixchain.com");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  async function call(sig: string): Promise<string | null> {
    try {
      const res = await fetch(`${base}/rpc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_call",
          params: [{ to: addr, data: sig }, "latest"],
          id: 1,
        }),
        signal: ctrl.signal,
        cache: "no-store",
      });
      const body = await res.json();
      return body?.result ?? null;
    } catch {
      return null;
    }
  }
  try {
    // ABI selectors (precomputed):
    //   name()           = 0x06fdde03
    //   symbol()         = 0x95d89b41
    //   decimals()       = 0x313ce567
    //   totalSupply()    = 0x18160ddd
    const [nameRaw, symRaw, decRaw, supplyRaw] = await Promise.all([
      call("0x06fdde03"),
      call("0x95d89b41"),
      call("0x313ce567"),
      call("0x18160ddd"),
    ]);
    if (!nameRaw || !symRaw) return null;
    const decode = (raw: string) => decodeAbiString(raw.replace(/^0x/, ""), 0);
    const decimals = decRaw ? parseInt(decRaw, 16) : 18;
    const supply = supplyRaw
      ? Number(BigInt(supplyRaw)) / Math.pow(10, decimals)
      : 0;
    return {
      contract_address: addr,
      name: decode(nameRaw),
      symbol: decode(symRaw),
      decimals,
      total_supply: supply,
      owner: "",
      standard: "evm",
    };
  } finally {
    clearTimeout(timer);
  }
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
    `/tokens/${normalizeAddress(contract)}/holders?limit=${limit}`,
  );
  if (!res?.holders) return [];
  return res.holders.map((h) => ({
    address: h.address,
    // 2026-04-30 audit: balance_sentri is the raw 1e8-scaled value; older
    // code returned it as-is, so the holder list rendered numbers 10^8×
    // larger than reality. Convert to SRX at the edge.
    balance: h.balance ?? (h.balance_sentri !== undefined ? toSrx(h.balance_sentri) : 0),
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
    `/tokens/${normalizeAddress(contract)}/trades?limit=${limit}&offset=${offset}`,
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
  // Cold cache routinely needs >20 s — backend recomputes the 14-day
  // aggregate before serving. The default 8 s timeout was the reason the
  // home TX-per-day chart silently rendered empty on first load.
  const res = await apiFetch<DailyStat[]>(network, "/stats/daily", SLOW_TIMEOUT_MS);
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
  // Cold cache for this endpoint hits ~25 s on the live edge before the
  // backend's window aggregator fills. Default 8 s timeout silently
  // dropped first-render perf-chart fetches into the retry-on-backoff
  // loop, which made the chart appear broken until the warm-cache hit.
  return apiFetch<ChainPerformance>(network, `/chain/performance?range=${range}`, SLOW_TIMEOUT_MS);
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
  const res = await apiFetch<{ tokens: RawAccountTokenHolding[] }>(network, `/accounts/${normalizeAddress(address)}/tokens`);
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
  amount: number; // SRX (post-conversion)
}

interface RawValidatorReward {
  block_height?: number;
  height?: number;
  timestamp?: number;
  amount?: number;
  amount_sentri?: number;
  amount_srx?: number;
}

export async function fetchValidatorRewards(
  network: NetworkId,
  address: string,
  page = 1,
  limit = 20,
): Promise<{ rewards: ValidatorReward[]; hasMore: boolean }> {
  const res = await apiFetch<{ rewards: RawValidatorReward[]; pagination?: { has_more?: boolean } }>(
    network,
    `/validators/${normalizeAddress(address)}/rewards?page=${page}&limit=${limit}`,
  );
  // 2026-04-30 audit: backend `amount` is in sentri (1e8) for parity with
  // /staking/validators.pending_rewards. The hook layer would otherwise
  // render rewards with 8 phantom decimals.
  const rewards: ValidatorReward[] = (res?.rewards ?? []).map((r) => ({
    block_height: r.block_height ?? r.height ?? 0,
    timestamp: r.timestamp ?? 0,
    amount: r.amount_srx ?? (r.amount_sentri !== undefined ? toSrx(r.amount_sentri) : toSrx(r.amount ?? 0)),
  }));
  return { rewards, hasMore: res?.pagination?.has_more ?? false };
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
    `/validators/${normalizeAddress(address)}/blocks-over-time?range=${range}`,
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
  }>(network, `/validators/${normalizeAddress(address)}/delegators`);
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
  // Active validator set for this epoch — added by the API but missing
  // from the type until 2026-05-02. Surfaced on /epochs so the user
  // knows which validators are signing during the current window.
  validator_set?: string[];
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
    ? (process.env.NEXT_PUBLIC_TESTNET_API || "https://testnet-api.sentrixchain.com")
    : (process.env.NEXT_PUBLIC_MAINNET_API || "https://api.sentrixchain.com"));
  const fromHex = typeof fromBlock === "number" ? `0x${fromBlock.toString(16)}` : fromBlock;
  const toHex = typeof toBlock === "number" ? `0x${toBlock.toString(16)}` : toBlock;
  // 2026-04-30 audit: this function previously had no timeout. A slow RPC
  // would hang the page render forever. 8s matches the apiFetch default.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
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
      signal: ctrl.signal,
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
  } finally {
    clearTimeout(timer);
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
  const [statsRaw, blocksRaw, txsRaw, status, mempool, epoch, performance] = await Promise.all([
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

  const stats = normalizeChainInfo(statsRaw);
  return { stats, blocks, txs, status, mempool: mempool ?? null, epoch, performance };
}
