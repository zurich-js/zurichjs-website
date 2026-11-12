/** Form controls for islands (Preact). Labels wrap controls; errors are announced politely. */
import type { ComponentChildren, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'preact';
import { useId } from 'preact/hooks';
import { cx, optionClass, optionInput } from '../recipes.ts';

const control = 'rounded-[14px] border px-3.5 text-[17px] font-normal bg-white text-black w-full box-border';
const border = (bad?: boolean) => (bad ? 'border-danger' : 'border-grey-line');

interface Wrap {
  label: ComponentChildren;
  hint?: ComponentChildren;
  error?: string;
  class?: string;
  labelSize?: 'md' | 'lg';
}

/**
 * Ids for the label, hint and error. The control is named by the label text
 * alone (`aria-labelledby`) and described by the hint and error, so a screen
 * reader does not read the hint and the error as part of the field's name.
 */
function useDescribedBy(hint: unknown, error: string | undefined) {
  const id = useId();
  const ids = { label: `${id}-label`, hint: `${id}-hint`, error: `${id}-error` };
  const describedBy = [hint ? ids.hint : '', error ? ids.error : ''].filter(Boolean).join(' ') || undefined;
  return { ids, describedBy };
}

function Wrapper({
  label,
  hint,
  error,
  class: className,
  labelSize = 'md',
  ids,
  children,
}: Wrap & { ids: { label: string; hint: string; error: string }; children: ComponentChildren }) {
  return (
    <label class={cx('flex flex-col gap-1.5 font-bold', labelSize === 'lg' ? 'text-[clamp(19px,1.8vw,22px)] leading-[1.3]' : 'text-[16px]', className)}>
      <span id={ids.label}>{label}</span>
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

export function TextField({ label, hint, error, class: className, labelSize, invalid, ...rest }: Wrap & InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const { ids, describedBy } = useDescribedBy(hint, error);
  return (
    <Wrapper label={label} hint={hint} error={error} class={className} labelSize={labelSize} ids={ids}>
      <input aria-labelledby={ids.label} aria-invalid={invalid || undefined} aria-describedby={describedBy} class={cx(control, 'min-h-[52px]', border(invalid))} {...rest} />
    </Wrapper>
  );
}

export function TextArea({ label, hint, error, class: className, labelSize, invalid, ...rest }: Wrap & TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  const { ids, describedBy } = useDescribedBy(hint, error);
  return (
    <Wrapper label={label} hint={hint} error={error} class={className} labelSize={labelSize} ids={ids}>
      <textarea
        aria-labelledby={ids.label}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        class={cx(control, 'py-3 resize-y leading-normal', border(invalid), labelSize === 'lg' && 'mt-1')}
        {...rest}
      />
    </Wrapper>
  );
}

export function SelectField({ label, hint, error, class: className, children, ...rest }: Wrap & SelectHTMLAttributes<HTMLSelectElement>) {
  const { ids, describedBy } = useDescribedBy(hint, error);
  return (
    <Wrapper label={label} hint={hint} error={error} class={className} ids={ids}>
      {/* The native arrow is tiny and sits on the edge in most browsers: hidden, and drawn here with room around it. */}
      <span class="relative flex">
        <select aria-labelledby={ids.label} aria-describedby={describedBy} class={cx(control, 'min-h-[52px] pl-3.5 pr-11 appearance-none cursor-pointer', border(false))} {...rest}>
          {children}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M3.5 6l4.5 4.5L12.5 6" />
        </svg>
      </span>
    </Wrapper>
  );
}

export function Checkbox({ label, class: className, ...rest }: { label: ComponentChildren; class?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label class={cx('flex gap-3 items-start text-[17px] leading-[1.45] cursor-pointer', className)}>
      <input type="checkbox" class="w-[22px] h-[22px] mt-px flex-none accent-black cursor-pointer" {...rest} />
      <span>{label}</span>
    </label>
  );
}

/** Pill-shaped radio chips. */
/** One choice from a few: native radios shown as light options (never as buttons). */
export function ChipGroup<T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const id = label.toLowerCase().replace(/\W+/g, '-');
  return (
    <fieldset class="border-0 p-0 m-0 flex flex-col gap-2 min-w-0">
      <legend class="p-0 mb-2 text-[16px] font-bold">{label}</legend>
      <div class="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.value} class={optionClass()}>
            <input type="radio" name={id} value={o.value} checked={o.value === value} onChange={() => onChange(o.value)} class={optionInput} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export const isEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim());
