/**
 * Class recipes shared by .astro components and Preact islands, so each
 * component's look is defined once.
 */
export const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

export type ButtonVariant =
  | 'yellow' // primary on black or white
  | 'outline-white' // secondary on black
  | 'black' // primary on white
  | 'outline-black' // secondary on white
  | 'white' // white fill, black hairline (on grey or yellow surfaces)
  | 'grey' // soft grey fill
  | 'danger'
  | 'link'; // underlined text, no box
export type ButtonSize = 'sm' | 'md' | 'lg';

const buttonBase = 'inline-flex items-center justify-center gap-2 font-bold cursor-pointer select-none transition-colors disabled:cursor-not-allowed box-border text-center';
const buttonVariants: Record<ButtonVariant, string> = {
  yellow: 'bg-yellow text-black border border-yellow hover:bg-yellow-hover hover:border-yellow-hover disabled:bg-grey disabled:border-grey disabled:text-grey-text',
  'outline-white': 'bg-transparent text-white border-2 border-white hover:bg-white hover:text-black',
  black: 'bg-black text-white border border-black hover:bg-ink-2 hover:border-ink-2 disabled:bg-grey disabled:border-grey disabled:text-grey-text',
  'outline-black': 'bg-transparent text-black border-2 border-black hover:bg-black hover:text-white',
  white: 'bg-white text-black border border-black hover:bg-grey',
  grey: 'bg-grey text-black border border-grey hover:bg-grey-hover hover:border-grey-hover',
  danger: 'bg-danger text-white border border-danger hover:bg-danger-hover',
  link: 'bg-transparent border-0 p-0 underline underline-offset-3 hover:text-blue',
};
const buttonSizes: Record<ButtonSize, string> = {
  sm: 'min-h-[44px] px-5 text-[16px]',
  md: 'min-h-[48px] px-6 text-[18px]',
  lg: 'min-h-[52px] px-[26px] text-[18px]',
};

export const buttonClass = (variant: ButtonVariant = 'yellow', size: ButtonSize = 'md', grow = false, extra?: string) =>
  cx(buttonBase, buttonVariants[variant], variant !== 'link' && cx('no-underline rounded-pill', buttonSizes[size]), grow && 'flex-[1_1_100%] md:flex-[0_0_auto]', extra);

export type SurfaceTone = 'grey' | 'yellow' | 'black' | 'ink' | 'soft' | 'white' | 'danger' | 'success';
/**
 * Cards (Bogdan's review, 4th November 2026): a Surface is static content, so 'grey' and 'soft' are white with a
 * thin border, never a fill that looks clickable. A card that is a link uses linkCardClass (soft grey, an arrow,
 * a hover state); a choice uses a yellow border when selected.
 */
const surfaceTones: Record<SurfaceTone, string> = {
  grey: 'bg-white text-black border border-grey-frame',
  yellow: 'bg-yellow text-black',
  black: 'bg-black text-white on-black',
  ink: 'bg-ink text-white on-black',
  soft: 'bg-white text-black border border-grey-frame',
  white: 'bg-white text-black',
  danger: 'bg-danger-soft text-black',
  /** Confirmations: a form was sent, an action is done. */
  success: 'bg-success-soft text-black',
};
export const surfaceClass = (tone: SurfaceTone = 'grey', extra?: string) => cx('rounded-card', surfaceTones[tone], extra);

export type BadgeTone = 'neutral' | 'accent' | 'dark' | 'success' | 'danger';
export type BadgeSize = 'sm' | 'md';
/**
 * Badge (docs/v2/UI-AUDIT.md, "Badge"): a small rounded pill that labels something (a status,
 * "Latest"). Not interactive. Green only for success and red only for errors (brand rules).
 */
const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-grey text-black',
  accent: 'bg-yellow text-black',
  dark: 'bg-black text-white',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
};
const badgeSizes: Record<BadgeSize, string> = { sm: 'px-2.5 py-0.5 text-sm', md: 'px-3 py-1 text-base' };
export const badgeClass = (tone: BadgeTone = 'neutral', size: BadgeSize = 'sm') =>
  cx('inline-flex items-center rounded-pill font-bold leading-normal whitespace-nowrap', badgeTones[tone], badgeSizes[size]);

export type MonogramTone = 'grey' | 'yellow' | 'white' | 'blue';
export type MonogramSize = 'avatar' | 'tile' | 'portrait';
// Yellow is for buttons and one CTA section per page (Bogdan's review): a 'yellow' monogram is grey.
const monoTones: Record<MonogramTone, string> = { grey: 'bg-grey', yellow: 'bg-grey', white: 'bg-white', blue: 'bg-blue-soft' };
const monoSizes: Record<MonogramSize, string> = {
  avatar: 'rounded-full items-center justify-center text-[15px]',
  tile: 'aspect-square w-full rounded-card items-center justify-center text-[clamp(36px,4vw,56px)]',
  portrait: 'aspect-square w-full rounded-card items-end p-[18px] text-[44px]',
};
export const monogramClass = (tone: MonogramTone = 'grey', size: MonogramSize = 'tile', extra?: string) =>
  cx('flex font-bold text-black box-border', monoTones[tone], monoSizes[size], extra);

export const headingSizes = {
  lg: 'text-[clamp(30px,3.4vw,48px)] leading-[1.1]',
  md: 'text-[clamp(26px,2.8vw,36px)] leading-[1.15]',
  sm: 'text-[clamp(24px,2.4vw,32px)] leading-[1.2]',
} as const;

export const isExternal = (href: string) => /^(https?:|mailto:)/.test(href);

/**
 * A choice in a form (radio or checkbox): a light bordered option with the native control visible and regular
 * weight, so it never looks like a button (Bogdan's review, 4th November 2026). Selected: black border, soft fill.
 */
export const optionClass = (invalid = false, extra?: string) =>
  cx(
    'inline-flex items-center gap-2.5 min-h-[44px] px-3.5 py-2 rounded-xl border bg-white text-[16px] text-black cursor-pointer select-none',
    'hover:border-black has-checked:border-black has-checked:bg-grey-soft has-disabled:opacity-50 has-disabled:cursor-not-allowed',
    invalid ? 'border-danger' : 'border-grey-line',
    extra,
  );
/** The native radio or checkbox inside an option. */
export const optionInput = 'w-[18px] h-[18px] m-0 flex-none accent-black cursor-pointer';

/** A card that is one link: soft grey, darker on hover, with an arrow (add `linkCardArrow` inside). */
export const linkCardClass = (extra?: string) =>
  cx('group relative block rounded-card bg-grey-soft hover:bg-grey transition-colors no-underline text-black p-5 md:p-6 pr-14 md:pr-16', extra);
/** The arrow for a link card, top right; it nudges right on hover. */
export const linkCardArrow = 'absolute right-5 top-5 md:right-6 md:top-6 transition-transform duration-300 group-hover:translate-x-1';
