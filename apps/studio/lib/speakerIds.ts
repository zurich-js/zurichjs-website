/**
 * Speaker IDs are the public URL of a speaker (zurichjs.com/speakers/<ID>), so they are names, never
 * database IDs (owner, 19th November 2026). The old site gave many speakers a generated
 * "speaker-<uuid>" ID; scripts/clean-speaker-slugs.ts proposes a name-based one for each. A changed ID
 * keeps the old one in `legacySlugs`, so links already shared or emailed keep working: the page
 * redirects (301) and the private feedback and profile links still find the speaker.
 */

/** Letters that Unicode does not split into a base letter and an accent, so they need their own spelling. */
const LETTERS: Record<string, string> = {ø: 'o', ł: 'l', đ: 'd', ß: 'ss', æ: 'ae', œ: 'oe', þ: 'th', ð: 'd', ı: 'i'}

/** A clean URL segment: lowercase letters, digits and single hyphens. Accented letters keep their base letter. */
export const cleanSlug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[øłđßæœþðı]/g, (c) => LETTERS[c] ?? c)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/** An ID the old site generated: "speaker-" and a UUID. It says nothing about the person and exposes an internal ID. */
export const isGeneratedId = (id: string) =>
  /^speaker-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim())

export interface SpeakerIdRow {
  _id: string
  slug: string
  name?: string
  legacySlugs?: string[]
}

export type SpeakerIdPlan =
  | {kind: 'change'; row: SpeakerIdRow; to: string; legacySlugs: string[]}
  | {kind: 'problem'; row: SpeakerIdRow; reason: string}

/**
 * What to change: a generated ID becomes the speaker's name; any other ID that is not a clean URL
 * segment is cleaned. A new ID never takes one that is in use, was just handed out, or is another
 * speaker's old ID (that would break their redirect); those are reported for a person to settle.
 */
export function planSpeakerIds(rows: SpeakerIdRow[]): SpeakerIdPlan[] {
  const taken = new Set(rows.map((r) => r.slug))
  const reserved = new Map<string, string>()
  for (const r of rows) for (const old of r.legacySlugs ?? []) reserved.set(old, r._id)
  const plans: SpeakerIdPlan[] = []
  for (const row of rows) {
    const generated = isGeneratedId(row.slug)
    const to = cleanSlug(generated ? (row.name ?? '') : row.slug)
    if (to === row.slug) continue
    if (!to) {
      plans.push({kind: 'problem', row, reason: generated ? 'has no name to make an ID from' : 'cleans to nothing'})
      continue
    }
    if (taken.has(to) || (reserved.has(to) && reserved.get(to) !== row._id)) {
      plans.push({kind: 'problem', row, reason: `"${to}" is already another speaker's ID or old ID`})
      continue
    }
    taken.add(to)
    plans.push({kind: 'change', row, to, legacySlugs: [...new Set([...(row.legacySlugs ?? []), row.slug])]})
  }
  return plans
}
