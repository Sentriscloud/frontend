import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import ThemeProvider from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Solux — Sentrix Chain Wallet",
  description: "Self-custody wallet for Sentrix Chain. Hold, send, and receive SRX. Chain ID 7119.",
  applicationName: "Solux",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [
      { rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#c8a84a" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "Solux",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "Solux — Sentrix Chain Wallet",
    description: "Self-custody wallet for Sentrix Chain. Hold, send, and receive SRX.",
    type: "website",
    siteName: "Solux",
  },
  twitter: {
    card: "summary",
    title: "Solux — Sentrix Chain Wallet",
    description: "Self-custody wallet for Sentrix Chain.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0c10",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider />
        <ServiceWorkerRegister />
        {children}
        <Toaster
          position="bottom-center"
          containerStyle={{
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)',
          }}
          toastOptions={{
            style: {
              background: 'var(--sf)',
              color: 'var(--tx)',
              border: '1px solid var(--brd-s)',
              fontSize: '13px',
              fontWeight: 500,
              borderRadius: '12px',
              padding: '12px 16px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.45), 0 0 0 1px var(--brd)',
              maxWidth: '90vw',
            },
            success: {
              iconTheme: { primary: 'var(--gold)', secondary: 'var(--sf)' },
            },
            error: {
              iconTheme: { primary: 'var(--red)', secondary: 'var(--sf)' },
            },
          }}
        />
      </body>
    </html>
  );
}
