#!/usr/bin/env bash
# Static-analysis sweep for known anti-patterns across the monorepo.
# Catches the kind of bugs we hit 2026-05-03: malformed explorer URLs,
# hardcoded chainId where it should be network-aware, missing CORS on
# fetch responses, etc.
#
# Run from repo root:   bash scripts/audit-static.sh
# Exit code = number of issues. CI can `set -e` and fail the build.
#
# Each section prints the rule + the offending lines. Add new rules at
# the bottom; keep them grep-friendly so they're easy to maintain.

set -uo pipefail

# Anchor at repo root regardless of where the script is invoked from.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Skip stuff that would create false positives if we matched generically.
EXCLUDE='--exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.turbo --exclude=*.tsbuildinfo --exclude=*.lock --exclude=pnpm-lock.yaml'
APPS_GLOB='apps/*/src apps/*/app apps/*/components apps/*/lib'

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
ylw()   { printf '\033[33m%s\033[0m\n' "$*"; }

ISSUES=0

section() {
  printf '\n──────  %s  ──────\n' "$1"
}

# Each rule:
#  rule "Title" "regex" "where" [--invert]
#  hits = grep finds the pattern → we print + count.
rule() {
  local title="$1" pattern="$2" target="${3-$APPS_GLOB}"
  section "$title"
  # shellcheck disable=SC2086
  local hits
  hits=$(grep -rnE $EXCLUDE "$pattern" $target 2>/dev/null || true)
  if [ -z "$hits" ]; then
    green "  clean"
    return 0
  fi
  echo "$hits" | while IFS= read -r line; do
    red "  ✗ $line"
  done
  local count
  count=$(printf '%s\n' "$hits" | wc -l)
  ISSUES=$((ISSUES + count))
}

# ── Rule 1: explorer URL composed with `?network=` BEFORE the path ────
# Example bug: explorerBase: 'https://scan.sentrixchain.com/?network=testnet'
# then `${explorerBase}/tx/${hash}` produces .../?network=testnet/tx/<hash>
# (path swallowed into query string → scan renders home).
#
# The regex anchors on quote/string delimiters so we only match the URL
# as a real value, never as comment text describing the bug. Three legit
# delimiters: ', ", `.
section "explorer URL with ?network= before path (broken composition)"
hits=$(grep -rnE $EXCLUDE "['\"\`]https?://scan\.sentrixchain\.com/?\?network=" $APPS_GLOB 2>/dev/null \
       | grep -vE '^\s*//' \
       | grep -vE '^[^:]+:[0-9]+:\s*\*' || true)
if [ -z "$hits" ]; then
  green "  clean"
else
  echo "$hits" | while IFS= read -r line; do
    red "  ✗ $line"
  done
  count=$(echo "$hits" | wc -l)
  ISSUES=$((ISSUES + count))
fi

# ── Rule 2: hardcoded chainId in components that should be network-aware ──
# Watch for chainId: 7119 literals OUTSIDE of NETWORKS lookup tables.
# Whitelist: chain.ts files (intentional config), create/page.tsx (per-net map).
section "hardcoded chainId 7119/7120 in component code (should use useChainId)"
hits=$(grep -rnE $EXCLUDE 'chainId:\s*(7119|7120)' apps/*/src/components apps/*/components 2>/dev/null \
       | grep -v '/lib/chain\.ts:' \
       | grep -v 'NETWORKS\[' || true)
if [ -z "$hits" ]; then
  green "  clean"
else
  echo "$hits" | while IFS= read -r line; do
    ylw "  ? $line  (verify intentional)"
  done
fi

# ── Rule 3: bare `https://scan.sentrixchain.com/tx/` without ?network= guard ──
# This is OK on mainnet-only apps (airdrop, coinblast main flow). Scan defaults
# to mainnet so a bare URL works there. This rule prints them as warnings —
# manual review confirms each is mainnet-only by design.
section "bare scan/tx links without ?network= (mainnet-only apps OK)"
hits=$(grep -rnE $EXCLUDE 'scan\.sentrixchain\.com/(tx|address|block)' $APPS_GLOB 2>/dev/null \
       | grep -v 'network=' \
       | grep -v 'sentrixchain\.com/tx[/"][^"]*\${' || true)
