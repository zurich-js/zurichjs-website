/** Check mark drawn as SVG: Figtree has no ✓ glyph, so text would fall back to a system font. */
export function Check({ class: className = 'w-[0.9em] h-[0.9em]' }: { class?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" class={`inline-block align-[-0.1em] ${className}`}>
      <path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}
