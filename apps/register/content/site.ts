/**
 * Site-wide metadata + branding constants.
 * Edit here once; pulled by layout, OG image, sitemap, robots.
 */
export const site = {
  name: "Sentrix Validator Registration",
  tagline: "Self-service validator onboarding for Sentrix Chain.",
  description:
    "Web wizard for submitting StakingOp::RegisterValidator with WalletConnect — coming soon. CLI path (`sentrix staking register`) is available today.",
  url: "https://register.sentrixchain.com",
  email: {
    contact: "validators@sentrixchain.com",
    security: "security@sentriscloud.com",
  },
  social: {
    github: "https://github.com/sentrix-labs/sentrix",
    twitter: "https://x.com/sentriscloud",
    telegram: "https://t.me/SentrixChain",
  },
  related: {
    chain: "https://sentrixchain.com",
    docs: "https://docs.sentrixchain.com/operations/validator-onboarding",
    scan: "https://scan.sentrixchain.com/validators",
  },
  marks: {
    logoPng: "https://cdn.jsdelivr.net/gh/sentrix-labs/brand-kit@master/png-transparent/sentriscloud-512.png",
    logoSvg: "https://cdn.jsdelivr.net/gh/sentrix-labs/brand-kit@master/svg/sentriscloud-mark.svg",
  },
} as const;
