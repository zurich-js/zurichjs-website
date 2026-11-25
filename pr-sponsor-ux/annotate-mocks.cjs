const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const sharp = require(process.env.SHARP_MODULE || 'sharp');
sharp.cache(false);
sharp.concurrency(1);
const hash = (b) => crypto.createHash('sha256').update(b).digest('hex');
(async () => {
  const base = __dirname;
  const manifestPath = path.join(base, 'manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  assert(!manifest.annotation, 'Already annotated');
  const details = ['admin-fees-running-1280-detail.png', 'provider-upgrade-375-detail.png'].map((file) => ({ file }));
  const proof = [];
  for (const row of [...manifest.screenshots, ...details]) {
    const file = path.join(base, row.file);
    const input = await fs.readFile(file);
    const { width, height } = await sharp(input).metadata();
    if (row.sha256) assert.equal(hash(input), row.sha256);
    const label = Buffer.from(
      '<svg width="' +
        width +
        '" height="36" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="black"/><text x="12" y="24" fill="white" font-family="sans-serif" font-size="16" font-weight="bold">MOCK · local test data</text></svg>',
    );
    const output = await sharp(input)
      .extend({ top: 36, bottom: 0, left: 0, right: 0, background: 'black' })
      .composite([{ input: label, top: 0, left: 0 }])
      .png()
      .toBuffer();
    const originalPixels = await sharp(input).ensureAlpha().raw().toBuffer();
    const retainedPixels = await sharp(output).extract({ left: 0, top: 36, width, height }).ensureAlpha().raw().toBuffer();
    assert(originalPixels.equals(retainedPixels), 'Page pixels changed: ' + row.file);
    const labelPixels = await sharp(output).extract({ left: 0, top: 0, width, height: 36 }).removeAlpha().raw().toBuffer();
    assert(
      labelPixels.some((value) => value > 0),
      'Missing label: ' + row.file,
    );
    row.originalSha256 = hash(input);
    row.captureHeight = height;
    row.width = width;
    row.height = height + 36;
    row.sha256 = hash(output);
    await fs.writeFile(file, output);
    proof.push({ file: row.file, originalSha256: row.originalSha256, sha256: row.sha256, pagePixelsUnchanged: true });
  }
  manifest.details = details;
  manifest.annotation = {
    placement: '36px strip above original capture',
    text: 'MOCK · local test data',
    originalMediaCommit: 'ec41ba0322dba0205f33fbbf5723d1949e79776e',
    pagePixelsUnchanged: true,
  };
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  await fs.writeFile(path.join(base, 'mock-label-proof.json'), JSON.stringify(proof, null, 2) + '\n');
  console.log('Annotated ' + proof.length + ' images; every original page pixel preserved.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
