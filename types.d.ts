// DECISION: Shim for Next 15.5 generated validator.ts which imports `next/types.js` with a .js
// extension. Under moduleResolution "bundler" TS cannot locate the sibling `.d.ts` for a `.js`
// specifier, so this shim forwards to the real module. Safe to remove once Next.js ships a fix.
declare module "next/types.js" {
  export * from "next/types";
}
