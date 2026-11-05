/**
 * Backfills the agenda of events that have talks but no agenda, with the
 * evening the old website showed ("Times are estimates and subject to
 * change"): doors, welcome 18:30, first talk 18:50, talk lengths, a break,
 * networking (lib/programme.ts). Writes drafts for an organiser to check,
 * correct and publish. Prints every event with the problems it found.
 *
 *   npx sanity exec scripts/backfill-agenda.ts --with-user-token [-- --apply] [-- --event <slug>]
 */
import {programmeFromTalks, type TalkForProgramme} from '../lib/programme'
import {APPLY, arg, banner, client, patchDraft} from './lib/drafts'

interface Row {
  _id: string
  slug: string
  title: string
  datetime?: string
  talks: (TalkForProgramme | null)[]
}

banner('Backfill event agendas from talks')
const only = arg('event')
const rows = await client.fetch<Row[]>(
  `*[_type == "events" && !(_id in path("drafts.**")) && count(coalesce(agenda, [])) == 0 && count(coalesce(talks, [])) > 0 ${only ? '&& id.current == $only' : ''}]
   | order(datetime asc){ _id, "slug": id.current, title, datetime, "talks": talks[]->{_id, title, durationMinutes} }`,
  {only: only ?? ''},
)

for (const ev of rows) {
  const talks = ev.talks.filter((t): t is TalkForProgramme => !!t)
  const {agenda, issues} = programmeFromTalks(ev.datetime, talks, (i) => `bf${i}`)
  console.log(`● ${ev.slug} · ${ev.title}`)
  for (const a of agenda)
    console.log(
      `    ${a.time}  ${a.kind.padEnd(10)} ${a.title ?? talks.find((t) => t._id === a.talk?._ref)?.title ?? ''}`,
    )
  for (const i of issues) console.log(`    ! ${i.message}`)
  if (ev.talks.length !== talks.length)
    console.log('    ! A talk reference is broken; check the talks list.')
  await patchDraft(ev._id, {agenda})
}
console.log(
  `\n${rows.length} event(s) ${APPLY ? 'now have a draft agenda to review' : 'would get a draft agenda'}.`,
)
