// Bridges the static seed list (MOCK_TOKENS — hand-curated rows that
// carry rich metadata: imageUrl, social links, description, curve
// address, graduation threshold) with the live on-chain registry
// (every TokenDeployed event from TokenFactory v1.1.0). The result is
// a single array of Token objects rendered by TokenCard.
//
// Match logic: address-as-lowercase. Static rows win for any token
// they describe (we have richer metadata for them); live-only rows
// inherit a sensible default Token shape with placeholder cards.

import type { Token } from "@/types";
import type { DeployedToken } from "./useDeployedTokens";
import type { DeployedCurve } from "./useDeployedCurves";
import { listLocalLaunches, localLaunchToToken } from "./local-launches";

export function mergeStaticAndDeployed(
  staticTokens: Token[],
  deployed: DeployedToken[],
  chainId = 7119,
  curves: DeployedCurve[] = [],
): Token[] {
  const seen = new Map<string, Token>();
  // Static wins first — rich metadata (description, image, socials).
  for (const t of staticTokens) seen.set(t.address.toLowerCase(), t);
  // Cross-device factory curves next — every CoinBlastFactory.createCurve
  // call. These have the curve address, threshold, and the on-chain owner.
  for (const c of curves) {
    const key = c.tokenAddress.toLowerCase();
    if (seen.has(key)) continue;
    seen.set(key, deployedCurveToToken(c));
  }
  // Local launches — the user's own deployments, captured at /create
  // submit so they show even before the factory event scan completes.
  for (const l of listLocalLaunches(chainId)) {
    const key = l.tokenAddress.toLowerCase();
    if (seen.has(key)) continue;
    seen.set(key, localLaunchToToken(l));
  }
  // TokenFactory live registry last — covers bare ERC-20 deploys via
  // the older /create flow (no curve attached). Kept for back-compat
  // until those tokens age out.
  for (const d of deployed) {
    const key = d.address.toLowerCase();
    if (seen.has(key)) continue;
    seen.set(key, deployedToToken(d));
  }
  return Array.from(seen.values());
}

function deployedCurveToToken(c: DeployedCurve): Token {
  const totalSupply = Number(c.curveSupply / 10n ** 18n);
  const gradSrx = Number(c.graduationSrxThreshold / 10n ** 18n);
  return {
    address: c.tokenAddress,
    curveAddress: c.curveAddress,
    name: c.name || "Unnamed",
    symbol: c.symbol || "—",
    description: "",
    imageUrl: "",
    creator: c.owner,
    totalSupply,
    tokensSold: 0,
    createdAt: 0,
    volume24h: 0,
    isGraduated: false,
    isWarned: false,
    isVerified: false,
    price: 0.0001,
    marketCap: 0,
    progress: 0,
    graduationThresholdSrx: gradSrx,
  };
}

function deployedToToken(d: DeployedToken): Token {
  // initialSupply is in token-wei (18 decimals across the FactoryToken
  // template). Render in whole tokens for the launchpad cards.
  const totalSupply = Number(d.initialSupply / 10n ** 18n);
  return {
    address: d.address,
    name: d.name || "Unnamed",
    symbol: d.symbol || "—",
    description: "",
    imageUrl: "",
    creator: d.owner,
    totalSupply,
    tokensSold: 0,
    // 0 = "just launched" per formatTimestamp short-circuit. Could
    // refine later by fetching the deploy block's timestamp.
    createdAt: 0,
    volume24h: 0,
    isGraduated: false,
    isWarned: false,
    isVerified: false,
    price: 0,
    marketCap: 0,
    progress: 0,
    // No curveAddress — bare TokenFactory deployment, BuySellWidget
    // renders the PreviewWidget "Curve not deployed" state. UX gap
    // worth a follow-up: route /create through CoinBlastCurve so every
    // launch ships with a tradeable curve attached.
  };
}
