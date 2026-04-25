import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sentrix Scan",
    short_name: "SentrixScan",
    description:
      "Block explorer for Sentrix Chain (SRX). Browse blocks, transactions, addresses, validators, and SRC-20 tokens.",
    start_url: "/",
    display: "standalone",
    background_color: "#0A0A0C",
    theme_color: "#8A5A11",
    icons: [
      { src: "/icon.png", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
