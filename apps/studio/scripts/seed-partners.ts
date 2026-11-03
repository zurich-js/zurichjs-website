/**
 * Seeds partner documents from the list the old website hardcoded
 * (zurichjs-website origin/main: src/data/index.ts, getPartners and
 * getTodaysSponsors), with logos from the website repo
 * (apps/web/public/images/partners). Creates drafts only; existing partners
 * with the same name get only the missing fields, as a draft.
 *
 * `current` follows what the old site presented as active: sponsors,
 * community, conference and supporting partners. Venue hosts are listed as
 * hosts (the site never calls them current sponsors). An organiser must
 * confirm every "current" and add dates before publishing.
 *
 *   npx sanity exec scripts/seed-partners.ts --with-user-token [-- --apply] [-- --logos <dir>]
 */
import {createReadStream, existsSync} from 'node:fs'
import {join} from 'node:path'
import {APPLY, arg, banner, client, createDraft, patchDraft} from './lib/drafts'

type Kind = 'sponsor' | 'venue' | 'food' | 'community' | 'conference' | 'supporting'
interface Seed {
  slug: string
  name: string
  url: string
  logo: string
  kinds: Kind[]
  tier?: 'champion' | 'builder' | 'friend' | 'supporter'
  current?: boolean
  description: string
  allowReferrer?: boolean
}

export const PARTNERS: Seed[] = [
  {
    slug: 'ginetta',
    name: 'Ginetta',
    url: 'https://ginetta.net',
    logo: 'ginetta.png',
    kinds: ['venue'],
    description: 'Hosted ZurichJS meetups',
  },
  {
    slug: 'novu',
    name: 'novu AG',
    url: 'https://novu.ch/',
    logo: 'novu.png',
    kinds: ['venue'],
    description: 'Hosted ZurichJS meetups, including the first one',
  },
  {
    slug: 'getyourguide',
    name: 'GetYourGuide',
    url: 'https://qrco.de/bgTBWh',
    logo: 'get-your-guide.png',
    kinds: ['venue'],
    description: 'Hosted Vue Zurich and ZurichJS meetups',
  },
  {
    slug: 'smallpdf',
    name: 'Smallpdf',
    url: 'https://smallpdf.com',
    logo: 'smallpdf.png',
    kinds: ['venue'],
    description: 'Hosted ZurichJS meetups',
  },
  {
    slug: 'orbiz-josef',
    name: 'Orbiz Josef Zurich',
    url: 'https://orbiz-flex.ch/standort/josef',
    logo: 'orbiz.png',
    kinds: ['venue'],
    description: 'Hosted ZurichJS meetups',
  },
  {
    slug: 'whatthestack',
    name: 'WhatTheStack',
    url: 'https://wts.sh',
    logo: 'wts.png',
    kinds: ['conference'],
    description: 'Conference perks for ZurichJS members',
  },
  {
    slug: 'cityjs',
    name: 'CityJS',
    url: 'https://cityjsconf.org/',
    logo: 'city-js.png',
    kinds: ['conference'],
    description: 'Conference perks for ZurichJS members',
  },
  {
    slug: 'ijs-munich',
    name: 'iJS Munich',
    url: 'https://javascript-conference.com/munich/',
    logo: 'ijs-munich.jpg',
    kinds: ['conference'],
    description: 'The conference for full-stack JavaScript in Munich',
  },
  {
    slug: 'grusp',
    name: 'Grusp',
    url: 'https://www.grusp.org/',
    logo: 'grusp.png',
    kinds: ['conference'],
    description: 'JavaScript community and conference partner',
  },
  {
    slug: 'code-blossom',
    name: 'Code Blossom',
    url: 'https://www.code-blossom.com/',
    logo: 'code-blossom.png',
    kinds: ['community'],
    description: 'Regional JavaScript community partner',
  },
  {
    slug: 'web-zurich',
    name: 'Web Zurich',
    url: 'https://webzurich.ch/',
    logo: 'webzurich.png',
    kinds: ['community'],
    description: 'Regional web development community partner',
  },
  {
    slug: 'swiss-dev-jobs',
    name: 'Swiss Dev Jobs',
    url: 'https://swissdevjobs.ch/jobs/JavaScript/all',
    logo: 'sdj-rectangle.png',
    kinds: ['supporting'],
    description: 'Job board access for ZurichJS members',
  },
  {
    slug: 'jetbrains',
    name: 'JetBrains',
    url: 'https://www.jetbrains.com/',
    logo: 'jetbrains.png',
    kinds: ['supporting'],
    description: 'Software licences for ZurichJS',
  },
  {
    slug: 'vercel',
    name: 'Vercel',
    url: 'https://vercel.com',
    logo: 'vercel-black.png',
    kinds: ['sponsor'],
    tier: 'champion',
    current: true,
    description: 'The AI Cloud for building and deploying web applications',
  },
  {
    slug: 'stripe',
    name: 'Stripe',
    url: 'https://stripe.com',
    logo: 'stripe.png',
    kinds: ['sponsor'],
    tier: 'builder',
    current: true,
    description: 'Financial infrastructure for the internet',
  },
  {
    slug: 'gyff',
    name: 'GYFF',
    url: 'https://www.gyffted.com',
    logo: 'gyff-logo-square.png',
    kinds: ['sponsor'],
    tier: 'supporter',
    current: true,
    description: 'IT recruitment in Switzerland',
    allowReferrer: true,
  },
  {
    slug: 'fin',
    name: 'FIN',
    url: 'https://trust-fin.ch/tax-return-switzerland/',
    logo: 'fin.png',
    kinds: ['sponsor'],
    tier: 'supporter',
    current: true,
    description: 'Tax advice in Switzerland',
    allowReferrer: true,
  },
]

