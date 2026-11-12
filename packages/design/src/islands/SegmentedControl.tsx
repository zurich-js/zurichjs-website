import { useId } from 'preact/hooks';

interface Props<T extends string> {
  /** The group's accessible name. */
  legend: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** The form field name; defaults to a unique id when the choice is not posted. */
  name?: string;
  class?: string;
}

/**
 * One pill with segments (billing cycle, one-time or monthly). Native radios, so arrow keys move the
 * choice without script of our own. 48px in total, like a button: a 4px track around 40px options.
 * The Astro twin is components/SegmentedControl.astro.
 */
export function SegmentedControl<T extends string>({ legend, options, value, onChange, name, class: extra }: Props<T>) {
  const id = useId();
  return (
    <fieldset class={['m-0 p-0 border-0 min-w-0', extra].filter(Boolean).join(' ')}>
      <legend class="sr-only">{legend}</legend>
      <div class="inline-flex gap-1 h-control p-1 rounded-pill bg-grey">
        {options.map((o) => (
          <label
            key={o.value}
            class="relative inline-flex items-center justify-center h-full px-4 md:min-w-30 whitespace-nowrap rounded-pill font-bold text-compact cursor-pointer transition-colors hover:bg-grey-hover has-checked:bg-black has-checked:text-white has-focus-visible:outline-3 has-focus-visible:outline-blue has-focus-visible:outline-offset-2"
          >
            {o.label}
            <input
              type="radio"
              name={name ?? id}
              value={o.value}
              checked={o.value === value}
              onChange={() => onChange(o.value)}
              class="absolute inset-0 size-full m-0 opacity-0 cursor-pointer appearance-none"
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
