/**
 * Bundles each Netlify Function in netlify/functions into one self-contained file in
 * .netlify/functions-bundled, which netlify.toml makes the functions directory on Netlify
 * (production, deploy previews, branch deploys). Local dev keeps running the sources.
 *
 * Why: Netlify packages v2 functions with nft (forced; node_bundler is ignored for them). nft
 * does not read the workspace packages' TypeScript, so a function that imports
 * @zurichjs/agent shipped packages/agent/src/index.ts without the files it imports, nor their
 * npm dependencies, and failed on its first request (ERR_MODULE_NOT_FOUND, 12th November 2026).
 * esbuild resolves and inlines all of it; nft then has nothing left to trace but Node built-ins.
 *
 * Schedules stay in netlify.toml as well as in the sources: Netlify reads `export const config`
 * statically, and a bundle may not keep it in the form it expects.
 *
 *   node scripts/bundle-functions.mjs   (from apps/web; the Netlify build runs it)
 */
import { readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { build } from 'esbuild';

const src = resolve('netlify/functions');
const out = resolve('.netlify/functions-bundled');
const entries = readdirSync(src).filter((f) => /\.m?ts$/.test(f));

rmSync(out, { recursive: true, force: true });
await build({
  entryPoints: entries.map((f) => join(src, f)),
  outdir: out,
  outExtension: { '.js': '.mjs' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  // Some dependencies are CommonJS and call require(); give the ESM bundle one.
  banner: { js: "import { createRequire as __zjsCreateRequire } from 'node:module'; const require = __zjsCreateRequire(import.meta.url);" },
  logLevel: 'warning',
});
console.log(`[bundle-functions] ${entries.length} functions → ${out}`);
