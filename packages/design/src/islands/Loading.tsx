import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { cx } from '../recipes.ts';
import { Button } from './Button.tsx';
import { Notice } from './Notice.tsx';

export const SLOW_AFTER_MS = 10_000;

const size = { body: 'text-body', compact: 'text-compact' } as const;

/**
 * The one loading line for islands that fetch: announced politely (`role="status"`), and after
 * SLOW_AFTER_MS it adds that this is taking longer than usual. The caller still decides when
 * loading has failed and shows its error with a way to try again.
 */
export function Loading({ children, size: s = 'body', class: extra }: { children: ComponentChildren; size?: keyof typeof size; /** Layout only. */ class?: string }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <p role="status" class={cx('m-0 text-ink-2 text-pretty', size[s], extra)}>
      {children}
      {slow && ' This is taking longer than usual.'}
    </p>
  );
}

/** A load that failed: what happened (announced), and a button to load again. */
export function LoadFailed({ title, children, onRetry }: { title: ComponentChildren; children?: ComponentChildren; onRetry: () => void }) {
  return (
    <div class="flex max-w-form flex-col items-start gap-4">
      <Notice tone="danger" live title={title} class="self-stretch">
        {children && <p class="m-0">{children}</p>}
      </Notice>
      <Button variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
