import type { ComponentChildren } from 'preact';

/**
 * Small brand marks for the social fields, so each one is easy to tell apart.
 * GitHub, X and Bluesky are from Simple Icons (CC0); LinkedIn and the website globe are drawn here.
 * Decorative: the field's text label stays its accessible name.
 */
const ICONS = {
  linkedin: {
    color: '#0a66c2',
    body: (
      <>
        <rect width="24" height="24" rx="4" fill="currentColor" />
        <circle cx="7" cy="7" r="1.9" fill="#fff" />
        <rect x="5.3" y="9.7" width="3.4" height="9" rx="0.4" fill="#fff" />
        <path d="M10.7 9.7h3.2v1.3c.5-.9 1.6-1.6 3.1-1.6 2.6 0 3.3 1.6 3.3 4.1v5.2h-3.4v-4.6c0-1.1-.3-1.9-1.4-1.9s-1.5.8-1.5 1.9v4.6h-3.3z" fill="#fff" />
      </>
    ),
  },
  github: {
    color: '#181717',
    body: (
      <path
        fill="currentColor"
        d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
      />
    ),
  },
  x: {
    color: '#000000',
    body: (
      <path
        fill="currentColor"
        d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z"
      />
    ),
  },
  bluesky: {
    color: '#1185fe',
    body: (
      <path
        fill="currentColor"
        d="M5.202 2.857C7.954 4.922 10.913 9.11 12 11.358c1.087-2.247 4.046-6.436 6.798-8.501C20.783 1.366 24 .213 24 3.883c0 .732-.42 6.156-.667 7.037-.856 3.061-3.978 3.842-6.755 3.37 4.854.826 6.089 3.562 3.422 6.299-5.065 5.196-7.28-1.304-7.847-2.97-.104-.305-.152-.448-.153-.327 0-.121-.05.022-.153.327-.568 1.666-2.782 8.166-7.847 2.97-2.667-2.737-1.432-5.473 3.422-6.3-2.777.473-5.899-.308-6.755-3.369C.42 10.04 0 4.615 0 3.883c0-3.67 3.217-2.517 5.202-1.026"
      />
    ),
  },
  website: {
    color: '#242528',
    body: (
      <g fill="none" stroke="currentColor" stroke-width="1.8">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2c2.8 3 4 6.4 4 10s-1.2 7-4 10c-2.8-3-4-6.4-4-10s1.2-7 4-10z" />
      </g>
    ),
  },
} as const;

export type Social = keyof typeof ICONS;

/** A social field's label: the brand mark, then the text. */
export function SocialLabel({ kind, text }: { kind: Social; text: ComponentChildren }) {
  const icon = ICONS[kind];
  return (
    <span class="inline-flex items-center gap-2">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" style={{ color: icon.color }} class="flex-none">
        {icon.body}
      </svg>
      {text}
    </span>
  );
}
