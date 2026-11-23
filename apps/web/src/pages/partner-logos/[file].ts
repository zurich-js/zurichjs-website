/**
 * The partners' logo files, written into the build from the database (docs/domains/partners/overview.md):
 * /partner-logos/<logo id>.<svg|png|webp>. A new upload has a new id, so an address never changes
 * what it shows. A build without a database writes none (the partner list in code uses /images/partners).
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { partnerLogoFile } from '@zurichjs/sponsorship';
import { publicPartnerLogos } from '../../server/sponsor-public.ts';

export const getStaticPaths: GetStaticPaths = async () => {
  if (import.meta.env.MODE === 'test' || import.meta.env.DEV) return [];
  // Like the partner list itself, the files never fail a build: without them the pages fall back to names.
  const logos = await publicPartnerLogos(process.env).catch((err: Error) => {
    console.warn(`\n[content] The partner logos could not be read (${err.message}).\n`);
    return [];
  });
  return logos.map((l) => ({ params: { file: partnerLogoFile(l) }, props: { data: l.data, contentType: l.contentType } }));
};

export const GET: APIRoute = ({ props }) => new Response(props.data as Uint8Array<ArrayBuffer>, { headers: { 'content-type': props.contentType as string } });
