import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { cx, motion } from '../recipes.ts';

// eslint-disable-next-line better-tailwindcss/no-restricted-classes -- a DOM selector for the Tab wrap, not classes
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface Props {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ComponentChildren;
}

/**
 * Centred dialog over a dimmed backdrop: a native modal <dialog> (`showModal()`), so the page behind is inert, and
 * theme.css keeps it still. Tab wraps inside (the browser alone would let it leave for its own toolbar). Escape and a
 * click on the backdrop close it; focus returns to the element that opened it. It fades and rises in, and sinks out
 * (motion.sheet).
 */
export function Modal({ open, onClose, labelledBy, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  // Callers often pass a new onClose on every render; the close event reads the latest from a ref.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const openRef = useRef(open);
  openRef.current = open;
  const opener = useRef<HTMLElement | null>(null);
  // While it fades out the dialog keeps showing what it showed last (the caller has usually cleared it already).
  const shown = useRef<ComponentChildren>(children);
  if (open) shown.current = children;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      opener.current = document.activeElement as HTMLElement | null;
      d.showModal();
    } else if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    // Every way of closing (Escape, the backdrop, the caller) ends in the native close event.
    const onCloseEvent = () => {
      opener.current?.focus?.();
      opener.current = null;
      if (openRef.current) closeRef.current();
    };
    // A click on the dialog element itself is a click on the backdrop: the panel inside fills the dialog.
    const onClick = (e: MouseEvent) => {
      if (e.target === d) d.close();
    };
    // Tab and Shift+Tab wrap from the last control to the first and back.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const els = [...d.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
      const first = els[0];
      const last = els.at(-1);
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    d.addEventListener('close', onCloseEvent);
    d.addEventListener('click', onClick);
    d.addEventListener('keydown', onKey);
    return () => {
      d.removeEventListener('close', onCloseEvent);
      d.removeEventListener('click', onClick);
      d.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <dialog ref={ref} aria-labelledby={labelledBy} class={cx(motion.sheet, 'm-auto p-0 w-115 overflow-auto border-0 rounded-card bg-white text-black backdrop:bg-black/55')}>
      <div class="p-7 box-border flex flex-col gap-4">{open ? children : shown.current}</div>
    </dialog>
  );
}
