import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Validators",
  description: "Active validators securing Sentrix Chain — stake, uptime, commission, and blocks produced.",
};

export default function ValidatorsLayout({ children }: { children: ReactNode }) {
  return children;
}
