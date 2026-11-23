/**
 * Partner records: every sponsor, host and partner the site names, current and past (owner,
 * 20th November 2026; docs/domains/partners/overview.md). The board edits them in /admin/partners;
 * a build reads them, with their logo files, from the same database.
 *
 * A partner has up to two logo files: `colour` (the logo as the company wants it) and `mono` (a
 * one-colour version, for the moving rows and for the hover colour). Uploading a variant replaces
 * the one before; each upload gets a new id, so the file's address on the site changes with it.
 */
import type { Queryable } from './postgres.ts';
import { NotFound } from './store.ts';
import type { Tier } from './types.ts';

export const PARTNER_KINDS = ['sponsor', 'venue', 'food', 'community', 'conference', 'supporting'] as const;
export type PartnerKind = (typeof PARTNER_KINDS)[number];
export const LOGO_VARIANTS = ['colour', 'mono'] as const;
export type LogoVariant = (typeof LOGO_VARIANTS)[number];
export const isLogoVariant = (v: unknown): v is LogoVariant => (LOGO_VARIANTS as readonly unknown[]).includes(v);

/** Lowercase letters, numbers and hyphens: it is part of addresses and what a sponsorship links to. */
export const PARTNER_ID = /^[a-z0-9][a-z0-9-]{0,62}$/;

export interface PartnerRecord {
  id: string;
  name: string;
  url: string | null;
  kinds: PartnerKind[];
  tier: Tier | null;
  current: boolean;
  delisted: boolean;
  description: string | null;
  blurb: string | null;
  allowReferrer: boolean;
  /** The hover colour, `#rrggbb` in lowercase. */
  logoBackground: string | null;
  logoKnockout: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerLogo {
  id: string;
  partnerId: string;
  variant: LogoVariant;
  contentType: string;
  filename: string;
  bytes: number;
  /** Width / height. */
  ratio: number | null;
  opaque: boolean;
  uploadedAt: string;
}

export type PartnerLogos = Partial<Record<LogoVariant, PartnerLogo>>;
export type PartnerWithLogos = PartnerRecord & { logos: PartnerLogos };
export type NewPartner = Omit<PartnerRecord, 'createdAt' | 'updatedAt'>;
export type PartnerPatch = Partial<Omit<NewPartner, 'id'>>;
export type NewPartnerLogo = Pick<PartnerLogo, 'contentType' | 'filename' | 'ratio' | 'opaque'> & { data: Uint8Array };
export type PartnerLogoFile = PartnerLogo & { data: Uint8Array };

export class DuplicatePartner extends Error {
  constructor(id: string) {
    super(`There is already a partner with the id ${id}.`);
    this.name = 'DuplicatePartner';
  }
}

export interface PartnerStore {
  /** By name. */
  list(): Promise<PartnerWithLogos[]>;
  get(id: string): Promise<PartnerWithLogos | null>;
  create(p: NewPartner): Promise<PartnerRecord>;
  update(id: string, patch: PartnerPatch): Promise<PartnerRecord>;
  /** Replaces the variant's file. */
  setLogo(id: string, variant: LogoVariant, logo: NewPartnerLogo): Promise<PartnerLogo>;
  removeLogo(id: string, variant: LogoVariant): Promise<void>;
  /** One file by its id, to serve it. */
  logoFile(logoId: string): Promise<PartnerLogoFile | null>;
  /** Every file, for a build. */
  logoFiles(): Promise<PartnerLogoFile[]>;
}

/** The id a name suggests: "SAE Institute Zürich" → sae-institute-zurich. */
export const partnerIdFor = (name: string) =>
  name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);

const EXT: Record<string, string> = { 'image/svg+xml': 'svg', 'image/png': 'png', 'image/webp': 'webp' };
/** The file name a logo has on the site: its id (new with every upload) and its type's extension. */
export const partnerLogoFile = (l: Pick<PartnerLogo, 'id' | 'contentType'>) => `${l.id}.${EXT[l.contentType] ?? 'png'}`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Row = Record<string, unknown>;
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : new Date(String(v)).toISOString());

const partnerOf = (r: Row): PartnerRecord => ({
  id: r.id as string,
  name: r.name as string,
  url: (r.url as string | null) ?? null,
  kinds: (r.kinds as PartnerKind[]) ?? [],
  tier: (r.tier as Tier | null) ?? null,
  current: r.current === true,
  delisted: r.delisted === true,
  description: (r.description as string | null) ?? null,
  blurb: (r.blurb as string | null) ?? null,
  allowReferrer: r.allow_referrer === true,
  logoBackground: (r.logo_background as string | null) ?? null,
  logoKnockout: r.logo_knockout === true,
  createdAt: iso(r.created_at),
  updatedAt: iso(r.updated_at),
});

const logoOf = (r: Row): PartnerLogo => ({
  id: r.id as string,
  partnerId: r.partner_id as string,
  variant: r.variant as LogoVariant,
  contentType: r.content_type as string,
  filename: r.filename as string,
  bytes: r.bytes as number,
  ratio: r.ratio === null || r.ratio === undefined ? null : Number(r.ratio),
  opaque: r.opaque === true,
  uploadedAt: iso(r.uploaded_at),
});
const fileOf = (r: Row): PartnerLogoFile => ({ ...logoOf(r), data: new Uint8Array(r.data as Uint8Array) });

const COLUMNS: Record<keyof Omit<NewPartner, 'id'>, string> = {
  name: 'name',
  url: 'url',
  kinds: 'kinds',
  tier: 'tier',
  current: 'current',
  delisted: 'delisted',
  description: 'description',
  blurb: 'blurb',
  allowReferrer: 'allow_referrer',
  logoBackground: 'logo_background',
  logoKnockout: 'logo_knockout',
};
const LOGO_META = 'id, partner_id, variant, content_type, filename, bytes, ratio, opaque, uploaded_at';

