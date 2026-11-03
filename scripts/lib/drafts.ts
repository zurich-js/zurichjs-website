/**
 * Shared by the content-restore scripts. Every script is a dry run unless
 * `--apply` is passed, and it only ever writes drafts (`drafts.<id>`): an
 * organiser reviews and publishes in the Studio. Nothing is deleted.
 *
 *   npx sanity exec scripts/<script>.ts --with-user-token                 # dry run
 *   npx sanity exec scripts/<script>.ts --with-user-token -- --apply      # write drafts
 *   SANITY_STUDIO_DATASET=v2-preview npx sanity exec …                    # another dataset
 *
 * Running with --apply against "production" is an owner step.
 */
import {getCliClient} from 'sanity/cli'

export const APPLY = process.argv.includes('--apply')
export const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

export const client = getCliClient({apiVersion: '2026-10-01'}).withConfig(
  process.env.SANITY_STUDIO_DATASET ? {dataset: process.env.SANITY_STUDIO_DATASET} : {},
)

export const draftId = (id: string) => (id.startsWith('drafts.') ? id : `drafts.${id}`)

export function banner(title: string) {
  console.log(
    `\n${title}\nDataset: ${client.config().dataset} · ${APPLY ? 'APPLY: writing drafts' : 'dry run: nothing is written (pass --apply to write drafts)'}\n`,
  )
}

/**
 * Sets fields on the draft of a document. The draft starts as a copy of the
 * published document when it does not exist yet, so nothing else changes.
 */
export async function patchDraft(id: string, set: Record<string, unknown>) {
  const published = await client.getDocument(id)
  const existing = await client.getDocument(draftId(id))
  const base = existing ?? (published ? {...published, _id: draftId(id)} : null)
  if (!base) throw new Error(`No document ${id}`)
  if (!APPLY) return
  await client
    .transaction()
    .createIfNotExists(base as never)
    .patch(draftId(id), (p) => p.set(set))
    .commit()
}

/** Creates a new document as a draft only (never published by the script). */
export async function createDraft(doc: {_id: string; _type: string} & Record<string, unknown>) {
  if (!APPLY) return
  await client.createIfNotExists({...doc, _id: draftId(doc._id)})
}
