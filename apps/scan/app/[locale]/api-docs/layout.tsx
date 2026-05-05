import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "API Reference",
  description: "REST + JSON-RPC + WebSocket endpoints for Sentrix Chain explorers and tooling.",
};

export default function ApiDocsLayout({ children }: { children: ReactNode }) {
  return children;
}
