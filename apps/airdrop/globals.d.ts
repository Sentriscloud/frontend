/// <reference types="next" />
/// <reference types="next/image-types/global" />

// CSS side-effect imports (e.g. `import "./globals.css"`)
// Typically declared by the auto-generated next-env.d.ts, but that
// file is gitignored + only emitted after `next build`. CI runs
// `pnpm typecheck` before `next build`, so we mirror those refs
// here to keep TS 6 happy.
declare module "*.css";
