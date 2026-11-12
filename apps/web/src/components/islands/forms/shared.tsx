/** Small pieces every form island shares: the honeypot field, focus management and inline-error helpers. */
import { HONEYPOT, validate, type FormKind } from '@zurichjs/forms/client';
import type { ComponentChildren, RefObject } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { buttonClass, type ButtonVariant } from '@zurichjs/design/recipes';

/**
 * Hidden field that bots fill in and people never see. The server rejects any
 * value. Off screen, hidden from assistive tech (`aria-hidden`), out of the tab
 * order (`tabIndex -1`) and `inert`, so it cannot be focused at all.
 */
export function Honeypot() {
  return (
    <div aria-hidden="true" inert class="absolute left-[-10000px] top-auto w-px h-px overflow-hidden">
      <label>
        Leave this field empty
        <input type="text" name={HONEYPOT} tabIndex={-1} autoComplete="off" aria-hidden="true" defaultValue="" />
      </label>
    </div>
  );
}

/** A label with "(optional)" after it. Forms that use it say once that every other field is required. */
export function optional(label: ComponentChildren) {
  return (
    <>
      {label} <span class="font-normal text-ink-2">(optional)</span>
    </>
  );
}

/**
 * Runs one submission at a time. `busy` drives the button; a second submit
 * (a double click, Enter pressed twice) is ignored until the first settles.
 */
export function useSubmitOnce() {
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const run = async (fn: () => Promise<void>) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      await fn();
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  return { busy, run };
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
  variant = 'primary',
  grow,
  class: extra,
  busy,
  children,
}: {
  variant?: ButtonVariant;
  grow?: boolean;
  class?: string;
  busy?: boolean;
  children: ComponentChildren;
}) {
  return (
    <button type="submit" class={buttonClass({ variant, grow }, extra)} disabled={busy} aria-busy={busy || undefined}>
      {children}
    </button>
  );
}

/** A group of native radios or checkboxes shown as cards or pills; the input itself stays keyboard-operable. */
export function ChoiceGroup({
  legend,
  hint,
  error,
  radio,
  children,
  class: extra,
}: {
  legend: string;
  hint?: ComponentChildren;
  error?: string;
  /** One choice only: the group is a radiogroup, which carries the invalid state (radios cannot). */
  radio?: boolean;
  children: ComponentChildren;
  class?: string;
}) {
  const id = `choice-${legend.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <fieldset
      role={radio ? 'radiogroup' : undefined}
      aria-invalid={(radio && !!error) || undefined}
      class="border-0 p-0 m-0 flex flex-col gap-2 min-w-0"
      aria-describedby={[hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined}
    >
      <legend class="text-compact font-bold p-0 mb-1.5">{legend}</legend>
      {hint && (
        <p id={`${id}-hint`} class="m-0 mb-1 text-compact text-grey-text">
          {hint}
        </p>
      )}
      <div class={extra}>{children}</div>
      <span id={`${id}-error`} class="text-meta text-danger min-h-lh" aria-live="polite">
        {error}
      </span>
    </fieldset>
  );
}
