import {useState} from 'react'
import type {DocumentActionProps} from 'sanity'
import {useClient, useDocumentOperation} from 'sanity'
import {programmeFromTalks, type TalkForProgramme} from '../lib/programme'

/**
 * "Fill programme from talks": writes the usual evening (doors, welcome,
 * talks with their lengths, a break, networking) into the agenda of the
 * draft, for the organiser to check and adjust before publishing.
 * Only offered while the agenda is empty, so it never overwrites edits.
 */
export default function FillProgrammeAction(props: DocumentActionProps) {
  const {id, type, draft, published, onComplete} = props
  const doc = (draft || published) as {
    datetime?: string
    agenda?: unknown[]
    talks?: {_ref: string}[]
  } | null
  const {patch} = useDocumentOperation(id, type)
  const client = useClient({apiVersion: '2024-10-01'})
  const [busy, setBusy] = useState(false)

  if (type !== 'events' || !doc || (doc.agenda?.length ?? 0) > 0 || !(doc.talks?.length ?? 0))
    return null

  return {
    label: busy ? 'Filling…' : 'Fill programme from talks',
    disabled: busy,
    onHandle: async () => {
      setBusy(true)
      const refs = (doc.talks ?? []).map((t) => t._ref)
      const found = await client.fetch<TalkForProgramme[]>(
        `*[_id in $ids]{_id, title, durationMinutes}`,
        {ids: refs},
      )
      const talks = refs
        .map((r) => found.find((t) => t._id === r))
        .filter((t): t is TalkForProgramme => !!t)
      const {agenda, issues} = programmeFromTalks(doc.datetime, talks, () =>
        Math.random().toString(36).slice(2, 10),
      )
      patch.execute([{setIfMissing: {agenda: []}}, {set: {agenda}}])
      setBusy(false)
      onComplete()
      if (issues.length)
        window.alert(
          `Programme filled. Please check:\n\n• ${issues.map((i) => i.message).join('\n• ')}`,
        )
    },
  }
}