const withLogos = (partners: PartnerRecord[], logos: PartnerLogo[]): PartnerWithLogos[] =>
  partners.map((p) => ({ ...p, logos: Object.fromEntries(logos.filter((l) => l.partnerId === p.id).map((l) => [l.variant, l])) as PartnerLogos }));

export function postgresPartners(db: Queryable): PartnerStore {
  const q = async <R = Row>(text: string, params: unknown[] = []) => (await db.query<R>(text, params)).rows;
  return {
    async list() {
      const [partners, logos] = await Promise.all([q('select * from partners order by lower(name), id'), q(`select ${LOGO_META} from partner_logos`)]);
      return withLogos(partners.map(partnerOf), logos.map(logoOf));
    },
    async get(id) {
      const [partners, logos] = await Promise.all([q('select * from partners where id = $1', [id]), q(`select ${LOGO_META} from partner_logos where partner_id = $1`, [id])]);
      return withLogos(partners.map(partnerOf), logos.map(logoOf))[0] ?? null;
    },
    async create(p) {
      const keys = Object.keys(COLUMNS) as (keyof typeof COLUMNS)[];
      const rows = await q(
        `insert into partners (id, ${keys.map((k) => COLUMNS[k]).join(', ')}) values ($1, ${keys.map((_, i) => `$${i + 2}`).join(', ')})
         on conflict (id) do nothing returning *`,
        [p.id, ...keys.map((k) => p[k])],
      );
      if (!rows[0]) throw new DuplicatePartner(p.id);
      return partnerOf(rows[0]);
    },
    async update(id, patch) {
      const entries = (Object.entries(patch) as [keyof typeof COLUMNS, unknown][]).filter(([k, v]) => v !== undefined && Object.hasOwn(COLUMNS, k));
      const sets = ['updated_at = now()', ...entries.map(([k], i) => `${COLUMNS[k]} = $${i + 2}`)].join(', ');
      const rows = await q(`update partners set ${sets} where id = $1 returning *`, [id, ...entries.map(([, v]) => v)]);
      if (!rows[0]) throw new NotFound('partner');
      return partnerOf(rows[0]);
    },
    async setLogo(id, variant, l) {
      // A new id with every upload: the file's address on the site changes, so no cache shows the old one.
      const rows = await q(
        `with gone as (delete from partner_logos where partner_id = $1 and variant = $2),
              touched as (update partners set updated_at = now() where id = $1 returning id)
         insert into partner_logos (partner_id, variant, content_type, filename, bytes, data, ratio, opaque)
         select id, $2, $3, $4, $5, $6, $7, $8 from touched returning ${LOGO_META}`,
        [id, variant, l.contentType, l.filename, l.data.length, Buffer.from(l.data), l.ratio, l.opaque],
      );
      if (!rows[0]) throw new NotFound('partner');
      return logoOf(rows[0]);
    },
    async removeLogo(id, variant) {
      await q(
        `with gone as (delete from partner_logos where partner_id = $1 and variant = $2 returning partner_id)
         update partners set updated_at = now() where id in (select partner_id from gone)`,
        [id, variant],
      );
    },
    async logoFile(logoId) {
      if (!UUID.test(logoId)) return null;
      const r = (await q(`select ${LOGO_META}, data from partner_logos where id = $1`, [logoId]))[0];
      return r ? fileOf(r) : null;
    },
    logoFiles: async () => (await q(`select ${LOGO_META}, data from partner_logos`)).map(fileOf),
  };
}

/** In memory, with the same rules as the database (tests). */
export function memoryPartners(opts: { now?: () => Date } = {}): PartnerStore {
  const now = () => (opts.now ?? (() => new Date()))().toISOString();
  const partners = new Map<string, PartnerRecord>();
  const logos = new Map<string, PartnerLogoFile>();
  let n = 0;
  const meta = ({ data: _data, ...l }: PartnerLogoFile): PartnerLogo => l;
  const all = () => withLogos([...partners.values()], [...logos.values()].map(meta)).sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  const must = (id: string) => {
    const p = partners.get(id);
    if (!p) throw new NotFound('partner');
    return p;
  };
  const drop = (id: string, variant: LogoVariant) => {
    for (const l of logos.values()) if (l.partnerId === id && l.variant === variant) logos.delete(l.id);
  };
  return {
    list: async () => all(),
    get: async (id) => all().find((p) => p.id === id) ?? null,
    async create(p) {
      if (partners.has(p.id)) throw new DuplicatePartner(p.id);
      const record = { ...p, createdAt: now(), updatedAt: now() };
      partners.set(p.id, record);
      return { ...record };
    },
    async update(id, patch) {
      const defined = Object.fromEntries(Object.entries(patch).filter(([k, v]) => v !== undefined && Object.hasOwn(COLUMNS, k)));
      const record = { ...must(id), ...defined, updatedAt: now() };
      partners.set(id, record);
      return { ...record };
    },
    async setLogo(id, variant, l) {
      must(id);
      drop(id, variant);
      const logo: PartnerLogoFile = { ...l, id: `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`, partnerId: id, variant, bytes: l.data.length, uploadedAt: now() };
      logos.set(logo.id, logo);
      return meta(logo);
    },
    removeLogo: async (id, variant) => drop(id, variant),
    logoFile: async (logoId) => logos.get(logoId) ?? null,
    logoFiles: async () => [...logos.values()],
  };
}
