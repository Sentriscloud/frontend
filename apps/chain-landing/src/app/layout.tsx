// Root layout is intentionally minimal — html/body, providers, and metadata
// live in `app/[locale]/layout.tsx`. Next 16 requires a root layout file.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
