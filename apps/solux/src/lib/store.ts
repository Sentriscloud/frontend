import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WalletState {
  privateKey: string | null;
  address: string | null;
  watchOnly: boolean;            // true = no privkey, address loaded for monitoring only
  // mnemonic kept session-only (never persisted) so Settings → Add account
  // can derive more without re-prompting. Cleared on lock or browser close.
  mnemonic: string | null;
  activeIndex: number;            // active HD path index for the loaded mnemonic
  setWallet: (privateKey: string, address: string) => void;
  setWatchOnly: (address: string) => void;
  setMnemonicWallet: (mnemonic: string, privateKey: string, address: string, index: number) => void;
  switchAccount: (privateKey: string, address: string, index: number) => void;
  clearWallet: () => void;
}

export const useWalletStore = create<WalletState>()((set) => ({
  privateKey: null,
  address: null,
  watchOnly: false,
  mnemonic: null,
  activeIndex: 0,
  setWallet: (privateKey, address) =>
    set({ privateKey, address, watchOnly: false, mnemonic: null, activeIndex: 0 }),
  setWatchOnly: (address) =>
    set({ privateKey: null, address, watchOnly: true, mnemonic: null, activeIndex: 0 }),
  setMnemonicWallet: (mnemonic, privateKey, address, index) =>
    set({ privateKey, address, watchOnly: false, mnemonic, activeIndex: index }),
  switchAccount: (privateKey, address, index) =>
    set({ privateKey, address, activeIndex: index }),
  clearWallet: () =>
    set({ privateKey: null, address: null, watchOnly: false, mnemonic: null, activeIndex: 0 }),
}));

// ── Settings (persisted) ───────────────────────────────────────────────

export type Locale = 'en' | 'id';
export type Network = 'mainnet' | 'testnet';
export type Theme = 'default' | 'colorful' | 'light' | 'ocean' | 'sentris';

export interface ThemeMeta {
  id: Theme;
  label: string;
  description: string;
  preview: { bg: string; surface: string; accent: string; text: string };
}

export const THEMES: Record<Theme, ThemeMeta> = {
  default: {
    id: 'default',
    label: 'Onyx',
    description: 'Polished onyx and antique brass',
    preview: { bg: '#0a0a0d', surface: '#1c1c22', accent: '#c49a4e', text: '#f4f0e0' },
  },
  colorful: {
    id: 'colorful',
    label: 'Bordeaux',
    description: 'Oxblood wine and cordovan leather',
    preview: { bg: '#150709', surface: '#2a1218', accent: '#c4564a', text: '#f4e8d4' },
  },
  light: {
    id: 'light',
    label: 'Newsprint',
    description: 'Salmon paper and terracotta ink',
    preview: { bg: '#fff1e5', surface: '#fff8ee', accent: '#8f4132', text: '#2a2520' },
  },
  ocean: {
    id: 'ocean',
    label: 'Midnight',
    description: 'Indigo dial and chronograph amber',
    preview: { bg: '#0a1228', surface: '#182547', accent: '#e0a050', text: '#f0ecde' },
  },
  sentris: {
    id: 'sentris',
    label: 'Sentris',
    description: 'SentrisCloud brand emerald',
    preview: { bg: '#0a0a0c', surface: '#16161a', accent: '#10b981', text: '#f5f5f4' },
  },
};

export interface NetworkConfig {
  network: Network;
  label: string;
  chainId: number;
  apiUrl: string;
  accent: 'gold' | 'teal';
}

// Per Caddyfile + memory: testnet API at testnet-api.sentriscloud.com
// (4-validator stack on VPS4, migrated 2026-04-23). Mainnet round-robins
// VPS1/2/3 via sentrix-api.sentriscloud.com.
export const NETWORKS: Record<Network, NetworkConfig> = {
  mainnet: {
    network: 'mainnet',
    label: 'Mainnet',
    chainId: 7119,
    apiUrl: 'https://sentrix-api.sentriscloud.com',
    accent: 'gold',
  },
  testnet: {
    network: 'testnet',
    label: 'Testnet',
    chainId: 7120,
    apiUrl: 'https://testnet-api.sentriscloud.com',
    accent: 'teal',
  },
};

interface SettingsState {
  autoLockMinutes: number;
  hideBalances: boolean;
  locale: Locale;
  network: Network;
  theme: Theme;
  setAutoLockMinutes: (n: number) => void;
  setHideBalances: (b: boolean) => void;
  setLocale: (l: Locale) => void;
  setNetwork: (n: Network) => void;
  setTheme: (t: Theme) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      autoLockMinutes: 15,
      hideBalances: false,
      locale: 'en',
      network: 'mainnet',
      theme: 'default',
      setAutoLockMinutes: (n) => set({ autoLockMinutes: n }),
      setHideBalances: (b) => set({ hideBalances: b }),
      setLocale: (l) => set({ locale: l }),
      setNetwork: (n) => set({ network: n }),
      setTheme: (t) => set({ theme: t }),
    }),
    { name: 'solux-settings' },
  ),
);

/** Read the active network config — usable from non-React modules (api.ts). */
export function getActiveNetwork(): NetworkConfig {
  return NETWORKS[useSettingsStore.getState().network];
}

// ── Notifications (in-app activity feed) ──────────────────────────────
// Local-only feed of wallet events. Lifecycle: pushed on broadcast / on
// finality / on inbound detection, marked read when user opens panel.
// Persisted per address so notifications survive lock/refresh.

