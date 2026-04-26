export type NavLink = {
  label: string;
  href: string;
  external?: boolean;
};

export const primaryNav: NavLink[] = [
  { label: "Products", href: "#products" },
  { label: "Why us", href: "#why" },
  { label: "Developers", href: "#developers" },
  { label: "Chain", href: "https://sentrixchain.com", external: true },
];

export const footerLinks = {
  products: [
    { label: "SentrixScan", href: "https://sentrixscan.sentriscloud.com", external: true },
    { label: "Solux", href: "https://wallet.sentriscloud.com", external: true },
    { label: "Sentrix Faucet", href: "https://sentrix-faucet.sentriscloud.com", external: true },
    { label: "CoinBlast", href: "#", external: false },
  ],
  ecosystem: [
    { label: "Sentrix Chain", href: "https://sentrixchain.com", external: true },
    { label: "Sentrix Labs", href: "https://github.com/sentrix-labs", external: true },
    { label: "Brand kit", href: "https://github.com/sentrix-labs/brand-kit", external: true },
    { label: "Validator program", href: "https://sentrixchain.com/validators", external: true },
  ],
  company: [
    { label: "About", href: "#about" },
    { label: "Contact", href: "mailto:contact@sentriscloud.com" },
    { label: "Security", href: "mailto:security@sentriscloud.com" },
    { label: "GitHub", href: "https://github.com/Sentriscloud", external: true },
  ],
} as const;
