// EVM transaction signing for cross-app dapp integration. Solux's own
// /send /stake flows use the chain's NATIVE tx format (custom signature
// scheme in `crypto.ts`), but DEX / CoinBlast / Airdrop talk to revm-
// deployed EVM contracts and need EIP-1559 RLP+secp256k1 signing.
//
// The same secp256k1 private key works for both — Sentrix derives EVM-
// style addresses (keccak256(pubkey)[-20:]) so the address a Solux user
// shows in their dashboard is the same address contracts see at
// msg.sender. Only the encoding+hashing of the tx itself differs.
//
// We delegate to viem (already a transitive dep through wallet-config in
// the monorepo) so we don't reimplement RLP, EIP-1559 envelopes, or
// secp256k1 RFC-6979. Just glue.

import {
  privateKeyToAccount,
  type PrivateKeyAccount,
} from "viem/accounts";
import type { Hex, TransactionSerializable } from "viem";

export interface EvmSignRequest {
  chainId: number;
  to: `0x${string}`;
  data?: `0x${string}`;
  value?: bigint;
  gas?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  nonce?: number;
}

/**
 * Build a viem account from a hex-encoded private key (no 0x prefix —
 * Solux's vault stores raw hex). Memoise externally if you call this in
 * a hot loop; for the popup-based signing UX it's once per click.
 */
export function accountFromPrivateKey(privateKeyHex: string): PrivateKeyAccount {
  const hex = (privateKeyHex.startsWith("0x") ? privateKeyHex : `0x${privateKeyHex}`) as Hex;
  return privateKeyToAccount(hex);
}

/**
 * Sign an EIP-1559 (type-2) EVM transaction and return the raw signed
 * bytes ready to broadcast via eth_sendRawTransaction. The consumer
 * passes everything except the signature; we construct the canonical
 * serializable, hand it to viem, and return the result.
 *
 * If `nonce` is omitted, the caller is responsible for supplying it
 * before invoking — the popup boundary doesn't talk to the chain itself.
 */
export async function signEvmTransaction(
  privateKeyHex: string,
  req: EvmSignRequest,
): Promise<`0x${string}`> {
  const account = accountFromPrivateKey(privateKeyHex);
  const tx: TransactionSerializable = {
    type: "eip1559",
    chainId: req.chainId,
    to: req.to,
    data: req.data ?? "0x",
    value: req.value ?? 0n,
    gas: req.gas,
    maxFeePerGas: req.maxFeePerGas,
    maxPriorityFeePerGas: req.maxPriorityFeePerGas,
    nonce: req.nonce,
  };
  return account.signTransaction(tx);
}
