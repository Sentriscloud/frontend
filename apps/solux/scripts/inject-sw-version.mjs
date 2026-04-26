#!/usr/bin/env node
/**
 * Postbuild step: replace the __BUILD_ID__ placeholder in public/sw.js
 * with the actual Next.js BUILD_ID (a content hash), so each deploy
 * produces a distinct service-worker cache namespace.
 *
 * The browser only refetches sw.js when the byte content differs, so
 * without this step the same VERSION string would persist across deploys
 * and skipWaiting()/clients.claim() would never trigger a real update.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const buildIdPath = resolve(root, '.next/BUILD_ID');
const swPath = resolve(root, 'public/sw.js');

let buildId;
try {
  buildId = readFileSync(buildIdPath, 'utf8').trim();
} catch {
  console.error(`[inject-sw-version] missing ${buildIdPath} — run \`next build\` first`);
  process.exit(1);
}
if (!buildId) {
  console.error('[inject-sw-version] BUILD_ID is empty');
  process.exit(1);
}

const sw = readFileSync(swPath, 'utf8');
// Replace either the placeholder or any previously injected build id, so
// the script is idempotent across repeated builds.
const next = sw.replace(/solux-sw-(?:__BUILD_ID__|[\w-]+)/g, `solux-sw-${buildId}`);
writeFileSync(swPath, next);
console.log(`[inject-sw-version] sw.js cache namespace -> solux-sw-${buildId}`);
