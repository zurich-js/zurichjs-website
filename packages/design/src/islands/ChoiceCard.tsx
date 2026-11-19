import type { ComponentChildren } from 'preact';
import { choiceCardClass, choiceDotClass } from '../recipes.ts';

interface Props {
  name: string;
  value: string;
  title: ComponentChildren;
  checked: boolean;
  onChange: () => void;
  type?: 'radio' | 'checkbox';
  /** The input's accessible name, when it should say more than the title (a price). */
  label?: string;
  /** Heading level of the title, when the choices are sections of the page. */
  level?: 'h3' | 'h4' | 'span';
  children?: ComponentChildren;
  class?: string;
}

/**
 * Island twin of ChoiceCard.astro: a whole card that is one choice, built on a native input so arrow keys
 * move between radios. 3px frame, yellow when chosen; the dot on the title's first line fills yellow.
 */
export function ChoiceCard({ name, value, title, checked, onChange, type = 'radio', label, level: Title = 'span', children, class: extra }: Props) {
  return (
    <label class={choiceCardClass(extra)}>
      <input type={type} name={name} value={value} checked={checked} onChange={onChange} aria-label={label} class="sr-only" />
      <span class="flex items-start gap-4">
        <Title class="m-0 flex-1 min-w-0 font-bold text-balance text-card-title">{title}</Title>
        <span aria-hidden="true" class="flex-none flex items-center h-lh text-card-title">
          <span class={choiceDotClass}>
            <svg viewBox="0 0 24 24" class="size-3.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12l5 5L20 7" />
            </svg>
          </span>
        </span>
      </span>
      {children}
    </label>
  );
}
