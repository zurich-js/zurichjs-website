import type { ComponentChildren } from 'preact';
import { useEffect, useId, useRef, useState } from 'preact/hooks';
import { buttonClass, cx, type ButtonVariant } from '../recipes.ts';

export interface MenuItem {
  label: string;
  href: string;
  /** Opens in a new tab (another site). */
  external?: boolean;
  onSelect?: () => void;
}

interface Props {
  /** The trigger's text. */
  label: ComponentChildren;
  items: MenuItem[];
  variant?: ButtonVariant;
  inverse?: boolean;
  /** An SVG path on a 24 by 24 viewBox, before the label. */
  icon?: string;
}

const Icon = ({ d, class: extra }: { d: string; class?: string }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    class={cx('size-5 flex-none', extra)}
    fill="none"
    stroke="currentColor"
    stroke-width="2.2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d={d} />
  </svg>
);

/**
 * A button that opens a short list of links under it (Add to calendar → Google, Outlook, Apple), the menu
 * button pattern: Enter, Space or the arrow keys open it on the first item, the arrows move, Escape closes
 * and returns to the button, and choosing, Tab or a click outside closes it. The trigger is a Button; the
 * list is a white panel (24px: 14px items plus its 10px padding) with one lift shadow.
 */
export function Menu({ label, items, variant = 'secondary', inverse, icon }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const links = () => [...(box.current?.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]') ?? [])];
  const close = (refocus = false) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    links()[0]?.focus();
    const outside = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) close();
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  const onKey = (e: KeyboardEvent) => {
    const all = links();
    const at = all.indexOf(document.activeElement as HTMLAnchorElement);
    const go = (i: number) => all[(i + all.length) % all.length]?.focus();
    if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      go(at + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      go(at - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      go(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      go(-1);
    } else if (e.key === 'Tab') close();
  };

  return (
    <div ref={box} class="relative">
      <button
        ref={trigger}
        type="button"
        id={`${id}-button`}
        class={buttonClass({ variant, inverse })}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {icon && <Icon d={icon} />}
        {label}
        <Icon d="M6 9l6 6 6-6" class={cx('transition-transform', open && 'rotate-180')} />
      </button>
      <div
        id={`${id}-menu`}
        role="menu"
        tabIndex={-1}
        aria-labelledby={`${id}-button`}
        hidden={!open}
        onKeyDown={onKey}
        class="absolute left-0 top-full z-40 mt-2 min-w-full w-max flex flex-col p-2.5 rounded-card bg-white text-black shadow-lift"
      >
        {items.map((item) => (
          <a
            key={item.label}
            role="menuitem"
            href={item.href}
            {...(item.external ? { target: '_blank', rel: 'noopener' } : {})}
            onClick={() => {
              item.onSelect?.();
              close();
            }}
            class="flex items-center min-h-control px-4 rounded-field text-compact font-bold text-black no-underline hover:bg-grey-soft focus-visible:bg-grey-soft focus-visible:outline-offset-0"
          >
            {item.label}
            {item.external && <span class="sr-only"> (opens in a new tab)</span>}
          </a>
        ))}
      </div>
    </div>
  );
}
