/**
 * What a partner inquiry is about, shared by the form island, the links on
 * /partners and the tests. `partner` means sponsorship (kept for the existing
 * `?way=partner&tier=…` links).
 */
export type Way = 'partner' | 'host' | 'food' | 'community' | 'unsure';
export type Tier = 'champion' | 'builder' | 'friend' | 'supporter';

export const WAY_LABEL: Record<Way, string> = {
  partner: 'Sponsorship',
  host: 'Host a meetup',
  food: 'Food and drinks',
  community: 'Community collaboration',
  unsure: 'Not sure yet',
};

export const TIERS: { value: Tier; label: string }[] = [
  { value: 'champion', label: 'Community Champion' },
  { value: 'builder', label: 'Community Builder' },
  { value: 'friend', label: 'Community Friend' },
  { value: 'supporter', label: 'Community Supporter' },
];

/** Other spellings people (and older links) use for a way. */
const ALIASES: Record<string, Way> = { sponsor: 'partner', sponsorship: 'partner', venue: 'host', hosting: 'host', catering: 'food', collaboration: 'community' };

export const asWay = (v: unknown): Way | null =>
  typeof v === 'string' ? (((Object.hasOwn(WAY_LABEL, v) ? v : Object.hasOwn(ALIASES, v) ? ALIASES[v] : undefined) as Way | undefined) ?? null) : null;
export const asTier = (v: unknown): Tier | '' => (TIERS.some((t) => t.value === v) ? (v as Tier) : '');
export const tierLabel = (t: Tier | '') => TIERS.find((x) => x.value === t)?.label;

/**
 * The preselected intent: a value set by a click on the page wins over the URL.
 * A tier alone means sponsorship; a tier is ignored for any other way.
 */
export function intentFromQuery(q: URLSearchParams, live: { way?: string; tier?: string } = {}): { way: Way; tier: Tier | '' } | null {
  const tier = asTier(live.tier || q.get('tier'));
  const way = asWay(live.way) ?? asWay(q.get('way')) ?? (tier ? 'partner' : null);
  if (!way) return null;
  return { way, tier: way === 'partner' ? tier : '' };
}

/** "Sponsorship: Community Builder", "Host a meetup". */
export const intentLabel = (way: Way, tier: Tier | '') => (way === 'partner' && tier ? `${WAY_LABEL.partner}: ${tierLabel(tier)}` : WAY_LABEL[way]);

/** What the form sends. Empty optional fields are left out; fields for another way are dropped. */
export function partnerPayload(f: { org: string; name: string; email: string; phone: string; way: Way; tier: Tier | ''; capacity: string; msg: string }) {
  const out: Record<string, string> = { org: f.org.trim(), name: f.name.trim(), email: f.email.trim(), way: f.way, interest: intentLabel(f.way, f.tier) };
  if (f.phone.trim()) out.phone = f.phone.trim();
  if (f.way === 'partner' && f.tier) out.tier = tierLabel(f.tier)!;
  if (f.way === 'host' && f.capacity.trim()) out.capacity = f.capacity.trim();
  if (f.msg.trim()) out.msg = f.msg.trim();
  return out;
}
