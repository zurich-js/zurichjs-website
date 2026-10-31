import type { ComponentChildren, JSX } from 'preact';
import { buttonClass, isExternal, type ButtonSize, type ButtonVariant } from '~/lib/ui';

type Common = { variant?: ButtonVariant; size?: ButtonSize; grow?: boolean; class?: string; children: ComponentChildren };

/** Island twin of Button.astro; both use buttonClass so the look is defined once. */
export function Button(props: Common & (({ href: string; external?: boolean } & JSX.HTMLAttributes<HTMLAnchorElement>) | ({ href?: undefined } & JSX.HTMLAttributes<HTMLButtonElement>))) {
  const { variant = 'yellow', size = 'md', grow, class: extra, children, ...rest } = props as Common & { href?: string; external?: boolean } & Record<string, unknown>;
  const cls = buttonClass(variant, size, grow, extra);
  if (typeof rest.href === 'string') {
    const { href, external, ...a } = rest as { href: string; external?: boolean } & Record<string, unknown>;
    const ext = external ?? isExternal(href);
    return (
      <a href={href} class={cls} {...(ext && !href.startsWith('mailto:') ? { target: '_blank', rel: 'noopener' } : {})} {...a}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" class={cls} {...(rest as JSX.HTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
