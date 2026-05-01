"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/ui/reveal";
import {
  AddToWalletButton,
  SENTRIX_MAINNET_ADD_PARAMS,
  SENTRIX_TESTNET_ADD_PARAMS,
} from "@/components/ui/add-to-wallet-button";
import { SectionHeader } from "./section-header";
import { SITE } from "@/data/content";

const EVM_CONTRACT = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20 {
    constructor() ERC20("MyToken", "MTK") {
        _mint(msg.sender, 1_000_000 * 10**18);
    }
}`;

const EVM_DEPLOY = `const provider = new ethers.JsonRpcProvider("https://rpc.sentrixchain.com");
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const factory = new ethers.ContractFactory(abi, bytecode, wallet);
const contract = await factory.deploy();`;

const NATIVE_CMD = `sentrix token deploy \\
  --name "My Token" \\
  --symbol MTK \\
  --supply 1_000_000_000 \\
  --decimals 18 \\
  --deployer-key PRIVATE_KEY \\
  --fee 100000`;

type Tab = "evm" | "native";

function CodeBlock({ caption, code }: { caption: string; code: string }) {
  return (
    <div className="rounded-2xl border border-[var(--brd)] bg-gradient-to-br from-[var(--bk)] to-[var(--sf)] overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-3.5 border-b border-[var(--brd)] font-mono text-[10px] text-[var(--tx-d)] tracking-[.12em] bg-[rgba(0,0,0,.15)]">
        <div className="flex gap-1.5">
          <span className="w-[9px] h-[9px] rounded-full bg-[var(--red)] opacity-70" />
          <span className="w-[9px] h-[9px] rounded-full bg-[var(--orange)] opacity-70" />
          <span className="w-[9px] h-[9px] rounded-full bg-[var(--green)] opacity-70" />
        </div>
        <span className="text-[10px] tracking-[.08em] normal-case text-[var(--tx-m)]">{caption}</span>
      </div>
      <pre className="p-6 font-mono text-[12px] leading-[1.7] text-[var(--tx-m)] overflow-x-auto whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

export function Developers() {
  const t = useTranslations("section.developers");
  const tab = useTranslations("developerTabs");
  const [active, setActive] = useState<Tab>("evm");

  return (
    <section id="developers" className="py-[120px] px-6 md:px-[60px]">
      <Reveal>
        <SectionHeader
          tag={t("tag")}
          title={t("title")}
          titleEm={t("titleEm")}
          subtitle={t("subtitle")}
        />
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mt-[60px]">
          {/* Tab buttons */}
          <div role="tablist" aria-label="Build surfaces" className="inline-flex rounded-full border border-[var(--brd2)] p-1 bg-[var(--sf)] mb-6">
            {(["evm", "native"] as const).map((id) => {
              const isActive = active === id;
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={isActive}
                  type="button"
                  onClick={() => setActive(id)}
                  className={`px-5 py-2 text-[11px] font-normal tracking-[.12em] uppercase rounded-full transition-colors ${
                    isActive
                      ? "bg-[rgba(200,168,74,.12)] text-[var(--gold)]"
                      : "text-[var(--tx-d)] hover:text-[var(--gold)]"
                  }`}
                >
                  {tab(id === "evm" ? "tabEvm" : "tabNative")}
                </button>
              );
            })}
          </div>

          {/* Tab panels */}
          {active === "evm" ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CodeBlock caption={tab("evmContractCaption")} code={EVM_CONTRACT} />
              <CodeBlock caption={tab("evmDeployCaption")} code={EVM_DEPLOY} />
            </div>
          ) : (
            <CodeBlock caption={tab("nativeCaption")} code={NATIVE_CMD} />
          )}

          <div className="mt-6">
            <a
              href={SITE.docs}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[12px] font-mono tracking-[.12em] uppercase text-[var(--gold)] hover:text-[var(--gold-l)] transition-colors"
            >
              {tab("fullDocs")}
            </a>
          </div>
        </div>
      </Reveal>

      {/* Network info — kept from prior section per #developers anchor contract */}
      <Reveal delay={0.25}>
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[var(--brd)] bg-[var(--sf)] p-6">
          <p className="text-[10px] font-mono tracking-[.15em] text-[var(--cyan)] mb-2">MAINNET</p>
          <p className="text-sm text-[var(--tx-m)] leading-relaxed font-mono">
            RPC: <span className="text-[var(--tx)]">https://rpc.sentrixchain.com</span><br/>
            Chain ID: <span className="text-[var(--tx)]">7119</span> (0x1bcf)<br/>
            Explorer: <a href="https://scan.sentrixchain.com" target="_blank" rel="noopener noreferrer" className="text-[var(--cyan)] hover:underline">scan.sentrixchain.com</a>
          </p>
          <div className="mt-4">
            <AddToWalletButton
              params={SENTRIX_MAINNET_ADD_PARAMS}
              label="Add Sentrix to Wallet"
              variant="primary"
            />
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--brd)] bg-[var(--sf)] p-6">
          <p className="text-[10px] font-mono tracking-[.15em] text-[var(--orange)] mb-2">TESTNET</p>
          <p className="text-sm text-[var(--tx-m)] leading-relaxed font-mono">
            RPC: <span className="text-[var(--tx)]">https://testnet-rpc.sentrixchain.com</span><br/>
            Chain ID: <span className="text-[var(--tx)]">7120</span> (0x1bd0)<br/>
            Explorer: <a href="https://scan.sentrixchain.com" target="_blank" rel="noopener noreferrer" className="text-[var(--cyan)] hover:underline">scan.sentrixchain.com</a> (toggle Testnet)<br/>
            Faucet: <a href="https://faucet.sentrixchain.com" target="_blank" rel="noopener noreferrer" className="text-[var(--cyan)] hover:underline">faucet.sentrixchain.com</a> — free tokens, no real value
          </p>
          <div className="mt-4">
            <AddToWalletButton
              params={SENTRIX_TESTNET_ADD_PARAMS}
              label="Add Testnet to Wallet"
              variant="secondary"
            />
          </div>
        </div>
      </div>
      </Reveal>
    </section>
  );
}
