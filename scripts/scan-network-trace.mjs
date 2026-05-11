// Trace every network request a scan v1 page makes — URL, status, timing.
// Use this to figure out WHY skeletons are stuck (which fetches are
// pending / 4xx / 5xx).

import { chromium } from "playwright";

const TARGET = process.argv[2] || "https://scan.sentrixchain.com/";
const WAIT = Number(process.argv[3] || 8000);

async function trace() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const reqs = new Map();
  page.on("request", (req) => {
    let postBody = null;
    if (req.method() === "POST") {
      try { postBody = req.postData(); } catch {}
    }
    reqs.set(req, { url: req.url(), method: req.method(), postBody, start: Date.now(), status: null, body: null });
  });
  page.on("response", async (res) => {
    const req = res.request();
    const entry = reqs.get(req);
    if (!entry) return;
    entry.status = res.status();
    entry.elapsed = Date.now() - entry.start;
    if (res.status() >= 400) {
      try { entry.body = (await res.text()).slice(0, 300); } catch {}
    }
  });
  page.on("requestfailed", (req) => {
    const entry = reqs.get(req);
    if (entry) {
      entry.status = "FAIL";
      entry.error = req.failure()?.errorText || "unknown";
      entry.elapsed = Date.now() - entry.start;
    }
  });

  await page.goto(TARGET, { waitUntil: "domcontentloaded", timeout: 25000 }).catch((e) => console.log("nav-err:", e.message));
  await page.waitForTimeout(WAIT);

  const all = Array.from(reqs.values()).filter((r) => r.url.includes("sentrixchain") || r.url.includes("sentriscloud"));
  const grouped = {};
  for (const r of all) {
    const key = r.status >= 400 || r.status === "FAIL" ? "BAD" : r.status === null ? "PENDING" : "OK";
    grouped[key] = grouped[key] || [];
    grouped[key].push(r);
  }

  console.log(`URL:   ${TARGET}`);
  console.log(`Total: ${all.length} (BAD=${(grouped.BAD||[]).length}  PENDING=${(grouped.PENDING||[]).length}  OK=${(grouped.OK||[]).length})`);
  console.log();

  for (const cat of ["BAD", "PENDING", "OK"]) {
    if (!grouped[cat]) continue;
    console.log(`── ${cat} ──`);
    // group by URL pattern (strip params + dynamic ids); for /rpc POSTs
    // also break out by JSON-RPC method so we can see exactly what is
    // being spammed.
    const byPath = {};
    for (const r of grouped[cat]) {
      const u = new URL(r.url);
      let path = `${u.host}${u.pathname.replace(/\/0x[a-f0-9]+/g, "/<addr>").replace(/\/\d+/g, "/<n>")}`;
      if (path.endsWith("/rpc") && r.postBody) {
        try {
          const j = JSON.parse(r.postBody);
          const method = Array.isArray(j) ? `BATCH(${j.length}: ${j[0]?.method})` : (j.method || "?");
          path = `${path} [${method}]`;
        } catch {}
      }
      byPath[path] = byPath[path] || { count: 0, statuses: new Set(), elapsed: [] };
      byPath[path].count++;
      byPath[path].statuses.add(r.status);
      if (r.elapsed) byPath[path].elapsed.push(r.elapsed);
    }
    const rows = Object.entries(byPath).sort((a,b) => b[1].count - a[1].count);
    for (const [path, info] of rows) {
      const avgMs = info.elapsed.length ? Math.round(info.elapsed.reduce((a,b)=>a+b,0) / info.elapsed.length) : "—";
      console.log(`  ${String(info.count).padStart(3)}x [${[...info.statuses].join(",")}] ${path}  (avg ${avgMs}ms)`);
    }
    console.log();
  }
  // Show first BAD body for diagnosis
  if (grouped.BAD) {
    console.log("── first BAD response bodies (preview) ──");
    for (const r of grouped.BAD.slice(0, 3)) {
      console.log(`  [${r.status}] ${r.url}`);
      if (r.body) console.log(`    body: ${r.body.slice(0, 200)}`);
      if (r.error) console.log(`    err: ${r.error}`);
    }
  }
  await browser.close();
}
trace().catch(console.error);
