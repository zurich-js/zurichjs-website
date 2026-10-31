import type {DocumentBadgeComponent} from 'sanity'
import {isReady, type EventDraft} from '../lib/readiness'

/** "Ready" or "Not ready" next to the publish button on events. */
export const ReadinessBadge: DocumentBadgeComponent = (props) => {
  const doc = (props.draft ?? props.published) as EventDraft | null
  if (!doc) return null
  return isReady(doc) ? {label: 'Ready', color: 'success', title: 'Everything the public page needs is filled in.'} : {label: 'Not ready', color: 'warning', title: 'Open the Readiness tab to see what is missing.'}
}
