/**
 * Class recipes shared by .astro components and their Preact twins, so each look is defined once.
 * Every size comes from a theme token (tokens.ts): no pixels here.
 */
export const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

export const isExternal = (href: string) => /^(https?:|mailto:)/.test(href);
/** Links to other sites open in a new tab; mail links do not. */
export const opensNewTab = (href: string | undefined) => !!href && isExternal(href) && !href.startsWith('mailto:');

/* ------------------------------------------------------------------------------------------------ Buttons */

/**
 * Four variants, one height (48px, like form fields; owner, 12th November 2026).
 *   primary    black; on hover the colours flip to white with the black border kept.
 *   secondary  grey with a subtle border; on hover it turns black.
 *   cta        yellow, for the one thing a page asks for; hover #E3CB16.
 *   plain      no fill or border, grey on hover: interface controls (sort, filter, close), never content actions.
 * `inverse` is for black surfaces, where the same roles are mirrored: primary is white and flips to black,
 * secondary is dark grey and turns white.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'cta' | 'plain';

const buttonBase =
  'inline-flex items-center justify-center gap-2 box-border border rounded-pill font-bold text-center no-underline cursor-pointer select-none transition-colors min-h-control min-w-control disabled:cursor-not-allowed';
const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-black text-white border-black hover:bg-white hover:text-black',
  secondary: 'bg-grey text-black border-grey-frame hover:bg-black hover:text-white hover:border-black',
  cta: 'bg-yellow text-black border-yellow hover:bg-yellow-hover hover:border-yellow-hover',
  plain: 'bg-transparent text-black border-transparent hover:bg-grey',
};
const buttonInverse: Record<ButtonVariant, string> = {
  primary: 'bg-white text-black border-white hover:bg-black hover:text-white',
  secondary: 'bg-ink-2 text-white border-ink-3 hover:bg-white hover:text-black hover:border-white',
  cta: buttonVariants.cta,
  plain: 'bg-transparent text-white border-transparent hover:bg-ink-2',
};
const buttonDisabled = 'disabled:bg-grey disabled:border-grey disabled:text-grey-text';

export interface ButtonLook {
  variant?: ButtonVariant;
  inverse?: boolean;
  /** No text, only an icon: a round button (give it a label). */
  iconOnly?: boolean;
  /** Full width on phones, its own width from 800px. */
  grow?: boolean;
}
export const buttonClass = ({ variant = 'primary', inverse = false, iconOnly = false, grow = false }: ButtonLook = {}, extra?: string) =>
  cx(
    buttonBase,
    (inverse ? buttonInverse : buttonVariants)[variant],
    variant !== 'plain' && buttonDisabled,
    iconOnly ? 'p-0' : cx(variant === 'plain' ? 'px-4' : 'px-6', 'text-body leading-normal'),
    grow && 'grow basis-full md:grow-0 md:basis-auto',
    extra,
  );

/* ------------------------------------------------------------------------------------------------ Tags */

/** A label you read, never press: 6px corners, not a pill (owner, 12th November 2026). */
export type TagSize = 'sm' | 'md';
/**
 * Pick the tone that contrasts with the parent: grey on white, white on grey, black for times and status.
 * success and danger label a state (a paid membership, a failed payment): green only for success, red only for errors.
 */
export type TagTone = 'grey' | 'white' | 'black' | 'success' | 'danger';
const tagSizes: Record<TagSize, string> = {
  sm: 'min-h-tag-sm px-2.5 py-0.5 text-meta',
  md: 'min-h-tag-md px-3.5 py-1 text-compact',
};
const tagTones: Record<TagTone, string> = {
  grey: 'bg-grey text-black',
  white: 'bg-white text-black',
  black: 'bg-black text-white font-bold',
  success: 'bg-success-soft text-success font-bold',
  danger: 'bg-danger-soft text-danger font-bold',
};
export const tagClass = (size: TagSize = 'sm', tone: TagTone = 'grey', extra?: string) =>
  cx('inline-flex items-center max-w-full rounded-tag leading-tight', tagSizes[size], tagTones[tone], extra);
/** A tag that is a link: the same tag plus a hover, and an invisible layer that makes the hit area 44px tall. */
export const tagLinkClass = (size: TagSize = 'sm', extra?: string) =>
  cx(
    tagClass(size, 'grey'),
    'relative no-underline hover:bg-grey-hover transition-colors after:absolute after:inset-x-0',
    size === 'sm' ? 'after:-inset-y-2.5' : 'after:-inset-y-1.5',
    extra,
  );
/** A filter that is a control: 44px, bold, outlined; black when selected. */
export const chipClass = (selected = false, extra?: string) =>
  cx(
    'inline-flex items-center gap-2 min-h-chip px-4 rounded-pill border no-underline font-bold text-compact transition-colors cursor-pointer',
    selected ? 'bg-black border-black text-white' : 'bg-white border-grey-line text-black hover:border-black',
    extra,
  );

/* ------------------------------------------------------------------------------------------------ Cards */

