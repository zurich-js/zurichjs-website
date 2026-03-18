import { createClient } from '@sanity/client';

export const client = createClient({
  projectId: "viqjrovw",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: true,
  perspective: 'published',
});

// Writable client for mutations (API routes that create/update documents)
export const writableClient = createClient({
  projectId: "viqjrovw",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: import.meta.env.SANITY_TOKEN,
});
