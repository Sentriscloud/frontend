# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this repository, please report it privately. **Do not open a public GitHub issue.**

**Contact:** `security@sentriscloud.com`

Please include:

- A description of the vulnerability
- Steps to reproduce
- The affected version / commit hash
- Any suggested mitigation

## Response Timeline

- **Initial acknowledgment:** within 72 hours
- **Triage:** within 7 days
- **Resolution target:** depends on severity (critical: days, high: weeks, medium: next release)

## Scope

In scope:

- Smart contracts deployed via canonical addresses on Sentrix Chain (chain ID 7119 mainnet, 7120 testnet)
- Sentrix node binary (consensus, state, EVM)
- Frontend apps that handle user keys or balances (faucet, scan, coinblast, dex, solux)
- Indexer / SDK that touches user-controlled data

Out of scope:

- Third-party dependencies (report upstream first; we can advisory-track if confirmed)
- Issues requiring physical access to a validator host
- Social engineering against operators

## Bug Bounty

A formal bug bounty program is under design. Reach out for case-by-case disclosure rewards.
