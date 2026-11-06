"""Summarise Playwright visual diffs in the CI log (where they differ, and small crops).

Run after a failed `pnpm e2e`: python3 tools/ci/visual-diff-summary.py test-results [--crops]
For each *-diff.png it prints the bounding box of the changed pixels. With --crops it also
prints the expected and actual crops around the change as base64 PNG, so they can be looked
at without downloading the artifact.
"""
import base64, glob, io, os, sys
from PIL import Image

root = sys.argv[1] if len(sys.argv) > 1 else 'test-results'
crops = '--crops' in sys.argv
for diff_path in sorted(glob.glob(os.path.join(root, '**', '*-diff.png'), recursive=True)):
    if 'retry' in diff_path:
        continue
    d = Image.open(diff_path).convert('RGB')
    px = d.load()
    w, h = d.size
    xs, ys = [], []
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            r, g, b = px[x, y]
            if r > 200 and g < 80 and b < 80:
                xs.append(x); ys.append(y)
    if not xs:
        print(f'VISUAL {diff_path}: no red pixels'); continue
    box = (min(xs), min(ys), max(xs) + 2, max(ys) + 2)
    rows = sorted(set(y // 100 * 100 for y in ys))
    print(f'VISUAL {diff_path}: size {w}x{h} changed {len(xs)*4}px box {box} rows {rows[:20]}')
    if crops:
        base = diff_path[: -len('-diff.png')]
        for kind in ('expected', 'actual'):
            p = f'{base}-{kind}.png'
            if not os.path.exists(p):
                continue
            im = Image.open(p).convert('RGB')
            y0 = rows[0]
            c = im.crop((0, max(0, y0 - 40), im.width, min(im.height, y0 + 260)))
            c.thumbnail((720, 400))
            buf = io.BytesIO(); c.save(buf, 'PNG', optimize=True)
            print(f'CROP {kind} {base} ' + base64.b64encode(buf.getvalue()).decode())
