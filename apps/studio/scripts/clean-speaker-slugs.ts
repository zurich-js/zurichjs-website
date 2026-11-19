/**
 * Makes every speaker ID a clean, name-based URL segment (lib/speakerIds.ts):
 *   - an ID the old site generated ("speaker-<uuid>") becomes the speaker's name ("nadja-hesselbjerg");
 *   - any other ID that is not lowercase letters, digits and single hyphens is cleaned.
 * With --apply it writes a draft that sets the new ID and keeps the old one in `legacySlugs`, so
 * zurichjs.com/speakers/<old> redirects (301) and feedback and profile links already emailed keep
 * working, once the draft is published and the site rebuilt. Clashes are listed for a person to settle.
 *
 *   npx sanity exec scripts/clean-speaker-slugs.ts --with-user-token [-- --apply]
 */
import {planSpeakerIds, type SpeakerIdRow} from '../lib/speakerIds'
import {APPLY, banner, client, patchDraft} from './lib/drafts'

banner('Clean speaker IDs')
const rows = await client.fetch<SpeakerIdRow[]>(
  `*[_type == "speaker" && defined(id.current) && !(_id in path("drafts.**"))] | order(name asc) {_id, "slug": id.current, name, legacySlugs}`,
)
let n = 0
for (const plan of planSpeakerIds(rows)) {
  const who = plan.row.name ?? plan.row._id
  if (plan.kind === 'problem') {
    console.log(`! ${who}: ${plan.row.slug} ${plan.reason}; fix by hand`)
    continue
  }
  n++
  console.log(`● ${who}: ${plan.row.slug} → ${plan.to}`)
  await patchDraft(plan.row._id, {
    id: {_type: 'slug', current: plan.to},
    legacySlugs: plan.legacySlugs,
  })
}
console.log(`\n${n} speaker ID(s) ${APPLY ? 'changed in drafts' : 'would change'}.`)
