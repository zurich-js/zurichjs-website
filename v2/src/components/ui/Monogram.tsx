import { cx } from '@/lib/cx';

interface Props {
  initials: string;
  className?: string;
  tone?: 'grey' | 'yellow' | 'white' | 'blue';
  size?: 'avatar' | 'tile' | 'portrait';
  label?: string;
}

const tones = { grey: 'bg-grey', yellow: 'bg-yellow', white: 'bg-white', blue: 'bg-[#D9E9F5]' };
const sizes = {
  avatar: 'rounded-full items-center justify-center text-[15px]',
  tile: 'aspect-square w-full rounded-card items-center justify-center text-[clamp(36px,4vw,56px)]',
  portrait: 'aspect-square w-full rounded-card items-end p-[18px] text-[44px]',
};

/** Initials in a rounded tile, used wherever a portrait is missing. */
export function Monogram({ initials, className, tone = 'grey', size = 'tile', label }: Props) {
  return (
    <span role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} className={cx('flex font-bold text-black box-border', tones[tone], sizes[size], className)}>
      {initials}
    </span>
  );
}
