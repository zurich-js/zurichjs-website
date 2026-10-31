/** Small pieces every form island shares: the honeypot field, focus management and inline-error helpers. */
import { HONEYPOT, validate, type FormKind } from '@zurichjs/forms/client';
import type { ComponentChildren, RefObject } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { buttonClass, type ButtonSize, type ButtonVariant } from '~/lib/ui';

/** Hidden field that bots fill in and people never see. The server rejects any value. */
export function Honeypot() {
  return (
    <div aria-hidden="true" class="absolute left-[-10000px] top-auto w-px h-px overflow-hidden">
      <label>
        Leave this field empty
        <input type="text" name={HONEYPOT} tabIndex={-1} autoComplete="off" aria-hidden="true" defaultValue="" />
      </label>
    </div>
  );
}

/** The honeypot value, read from the nearest form at submit time. */
export function honeypotValue(el: Element | null): string {
  const input = el?.closest('form')?.querySelector<HTMLInputElement>(`input[name="${HONEYPOT}"]`) ?? el?.querySelector<HTMLInputElement>(`input[name="${HONEYPOT}"]`);
  return input?.value ?? '';
}

/**
 * Field-level errors from the shared schema, limited to the fields the form
 * shows. The form's own copy (`messages`) wins over the schema's generic text.
 */
export function fieldErrors(kind: FormKind, data: object, messages: Record<string, string>): Record<string, string> {
  const r = validate(kind, data);
  if (r.ok) return {};
  const out: Record<string, string> = {};
  for (const [k, msg] of Object.entries(r.fields)) if (k in messages) out[k] = messages[k] || msg;
  return out;
}

/**
 * Moves focus to the first invalid control after a failed submit. Call
 * `request()` when validation fails; the effect runs after the errors render.
 */
export function useFocusFirstError(root: RefObject<HTMLElement>) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!tick) return;
    const bad = root.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!bad) return;
    const target = bad.matches('input, textarea, select, button') ? bad : bad.querySelector<HTMLElement>('input, textarea, select, button');
    (target ?? bad).focus();
  }, [tick, root]);
  return () => setTick((t) => t + 1);
}

/** Focuses an element (e.g. a success message) whenever `when` turns true. */
export function useFocusWhen<T extends HTMLElement>(when: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (when) ref.current?.focus();
  }, [when]);
  return ref;
}

/**
 * Submit button with the shared button recipe. (The island Button's props do
 * not type `type` or `disabled`, so forms use this.)
 */
export function SubmitButton({
  variant = 'black',
  size = 'lg',
  grow,
  class: extra,
  busy,
  children,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  grow?: boolean;
  class?: string;
  busy?: boolean;
  children: ComponentChildren;
}) {
  return (
    <button type="submit" class={buttonClass(variant, size, grow, extra)} disabled={busy} aria-busy={busy || undefined}>
      {children}
    </button>
  );
}
