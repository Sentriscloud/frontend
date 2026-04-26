import * as secp from '@noble/secp256k1';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { sha256 } from '@noble/hashes/sha2.js';

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export function generatePrivateKey(): string {
  const bytes = secp.utils.randomSecretKey();
  return bytesToHex(bytes);
}

export function privateKeyToAddress(privateKeyHex: string): string {
  const pubKey = secp.getPublicKey(hexToBytes(privateKeyHex), false);
  const hash = keccak_256(pubKey.slice(1));
  const addressBytes = hash.slice(-20);
  return '0x' + bytesToHex(addressBytes);
}

export function privateKeyToPublicKey(privateKeyHex: string): string {
  const pubKey = secp.getPublicKey(hexToBytes(privateKeyHex), false);
  return bytesToHex(pubKey);
}

export interface SigningPayload {
  from: string;
  to: string;
  amount: number;
  fee: number;
  nonce: number;
  data: string;
  timestamp: number;
  chain_id: number;
}

export function buildSigningPayload(payload: SigningPayload): string {
  const ordered = {
    amount: payload.amount,
    chain_id: payload.chain_id,
    data: payload.data,
    fee: payload.fee,
    from: payload.from,
    nonce: payload.nonce,
    timestamp: payload.timestamp,
    to: payload.to,
  };
  return JSON.stringify(ordered);
}

export async function signTransaction(
  payload: SigningPayload,
  privateKeyHex: string
): Promise<{ signature: string; txid: string; public_key: string }> {
  const payloadStr = buildSigningPayload(payload);
  const msgBytes = new TextEncoder().encode(payloadStr);
  const msgHash = sha256(msgBytes);
  const keyBytes = hexToBytes(privateKeyHex);
  try {
    const sig = await secp.signAsync(msgHash, keyBytes, { lowS: true });
    const sigBytes = typeof sig === 'object' && 'toCompactRawBytes' in sig
      ? (sig as { toCompactRawBytes: () => Uint8Array }).toCompactRawBytes()
      : sig as Uint8Array;
    const txid = bytesToHex(sha256(msgBytes));
    const public_key = bytesToHex(secp.getPublicKey(keyBytes, false));
    return {
      signature: bytesToHex(sigBytes),
      txid,
      public_key,
    };
  } finally {
    keyBytes.fill(0);
  }
}

export function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

export function isValidPrivateKey(hex: string): boolean {
  try {
    if (hex.length !== 64) return false;
    const bytes = hexToBytes(hex);
    secp.getPublicKey(bytes, false);
    return true;
  } catch {
    return false;
  }
}
