import { cx } from '@/lib/cx';

interface Props {
  value: number;
  onChange: (n: number) => void;
  label: string;
  invalid?: boolean;
  size?: 'md' | 'lg';
}

/** Five buttons, 1 to 5, filled yellow up to the selection. */
export function StarRating({ value, onChange, label, invalid, size = 'md' }: Props) {
  return (
    <div className="flex flex-col gap-2 max-w-[440px]">
      <div role="radiogroup" aria-label={label} aria-invalid={invalid || undefined} className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} of 5`}
            onClick={() => onChange(n)}
            className={cx('rounded-2xl border-0 font-bold text-[20px] cursor-pointer', size === 'lg' ? 'min-h-[56px]' : 'min-h-[52px]', value >= n ? 'bg-yellow' : 'bg-grey hover:bg-[#E2E2E6]')}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[15px] text-ink-2">
        <span>Not for me</span>
        <span>Loved it</span>
      </div>
    </div>
  );
}
