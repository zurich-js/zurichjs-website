/**
 * What the Slack buttons do. Deterministic code, not the model: only allowlisted organisers
 * publish, a draft must pass the readiness check first, and discarding removes only the draft.
 * Publishing fires the normal Sanity webhook → debounced Netlify rebuild (src/server/rebuild.ts).
 */
import { readiness, type EventDocumentForReadiness } from '@zurichjs/events';
import { draftIdOf, type ContentStore } from './store';

export type ButtonAction = 'publish' | 'discard';
export interface ButtonValue {
  id: string;
  type: 'events' | 'siteSettings';
}

export interface ButtonResult {
  ok: boolean;
  message: string;
}

export async function handleButton(action: ButtonAction, value: ButtonValue, user: string, publishers: Set<string>, store: ContentStore): Promise<ButtonResult> {
  const draftId = draftIdOf(value.id);
  const draft = await store.getDocument(draftId);
  if (!draft) return { ok: false, message: 'There is no draft any more (already published or discarded).' };
  if (action === 'discard') {
    await store.discardDraft(draftId);
    return { ok: true, message: `<@${user}> discarded the draft. The live page is unchanged.` };
  }
  if (!publishers.has(user)) return { ok: false, message: `<@${user}>, only organisers on the publish list can publish. Ask one of them to press Publish.` };
  if (value.type === 'events') {
    const missing = readiness(draft as unknown as EventDocumentForReadiness).filter((c) => !c.ok);
    if (missing.length) return { ok: false, message: `Not published: the page still needs ${missing.map((c) => c.label).join(', ')}.` };
  }
  await store.publish(draftId, value.id);
  return { ok: true, message: `<@${user}> published it. The site rebuilds and shows it in about 4 minutes.` };
}
