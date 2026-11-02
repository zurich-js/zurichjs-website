import { isDraftId, publishedIdOf, type ContentStore, type SanityDoc } from '../src/store.ts';

/** In-memory Sanity with just enough GROQ for the agent's queries. Records every call. */
export function fakeStore(docs: SanityDoc[] = []) {
  const db = new Map(docs.map((d) => [d._id, structuredClone(d)]));
  const calls: string[] = [];
  const all = () => [...db.values()];
  const store: ContentStore = {
    async query<T>(groq: string, params: Record<string, unknown> = {}): Promise<T> {
      calls.push(`query`);
      if (groq.includes('_type == "siteSettings"')) return all().filter((d) => d._type === 'siteSettings') as T;
      let rows = all().filter((d) => d._type === 'events');
      if (groq.includes('id.current == $slug')) rows = rows.filter((d) => (d.id as { current?: string } | undefined)?.current === params.slug);
      if (groq.includes('!(_id in path("drafts.**"))')) rows = rows.filter((d) => !isDraftId(d._id));
      if (groq.includes('"slug": id.current'))
        return rows.map((d) => ({ ...d, slug: (d.id as { current: string }).current, venue: (d.venue as { name?: string } | undefined)?.name ?? d.location })) as T;
      return rows as T;
    },
    async getDocument(id) {
      return structuredClone(db.get(id) ?? null);
    },
    async saveDraft(doc) {
      if (!isDraftId(doc._id)) throw new Error('not a draft');
      calls.push(`saveDraft ${doc._id}`);
      db.set(doc._id, structuredClone(doc));
    },
    async patchDraft(id, set) {
      if (!isDraftId(id)) throw new Error('not a draft');
      calls.push(`patchDraft ${id}`);
      db.set(id, { ...db.get(id)!, ...structuredClone(set) });
    },
    async publish(draftId, publishedId) {
      calls.push(`publish ${draftId}`);
      const { _id, ...rest } = db.get(draftId)!;
      db.set(publishedId, { _id: publishedId, ...rest });
      db.delete(draftId);
    },
    async discardDraft(draftId) {
      calls.push(`discard ${draftId}`);
      db.delete(draftId);
    },
  };
  return { store, db, calls, published: () => all().filter((d) => !isDraftId(d._id)), draftOf: (id: string) => db.get(`drafts.${publishedIdOf(id)}`) };
}

export const NOV: SanityDoc = {
  _id: 'evt-nov',
  _type: 'events',
  _rev: 'r1',
  title: 'Forms, types and design systems',
  id: { _type: 'slug', current: 'zurichjs-meetup-november-2026' },
  status: 'scheduled',
  datetime: '2026-11-18T17:30:00.000Z',
  venue: { name: 'Venue AG', street: 'Hardstrasse 201', zip: '8005', city: 'Zürich' },
  location: 'Venue AG',
  address: 'Hardstrasse 201, 8005 Zürich',
  description: 'Two talks about typed forms and design systems, then food and drinks with the community.',
  meetupUrl: 'https://www.meetup.com/zurich-js/events/1/',
  talks: [{ _ref: 't1' }],
};
export const SEP: SanityDoc = {
  ...NOV,
  _id: 'evt-sep',
  id: { _type: 'slug', current: 'zurichjs-meetup-september-2026' },
  title: 'Signals',
  datetime: '2026-09-16T16:30:00.000Z',
  venue: { name: 'Old Office', city: 'Zürich' },
  location: 'Old Office',
};
