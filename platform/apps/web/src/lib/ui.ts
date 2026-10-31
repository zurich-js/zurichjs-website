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

const buttonBase =
  'inline-flex items-center justify-center gap-2 font-bold rounded-pill cursor-pointer no-underline select-none transition-colors disabled:cursor-not-allowed box-border text-center';
const buttonVariants: Record<ButtonVariant, string> = {
  yellow: 'bg-yellow text-black border border-yellow hover:bg-yellow-hover hover:border-yellow-hover disabled:bg-grey disabled:border-grey disabled:text-grey-text',
  'outline-white': 'bg-transparent text-white border-2 border-white hover:bg-white hover:text-black',
  black: 'bg-black text-white border border-black hover:bg-ink-2 hover:border-ink-2 disabled:bg-grey disabled:border-grey disabled:text-grey-text',
  'outline-black': 'bg-transparent text-black border-2 border-black hover:bg-black hover:text-white',
  white: 'bg-white text-black border border-black hover:bg-grey',
  grey: 'bg-grey text-black border border-grey hover:bg-[#E2E2E6] hover:border-[#E2E2E6]',
  danger: 'bg-danger text-white border border-danger hover:bg-[#8F1D17]',
  link: 'bg-transparent border-0 p-0 underline underline-offset-4 rounded-none hover:text-blue',
};
const buttonSizes: Record<ButtonSize, string> = {
  sm: 'min-h-[44px] px-5 text-[16px]',
  md: 'min-h-[48px] px-6 text-[18px]',
  lg: 'min-h-[52px] px-[26px] text-[18px]',
};

export const buttonClass = (variant: ButtonVariant = 'yellow', size: ButtonSize = 'md', grow = false, extra?: string) =>
  cx(buttonBase, buttonVariants[variant], variant !== 'link' && buttonSizes[size], grow && 'flex-[1_1_100%] md:flex-[0_0_auto]', extra);

export type SurfaceTone = 'grey' | 'yellow' | 'black' | 'ink' | 'soft' | 'white' | 'danger';
const surfaceTones: Record<SurfaceTone, string> = {
  grey: 'bg-grey text-black',
  yellow: 'bg-yellow text-black',
  black: 'bg-black text-white on-black',
  ink: 'bg-ink text-white on-black',
  soft: 'bg-grey-soft text-black',
  white: 'bg-white text-black',
  danger: 'bg-danger-soft text-black',
};
export const surfaceClass = (tone: SurfaceTone = 'grey', extra?: string) => cx('rounded-card', surfaceTones[tone], extra);

export type MonogramTone = 'grey' | 'yellow' | 'white' | 'blue';
export type MonogramSize = 'avatar' | 'tile' | 'portrait';
const monoTones: Record<MonogramTone, string> = { grey: 'bg-grey', yellow: 'bg-yellow', white: 'bg-white', blue: 'bg-[#D9E9F5]' };
const monoSizes: Record<MonogramSize, string> = {
  avatar: 'rounded-full items-center justify-center text-[15px]',
  tile: 'aspect-square w-full rounded-card items-center justify-center text-[clamp(36px,4vw,56px)]',
  portrait: 'aspect-square w-full rounded-card items-end p-[18px] text-[44px]',
};
export const monogramClass = (tone: MonogramTone = 'grey', size: MonogramSize = 'tile', extra?: string) => cx('flex font-bold text-black box-border', monoTones[tone], monoSizes[size], extra);

export const headingSizes = {
  lg: 'text-[clamp(30px,3.4vw,48px)] leading-[1.1]',
  md: 'text-[clamp(26px,2.8vw,36px)] leading-[1.15]',
  sm: 'text-[clamp(24px,2.4vw,32px)] leading-[1.2]',
} as const;

export const isExternal = (href: string) => /^(https?:|mailto:)/.test(href);
