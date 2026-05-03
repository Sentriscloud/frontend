// Selector dictionary fallback. When a contract isn't verified on Sourcify
// we can't render named arguments — but we can still surface the function
// name from the 4-byte selector. Seed list covers the common ERC-20/721
// surface plus the Sentrix DEX router (UniswapV2-equivalent) so the
// majority of mainnet activity decodes without operator intervention.
//
// On selector collisions: 4byte.directory has ~1M signatures and most
// real-world traffic concentrates on <500 of them. We pick the canonical
// signature per selector (the one Etherscan also picks) — if the trace
// shows a different signature, the user can verify the contract and the
// Sourcify path takes over.
//
// To extend: add `selector: signature` pairs below. Selectors are the
// keccak256 of the canonical signature, first 4 bytes, lowercase hex.

export const METHOD_SIGNATURES: Record<string, string> = {
  // ERC-20
  "0xa9059cbb": "transfer(address,uint256)",
  "0x23b872dd": "transferFrom(address,address,uint256)",
  "0x095ea7b3": "approve(address,uint256)",
  "0x70a08231": "balanceOf(address)",
  "0xdd62ed3e": "allowance(address,address)",
  "0x18160ddd": "totalSupply()",
  "0x06fdde03": "name()",
  "0x95d89b41": "symbol()",
  "0x313ce567": "decimals()",

  // Mint/burn
  "0x40c10f19": "mint(address,uint256)",
  "0x42966c68": "burn(uint256)",
  "0x6a627842": "mint(address)",
  "0xa0712d68": "mint(uint256)",

  // ERC-721
  "0x42842e0e": "safeTransferFrom(address,address,uint256)",
  "0xb88d4fde": "safeTransferFrom(address,address,uint256,bytes)",
  "0xa22cb465": "setApprovalForAll(address,bool)",
  "0xe985e9c5": "isApprovedForAll(address,address)",
  "0x081812fc": "getApproved(uint256)",
  "0x6352211e": "ownerOf(uint256)",
  "0xc87b56dd": "tokenURI(uint256)",

  // ERC-1155
  "0xf242432a": "safeTransferFrom(address,address,uint256,uint256,bytes)",
  "0x2eb2c2d6": "safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)",
  "0x4e1273f4": "balanceOfBatch(address[],uint256[])",

  // UniswapV2 router (mirrors Sentrix DEX since router is V2-equivalent)
  "0x7ff36ab5": "swapExactETHForTokens(uint256,address[],address,uint256)",
  "0x18cbafe5": "swapExactTokensForETH(uint256,uint256,address[],address,uint256)",
  "0x38ed1739": "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)",
  "0x8803dbee": "swapTokensForExactTokens(uint256,uint256,address[],address,uint256)",
  "0xfb3bdb41": "swapETHForExactTokens(uint256,address[],address,uint256)",
  "0x4a25d94a": "swapTokensForExactETH(uint256,uint256,address[],address,uint256)",
  "0xe8e33700": "addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256)",
  "0xf305d719": "addLiquidityETH(address,uint256,uint256,uint256,address,uint256)",
  "0xbaa2abde": "removeLiquidity(address,address,uint256,uint256,uint256,address,uint256)",
  "0x02751cec": "removeLiquidityETH(address,uint256,uint256,uint256,address,uint256)",
  "0xd06ca61f": "getAmountsOut(uint256,address[])",
  "0x1f00ca74": "getAmountsIn(uint256,address[])",

  // Sentrix DEX router — SRX-flavoured variants of the WETH wrappers above.
  // (Selector is the keccak of the readable signature.)
  "0xa05f9906": "swapExactSRXForTokens(uint256,address[],address,uint256)",
  "0xb1b8c2c4": "swapExactTokensForSRX(uint256,uint256,address[],address,uint256)",
  "0xb7c52ce4": "addLiquiditySRX(address,uint256,uint256,uint256,address,uint256)",
  "0x4e8a9968": "removeLiquiditySRX(address,uint256,uint256,uint256,address,uint256)",

  // Multicall (Uniswap V3 / Permit2 style)
  "0xac9650d8": "multicall(bytes[])",
  "0x5ae401dc": "multicall(uint256,bytes[])",

  // Permit / EIP-2612
  "0xd505accf": "permit(address,address,uint256,uint256,uint8,bytes32,bytes32)",

  // Proxy / Ownable / AccessControl
  "0xf2fde38b": "transferOwnership(address)",
  "0x715018a6": "renounceOwnership()",
  "0x8da5cb5b": "owner()",
  "0x2f2ff15d": "grantRole(bytes32,address)",
  "0xd547741f": "revokeRole(bytes32,address)",
  "0x91d14854": "hasRole(bytes32,address)",

  // EIP-1967 proxy
  "0x4f1ef286": "upgradeToAndCall(address,bytes)",
  "0x3659cfe6": "upgradeTo(address)",

  // WETH / WSRX
  "0xd0e30db0": "deposit()",
  "0x2e1a7d4d": "withdraw(uint256)",

  // Pair (UniswapV2)
  "0x0902f1ac": "getReserves()",
  "0xc45a0155": "factory()",
  "0x0dfe1681": "token0()",
  "0xd21220a7": "token1()",
};

/** Look up the canonical signature for a 4-byte selector. */
export function lookupMethodSignature(selector: string): string | undefined {
  if (!selector || !selector.startsWith("0x")) return undefined;
  const key = selector.slice(0, 10).toLowerCase();
  return METHOD_SIGNATURES[key];
}

/** Extract the selector + remainder from a calldata blob. */
export function splitInputData(input: string): { selector: string; args: string } | null {
  if (!input || !input.startsWith("0x") || input.length < 10) return null;
  return { selector: input.slice(0, 10).toLowerCase(), args: "0x" + input.slice(10) };
}
