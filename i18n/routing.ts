import { defineRouting } from "next-intl/routing";

// DECISION: default locale EN per updated user spec. Routes both /id and /en are prerendered;
// `localePrefix: "always"` forces a locale in the URL for SEO clarity.
export const routing = defineRouting({
  locales: ["id", "en"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
