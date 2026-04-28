// Vault — password-encrypted persistent wallet storage.
//
// Threat model: an attacker with read access to localStorage (XSS, malicious
// extension, attacker with the device unlocked) should not be able to recover
// the private key without the user's password. PBKDF2-SHA256 with 600,000
// iterations + AES-256-GCM is the same primitive set MetaMask uses for its
// vault, and matches OWASP 2023 guidance for password-based KDF.
//
// Watch-only wallets store no key, so they persist as plaintext JSON
// (just an address). No password prompt on unlock — the address is loaded
// directly into the store on app open.

import { gcm } from '@noble/ciphers/aes.js';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';

const VAULT_KEY = 'solux-vault';
const VAULT_VERSION = 1 as const;
const PBKDF2_ITER = 600_000;
const KEY_LEN = 32;          // AES-256
const SALT_LEN = 16;
const NONCE_LEN = 12;        // GCM standard

export interface VaultPlaintext {
  privateKey: string;        // hex 64 chars (no 0x)
  mnemonic?: string;         // BIP39 phrase, present only for HD wallets
  activeIndex?: number;      // HD path index of currently-active account
}

interface EncryptedVault {
  v: typeof VAULT_VERSION;
  kind: 'encrypted';
  address: string;
  kdf: 'pbkdf2-sha256';
  iter: number;
  salt: string;              // hex
  nonce: string;             // hex
  ct: string;                // hex (ciphertext + GCM auth tag concatenated)
}

interface WatchVault {
  v: typeof VAULT_VERSION;
  kind: 'watch';
  address: string;
}

export type Vault = EncryptedVault | WatchVault;

// ── Hex helpers ─────────────────────────────────────────────────────
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    out[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return out;
}
function randomBytes(n: number): Uint8Array {
  const arr = new Uint8Array(n);
  crypto.getRandomValues(arr);
  return arr;
}

// ── Encryption ──────────────────────────────────────────────────────
async function deriveKey(password: string, salt: Uint8Array, iter: number): Promise<Uint8Array> {
  const passwordBytes = new TextEncoder().encode(password);
  return pbkdf2Async(sha256, passwordBytes, salt, { c: iter, dkLen: KEY_LEN });
}

export async function encryptVault(plaintext: VaultPlaintext, password: string, address: string): Promise<EncryptedVault> {
  const salt = randomBytes(SALT_LEN);
  const nonce = randomBytes(NONCE_LEN);
  const key = await deriveKey(password, salt, PBKDF2_ITER);
  const json = new TextEncoder().encode(JSON.stringify(plaintext));
  const ct = gcm(key, nonce).encrypt(json);
  return {
    v: VAULT_VERSION,
    kind: 'encrypted',
    address,
    kdf: 'pbkdf2-sha256',
    iter: PBKDF2_ITER,
    salt: bytesToHex(salt),
    nonce: bytesToHex(nonce),
    ct: bytesToHex(ct),
  };
}

export async function decryptVault(vault: EncryptedVault, password: string): Promise<VaultPlaintext> {
  const salt = hexToBytes(vault.salt);
  const nonce = hexToBytes(vault.nonce);
  const ct = hexToBytes(vault.ct);
  const key = await deriveKey(password, salt, vault.iter);
  // GCM auth-tag mismatch throws — caller maps to "wrong password"
  const pt = gcm(key, nonce).decrypt(ct);
  return JSON.parse(new TextDecoder().decode(pt)) as VaultPlaintext;
}

// ── localStorage I/O ────────────────────────────────────────────────
export function loadVault(): Vault | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(VAULT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Vault;
    if (parsed?.v !== VAULT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveVault(vault: Vault): void {
  window.localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
}

export function clearVault(): void {
  window.localStorage.removeItem(VAULT_KEY);
}

export function saveWatchVault(address: string): WatchVault {
  const vault: WatchVault = { v: VAULT_VERSION, kind: 'watch', address };
  saveVault(vault);
  return vault;
}
