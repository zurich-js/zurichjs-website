/**
 * What the Slack buttons do. Deterministic code, not the model: only allowlisted organisers
 * publish, a draft must pass the readiness check first, and discarding removes only the draft.
 * Publishing fires the normal Sanity webhook → debounced Netlify rebuild (src/server/rebuild.ts).
 */
import { readiness, type EventDocumentForReadiness } from '@zurichjs/events';
import { draftIdOf, publishedIdOf, type ContentStore, type SanityDoc } from './store.ts';

export type ButtonAction = 'publish' | 'discard';
export interface ButtonValue {
  id: string;
  type: string;
}
/** A Publish all / Discard all button: every document one agent reply changed. */
export interface ButtonValues {
  items: ButtonValue[];
}

/** One document a Publish press made live: the live version before (null if it was new) and after. */
export interface PublishedDoc {
  id: string;
  type: string;
  before: SanityDoc | null;
  after: SanityDoc;
}

export interface ButtonResult {
  ok: boolean;
  message: string;
  /** What was published, in order (Publish only). speaker-email.ts reads it to offer the "your talk is scheduled" email. */
  published?: PublishedDoc[];
}

/** Referenced documents go live before the documents that point at them. */
const ORDER = ['speaker', 'talk', 'talkSubmission', 'events', 'siteSettings'];
const rank = (t: string) => (ORDER.includes(t) ? ORDER.indexOf(t) : ORDER.length);

/** Turns weak references made while the target was only a draft into normal ones, once the target is live. */
async function strengthen(value: unknown, store: ContentStore): Promise<unknown> {
  if (Array.isArray(value)) return Promise.all(value.map((v) => strengthen(v, store)));
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (typeof o._ref === 'string' && o._strengthenOnPublish) {
      if (!(await store.getDocument(o._ref))) return o;
      const { _weak, _strengthenOnPublish, ...rest } = o;
      return rest;
    }
    return Object.fromEntries(await Promise.all(Object.entries(o).map(async ([k, v]) => [k, await strengthen(v, store)] as const)));
  }
  return value;
}

export async function handleButton(action: ButtonAction, value: ButtonValue | ButtonValues, user: string, publishers: Set<string>, store: ContentStore): Promise<ButtonResult> {
  const items = ('items' in value ? value.items : [value]).slice().sort((a, b) => rank(a.type) - rank(b.type));
  const drafts = (await Promise.all(items.map(async (i) => ({ ...i, draft: await store.getDocument(draftIdOf(i.id)) })))).filter((d) => d.draft);
  if (!drafts.length) return { ok: false, message: 'There is no draft any more (already published or discarded).' };
  if (action === 'discard') {
    for (const d of drafts) await store.discardDraft(draftIdOf(d.id));
    return { ok: true, message: `<@${user}> discarded ${drafts.length === 1 ? 'the draft' : `${drafts.length} drafts`}. The live site is unchanged.` };
  }
  if (!publishers.has(user)) return { ok: false, message: `<@${user}>, only organisers on the publish list can publish. Ask one of them to press Publish.` };
  // Check every event first, so a set is published whole or not at all.
  for (const d of drafts) {
    if (d.type !== 'events') continue;
    const missing = readiness(d.draft as unknown as EventDocumentForReadiness).filter((c) => !c.ok);
    if (missing.length)
      return {
        ok: false,
        message:
          drafts.length === 1
            ? `Not published: the page still needs ${missing.map((c) => c.label).join(', ')}.`
            : `Not published: ${String(d.draft!.title ?? 'the event')} still needs ${missing.map((c) => c.label).join(', ')}. Nothing was published.`,
      };
  }
  const published: PublishedDoc[] = [];
  for (const d of drafts) {
    const draftId = draftIdOf(d.id);
    const before = await store.getDocument(publishedIdOf(d.id));
    const fixed = (await strengthen(d.draft, store)) as Record<string, unknown>;
    const set = Object.fromEntries(Object.entries(fixed).filter(([k, v]) => !k.startsWith('_') && JSON.stringify(v) !== JSON.stringify(d.draft![k])));
    if (Object.keys(set).length) await store.patchDraft(draftId, set);
    await store.publish(draftId, d.id);
    published.push({ id: publishedIdOf(d.id), type: d.type, before, after: { ...(fixed as SanityDoc), _id: publishedIdOf(d.id) } });
  }
  return {
    ok: true,
    published,
    message: `<@${user}> published ${drafts.length === 1 ? 'it' : `${drafts.length} changes`}. The site rebuilds and shows ${drafts.length === 1 ? 'it' : 'them'} in about 4 minutes.`,
  };
}
