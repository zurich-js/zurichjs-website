import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

interface Props {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ComponentChildren;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Centred dialog with a dimmed backdrop. Closes on Escape and backdrop click; keeps Tab inside while open. */
export function Modal({ open, onClose, labelledBy, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // Callers often pass a new onClose on every render; keep the latest in a ref so the effect below runs
  // once per opening and remembers the element that opened the dialog.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const focusables = () => [...(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter((el) => el.getClientRects().length > 0);
    (focusables()[0] ?? ref.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return closeRef.current();
      if (e.key !== 'Tab' || !ref.current) return;
      // Focus trap: Tab and Shift+Tab wrap inside the dialog, since aria-modal hides the page behind it.
      const els = focusables();
      const first = els[0];
      const last = els[els.length - 1];
      const active = document.activeElement;
      const inside = ref.current.contains(active);
      if (!first || !last) {
        e.preventDefault();
        ref.current.focus();
      } else if (e.shiftKey && (active === first || active === ref.current || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    // Backdrop click is a mouse shortcut; keyboard users close with Escape (handled above).
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events
    <div role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()} class="fixed inset-0 z-40 bg-black/55 flex items-center justify-center p-4">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        class="bg-white text-black rounded-card w-full max-w-115 max-h-[90vh] overflow-auto p-7 box-border flex flex-col gap-4 outline-hidden"
      >
        {children}
      </div>
    </div>
  );
}
