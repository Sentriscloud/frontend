import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  // Ignore Next's build output + the type-only shims it generates.
  // Without this, `next build` artefacts in .next/ get lint-walked and
  // surface ~5800 false-positive `any`/require-style errors that aren't
  // in source.
  {
    ignores: [
      ".next/**",
      "next-env.d.ts",
      "node_modules/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