/** The old /today page's sponsors, all for the September 2026 warm-up (event "sep-2026"). */
export const EVENT_SUPPORTERS: Record<
  string,
  {partner: string; role: 'venue' | 'food' | 'sponsor' | 'community'}[]
> = {
  'sep-2026': [
    {partner: 'getyourguide', role: 'venue'},
    {partner: 'gyff', role: 'sponsor'},
    {partner: 'fin', role: 'sponsor'},
  ],
}

banner('Seed partners from the old website')
const logos =
  arg('logos') ?? join(process.cwd(), '../zurichjs-website/apps/web/public/images/partners')
const existing = await client.fetch<{_id: string; name?: string; slug?: string}[]>(
  `*[_type == "partner" && !(_id in path("drafts.**"))]{_id, name, "slug": id.current}`,
)
const idFor: Record<string, string> = {}

for (const p of PARTNERS) {
  const match = existing.find(
    (e) =>
      e.slug === p.slug ||
      e.name?.toLowerCase().replace(/\s+/g, '') === p.name.toLowerCase().replace(/\s+/g, ''),
  )
  const fields = {
    kinds: p.kinds,
    tier: p.tier,
    current: p.current ?? !p.kinds.includes('venue'),
    description: p.description,
    allowReferrer: p.allowReferrer ?? false,
  }
  const file = join(logos, p.logo)
  console.log(
    `● ${p.name.padEnd(20)} ${match ? `update ${match._id}` : 'create'} · ${p.kinds.join(', ')}${fields.current ? ' · CURRENT (confirm!)' : ''}${existsSync(file) ? '' : ' · logo file missing'}`,
  )
  let logo: Record<string, unknown> | undefined
  if (APPLY && existsSync(file)) {
    const asset = await client.assets.upload('image', createReadStream(file), {filename: p.logo})
    logo = {_type: 'image', asset: {_type: 'reference', _ref: asset._id}}
  }
  if (match) {
    idFor[p.slug] = match._id
    await patchDraft(match._id, {...fields, ...(logo ? {logo} : {})})
  } else {
    const _id = `partner.${p.slug}`
    idFor[p.slug] = _id
    await createDraft({
      _id,
      _type: 'partner',
      id: {_type: 'slug', current: p.slug},
      name: p.name,
      url: p.url,
      ...fields,
      ...(logo ? {logo} : {}),
    })
  }
}

for (const [slug, list] of Object.entries(EVENT_SUPPORTERS)) {
  const ev = await client.fetch<{_id: string} | null>(
    `*[_type == "events" && id.current == $slug && !(_id in path("drafts.**"))][0]{_id}`,
    {slug},
  )
  console.log(
    `● event ${slug}: ${ev ? list.map((s) => `${s.partner} (${s.role})`).join(', ') : 'not found, skipped'}`,
  )
  if (!ev) continue
  // Weak references: the partner drafts are not published yet.
  await patchDraft(ev._id, {
    supporters: list.map((s, i) => ({
      _key: `s${i}`,
      _type: 'eventSupporter',
      role: s.role,
      partner: {_type: 'reference', _ref: idFor[s.partner], _weak: true},
    })),
  })
}
console.log(
  APPLY
    ? '\nDrafts written. Confirm "Current" and dates for each partner, then publish.'
    : '\nDry run complete.',
)
