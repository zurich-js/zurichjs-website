---
name: visual-review
description: Make the screenshots and short recording every ZurichJS PR needs (changed routes at 390 and 1440 px, with sample content and a fixed clock) and check them against the brand rules. Use for any UI change and before opening a PR.
---

# Visual review

1. **Build and serve with sample content and a fixed clock:**
   1. `CONTENT_SOURCE=sample BUILD_NOW=2026-11-01T12:00:00+01:00 pnpm build`
   2. `node tools/serve-dist.mjs 4321 &`
2. **Screenshot every changed route,** full page, at 390 and 1440 px (and at 320 px when layout changed). Use Playwright, either a short script or the Playwright MCP.
3. **Record a short clip of each changed flow** (Playwright `recordVideo`). Convert it with ffmpeg to an mp4 and a small GIF of at most 720px, about 8 fps.
4. **Check against `AGENTS.md` and `docs/design-system.md`:**
   - black opening and footer
   - Figtree actually rendered (check `document.fonts`)
   - yellow as the only accent
   - no kickers and no decorative lines
   - no horizontal scroll at 320px
   - visible focus rings
5. **Publish the media:**
   1. Push it to the `v2/pr-media` branch under `pr-<topic>/`. Never commit media to code branches.
   2. Embed it in the PR with `raw.githubusercontent.com` URLs.
