import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

const control = 'rounded-[14px] border px-3.5 text-[17px] font-normal bg-white text-black w-full box-border';
const border = (bad?: boolean) => (bad ? 'border-danger' : 'border-grey-line');

interface Wrap {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  className?: string;
  labelSize?: 'md' | 'lg';
}

function Wrapper({ label, hint, error, className, labelSize = 'md', children }: Wrap & { children: ReactNode }) {
  return (
    <label className={cx('flex flex-col gap-1.5 font-bold', labelSize === 'lg' ? 'text-[clamp(19px,1.8vw,22px)] leading-[1.3]' : 'text-[16px]', className)}>
      {label}
      {hint && <span className="text-[16px] font-normal text-grey-text leading-[1.45]">{hint}</span>}
      {children}
      {error !== undefined && (
        <span className="font-normal text-[14px] text-danger min-h-[1.2em]" aria-live="polite">
          {error}
        </span>
      )}
    </label>
  );
}

export function TextField({ label, hint, error, className, labelSize, invalid, ...rest }: Wrap & InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <Wrapper label={label} hint={hint} error={error} className={className} labelSize={labelSize}>
      <input aria-invalid={invalid || undefined} className={cx(control, 'min-h-[52px]', border(invalid))} {...rest} />
    </Wrapper>
  );
}

export function TextArea({ label, hint, error, className, labelSize, invalid, ...rest }: Wrap & TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <Wrapper label={label} hint={hint} error={error} className={className} labelSize={labelSize}>
      <textarea aria-invalid={invalid || undefined} className={cx(control, 'py-3 resize-y leading-[1.5]', border(invalid), labelSize === 'lg' && 'mt-1')} {...rest} />
    </Wrapper>
  );
}

export function SelectField({ label, hint, error, className, children, ...rest }: Wrap & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Wrapper label={label} hint={hint} error={error} className={className}>
      <select className={cx(control, 'min-h-[52px] px-3', border(false))} {...rest}>
        {children}
      </select>
    </Wrapper>
  );
}

export function Checkbox({ label, className, ...rest }: { label: ReactNode; className?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cx('flex gap-3 items-start text-[17px] leading-[1.45] cursor-pointer', className)}>
      <input type="checkbox" className="w-[22px] h-[22px] mt-[1px] flex-none accent-black" {...rest} />
      <span>{label}</span>
    </label>
  );
}

/** Pill-shaped radio chips. */
export function ChipGroup<T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const id = label.toLowerCase().replace(/\W+/g, '-');
  return (
    <div role="radiogroup" aria-labelledby={id} className="flex flex-col gap-2">
      <div id={id} className="text-[16px] font-bold">
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.value)}
              className={cx('min-h-[44px] px-[18px] rounded-pill border border-black font-bold text-[16px] cursor-pointer', on ? 'bg-black text-white' : 'bg-white text-black hover:bg-grey')}
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
export const filled = (v: string) => v.trim().length > 0;
