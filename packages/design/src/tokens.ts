/**
 * ZurichJS design tokens: the single source of truth. `pnpm --filter @zurichjs/design theme`
 * writes them into src/theme.css (Tailwind 4 @theme) and src/fonts.css; a test fails if those
 * files are out of date. Brand rules for using them: docs/design-system.md.
 */
export const colors = {
  black: '#000000',
  white: '#ffffff',
  /** The only accent: the cta button, the chosen dot of a ChoiceCard, one CTA section on the home page. */
  yellow: '#f1e271',
  /** Hover on yellow (owner, 12th November 2026; replaces #edc936). */
  'yellow-hover': '#e3cb16',
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
  /** Buttons, chips and switches. */
  pill: '999px',
  /** Cards and surfaces where text touches the edge. */
  card: '24px',
  /** Large blocks (conference module, CTA blocks). */
  block: 'clamp(24px, 3vw, 40px)',
  /** Tags: read, not pressed, so not a pill (owner, 12th November 2026). */
  tag: '6px',
  /** Form fields and form options. */
  field: '14px',
  /**
   * Rounding: one formula. Outer radius = inner radius + the space between them (padding, plus a frame).
   * Text touches the edge: 24px. A button touches it: 24px (half a 48px control) + padding.
   * A card touches it: that card's radius + padding. Inside a card, a nested shape gets the card's
   * radius minus its padding, never below 12px. Card applies this through its `edge` prop.
   */
  'control-pill': 'calc(var(--spacing-control) / 2)',
  /** A small card holding a button: 24px + 16px = 40px. */
  'card-sm-control': 'calc(var(--radius-control-pill) + var(--spacing-card-sm))',
  'nested-min': '12px',
} as const;

/** One layout breakpoint (800 px); `lg` only for wide grids. */
export const breakpoints = { md: '800px', lg: '1100px' } as const;

/** Side gutter: 20 px on phones, 48 px from the breakpoint, centred to a 1280 px column. */
export const gutter = { mobile: '20px', desktop: '48px', column: '1280px' } as const;

/** Content widths (`max-w-*`), besides the 1280 px site column. */
export const containers = {
  site: gutter.column,
  /** Reading width: paragraphs, section intros. Not `prose`: Tailwind's max-w-prose (65ch) is built in. */
  reading: '720px',
  wide: '880px',
  form: '640px',
} as const;

export const font = {
  family: 'Figtree',
  /** Set by the Astro Fonts API (or fonts.css outside Astro). */
  cssVariable: '--font-figtree',
  fallbacks: ['ui-sans-serif', 'system-ui', 'sans-serif'],
  weights: '300 900',
  file: 'figtree-var.woff2',
} as const;

/**
 * Type: nine roles, each a size with its line height (owner, 12th November 2026). Tailwind's default
 * text scale is switched off, so `text-body`, `text-meta` and the rest are the only sizes.
 * Body is 18px (all of the old 17px became body); compact replaces only the old 16px.
 */
export const text = {
  display: { size: 'clamp(40px, 6.4vw, 84px)', lineHeight: '1.02' },
  title: { size: 'clamp(36px, 5vw, 64px)', lineHeight: '1.08' },
  section: { size: 'clamp(30px, 3.4vw, 48px)', lineHeight: '1.1' },
  subsection: { size: 'clamp(26px, 2.8vw, 36px)', lineHeight: '1.15' },
  'card-title': { size: 'clamp(20px, 1.8vw, 24px)', lineHeight: '1.25' },
  lead: { size: 'clamp(19px, 1.6vw, 22px)', lineHeight: '1.45' },
  body: { size: '18px', lineHeight: '1.55' },
  compact: { size: '16px', lineHeight: '1.5' },
  meta: { size: '14px', lineHeight: '1.4' },
} as const;

/** Named spacing (`p-card-md`, `min-h-control`, `gap-section` ...), next to Tailwind's 4px scale. */
export const spacing = {
  /** Page rhythm. */
  'page-top': 'clamp(40px, 5vw, 72px)',
  'page-end': 'clamp(64px, 8vw, 112px)',
  section: 'clamp(56px, 7vw, 96px)',
  /** Card padding: three sizes, chosen with a prop. */
  'card-sm': '16px',
  'card-md': 'clamp(20px, 2.4vw, 28px)',
  'card-lg': 'clamp(24px, 3vw, 36px)',
  /** The header's height: 16px around a 48px button. It overlaps the page, and the opening is padded by it. */
  header: '80px',
  /** Every button, switch and form field (owner, 12th November 2026). */
  control: '48px',
  /** Filter chips: the smallest touch target. */
  chip: '44px',
  /** Tags you read, not press. */
  'tag-sm': '24px',
  'tag-md': '32px',
} as const;

/** Auto-fit card grids (`grid-cols-auto-sm` ...): three minimum column widths instead of seven. */
export const grids = {
  'auto-sm': 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
  'auto-md': 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
  'auto-lg': 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))',
} as const;

export const motion = {
  /** The default transition (colours). Logo tiles use 300ms and the speaker arc 500ms; no scroll reveals. Disabled under prefers-reduced-motion. */
  durationMs: 150,
} as const;
