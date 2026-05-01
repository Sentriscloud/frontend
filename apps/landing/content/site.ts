/**
 * Site-wide metadata + branding constants.
 * Edit here once; pulled by layout, OG image, sitemap, robots.
 */
export const site = {
  name: "SentrisCloud",
  tagline: "Products built on Sentrix Chain.",
  description:
    "SentrisCloud builds the user-facing layer of the Sentrix ecosystem — explorers, wallets, faucets, and exchanges that make the chain usable for everyone.",
  url: "https://sentriscloud.com",
  email: {
    contact: "contact@sentriscloud.com",
    security: "security@sentriscloud.com",
  },
  social: {
    github: "https://github.com/Sentriscloud",
    twitter: "https://x.com/sentriscloud",
    telegram: "https://t.me/SentrixChain",
  },
  related: {
    chain: "https://sentrixchain.com",
    labs: "https://github.com/sentrix-labs",
    brandKit: "https://github.com/sentrix-labs/brand-kit",
  },
  marks: {
    logoPng: "https://cdn.jsdelivr.net/gh/sentrix-labs/brand-kit@master/png-transparent/sentriscloud-512.png",
    logoSvg: "https://cdn.jsdelivr.net/gh/sentrix-labs/brand-kit@master/svg/sentriscloud-mark.svg",
  },
} as const;
