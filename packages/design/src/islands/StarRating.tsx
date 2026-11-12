import { useId } from 'preact/hooks';
import { cx } from '../recipes.ts';

interface Props {
  value: number;
  onChange: (n: number) => void;
  label: string;
  invalid?: boolean;
  size?: 'md' | 'lg';
}

/**
 * Five choices, 1 to 5, filled yellow up to the selection. Native radios, so arrow keys move the
 * rating and Tab enters and leaves the group as one stop.
 */
export function StarRating({ value, onChange, label, invalid, size = 'md' }: Props) {
  const name = useId();
  return (
    <div class="flex flex-col gap-2 max-w-[440px]">
      {/* Native radios in a named group: aria-invalid is supported on radiogroup, not on each radio. */}
      <div role="radiogroup" aria-label={label} aria-invalid={invalid || undefined} class="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            class={cx(
              'relative flex items-center justify-center rounded-2xl font-bold text-[20px] cursor-pointer transition-colors',
              'has-focus-visible:outline-3 has-focus-visible:outline-blue has-focus-visible:outline-offset-2',
              size === 'lg' ? 'min-h-[56px]' : 'min-h-[52px]',
              value >= n ? 'bg-yellow' : 'bg-grey hover:bg-grey-hover',
            )}
          >
            <span aria-hidden="true">{n}</span>
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              aria-label={`${n} of 5`}
              class="absolute inset-0 size-full m-0 opacity-0 cursor-pointer appearance-none"
            />
          </label>
        ))}
      </div>
      <div aria-hidden="true" class="flex justify-between text-[15px] text-ink-2">
        <span>Not for me</span>
        <span>Loved it</span>
      </div>
    </div>
  );
}
