import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

interface Props {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ComponentChildren;
}

/** Centred dialog with a dimmed backdrop. Closes on Escape and backdrop click; traps initial focus. */
export function Modal({ open, onClose, labelledBy, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])');
    (first ?? ref.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div onClick={onClose} class="fixed inset-0 z-40 bg-black/55 flex items-center justify-center p-4">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        class="bg-white text-black rounded-[28px] w-full max-w-[460px] max-h-[90vh] overflow-auto p-7 box-border flex flex-col gap-4 outline-none"
      >
        {children}
      </div>
    </div>
  );
}
