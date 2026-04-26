// Web3 Secret Storage v3 keystore — same format as MetaMask, Geth, MyCrypto.
// A keystore is a JSON file holding an encrypted private key. Decryption needs
// the password the user picked at export time. Compatibility goal: keystores
// produced here open cleanly in MetaMask, and MetaMask exports open here.

import { ctr } from '@noble/ciphers/aes.js';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { privateKeyToAddress } from './crypto';

// ── Helpers ────────────────────────────────────────────────────────────
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, '');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    out[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return out;
}

function randomBytes(n: number): Uint8Array {
  const arr = new Uint8Array(n);
  crypto.getRandomValues(arr);
  return arr;
}

function uuidv4(): string {
  // RFC 4122 v4 — 16 random bytes with version + variant bits set
  const b = randomBytes(16);
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant 10
  const h = bytesToHex(b);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// ── Keystore v3 schema (subset we support) ────────────────────────────
export interface KeystoreV3 {
  version: 3;
  id: string;
  address: string;             // hex without 0x prefix (MetaMask convention)
  crypto: {
    cipher: 'aes-128-ctr';
    ciphertext: string;        // hex
    cipherparams: { iv: string };
    kdf: 'scrypt' | 'pbkdf2';
    kdfparams: ScryptParams | Pbkdf2Params;
    mac: string;               // hex
  };
}

interface ScryptParams { n: number; r: number; p: number; dklen: number; salt: string; }
interface Pbkdf2Params { c: number; prf: 'hmac-sha256'; dklen: number; salt: string; }

function isScryptParams(p: ScryptParams | Pbkdf2Params): p is ScryptParams {
  return (p as ScryptParams).n !== undefined;
}

// ── Decrypt ────────────────────────────────────────────────────────────
export async function decryptKeystore(
  raw: string | KeystoreV3,
  password: string,
): Promise<string> {
  const ks: KeystoreV3 = typeof raw === 'string' ? JSON.parse(raw) : raw;

  if (ks.version !== 3) {
    throw new Error(`Unsupported keystore version: ${ks.version} (only v3 supported)`);
  }
  if (ks.crypto.cipher !== 'aes-128-ctr') {
    throw new Error(`Unsupported cipher: ${ks.crypto.cipher}`);
  }

  const passwordBytes = new TextEncoder().encode(password);
  const params = ks.crypto.kdfparams;
  const salt = hexToBytes(params.salt);
  let derivedKey: Uint8Array;

  if (ks.crypto.kdf === 'scrypt' && isScryptParams(params)) {
    derivedKey = await scryptAsync(passwordBytes, salt, {
      N: params.n, r: params.r, p: params.p, dkLen: params.dklen,
    });
  } else if (ks.crypto.kdf === 'pbkdf2' && !isScryptParams(params)) {
    if (params.prf !== 'hmac-sha256') throw new Error(`Unsupported PRF: ${params.prf}`);
    derivedKey = await pbkdf2Async(sha256, passwordBytes, salt, {
      c: params.c, dkLen: params.dklen,
    });
  } else {
    throw new Error(`Unsupported KDF: ${ks.crypto.kdf}`);
  }

  // MAC = keccak256(derivedKey[16:32] || ciphertext)
  const ciphertext = hexToBytes(ks.crypto.ciphertext);
  const macInput = new Uint8Array(16 + ciphertext.length);
  macInput.set(derivedKey.slice(16, 32), 0);
  macInput.set(ciphertext, 16);
  const computedMac = bytesToHex(keccak_256(macInput));
  if (computedMac.toLowerCase() !== ks.crypto.mac.toLowerCase()) {
    throw new Error('Invalid password (MAC mismatch)');
  }

  // Decrypt with AES-128-CTR using first 16 bytes of derived key
  const iv = hexToBytes(ks.crypto.cipherparams.iv);
  const aesKey = derivedKey.slice(0, 16);
  const stream = ctr(aesKey, iv);
  const privKey = stream.decrypt(ciphertext);

  if (privKey.length !== 32) {
    throw new Error(`Decrypted key has wrong length: ${privKey.length}`);
  }
  return bytesToHex(privKey);
}

// ── Encrypt ────────────────────────────────────────────────────────────
// Defaults match Geth/MetaMask "light" preset (n=2^12) for browser speed.
// "standard" preset (n=2^17) takes ~2s on a phone — too slow for casual export.
// Users who want stronger params can re-encrypt via geth/MetaMask.
export interface EncryptOptions {
  kdf?: 'scrypt' | 'pbkdf2';
  // scrypt
  n?: number;     // CPU/memory cost (default 2^17 = 131072)
  r?: number;
  p?: number;
  // pbkdf2
  c?: number;     // iteration count
  // shared
  dklen?: number;
}

export async function encryptKeystore(
  privateKeyHex: string,
  password: string,
  opts: EncryptOptions = {},
): Promise<KeystoreV3> {
  const privKey = hexToBytes(privateKeyHex);
  if (privKey.length !== 32) throw new Error('Invalid private key');

  const passwordBytes = new TextEncoder().encode(password);
  const salt = randomBytes(32);
  const iv = randomBytes(16);
  const dklen = opts.dklen ?? 32;
  const kdf = opts.kdf ?? 'scrypt';

  let derivedKey: Uint8Array;
  let kdfparams: ScryptParams | Pbkdf2Params;

  if (kdf === 'scrypt') {
    // Geth defaults: n=131072 r=8 p=1. On modern phones ≈ 1-2s.
    const n = opts.n ?? 131072;
    const r = opts.r ?? 8;
    const p = opts.p ?? 1;
    derivedKey = await scryptAsync(passwordBytes, salt, { N: n, r, p, dkLen: dklen });
    kdfparams = { n, r, p, dklen, salt: bytesToHex(salt) };
  } else {
    const c = opts.c ?? 262144;
    derivedKey = await pbkdf2Async(sha256, passwordBytes, salt, { c, dkLen: dklen });
    kdfparams = { c, prf: 'hmac-sha256', dklen, salt: bytesToHex(salt) };
  }

  const aesKey = derivedKey.slice(0, 16);
  const stream = ctr(aesKey, iv);
  const ciphertext = stream.encrypt(privKey);

  const macInput = new Uint8Array(16 + ciphertext.length);
  macInput.set(derivedKey.slice(16, 32), 0);
  macInput.set(ciphertext, 16);
  const mac = bytesToHex(keccak_256(macInput));

  // Address without 0x prefix per MetaMask convention
  const address = privateKeyToAddress(privateKeyHex).replace(/^0x/, '');

  return {
    version: 3,
    id: uuidv4(),
    address,
    crypto: {
      cipher: 'aes-128-ctr',
      ciphertext: bytesToHex(ciphertext),
      cipherparams: { iv: bytesToHex(iv) },
      kdf,
      kdfparams,
      mac,
    },
  };
}

export function isValidKeystoreJson(text: string): boolean {
  try {
    const obj = JSON.parse(text);
    return (
      obj &&
      typeof obj === 'object' &&
      obj.version === 3 &&
      obj.crypto &&
      typeof obj.crypto.ciphertext === 'string' &&
      typeof obj.crypto.mac === 'string' &&
      (obj.crypto.kdf === 'scrypt' || obj.crypto.kdf === 'pbkdf2')
    );
  } catch {
    return false;
  }
}
