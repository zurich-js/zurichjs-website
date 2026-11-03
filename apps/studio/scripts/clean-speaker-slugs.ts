/**
 * Finds speaker IDs that are not clean URL segments (lowercase letters,
 * digits and single hyphens) and proposes a clean one. With --apply it
 * writes a draft that sets the new ID and keeps the old one in
 * `legacySlugs`, so zurichjs.com/speakers/<old> redirects (301) after the
 * draft is published and the site rebuilt.
 *
 *   npx sanity exec scripts/clean-speaker-slugs.ts --with-user-token [-- --apply]
 */
import {APPLY, banner, client, patchDraft} from './lib/drafts'

export const cleanSlug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

banner('Clean speaker IDs')
const rows = await client.fetch<
  {_id: string; slug: string; name?: string; legacySlugs?: string[]}[]
>(
  `*[_type == "speaker" && defined(id.current) && !(_id in path("drafts.**"))]{_id, "slug": id.current, name, legacySlugs}`,
)
const taken = new Set(rows.map((r) => r.slug))
let n = 0
for (const r of rows) {
  const clean = cleanSlug(r.slug)
  if (clean === r.slug) continue
  if (!clean || taken.has(clean)) {
    console.log(`! ${r.slug} → ${clean || '(empty)'} clashes; fix by hand`)
    continue
  }
  n++
  taken.add(clean)
  console.log(`● ${r.name ?? r._id}: ${r.slug} → ${clean}`)
  await patchDraft(r._id, {
    id: {_type: 'slug', current: clean},
    legacySlugs: [...new Set([...(r.legacySlugs ?? []), r.slug])],
  })
}
console.log(`\n${n} speaker ID(s) ${APPLY ? 'changed in drafts' : 'would change'}.`)
