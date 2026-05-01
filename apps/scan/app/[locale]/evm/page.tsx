import type { Metadata } from "next";
import { RailPage } from "@/components/common/RailPage";

export const metadata: Metadata = {
  title: "EVM — Sentrix Scan",
  description:
    "EVM-rail transactions on Sentrix Chain. Solidity / Vyper contracts, ERC-20 / ERC-721 / ERC-1155 transfers, eth_sendRawTransaction.",
};

export default function EvmPage() {
  return <RailPage rail="evm" />;
}
