import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Solux — Sentrix Chain Wallet",
  description: "Solux: self-custody wallet for Sentrix Chain (SRX). Chain ID 7119.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" style={{ background: '#030712' }}>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#0D1426',
              color: '#F1F5F9',
              border: '1px solid rgba(255,255,255,0.08)',
              fontSize: '14px',
              borderRadius: '12px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            },
          }}
        />
      </body>
    </html>
  );
}
