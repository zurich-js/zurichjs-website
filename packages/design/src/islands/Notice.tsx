import type { ComponentChildren, Ref } from 'preact';
import { noticeClass, type NoticeTone } from '../recipes.ts';

interface Props {
  tone?: NoticeTone;
  title: ComponentChildren;
  /** For results of an action (form sent, form failed): announced to screen readers. */
  live?: boolean;
  children?: ComponentChildren;
  /** Forms move focus to their result: pass a ref, and the notice can take focus. */
  focusRef?: Ref<HTMLDivElement>;
  /** The title as a heading, when the notice replaces a page's content (a form's result). */
  as?: 'p' | 'h2' | 'h3';
  id?: string;
  class?: string;
}

/** Island twin of Notice.astro: success, error and note panels. Green only for success, red only for errors. */
export function Notice({ tone = 'note', title, live = false, children, focusRef, as: Title = 'p', id, class: extra }: Props) {
  const role = live ? (tone === 'danger' ? 'alert' : 'status') : undefined;
  return (
    <div ref={focusRef} id={id} role={role} tabIndex={focusRef ? -1 : undefined} class={noticeClass(tone, ['outline-hidden', extra].filter(Boolean).join(' '))}>
      <div class="flex flex-col gap-1.5 min-w-0">
        <Title class="m-0 font-bold text-card-title">{title}</Title>
        {children && <div class="flex flex-col gap-2 text-compact">{children}</div>}
      </div>
    </div>
  );
}