export type NotificationKind =
  | 'tx-broadcast'    // user sent a tx, awaiting confirmation
  | 'tx-confirmed'    // tx in block
  | 'tx-finalized'    // tx finalized
  | 'tx-expired'      // tx never landed
  | 'tx-received'     // someone sent us SRX
  | 'staking'         // delegate / undelegate / claim
  | 'system';         // network warning, upgrade, etc.

export interface Notification {
  id: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  txid?: string;
  amount?: number;          // sentri
  blockHeight?: number;
  createdAt: number;        // unix ms
  read: boolean;
  network: Network;
}

interface NotificationState {
  /** keyed by lowercase address */
  byAddress: Record<string, Notification[]>;
  push: (address: string, n: Omit<Notification, 'id' | 'createdAt' | 'read' | 'network'> & { network?: Network }) => string;
  update: (address: string, id: string, patch: Partial<Notification>) => void;
  markAllRead: (address: string) => void;
  clear: (address: string) => void;
  list: (address: string) => Notification[];
  unreadCount: (address: string) => number;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      byAddress: {},
      push: (address, n) => {
        const a = address.toLowerCase();
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const network = n.network ?? useSettingsStore.getState().network;
        const entry: Notification = {
          ...n,
          id,
          createdAt: Date.now(),
          read: false,
          network,
        };
        const list = get().byAddress[a] ?? [];
        // Cap at 50 most recent so localStorage doesn't bloat indefinitely
        const next = [entry, ...list].slice(0, 50);
        set({ byAddress: { ...get().byAddress, [a]: next } });
        return id;
      },
      update: (address, id, patch) => {
        const a = address.toLowerCase();
        const list = get().byAddress[a] ?? [];
        set({
          byAddress: {
            ...get().byAddress,
            [a]: list.map((n) => (n.id === id ? { ...n, ...patch } : n)),
          },
        });
      },
      markAllRead: (address) => {
        const a = address.toLowerCase();
        const list = get().byAddress[a] ?? [];
        set({
          byAddress: { ...get().byAddress, [a]: list.map((n) => ({ ...n, read: true })) },
        });
      },
      clear: (address) => {
        const a = address.toLowerCase();
        set({ byAddress: { ...get().byAddress, [a]: [] } });
      },
      list: (address) => get().byAddress[address.toLowerCase()] ?? [],
      unreadCount: (address) =>
        (get().byAddress[address.toLowerCase()] ?? []).filter((n) => !n.read).length,
    }),
    { name: 'solux-notifications' },
  ),
);

// ── Client-side pending nonce tracker ──────────────────────────────────
// Server's getNonce returns the on-chain nonce. The mempool dispatcher
// expects `expected = on_chain + mempool_pending(addr)`. If the user
// submits two txs back-to-back, both will see the same on-chain nonce,
// so the second one's nonce ends up below the server's expectation and
// is rejected with "InvalidNonce".
//
// This store remembers "the highest nonce we've already broadcast" per
// (network, address). Send paths use `max(server_nonce, last_local + 1)`.
// Cleared on wallet lock / network switch (mempool isolated per chain).

interface NonceState {
  nonces: Record<string, number>; // key: `${network}:${address.lower()}` → last used nonce
  bumpNonce: (network: Network, address: string, used: number) => void;
  getLocalNext: (network: Network, address: string) => number | null;
  clear: () => void;
}

export const useNonceStore = create<NonceState>()((set, get) => ({
  nonces: {},
  bumpNonce: (network, address, used) => {
    const key = `${network}:${address.toLowerCase()}`;
    const prev = get().nonces[key] ?? -1;
    if (used > prev) set({ nonces: { ...get().nonces, [key]: used } });
  },
  getLocalNext: (network, address) => {
    const key = `${network}:${address.toLowerCase()}`;
    const last = get().nonces[key];
    return last === undefined ? null : last + 1;
  },
  clear: () => set({ nonces: {} }),
}));

// ── Address book (persisted) ───────────────────────────────────────────
// Local labels only. Never sent on-chain. Lowercased addresses for dedupe.

export interface AddressBookEntry {
  address: string;          // lowercase 0x…
  label: string;
  note?: string;
  createdAt: number;
}

interface AddressBookState {
  entries: AddressBookEntry[];
  add: (address: string, label: string, note?: string) => void;
  update: (address: string, patch: Partial<Omit<AddressBookEntry, 'address' | 'createdAt'>>) => void;
  remove: (address: string) => void;
  lookup: (address: string) => AddressBookEntry | undefined;
}

export const useAddressBookStore = create<AddressBookState>()(
  persist(
    (set, get) => ({
      entries: [],
      add: (address, label, note) => {
        const a = address.toLowerCase();
        const exists = get().entries.find((e) => e.address === a);
        if (exists) {
          set({
            entries: get().entries.map((e) =>
              e.address === a ? { ...e, label, note } : e,
            ),
          });
        } else {
          set({
            entries: [...get().entries, { address: a, label, note, createdAt: Date.now() }],
          });
        }
      },
      update: (address, patch) => {
        const a = address.toLowerCase();
        set({
          entries: get().entries.map((e) => (e.address === a ? { ...e, ...patch } : e)),
        });
      },
      remove: (address) => {
        const a = address.toLowerCase();
        set({ entries: get().entries.filter((e) => e.address !== a) });
      },
      lookup: (address) => {
        const a = address.toLowerCase();
        return get().entries.find((e) => e.address === a);
      },
    }),
    { name: 'solux-address-book' },
  ),
);
