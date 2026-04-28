import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { loadVault, type Vault } from './vault';

// Wallet has three lifecycle states surfaced to the UI:
//   no-vault   → no localStorage entry → show WalletSetup
//   locked     → encrypted vault on disk, key not in memory → show UnlockScreen
//   unlocked   → key in memory → show Dashboard
// Watch-only is a fourth, simpler path: vault is plain (no key to protect),
// hydrates straight to "unlocked" with `watchOnly: true`.
interface WalletState {
  privateKey: string | null;
  address: string | null;
  watchOnly: boolean;
  // mnemonic kept session-only (never persisted in plain form). When the
  // wallet is locked, it lives encrypted inside the vault blob and only
  // gets decrypted back into memory on unlock.
  mnemonic: string | null;
  activeIndex: number;

  // Vault metadata mirror — populated from localStorage on app boot so the
  // UI can render the correct screen (locked / no-vault) before the user
  // does anything. `null` until hydrated, then concrete or null.
  vault: Vault | null;
  hydrated: boolean;

  // In-memory unlock — populates privateKey/mnemonic/address from a
  // decrypted vault. Does NOT touch localStorage; used after user enters
  // password, or after watch-vault hydration, or after fresh setup.
  unlock: (args: {
    privateKey: string | null;
    address: string;
    mnemonic?: string | null;
    activeIndex?: number;
    watchOnly?: boolean;
  }) => void;

  // Auto-lock / manual lock — wipes in-memory key but keeps vault on disk.
  // User re-enters password to unlock again.
  lock: () => void;

  // Switch HD account index without touching the vault — vault still holds
  // the mnemonic, store just points at a different derived key.
  switchAccount: (privateKey: string, address: string, index: number) => void;

  // Full reset for "Remove wallet" — clears memory AND vault. After this,
  // the user lands back on WalletSetup.
  clearWallet: () => void;

  // Hydration from localStorage on app mount. Called once at boot.
  hydrate: () => void;

  // After encrypting a fresh vault, push the metadata into the store so
  // the locked-screen path is populated when the user locks/refreshes.
  setVault: (vault: Vault | null) => void;
}

export const useWalletStore = create<WalletState>()((set, get) => ({
  privateKey: null,
  address: null,
  watchOnly: false,
  mnemonic: null,
  activeIndex: 0,
  vault: null,
  hydrated: false,

  unlock: ({ privateKey, address, mnemonic = null, activeIndex = 0, watchOnly = false }) =>
    set({ privateKey, address, mnemonic, activeIndex, watchOnly }),

  lock: () =>
    // Keep vault metadata; wipe everything else.
    set({ privateKey: null, mnemonic: null, address: null, watchOnly: false, activeIndex: 0 }),

  switchAccount: (privateKey, address, index) =>
    set({ privateKey, address, activeIndex: index }),

  clearWallet: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('solux-vault');
    }
    set({
      privateKey: null,
      address: null,
      watchOnly: false,
      mnemonic: null,
      activeIndex: 0,
      vault: null,
    });
  },

  hydrate: () => {
    if (get().hydrated) return;
    const vault = loadVault();
    // Watch vaults can hydrate immediately into "unlocked" state — no key
    // to protect, no password to prompt.
    if (vault?.kind === 'watch') {
      set({ vault, hydrated: true, address: vault.address, watchOnly: true });
    } else {
      set({ vault, hydrated: true });
    }
  },

  setVault: (vault) => set({ vault }),
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

// Chain API moved to sentrixchain.com domain in 2026-04. Old sentriscloud.com
// API hostnames have no DNS — wallet showed disconnected because every RPC
// call failed to resolve. Mainnet endpoint round-robins across producer
// validators behind the edge proxy; testnet is a separate 4-validator stack.
export const NETWORKS: Record<Network, NetworkConfig> = {
  mainnet: {
    network: 'mainnet',
    label: 'Mainnet',
    chainId: 7119,
    apiUrl: 'https://api.sentrixchain.com',
    accent: 'gold',
  },
  testnet: {
    network: 'testnet',
    label: 'Testnet',
    chainId: 7120,
    apiUrl: 'https://testnet-api.sentrixchain.com',
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
