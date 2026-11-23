/**
 * Partner records in the admin area and on the site: adding and editing them, their two logo
 * files and hover colour, linking a sponsorship to one, and what a build reads.
 */
import { memoryPartners, memoryStore, type NewSponsor, type PartnerStore, type SponsorStore } from '@zurichjs/sponsorship';
import { beforeEach, describe, expect, it } from 'vitest';
import { handleAddPartner, handleAdminPartners } from '../src/pages/api/membership/admin/partners/index.ts';
import { handleAdminPartner, handleUpdatePartner } from '../src/pages/api/membership/admin/partners/[id]/index.ts';
import { handlePartnerLogoRemove, handlePartnerLogoUpload } from '../src/pages/api/membership/admin/partners/[id]/logos/[variant].ts';
import { handleAdminSponsor, handleUpdateSponsor } from '../src/pages/api/membership/admin/sponsors/[id]/index.ts';
import { handlePartnerLogo } from '../src/pages/api/partner-logo/[file].ts';
import { logoMeta } from '../src/server/logo-meta.ts';
import type { PartnerView } from '../src/server/partner-admin.ts';
import type { LogoStore } from '../src/server/sponsor-logo.ts';
import { sitePartner } from '../src/server/sponsor-public.ts';

const ADMIN = 'admin-password-for-tests';
const env = { ADMIN_PASSWORD: ADMIN, BETTER_AUTH_URL: 'https://zurichjs.com' };
const NOW = new Date('2026-11-23T10:00:00Z');
const BOARD = { kind: 'board', id: 'admin' } as const;
const headers = { authorization: `Bearer ${ADMIN}`, origin: 'https://zurichjs.com' };
const get = (path = '/x') => new Request(`https://zurichjs.com${path}`, { headers });
const post = (body: unknown) => new Request('https://zurichjs.com/x', { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(body) });
const upload = (bytes: Uint8Array, name: string) => {
  const form = new FormData();
  form.set('file', new File([bytes as Uint8Array<ArrayBuffer>], name));
  return new Request('https://zurichjs.com/x', { method: 'POST', headers, body: form });
};
const svg = (viewBox = '0 0 300 100') => new TextEncoder().encode(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><path d="M0 0h10v10z"/></svg>`);
/** The first bytes of a PNG: signature, then IHDR with this size and colour type. */
const png = (w: number, h: number, colourType: number) => {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, w);
  new DataView(b.buffer).setUint32(20, h);
  b[24] = 8;
  b[25] = colourType;
  return b;
};
const sponsor: NewSponsor = {
  companyName: 'Trust FIN GmbH',
  legalName: null,
  billingAddress: null,
  vatId: null,
  website: null,
  tier: 'supporter',
  cycle: 'yearly',
  paymentMode: 'manual',
  status: 'pending',
  source: 'imported',
  startedAt: '2026-01-01',
  paidUntil: '2027-01-01',
  pricePerMeetup: null,
  notes: null,
};

describe('partner records', () => {
  let partners: PartnerStore;
  let store: SponsorStore;
  let rebuilds: string[];
  let blobs: Map<string, ArrayBuffer>;
  const deps = () => {
    const logos: LogoStore = { set: async (k, d) => void blobs.set(k, d), get: async (k) => blobs.get(k) ?? null };
    return { env, store, partners, logos, now: NOW.getTime(), rebuild: async (reason: string) => void rebuilds.push(reason) };
  };
  const body = async <T>(res: Response | Promise<Response>) => (await (await res).json()) as T & { error?: string; field?: string };
  const add = (over: Record<string, unknown> = {}) => handleAddPartner(post({ name: 'FIN', url: 'https://trust-fin.ch/', kinds: ['sponsor'], ...over }), deps());

  beforeEach(() => {
    partners = memoryPartners({ now: () => NOW });
    store = memoryStore({ now: () => NOW });
    rebuilds = [];
    blobs = new Map();
  });

  it('needs the admin session', async () => {
    const res = await handleAdminPartners(new Request('https://zurichjs.com/x'), deps());
    expect(res.status).toBe(401);
  });

  it('adds a partner with an id made from its name, refuses a second one, and queues a rebuild', async () => {
    const res = await add({ name: 'SAE Institute Zürich', kinds: ['venue'], current: true });
    expect(res.status).toBe(200);
    expect((await body<{ partner: PartnerView }>(res)).partner).toMatchObject({ id: 'sae-institute-zurich', kinds: ['venue'], current: true, logos: { colour: null, mono: null } });
    expect(rebuilds).toEqual(['partner added']);
    const again = await add({ name: 'SAE Institute Zürich' });
    expect(again.status).toBe(409);
    expect((await body(again)).field).toBe('id');
    expect((await add({ name: 'Other', id: 'Not An Id' })).status).toBe(400);
    expect((await add({ name: '' })).status).toBe(400);
    expect((await body<{ partners: PartnerView[] }>(handleAdminPartners(get(), deps()))).partners.map((p) => p.id)).toEqual(['sae-institute-zurich']);
  });

  it('saves the hover colour in lowercase and refuses anything that is not a hex colour, kind or tier', async () => {
    await add();
    const saved = await body<{ partner: PartnerView }>(handleUpdatePartner(post({ logoBackground: '#635BFF', tier: 'builder', current: true }), 'fin', deps()));
    expect(saved.partner).toMatchObject({ logoBackground: '#635bff', tier: 'builder', current: true, name: 'FIN' });
    for (const bad of [{ logoBackground: 'purple' }, { kinds: ['investor'] }, { tier: 'platinum' }, { url: 'javascript:alert(1)' }, { current: 'yes' }])
      expect((await handleUpdatePartner(post(bad), 'fin', deps())).status).toBe(400);
    expect((await body<{ partner: PartnerView }>(handleUpdatePartner(post({ logoBackground: '' }), 'fin', deps()))).partner.logoBackground).toBeNull();
    expect((await handleUpdatePartner(post({ name: 'x' }), 'nobody', deps())).status).toBe(404);
  });

  it('takes a colour and a one-colour logo, serves them, and replaces or removes them', async () => {
    await add();
    const first = await body<{ partner: PartnerView }>(handlePartnerLogoUpload(upload(svg(), 'fin.svg'), 'fin', 'colour', deps()));
    expect(first.partner.logos.colour).toMatchObject({ filename: 'fin.svg', contentType: 'image/svg+xml', ratio: 3, opaque: false });
    const file = first.partner.logos.colour!.src.split('/').pop()!;
    expect(first.partner.logos.colour!.src).toBe(`/api/partner-logo/${file}`);

    const served = await handlePartnerLogo(file, deps());
    expect(served.status).toBe(200);
    expect(served.headers.get('content-type')).toBe('image/svg+xml');
    expect(served.headers.get('content-security-policy')).toContain('sandbox');
    expect(served.headers.get('cache-control')).toContain('immutable');
    expect((await handlePartnerLogo(file.replace('.svg', '.png'), deps())).status).toBe(404);

    await handlePartnerLogoUpload(upload(png(400, 100, 2), 'fin-black.png'), 'fin', 'mono', deps());
    const replaced = await body<{ partner: PartnerView }>(handlePartnerLogoUpload(upload(png(200, 100, 6), 'fin-2.png'), 'fin', 'colour', deps()));
    expect(replaced.partner.logos).toMatchObject({ colour: { filename: 'fin-2.png', ratio: 2, opaque: false }, mono: { filename: 'fin-black.png', ratio: 4, opaque: true } });
    // The old file's address is gone with it.
    expect((await handlePartnerLogo(file, deps())).status).toBe(404);

    const script = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    const refused = await handlePartnerLogoUpload(upload(script, 'bad.svg'), 'fin', 'colour', deps());
    expect(refused.status).toBe(400);
    expect((await handlePartnerLogoUpload(upload(svg(), 'x.svg'), 'fin', 'hover', deps())).status).toBe(404);

    const removed = await body<{ partner: PartnerView }>(handlePartnerLogoRemove(new Request('https://zurichjs.com/x', { method: 'DELETE', headers }), 'fin', 'mono', deps()));
    expect(removed.partner.logos.mono).toBeNull();
    expect(rebuilds.filter((r) => r.includes('logo'))).toHaveLength(4);
  });

  it('links a sponsorship only to a record that exists, and puts a logo the sponsor uploaded on the site', async () => {
    await add();
    const { sponsor: s } = await store.create(sponsor, { email: 'ada@trust-fin.ch', name: 'Ada', role: 'primary' }, BOARD);
    await store.transition(s.id, { from: 'pending', to: 'active', actor: BOARD });

    // Running and not linked: the board is told, because the site lists them by name only.
    expect((await body<{ attention: string[] }>(handleAdminSponsor(get(), s.id, deps()))).attention).toContain('no_partner');
    const typo = await handleUpdateSponsor(post({ partnerId: 'finn' }), s.id, deps());
    expect(typo.status).toBe(400);
    expect((await body(typo)).field).toBe('partnerId');
    expect((await handleUpdateSponsor(post({ partnerId: 'fin' }), s.id, deps())).status).toBe(200);
    expect((await body<{ attention: string[] }>(handleAdminSponsor(get(), s.id, deps()))).attention).not.toContain('no_partner');
    // Saving other details with the link unchanged never checks it again.
    expect((await handleUpdateSponsor(post({ partnerId: 'fin', notes: 'Met at the conference' }), s.id, deps())).status).toBe(200);
    expect((await body<{ sponsorships: { companyName: string }[] }>(handleAdminPartner(get(), 'fin', deps()))).sponsorships).toMatchObject([{ companyName: 'Trust FIN GmbH' }]);

    blobs.set(`logos/${s.id}/1.svg`, svg('0 0 50 50').buffer as ArrayBuffer);
    const logo = await store.addLogo(
      s.id,
      { blobKey: `logos/${s.id}/1.svg`, contentType: 'image/svg+xml', bytes: 90, filename: 'fin (1).svg', uploadedBy: 'ada@trust-fin.ch' },
      BOARD,
    );
    const used = await body<{ partner: PartnerView }>(handlePartnerLogoUpload(post({ sponsorId: s.id, logoId: logo.id }), 'fin', 'colour', deps()));
    expect(used.partner.logos.colour).toMatchObject({ filename: 'fin (1).svg', ratio: 1 });
    // Never another sponsor's file.
    expect((await handlePartnerLogoUpload(post({ sponsorId: 'someone-else', logoId: logo.id }), 'fin', 'colour', deps())).status).toBe(404);
    expect((await handleUpdateSponsor(post({ partnerId: null }), s.id, deps())).status).toBe(200);
  });

  it('gives the site a partner with the addresses of its logo files', async () => {
    await add({ logoBackground: '#000000', description: 'Tax advice' });
    await handlePartnerLogoUpload(upload(svg(), 'fin.svg'), 'fin', 'colour', deps());
    await handlePartnerLogoUpload(upload(svg(), 'fin-black.svg'), 'fin', 'mono', deps());
    const p = (await partners.get('fin'))!;
    expect(sitePartner(p, '/partner-logos')).toMatchObject({
      id: 'fin',
      name: 'FIN',
      url: 'https://trust-fin.ch/',
      logo: `/partner-logos/${p.logos.colour!.id}.svg`,
      logoBlack: `/partner-logos/${p.logos.mono!.id}.svg`,
      logoBackground: '#000000',
      logoRatio: 3,
      kinds: ['sponsor'],
      current: false,
      description: 'Tax advice',
    });
    expect(sitePartner({ ...p, logos: {} }, '/partner-logos').logo).toBeUndefined();
  });
});

describe('logoMeta', () => {
  it('reads the ratio and the transparency of a PNG', () => {
    expect(logoMeta(png(300, 100, 6), 'image/png')).toEqual({ ratio: 3, opaque: false });
    expect(logoMeta(png(100, 200, 2), 'image/png')).toEqual({ ratio: 0.5, opaque: true });
  });

  it('reads a WebP, lossy, lossless and extended', () => {
    const riff = (format: string) => {
      const b = new Uint8Array(40);
      b.set(new TextEncoder().encode('RIFF'), 0);
      b.set(new TextEncoder().encode('WEBP'), 8);
      b.set(new TextEncoder().encode(format), 12);
      return b;
    };
    const lossy = riff('VP8 ');
    new DataView(lossy.buffer).setUint16(26, 240, true);
    new DataView(lossy.buffer).setUint16(28, 80, true);
    expect(logoMeta(lossy, 'image/webp')).toEqual({ ratio: 3, opaque: true });
    const lossless = riff('VP8L');
    new DataView(lossless.buffer).setUint32(21, (240 - 1) | ((120 - 1) << 14) | (1 << 28), true);
    expect(logoMeta(lossless, 'image/webp')).toEqual({ ratio: 2, opaque: false });
    const extended = riff('VP8X');
    extended[20] = 0x10;
    extended.set([99, 0, 0, 49, 0, 0], 24);
    expect(logoMeta(extended, 'image/webp')).toEqual({ ratio: 2, opaque: false });
  });

  it('reads an SVG from its viewBox or its size, and answers nothing for what it cannot read', () => {
    const enc = (s: string) => new TextEncoder().encode(s);
    expect(logoMeta(enc('<svg viewBox="0 0 271.2 100"></svg>'), 'image/svg+xml')).toEqual({ ratio: 2.712, opaque: false });
    expect(logoMeta(enc('<svg width="200px" height="50"></svg>'), 'image/svg+xml')).toEqual({ ratio: 4, opaque: false });
    expect(logoMeta(enc('<svg></svg>'), 'image/svg+xml')).toEqual({ ratio: null, opaque: false });
    expect(logoMeta(new Uint8Array(4), 'image/png')).toEqual({ ratio: null, opaque: false });
  });
});
