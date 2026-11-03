/** Where the V2 Astro site runs for previews (Presentation tool and links). Set SANITY_STUDIO_PREVIEW_URL. */
export const PREVIEW_ORIGIN = (process.env.SANITY_STUDIO_PREVIEW_URL || 'http://localhost:4321').replace(/\/$/, '')

export const previewUrlFor = (slug?: string) => (slug ? `${PREVIEW_ORIGIN}/events/${slug}` : undefined)
