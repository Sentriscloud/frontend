// Deep audit: scan v1 — every public route, both networks, capture
// console errors + key visual data points + check loading-vs-data state.

import { chromium } from "playwright";

const BASE = "https://scan.sentrixchain.com";
const ROUTES = [
  // mainnet
  { path: "/",                                            label: "home-mainnet",         net: "mainnet" },
  { path: "/blocks",                                      label: "blocks-list-mainnet",  net: "mainnet" },
  { path: "/blocks/1681000",                              label: "block-detail-mainnet", net: "mainnet" },
  { path: "/blocks/1",                                    label: "block-genesis-mainnet",net: "mainnet" },
  { path: "/validators",                                  label: "validators-mainnet",   net: "mainnet" },
  { path: "/leaderboard",                                 label: "leaderboard-mainnet",  net: "mainnet" },
  { path: "/tokens",                                      label: "tokens-mainnet",       net: "mainnet" },
  { path: "/address/0x87c9976d4b2e360b9fbb87e4bd5442edce2a7511", label: "address-validator", net: "mainnet" },
  { path: "/api-docs",                                    label: "api-docs",             net: "mainnet" },
  // testnet variants
  { path: "/?network=testnet",                            label: "home-testnet",         net: "testnet" },
  { path: "/blocks?network=testnet",                      label: "blocks-list-testnet",  net: "testnet" },
  { path: "/validators?network=testnet",                  label: "validators-testnet",   net: "testnet" },
];

async function audit() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  for (const { path, label, net } of ROUTES) {
    const page = await ctx.newPage();
    const errors = [];
    const warnings = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
      if (m.type() === "warning") warnings.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

    let status = "ok";
    let height = "—";
    let firstSkeleton = "—";
    let mainText = "";
    try {
      // domcontentloaded is more reliable than networkidle when the page
      // has long-poll WS / 5s polling — networkidle never resolves and
      // we time out before extracting anything useful.
      const res = await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 25000 });
      status = res?.status() ?? "no-response";
      await page.waitForTimeout(4000);

      const heightCandidates = await page.locator('h1, h2, h3, [class*="height"], [class*="number"]').allInnerTexts().catch(() => []);
      const heightMatch = (heightCandidates || []).find((t) => typeof t === "string" && /^[0-9,]{4,}$/.test(t.trim()));
      if (heightMatch) height = heightMatch.trim();

      firstSkeleton = await page.locator('[class*="skeleton"], [class*="Skeleton"], [class*="animate-pulse"]').count();
      mainText = await page.locator('main').first().innerText().catch(() => "");
      if (!mainText) mainText = await page.locator('body').first().innerText().catch(() => "");
    } catch (e) {
      status = `nav-fail: ${e.message.slice(0, 80)}`;
    }

    const empty = mainText.length < 200;
    const errCount = errors.length;
    const warnCount = warnings.length;
    const stuck = firstSkeleton > 5;

    const flag = (errCount > 0 || empty || stuck || (typeof status === "number" && status >= 400))
      ? "✗"
      : (warnCount > 0 || (typeof firstSkeleton === "number" && firstSkeleton > 0))
        ? "?"
        : "✓";

    console.log(`${flag}  ${label.padEnd(26)} HTTP=${status}  errs=${errCount}  warns=${warnCount}  skeletons=${firstSkeleton}  height=${height}  bodyLen=${mainText.length}`);
    if (errCount > 0) {
      for (const e of errors.slice(0, 3)) console.log(`     ↳ ERR: ${e.slice(0, 200)}`);
    }
    await page.close();
  }
  await browser.close();
}
audit().catch(console.error);
