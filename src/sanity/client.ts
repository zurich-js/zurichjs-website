import { createClient } from "next-sanity";

// useCdn: true routes reads through Sanity's global edge CDN (api.sanity.io is the
// origin, apicdn.sanity.io is cached at the edge). Required because every getStaticProps,
// ISR revalidation, and getServerSideProps in this app reads from here on the hot path.
export const client = createClient({
  projectId: "viqjrovw",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: true,
  perspective: "published",
});
