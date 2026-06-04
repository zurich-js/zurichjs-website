#!/usr/bin/env node
// One-off: re-encode oversized rasters in public/images in place.
// Run when new big images are added: `npx -p sharp@latest node scripts/optimize-public-images.cjs`
// Skips files that are already small (<300KB) or non-raster.

const fs = require("fs");
const path = require("path");

let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error(
    "sharp is not installed. Run: `npx -p sharp node scripts/optimize-public-images.cjs`",
  );
  process.exit(1);
}

const ROOT = path.resolve(__dirname, "..", "public", "images");
const MAX_WIDTH = 1600; // anything wider is wasted on a 2x retina hero
const SKIP_BYTES = 300 * 1024;
const RASTER_EXT = new Set([".png", ".jpg", ".jpeg"]);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

async function process(file) {
  const ext = path.extname(file).toLowerCase();
  if (!RASTER_EXT.has(ext)) return null;
  const stat = fs.statSync(file);
  if (stat.size < SKIP_BYTES) return null;

  const meta = await sharp(file).metadata();
  const targetWidth = meta.width && meta.width > MAX_WIDTH ? MAX_WIDTH : meta.width;

  const baseInput = await sharp(file)
    .rotate()
    .resize({ width: targetWidth, withoutEnlargement: true })
    .toBuffer();

  const orig = stat.size;

  // Overwrite original in same format with sane quality.
  if (ext === ".png") {
    const out = await sharp(baseInput)
      .png({ compressionLevel: 9, palette: true, quality: 80 })
      .toBuffer();
    fs.writeFileSync(file, out);
  } else {
    const out = await sharp(baseInput)
      .jpeg({ quality: 78, mozjpeg: true, progressive: true })
      .toBuffer();
    fs.writeFileSync(file, out);
  }

  const finalSize = fs.statSync(file).size;
  return { file: path.relative(ROOT, file), orig, finalSize };
}

(async () => {
  const files = walk(ROOT);
  const results = [];
  for (const f of files) {
    try {
      const r = await process(f);
      if (r) results.push(r);
    } catch (e) {
      console.error("FAIL", f, e.message);
    }
  }
  let savedOrig = 0,
    savedNew = 0;
  for (const r of results.sort((a, b) => b.orig - a.orig)) {
    savedOrig += r.orig;
    savedNew += r.finalSize;
    console.log(
      r.file.padEnd(50),
      "orig=" + (r.orig / 1024 / 1024).toFixed(2) + "MB",
      "->",
      (r.finalSize / 1024).toFixed(0) + "KB",
    );
  }
  console.log(
    "\nTotal processed:",
    results.length,
    "files;",
    "saved",
    ((savedOrig - savedNew) / 1024 / 1024).toFixed(1) + "MB on originals",
  );
})();
