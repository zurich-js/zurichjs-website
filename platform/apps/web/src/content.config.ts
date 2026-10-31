import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/** Policy pages: the production legal text, one Markdown file each. URLs keep the production slugs. */
const policies = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/policies' }),
  schema: z.object({
    title: z.string(),
    tab: z.string(),
    order: z.number(),
    description: z.string().min(50).max(170),
    updated: z.coerce.date(),
  }),
});

export const collections = { policies };