if [ -z "$hits" ]; then
  green "  clean"
else
  echo "$hits" | while IFS= read -r line; do
    ylw "  ? $line"
  done
fi

# ── Rule 4: TODO(api) / FIXME / BUG markers in shipped code ────────────
section "TODO(api) / FIXME / BUG markers (deferred work)"
hits=$(grep -rnE $EXCLUDE 'TODO\(api\)|FIXME|XXX|HACK' $APPS_GLOB 2>/dev/null || true)
if [ -z "$hits" ]; then
  green "  clean"
else
  echo "$hits" | while IFS= read -r line; do
    ylw "  ? $line"
  done
fi

# ── Rule 5: console.log / console.error left in production code ────────
section "leaked console.log/console.error in app code (should use logger)"
hits=$(grep -rnE $EXCLUDE 'console\.(log|error|warn|debug)\b' $APPS_GLOB 2>/dev/null \
       | grep -vE '/(scripts|test|tests|__tests__)/' \
       | grep -v '// eslint-disable.*console' || true)
if [ -z "$hits" ]; then
  green "  clean"
else
  echo "$hits" | head -20 | while IFS= read -r line; do
    ylw "  ? $line"
  done
  total=$(echo "$hits" | wc -l)
  if [ "$total" -gt 20 ]; then
    ylw "  ... ($((total - 20)) more)"
  fi
fi

# ── Rule 6: any/unknown casts that often paper over type bugs ──────────
section "as any / as unknown casts (review for safer types)"
hits=$(grep -rnE $EXCLUDE '\bas\s+any\b|\bas\s+unknown\b' $APPS_GLOB 2>/dev/null || true)
if [ -z "$hits" ]; then
  green "  clean"
else
  echo "$hits" | head -10 | while IFS= read -r line; do
    ylw "  ? $line"
  done
  total=$(echo "$hits" | wc -l)
  if [ "$total" -gt 10 ]; then
    ylw "  ... ($((total - 10)) more)"
  fi
fi

# ── Rule 7: empty catch blocks that swallow errors ─────────────────────
section "empty catch blocks (silent failures)"
hits=$(grep -rnPzo $EXCLUDE 'catch\s*\([^)]*\)\s*\{\s*\}' $APPS_GLOB 2>/dev/null || true)
if [ -z "$hits" ]; then
  green "  clean"
else
  red "  ✗ found empty catch — review manually"
  echo "$hits"
fi

# ── Rule 8: deprecated API usage (memory: don't use these) ─────────────
# Grok flagged THREE.Clock as deprecated; we'd want similar lint for
# anything we deprecate internally. Skeleton — extend as needed.
section "deprecated three.js (use TimerNode / Timer)"
hits=$(grep -rnE $EXCLUDE 'THREE\.Clock|new Clock\(\)' apps/chain-landing 2>/dev/null || true)
if [ -z "$hits" ]; then
  green "  clean"
else
  echo "$hits" | while IFS= read -r line; do
    ylw "  ? $line"
  done
fi

# ── Rule 9: unscoped CORS-from-edge expectations (chain RPC paths) ─────
# Anywhere we fetch the chain RPC from a different origin without
# expecting Caddy edge CORS — flagged for review.
section "fetch to rpc.sentrixchain.com from app code (verify edge CORS still in Caddyfile)"
hits=$(grep -rnE $EXCLUDE 'fetch\([^)]*rpc\.sentrixchain' $APPS_GLOB 2>/dev/null || true)
if [ -z "$hits" ]; then
  green "  no direct fetch — wagmi/viem handles RPC"
else
  echo "$hits" | while IFS= read -r line; do
    ylw "  ? $line"
  done
fi

printf '\n────────────────────────────────────────\n'
if [ "$ISSUES" -eq 0 ]; then
  green "Static audit: no hard errors found."
else
  red "Static audit: $ISSUES hard error(s). Yellow lines are review-only."
fi
exit "$ISSUES"
