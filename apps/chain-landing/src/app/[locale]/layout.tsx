import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { SmoothScroll } from "@/components/ui/smooth-scroll";
import { routing } from "../../../i18n/routing";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("title"),
    description: t("description"),
    keywords: ["sentrix", "sentrix chain", "blockchain", "layer-1", "L1", "EVM", "rust blockchain", "SRX", "DPoS", "BFT", "chain id 7119"],
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: "/en",
        id: "/id",
        "x-default": "/en",
      },
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/brand/favicon-32x32.png", type: "image/png", sizes: "32x32" },
        { url: "/brand/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      ],
      apple: "/brand/apple-touch-icon.png",
      shortcut: "/favicon.ico",
    },
    openGraph: {
      type: "website",
      siteName: "Sentrix Chain",
      title: t("title"),
      description: t("description"),
      url: `https://sentrixchain.com/${locale}`,
      images: [{ url: "/brand/og-image.png", width: 1200, height: 630, alt: t("title") }],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: ["/brand/og-image.png"],
    },
    metadataBase: new URL("https://sentrixchain.com"),
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

  const t = await getTranslations({ locale, namespace: "meta" });
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Sentrix Chain",
    url: "https://sentrixchain.com",
    description: t("description"),
    inLanguage: ["en", "id"],
    publisher: {
      "@type": "Organization",
      name: "Sentrix Labs",
      url: "https://sentrixchain.com",
    },
  };

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <NextIntlClientProvider>
          <ThemeProvider>
            <SmoothScroll />
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
