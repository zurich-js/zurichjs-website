import { createClient } from '@sanity/client';

export const client = createClient({
  projectId: "viqjrovw",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  perspective: 'published',
});