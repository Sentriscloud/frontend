# Contributing

Thanks for your interest in Sentrix.

## Quick start

1. Fork the repo, clone your fork.
2. Create a branch: `git checkout -b feat/my-change`.
3. Make your change. Keep PRs focused.
4. Run the test suite locally before opening the PR.
5. Open a pull request against `main`. CI runs automatically.

## PR conventions

- One conceptual change per PR.
- Conventional-commit-style title: `feat:`, `fix:`, `chore:`, `docs:`, `ci:`, `test:`, `refactor:`.
- Test plan in the PR body.
- For consensus-touching code in `sentrix-labs/sentrix`: include a regression test that fails on `main` and passes after.

## Code style

- Match existing patterns in the file/module.
- No drive-by formatting changes outside the diff.
- For Rust: `cargo fmt` + `cargo clippy --workspace --tests -- -D warnings` clean.
- For TypeScript: `pnpm lint` + `pnpm typecheck` clean.
- For Solidity: `forge fmt` + `forge build` clean.

## Bug reports

Use the issue templates. Include version/commit + reproduction steps.

## Security

Vulnerabilities go to `security@sentriscloud.com`, NOT a public issue. See `SECURITY.md`.
