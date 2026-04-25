import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/theme-provider";
import { NetworkProvider } from "@/lib/network-context";
import type { NetworkId } from "@/lib/chain";
import { LabelBootstrap } from "@/components/layout/label-bootstrap";
import { Header, MobileBottomNav } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Toaster } from "@/components/layout/toaster";
import { routing } from "@/i18n/routing";
import { getApiUrl } from "@/lib/chain";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

async function readNetworkCookie(): Promise<NetworkId> {
  const cookieStore = await cookies();
  const stored = cookieStore.get("sentrix-network")?.value;
  return stored === "testnet" ? "testnet" : "mainnet";
}

export async function generateMetadata(): Promise<Metadata> {
  const network = await readNetworkCookie();
  const chainId = network === "testnet" ? 7120 : 7119;
  const label = network === "testnet" ? "Testnet" : "Mainnet";
  return {
    description: `Block explorer for Sentrix Chain ${label} (SRX). Browse blocks, transactions, addresses, validators, and SRC-20 tokens on Chain ID ${chainId}.`,
    keywords: ["sentrix", "block explorer", "blockchain", "SRX", `chain id ${chainId}`, "EVM", "sentrix scan", network],
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const initialNetwork = await readNetworkCookie();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href={getApiUrl(initialNetwork)} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={getApiUrl(initialNetwork === "testnet" ? "mainnet" : "testnet")} />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <NextIntlClientProvider>
          <ThemeProvider>
            <NetworkProvider initial={initialNetwork}>
              <LabelBootstrap>
                <Header />
                <main className="flex-1 pb-16 md:pb-0">{children}</main>
                <Footer />
                <MobileBottomNav />
                <Toaster />
              </LabelBootstrap>
            </NetworkProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
