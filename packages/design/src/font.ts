/**
 * Figtree, the only typeface (AGENTS.md). Configuration for the Astro Fonts API (apps/web/astro.config.mjs) and the
 * HTML emails, which need the file and its weights rather than a CSS value. Other sites use fonts.css.
 */
export const font = {
  family: 'Figtree',
  /** Set by the Astro Fonts API (or fonts.css outside Astro). theme.css builds --font-sans from it. */
  cssVariable: '--font-figtree',
  fallbacks: ['ui-sans-serif', 'system-ui', 'sans-serif'],
  weights: '300 900',
  file: 'figtree-var.woff2',
} as const;
