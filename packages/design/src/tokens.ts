/**
 * ZurichJS design tokens: the single source of truth. `pnpm --filter @zurichjs/design theme`
 * writes them into src/theme.css (Tailwind 4 @theme) and src/fonts.css; a test fails if those
 * files are out of date. Brand rules for using them: docs/design-system.md.
 */
export const colors = {
  black: '#000000',
  white: '#ffffff',
  /** The only accent. Primary action, status pills, date tiles, the rating number. */
  yellow: '#f1e271',
  'yellow-hover': '#edc936',
  /** Supporting dark surfaces (conference module, cards on black). */
  ink: '#19191b',
  'ink-2': '#242528',
  'ink-3': '#3a3b40',
  /** Supporting light surfaces and text. */
  grey: '#ededef',
  /** Hover on grey buttons and tiles. */
  'grey-hover': '#e2e2e6',
  'grey-soft': '#f6f6f4',
  'grey-mid': '#a9aab1',
  /** Secondary text on black. */
  'grey-light': '#d4d5da',
  'grey-text': '#5f626b',
  /** Placeholder text in inputs (kept from the Tailwind 3 default the design was built on). */
  'grey-placeholder': '#9ca3af',
  'grey-line': '#7c7f89',
  'grey-frame': '#d9d9dc',
  /** Focus rings and the logo only. */
  blue: '#268bcc',
  /** Monogram tile tint. */
  'blue-soft': '#d9e9f5',
  danger: '#b3261e',
  'danger-hover': '#8f1d17',
  'danger-soft': '#f6d8d3',
  /** Success messages only: confirmations after a form is sent or an action is done (owner, 3rd November 2026). */
  success: '#1e7a3c',
  'success-soft': '#dcf0e1',
} as const;

export const radii = {
  /** Buttons, tags, pills. */
  pill: '999px',
  /** Cards and surfaces. */
  card: '24px',
  /** Large blocks (conference module, CTA blocks). */
  block: 'clamp(24px, 3vw, 40px)',
} as const;

/** One layout breakpoint (800 px); `lg` only for wide grids. */
export const breakpoints = { md: '800px', lg: '1100px' } as const;

/** Side gutter: 20 px on phones, 48 px from the breakpoint, centred to a 1280 px column. */
export const gutter = { mobile: '20px', desktop: '48px', column: '1280px' } as const;

export const font = {
  family: 'Figtree',
  /** Set by the Astro Fonts API (or fonts.css outside Astro). */
  cssVariable: '--font-figtree',
  fallbacks: ['ui-sans-serif', 'system-ui', 'sans-serif'],
  weights: '300 900',
  file: 'figtree-var.woff2',
} as const;

/** Heading sizes per level (fluid between phone and desktop). */
export const headings = {
  display: 'clamp(40px, 6.4vw, 84px)',
  h1: 'clamp(36px, 5.4vw, 72px)',
  h2: 'clamp(30px, 3.4vw, 48px)',
  h2Medium: 'clamp(26px, 2.8vw, 36px)',
  h3: 'clamp(24px, 2.4vw, 32px)',
  body: '18px',
  small: '16px',
} as const;

export const motion = {
  /** Colour transitions only; no scroll reveals. Disabled under prefers-reduced-motion. */
  durationMs: 150,
} as const;
