/** Form controls for islands (Preact). Labels wrap controls; errors are announced politely. */
import type { ComponentChildren, JSX } from 'preact';
import { useId } from 'preact/hooks';
import { cx } from '~/lib/ui';

const control = 'rounded-[14px] border px-3.5 text-[17px] font-normal bg-white text-black w-full box-border';
const border = (bad?: boolean) => (bad ? 'border-danger' : 'border-grey-line');

interface Wrap {
  label: ComponentChildren;
  hint?: ComponentChildren;
  error?: string;
  class?: string;
  labelSize?: 'md' | 'lg';
}

/** Ids for the hint and error, and the aria-describedby value that points at them. */
function useDescribedBy(hint: unknown, error: string | undefined) {
  const id = useId();
  const ids = { hint: `${id}-hint`, error: `${id}-error` };
  const describedBy = [hint ? ids.hint : '', error ? ids.error : ''].filter(Boolean).join(' ') || undefined;
  return { ids, describedBy };
}

function Wrapper({ label, hint, error, class: className, labelSize = 'md', ids, children }: Wrap & { ids: { hint: string; error: string }; children: ComponentChildren }) {
  return (
    <label class={cx('flex flex-col gap-1.5 font-bold', labelSize === 'lg' ? 'text-[clamp(19px,1.8vw,22px)] leading-[1.3]' : 'text-[16px]', className)}>
      {label}
      {hint && (
        <span id={ids.hint} class="text-[16px] font-normal text-grey-text leading-[1.45]">
          {hint}
        </span>
      )}
      {children}
      {error !== undefined && (
        <span id={ids.error} class="font-normal text-[14px] text-danger min-h-[1.2em]" aria-live="polite">
          {error}
        </span>
      )}
    </label>
  );
}

export function TextField({ label, hint, error, class: className, labelSize, invalid, ...rest }: Wrap & JSX.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const { ids, describedBy } = useDescribedBy(hint, error);
  return (
    <Wrapper label={label} hint={hint} error={error} class={className} labelSize={labelSize} ids={ids}>
      <input aria-invalid={invalid || undefined} aria-describedby={describedBy} class={cx(control, 'min-h-[52px]', border(invalid))} {...rest} />
    </Wrapper>
  );
}

export function TextArea({ label, hint, error, class: className, labelSize, invalid, ...rest }: Wrap & JSX.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  const { ids, describedBy } = useDescribedBy(hint, error);
  return (
    <Wrapper label={label} hint={hint} error={error} class={className} labelSize={labelSize} ids={ids}>
      <textarea
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        class={cx(control, 'py-3 resize-y leading-[1.5]', border(invalid), labelSize === 'lg' && 'mt-1')}
        {...rest}
      />
    </Wrapper>
  );
}

export function SelectField({ label, hint, error, class: className, children, ...rest }: Wrap & JSX.SelectHTMLAttributes<HTMLSelectElement>) {
  const { ids, describedBy } = useDescribedBy(hint, error);
  return (
    <Wrapper label={label} hint={hint} error={error} class={className} ids={ids}>
      <select aria-describedby={describedBy} class={cx(control, 'min-h-[52px] px-3', border(false))} {...rest}>
        {children}
      </select>
    </Wrapper>
  );
}

export function Checkbox({ label, class: className, ...rest }: { label: ComponentChildren; class?: string } & JSX.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label class={cx('flex gap-3 items-start text-[17px] leading-[1.45] cursor-pointer', className)}>
      <input type="checkbox" class="w-[22px] h-[22px] mt-[1px] flex-none accent-black" {...rest} />
      <span>{label}</span>
    </label>
  );
}

/** Pill-shaped radio chips. */
export function ChipGroup<T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const id = label.toLowerCase().replace(/\W+/g, '-');
  return (
    <div role="radiogroup" aria-labelledby={id} class="flex flex-col gap-2">
      <div id={id} class="text-[16px] font-bold">
        {label}
      </div>
      <div class="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.value)}
              class={cx(
                'min-h-[44px] px-[18px] rounded-pill border border-black font-bold text-[16px] cursor-pointer',
                on ? 'bg-black text-white' : 'bg-white text-black hover:bg-grey',
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const isEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim());
