/**
 * The design tokens, read from theme.css: the single source of every colour, size, radius and width. Edit
 * theme.css; TypeScript reads it from here (the HTML emails, the OG images, the /design gallery), so the two never
 * drift and nothing is generated.
 *
 * Lookups throw on an unknown name, so a misspelt token fails the build instead of shipping `undefined`.
 * It loads theme.css as text in every bundler: Vite's `?raw` (the Astro build, Vitest; vitest.config.ts lets theme.css
 * through) and esbuild's `with { type: 'text' }` (the Netlify functions). src/raw.d.ts types the import.
 */
// `?raw` is for Vite (the Astro build, Vitest); the `text` attribute is for esbuild, which bundles the Netlify
// functions (it ignores the query). Both read the same file as text.
import css from './theme.css?raw' with { type: 'text' };

const block = (() => {
  const start = css.indexOf('@theme');
  return css.slice(start, css.indexOf('\n}', start));
})();
const vars = new Map([...block.matchAll(/^\s*--([\w-]+):\s*([^;]+);/gm)].map((m) => [m[1]!, m[2]!.trim()] as const));

/** Every `--<prefix>-<name>` in the @theme block, as { name: value } (wildcard resets and sub-properties left out). */
const group = (prefix: string): Readonly<Record<string, string>> =>
  Object.fromEntries([...vars].filter(([k]) => k.startsWith(`${prefix}-`) && !k.includes('--') && !k.endsWith('*')).map(([k, v]) => [k.slice(prefix.length + 1), v]));

const lookup =
  (kind: string, record: Readonly<Record<string, string>>) =>
  (name: string): string => {
    const value = record[name];
    if (value === undefined) throw new Error(`Unknown ${kind} token "${name}": not in packages/design/src/theme.css`);
    return value;
  };

export const colors = group('color');
export const radii = group('radius');
export const spacing = group('spacing');
export const containers = group('container');
export const breakpoints = group('breakpoint');
export const shadows = group('shadow');

/** The nine type roles: size and line height, from --text-<role> and --text-<role>--line-height. */
export const text: Readonly<Record<string, { size: string; lineHeight: string }>> = Object.fromEntries(
  Object.entries(group('text')).map(([role, size]) => [role, { size, lineHeight: vars.get(`text-${role}--line-height`) ?? '' }]),
);

/** The side gutter: --px on phones and from the breakpoint (base layer), around a column as wide as max-w-site. */
export const gutter = (() => {
  const px = [...css.matchAll(/--px:\s*([^;]+);/g)].map((m) => m[1]!.trim());
  return { mobile: px[0] ?? '', desktop: px[1] ?? '', column: containers.site ?? '' };
})();

export const color = lookup('colour', colors);
export const radius = lookup('radius', radii);
export const space = lookup('spacing', spacing);
