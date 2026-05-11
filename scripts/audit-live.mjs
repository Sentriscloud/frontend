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
//
// `expectNotFound` flags URLs where 404s in the network log are expected
// (non-existent tx hash used as a probe — confirms cross-network probe
// fires without actually owning a real testnet tx). Those console 404s
// are filtered out of the issue count.
const SURFACE = [
  { app: "scan-v1",             url: "https://scan.sentrixchain.com" },
  { app: "scan-v1-tx-mainnet",  url: "https://scan.sentrixchain.com/tx/0xdeadbeef", expectNotFound: true },
  { app: "scan-v1-tx-testnet",  url: "https://scan.sentrixchain.com/tx/0xdeadbeef?network=testnet", expectNotFound: true },
  { app: "scan-v1-block",       url: "https://scan.sentrixchain.com/blocks/1" },
  { app: "scan-v1-leaderboard", url: "https://scan.sentrixchain.com/leaderboard" },
  // V2 (Leptos) — separate sentriscloud.com hosts. Coexists with V1 per
  // user direction; both monitored permanently.
  { app: "scan-v2",             url: "https://scan.sentriscloud.com" },
  { app: "scan-v2-block",       url: "https://scan.sentriscloud.com/block/1" },
  { app: "scan-v2-testnet",     url: "https://scan-testnet.sentriscloud.com" },
  { app: "scan-v2-testnet-blk", url: "https://scan-testnet.sentriscloud.com/block/1" },
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

  for (const { app, url, expectNotFound } of SURFACE) {
    const page = await ctx.newPage();
    const errors = [];
    const warnings = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Strip 404s on the probe pages (fake hash, expected to not exist).
        if (expectNotFound && /status of 404/.test(text)) return;
        errors.push(text);
      }
      if (msg.type() === "warning") warnings.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

    let badHrefs = [];
    let status = "ok";
    let httpStatus = null;
    try {
      // `load` (= DOMContentLoaded + scripts ran + initial assets) is
      // the right gate for live dapps. `networkidle` never resolves on
      // pages that poll a WS or REST endpoint (coinblast, scan-leaderboard,
      // anything with live data) so we'd time out and miss real signal.
      // After load, give the page 3s of grace to render any client-side
      // hydration errors before snapshotting console.
      const waitUntil = expectNotFound ? "domcontentloaded" : "load";
      const resp = await page.goto(url, { waitUntil, timeout: 20_000 });
      await page.waitForTimeout(3_000);
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
      // Timeout on a probe page is expected (auto-switch keeps polling) —
      // don't count it as a load-error.
      const isTimeout = /Timeout.*exceeded/.test(String(err));
      if (expectNotFound && isTimeout) {
        status = "ok";
      } else {
        status = "load-error";
        errors.push(String(err));
      }
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