/**
 * One card, chosen by surface (Card.astro adds behaviour: link, disclosure, action).
 *   outline  white with a frame: lists of items on white. The frame is functional, not decoration.
 *   filled   soft grey: the card itself is the block (workshops, contact options).
 *   plain    no box, same padding, so its text lines up with cards around it.
 *   white    white without a frame, on black or grey.
 *   inverse  dark, on black.
 */
export type CardSurface = 'outline' | 'filled' | 'plain' | 'white' | 'inverse';
export type CardPadding = 'sm' | 'md' | 'lg';
export const cardSurfaces: Record<CardSurface, string> = {
  outline: 'bg-white text-black border border-grey-frame',
  filled: 'bg-grey-soft text-black',
  plain: 'text-black',
  white: 'bg-white text-black',
  inverse: 'bg-ink text-white on-black',
};
export const cardPadding: Record<CardPadding, string> = {
  sm: 'p-card-sm gap-2',
  md: 'p-card-md gap-3',
  lg: 'p-card-lg gap-5',
};
/** A static card for Preact islands (Card.astro is the full component): 24px corners, text touching the edge. */
export const cardClass = (surface: CardSurface = 'outline', padding: CardPadding = 'md', extra?: string) =>
  cx('flex flex-col min-w-0 rounded-card', cardSurfaces[surface], cardPadding[padding], extra);

/** A whole card that is one choice (membership tier, sponsorship package): 3px frame, yellow when chosen. */
export const choiceCardClass = (extra?: string) =>
  cx(
    'group relative flex flex-col gap-3 rounded-card bg-white border-3 border-grey-frame cursor-pointer transition-colors p-card-lg',
    'hover:border-grey-mid has-checked:border-yellow',
    'has-focus-visible:outline-3 has-focus-visible:outline-blue has-focus-visible:outline-offset-2',
    extra,
  );
/** The dot of a choice card: on the title's first line, filled yellow with a tick when chosen. */
export const choiceDotClass =
  'size-7 rounded-full border-2 border-grey-line bg-white flex items-center justify-center text-transparent group-has-checked:bg-yellow group-has-checked:border-yellow group-has-checked:text-black';

/** Feedback and important notes. Green only for success, red only for errors. */
export type NoticeTone = 'note' | 'success' | 'danger';
const noticeTones: Record<NoticeTone, string> = {
  note: 'bg-white border border-grey-frame',
  success: 'bg-success-soft',
  danger: 'bg-danger-soft',
};
export const noticeClass = (tone: NoticeTone = 'note', extra?: string) => cx('flex gap-4 rounded-card text-black p-card-md', noticeTones[tone], extra);

/* ------------------------------------------------------------------------------------------------ Type */

export type HeadingSize = 'display' | 'title' | 'section' | 'subsection' | 'card';
export const headingClass: Record<HeadingSize, string> = {
  display: 'text-display',
  title: 'text-title',
  section: 'text-section',
  subsection: 'text-subsection',
  card: 'text-card-title',
};
export type TextSize = 'lead' | 'body' | 'compact' | 'meta';
export const textClass: Record<TextSize, string> = {
  lead: 'text-lead',
  body: 'text-body',
  compact: 'text-compact',
  meta: 'text-meta',
};
export type TextTone = 'default' | 'muted' | 'inverse' | 'inverse-muted';
export const textTone: Record<TextTone, string> = {
  default: 'text-black',
  muted: 'text-ink-2',
  inverse: 'text-white',
  'inverse-muted': 'text-grey-light',
};

/* ------------------------------------------------------------------------------------------------ Others */

export type MonogramTone = 'grey' | 'white' | 'blue';
export type MonogramSize = 'avatar' | 'tile' | 'portrait';
const monoTones: Record<MonogramTone, string> = { grey: 'bg-grey', white: 'bg-white', blue: 'bg-blue-soft' };
const monoSizes: Record<MonogramSize, string> = {
  avatar: 'rounded-full items-center justify-center text-meta',
  tile: 'aspect-square w-full rounded-card items-center justify-center text-title',
  portrait: 'aspect-square w-full rounded-card items-end p-card-sm text-title',
};
export const monogramClass = (tone: MonogramTone = 'grey', size: MonogramSize = 'tile', extra?: string) =>
  cx('flex font-bold text-black box-border', monoTones[tone], monoSizes[size], extra);

/**
 * A choice in a form (radio or checkbox): a light bordered option with the native control visible and regular
 * weight, so it never looks like a button (Bogdan's review, 4th November 2026). 48px, like every field.
 */
export const optionClass = (invalid = false, extra?: string) =>
  cx(
    'inline-flex items-center gap-2.5 min-h-control px-3.5 py-2 rounded-field border bg-white text-compact text-black cursor-pointer select-none',
    'hover:border-black has-checked:border-black has-checked:bg-grey-soft has-disabled:opacity-50 has-disabled:cursor-not-allowed',
    invalid ? 'border-danger' : 'border-grey-line',
    extra,
  );
/** The native radio or checkbox inside an option. */
export const optionInput = 'size-4.5 m-0 flex-none accent-black cursor-pointer';
