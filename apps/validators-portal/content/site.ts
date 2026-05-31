/**
 * Site-wide metadata + branding constants.
 * Edit here once; pulled by layout, OG image, sitemap, robots.
 */
export const site = {
  name: "Sentrix Validators",
  tagline: "Validator directory + delegation portal for Sentrix Chain.",
  description:
    "Browse Sentrix Chain validators by stake, commission, and uptime. Delegate SRX with a wallet click. Read-only directory + delegate flow coming soon.",
  url: "https://validators.sentrixchain.com",
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
    docs: "https://docs.sentrixchain.com/operations/validator-guide",
    scan: "https://scan.sentrixchain.com/validators",
    register: "https://register.sentrixchain.com",
  },
  marks: {
    logoPng: "https://cdn.jsdelivr.net/gh/sentrix-labs/brand-kit@master/png-transparent/sentriscloud-512.png",
    logoSvg: "https://cdn.jsdelivr.net/gh/sentrix-labs/brand-kit@master/svg/sentriscloud-mark.svg",
  },
} as const;
