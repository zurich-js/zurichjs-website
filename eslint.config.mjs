/**
 * UI lint: the design-system rules in AGENTS.md ("UI and design system rules") that oxlint cannot check.
 * Oxlint (`pnpm lint`) stays the general linter; this config only runs the UI rules (`pnpm lint:ui`).
 *
 * Existing violations are recorded in eslint-suppressions.json (ESLint bulk suppressions), so CI fails only
 * on new ones. When you fix legacy code, run `pnpm lint:ui:prune` to shrink the baseline. Never add to it by
 * hand or with --suppress-all to get green: fix the cause, or ask the owner for a token.
 */
import betterTailwind from 'eslint-plugin-better-tailwindcss';
import { getDefaultSelectors } from 'eslint-plugin-better-tailwindcss/defaults';
import { MatcherType, SelectorKind } from 'eslint-plugin-better-tailwindcss/types';
import * as astroParser from 'astro-eslint-parser';
import tseslint from 'typescript-eslint';

/**
 * Arbitrary values are any class with a `[`: `min-h-[44px]`, `text-[17px]`, `bg-[#abc]`, `aria-[current=true]:`,
 * `[mask:…]`. Two exceptions, each because the scale has no equivalent:
 * - `grid-cols-[…]`: track lists such as `repeat(auto-fit,minmax(min(100%,260px),1fr))` or `64px_minmax(0,1fr)`
 *   have no utility in Tailwind 4, and a named token per layout would only move the literal elsewhere.
 * - `aspect-[…]`: photo ratios such as 4/5.2 come from the photography; Tailwind only has square and video.
 * Variant prefixes (`md:`, `hover:`) are allowed in front of both.
 */
const ARBITRARY = String.raw`^(?!(?:[a-z0-9-]+:)*(?:grid-cols|aspect)-\[).*\[`;

/**
 * Class strings also live outside `class`: in variant maps and constants (recipes.ts, `const h2 = '…'`), in
 * helper calls (`buttonClass('yellow', 'md', false, 'mt-6')`) and in props such as `moreClass`. Lint them all.
 */
const strings = [{ type: MatcherType.String }, { type: MatcherType.ObjectValue }];
const selectors = [
  ...getDefaultSelectors(),
  { kind: SelectorKind.Attribute, name: String.raw`^[a-z][a-zA-Z]*Class(?:Name)?$`, match: strings },
  { kind: SelectorKind.Callee, name: String.raw`^[a-z][a-zA-Z]*Class$`, match: strings },
  { kind: SelectorKind.Variable, name: '.*', match: strings },
];

const hex = String.raw`/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/`;

export default [
  {
    ignores: ['**/dist/**', '**/.astro/**', '**/.netlify/**', '**/node_modules/**', 'apps/studio/**'],
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx,astro}', 'packages/design/src/**/*.{ts,tsx,astro}'],
    // Server code, API routes and image generators have no classes; theme.css is where literals belong.
    ignores: ['**/*.test.*', '**/*.d.ts', 'apps/web/src/server/**', 'apps/web/src/pages/api/**', 'apps/web/src/pages/og/**'],
    languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { 'better-tailwindcss': betterTailwind },
    settings: {
      'better-tailwindcss': { entryPoint: 'apps/web/src/styles/global.css', selectors },
    },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      'better-tailwindcss/no-restricted-classes': [
        'error',
        {
          restrict: [
            {
              pattern: ARBITRARY,
              message: 'Arbitrary value "$0": snap to a token from packages/design/src/theme.css, or propose a new token (AGENTS.md, UI rule 1).',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXAttribute[name.name="style"]',
          message:
            'No inline style: use tokens and utilities. A value that only exists at runtime (a CSS custom property, an image focal point) needs an eslint-disable comment with the reason (AGENTS.md, UI rule 1).',
        },
        {
          selector: `Literal[value=${hex}]`,
          message: 'No hardcoded colours: use a colour token from packages/design/src/theme.css (AGENTS.md, UI rule 1).',
        },
        {
          selector: `TemplateElement[value.raw=${hex}]`,
          message: 'No hardcoded colours: use a colour token from packages/design/src/theme.css (AGENTS.md, UI rule 1).',
        },
      ],
    },
  },
  {
    files: ['**/*.astro'],
    languageOptions: { parser: astroParser, parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.astro'] } },
  },
];
