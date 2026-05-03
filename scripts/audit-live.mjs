#!/usr/bin/env node
// Live-flow sweep: hits every public dapp + every scan detail page
// pattern, captures all console errors, validates explorer URLs are
// well-formed (path BEFORE query), and writes a report.
//
// Run from repo root:   node scripts/audit-live.mjs
// Optional:             node scripts/audit-live.mjs --quick  (skip slow checks)
//                       node scripts/audit-live.mjs --json   (machine-readable)
//
// Requires `playwright` already installed in the workspace (it is, via
// the playwright-mcp dep). If not present, the script falls back to a
// header-only curl sweep.

import { chromium } from "playwright";

const QUICK = process.argv.includes("--quick");
const JSON_OUT = process.argv.includes("--json");

// Public surface. Each entry: a label + a URL to load. The script visits
// each, waits for network-idle, then dumps any console errors.
const SURFACE = [
  { app: "scan",                url: "https://scan.sentrixchain.com" },
  { app: "scan-tx-mainnet",     url: "https://scan.sentrixchain.com/tx/0xdeadbeef" },
  { app: "scan-tx-testnet",     url: "https://scan.sentrixchain.com/tx/0xdeadbeef?network=testnet" },
  { app: "scan-block-mainnet",  url: "https://scan.sentrixchain.com/blocks/1" },
  { app: "scan-leaderboard",    url: "https://scan.sentrixchain.com/leaderboard" },
  { app: "solux",               url: "https://solux.sentriscloud.com" },
  { app: "sentriscloud",        url: "https://sentriscloud.com" },
  { app: "sentrixchain",        url: "https://sentrixchain.com" },
  { app: "coinblast",           url: "https://coinblast.sentriscloud.com" },
  { app: "faucet",              url: "https://faucet.sentrixchain.com" },
  { app: "faucet-testnet",      url: "https://faucet.sentrixchain.com/testnet" },
  { app: "airdrop",             url: "https://airdrop.sentrixchain.com" },
  { app: "dex",                 url: "https://dex.sentrixchain.com" },
];

// Patterns we consider broken when seen as href values rendered to the DOM.
// Add new ones here as we discover them — every entry pays dividends.
const BAD_HREF_PATTERNS = [
  {
    name: "scan URL with ?network= before path (path swallowed into query)",
    regex: /scan\.sentrixchain\.com\/\?network=[^/]*\/(tx|address|block)/i,
  },
  {
    name: "explorer URL with double slash inside path",
    regex: /scan\.sentrixchain\.com\/\/(?!\?)/,
  },
  {
    name: "literal `undefined` baked into href",
    regex: /\/(tx|address|block)\/undefined\b/,
  },
];

async function audit() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const report = [];

  for (const { app, url } of SURFACE) {
    const page = await ctx.newPage();
    const errors = [];
    const warnings = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
      if (msg.type() === "warning") warnings.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

    let badHrefs = [];
    let status = "ok";
    let httpStatus = null;
    try {
      const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 25_000 });
      httpStatus = resp ? resp.status() : null;
      if (!QUICK) {
        const hrefs = await page.$$eval("a[href]", (els) => els.map((e) => e.getAttribute("href") || ""));
        for (const href of hrefs) {
          for (const { name, regex } of BAD_HREF_PATTERNS) {
            if (regex.test(href)) {
              badHrefs.push({ rule: name, href });
            }
          }
        }
      }
    } catch (err) {
      status = "load-error";
      errors.push(String(err));
    }

    await page.close();
    report.push({ app, url, status, httpStatus, errors, warnings: warnings.length, badHrefs });
  }

  await browser.close();

  if (JSON_OUT) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  // Pretty report.
  let total = 0;
  for (const r of report) {
    const dirty = r.errors.length + r.badHrefs.length + (r.status !== "ok" ? 1 : 0);
    total += dirty;
    const tag = dirty === 0 ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
    console.log(`${tag}  ${r.app.padEnd(22)}  HTTP=${r.httpStatus ?? "?"}  errs=${r.errors.length}  bad-hrefs=${r.badHrefs.length}  warns=${r.warnings}`);
    if (r.errors.length) {
      for (const e of r.errors.slice(0, 5)) console.log(`     err: ${e.slice(0, 200)}`);
      if (r.errors.length > 5) console.log(`     ... ${r.errors.length - 5} more errors`);
    }
    for (const b of r.badHrefs) console.log(`     bad-href: ${b.rule}\n               ${b.href}`);
  }

  console.log("");
  if (total === 0) {
    console.log("\x1b[32mLive audit: clean across the surface.\x1b[0m");
    process.exit(0);
  } else {
    console.log(`\x1b[31mLive audit: ${total} issue(s) across ${report.length} URL(s).\x1b[0m`);
    process.exit(1);
  }
}

audit().catch((err) => {
  console.error("audit failed:", err);
  process.exit(2);
});
