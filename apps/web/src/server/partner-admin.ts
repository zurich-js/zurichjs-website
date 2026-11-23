/**
 * The board's side of partner records (/admin/partners, API under /api/membership/admin/partners,
 * behind the same ADMIN_PASSWORD session as the rest of the admin area): every sponsor, host and
 * partner the site names, with its two logo files and its hover colour
 * (docs/domains/partners/overview.md). The site is static, so every change queues a rebuild.
 */
import {
  PARTNER_ID,
  PARTNER_KINDS,
  isTier,
  partnerIdFor,
  partnerLogoFile,
  postgresPartners,
  type NewPartner,
  type PartnerKind,
  type PartnerLogo,
  type PartnerPatch,
  type PartnerStore,
  type PartnerWithLogos,
} from '@zurichjs/sponsorship';
import { text, type Env } from './http.ts';
import { membershipDb } from './membership-db.ts';
import { sponsorAdminRoute, type SponsorAdminCtx, type SponsorAdminDeps } from './sponsor-admin.ts';
import type { Parsed } from './sponsor-input.ts';
import { LOGO_BASE } from './sponsor-public.ts';
import { queueRebuild } from './sponsor-rebuild.ts';

export interface PartnerDeps extends SponsorAdminDeps {
  partners?: PartnerStore;
  /** Queues a rebuild of the site (tests pass their own). */
  rebuild?: (reason: string) => Promise<void>;
}

export const partnerStore = (env: Env): PartnerStore => postgresPartners(membershipDb(env));

export interface PartnerCtx extends SponsorAdminCtx {
  partners: PartnerStore;
  /** After a change the site shows. Never throws, never blocks the change. */
  changed: (reason: string) => Promise<void>;
}

export const partnerAdminRoute = (request: Request, deps: PartnerDeps, fn: (ctx: PartnerCtx) => Promise<Response>, what: string) =>
  sponsorAdminRoute(
    request,
    deps,
    (ctx) =>
      fn({
        ...ctx,
        partners: deps.partners ?? partnerStore(ctx.env),
        changed: async (reason) => {
          try {
            await (deps.rebuild ?? queueRebuild)(reason);
          } catch (err) {
            console.warn(`[partners] could not queue a rebuild (${reason}): ${(err as Error).message}`);
          }
        },
      }),
    what,
  );

const logoView = (l: PartnerLogo | undefined) => (l ? { ...l, src: `${LOGO_BASE.dev}/${partnerLogoFile(l)}` } : null);

/** A partner for the admin area: the record, and where its logo files can be seen. */
export const partnerView = (p: PartnerWithLogos) => ({ ...p, logos: { colour: logoView(p.logos.colour), mono: logoView(p.logos.mono) } });
export type PartnerView = ReturnType<typeof partnerView>;

const no = (error: string, field: string) => ({ ok: false as const, error, field });

const webUrl = (v: string) => {
  try {
    const u = new URL(v);
    return (u.protocol === 'https:' || u.protocol === 'http:') && v.length <= 500 ? u.toString() : null;
  } catch {
    return null;
  }
};

/** The fields of a partner that were sent, checked. Each failure names its field. */
export function parsePartner(body: Record<string, unknown>): Parsed<PartnerPatch> {
  const out: PartnerPatch = {};
  if ('name' in body) {
    const v = text(body.name, 200);
    if (!v) return no('Add the name, without < or >.', 'name');
    out.name = v;
  }
  if ('url' in body) {
    const v = text(body.url, 500);
    if (v === false) return no('Give the website as a full address (https://…).', 'url');
    const url = v ? webUrl(v) : null;
    if (v && !url) return no('Give the website as a full address (https://…).', 'url');
    out.url = url;
  }
  if ('kinds' in body) {
    if (!Array.isArray(body.kinds) || body.kinds.some((k) => !(PARTNER_KINDS as readonly unknown[]).includes(k))) return no('Choose what they are to ZurichJS.', 'kinds');
    out.kinds = PARTNER_KINDS.filter((k) => (body.kinds as unknown[]).includes(k)) as PartnerKind[];
  }
  if ('tier' in body) {
    if (body.tier && !isTier(body.tier)) return no('Choose a tier, or none.', 'tier');
    out.tier = isTier(body.tier) ? body.tier : null;
  }
  for (const k of ['current', 'delisted', 'allowReferrer', 'logoKnockout'] as const) {
    if (!(k in body)) continue;
    if (typeof body[k] !== 'boolean') return no('Send yes or no.', k);
    out[k] = body[k];
  }
  for (const [k, max] of [
    ['description', 500],
    ['blurb', 2000],
  ] as const) {
    if (!(k in body)) continue;
    const v = text(body[k], max);
    if (v === false) return no(`Keep this under ${max} characters, without < or >.`, k);
    out[k] = v ?? null;
  }
  if ('logoBackground' in body) {
    const v = typeof body.logoBackground === 'string' ? body.logoBackground.trim().toLowerCase() : body.logoBackground;
    if (v && !(typeof v === 'string' && /^#[0-9a-f]{6}$/.test(v))) return no('Give the colour as six hex digits, for example #635bff.', 'logoBackground');
    out.logoBackground = (v as string) || null;
  }
  return { ok: true, value: out };
}

/** A new partner: a name, and an id (given, or made from the name). */
export function parseNewPartner(body: Record<string, unknown>): Parsed<NewPartner> {
  const parsed = parsePartner(body);
  if (!parsed.ok) return parsed;
  const p = parsed.value;
  if (!p.name) return no('Add the name.', 'name');
  const id = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : partnerIdFor(p.name);
  if (!PARTNER_ID.test(id)) return no('Use lowercase letters, numbers and hyphens for the id, for example sae-institute.', 'id');
  return {
    ok: true,
    value: {
      id,
      name: p.name,
      url: p.url ?? null,
      kinds: p.kinds ?? [],
      tier: p.tier ?? null,
      current: p.current ?? false,
      delisted: p.delisted ?? false,
      description: p.description ?? null,
      blurb: p.blurb ?? null,
      allowReferrer: p.allowReferrer ?? false,
      logoBackground: p.logoBackground ?? null,
      logoKnockout: p.logoKnockout ?? false,
    },
  };
}
