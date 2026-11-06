/**
 * The only way the agent touches Sanity. Every write goes to a draft (`drafts.<id>`); published
 * documents change only through `publish`, which the model cannot call (it is wired to the Slack
 * Publish button, see slack.ts). Nothing here deletes a published document.
 */
import { createClient } from '@sanity/client';

export type SanityDoc = { _id: string; _type: string; [k: string]: unknown };

export interface ContentStore {
  /** GROQ over the raw perspective: drafts and published documents both come back. */
  query<T>(groq: string, params?: Record<string, unknown>): Promise<T>;
  getDocument(id: string): Promise<SanityDoc | null>;
  /** Creates or replaces a draft. The id must start with `drafts.`. */
  saveDraft(doc: SanityDoc): Promise<void>;
  /** Sets fields on an existing draft. */
  patchDraft(draftId: string, set: Record<string, unknown>): Promise<void>;
  publish(draftId: string, publishedId: string): Promise<void>;
  /** Deletes a draft only; the published document (if any) stays as it is. */
  discardDraft(draftId: string): Promise<void>;
}

export const DRAFT = 'drafts.';
export const isDraftId = (id: string) => id.startsWith(DRAFT);
export const publishedIdOf = (id: string) => (isDraftId(id) ? id.slice(DRAFT.length) : id);
export const draftIdOf = (id: string) => DRAFT + publishedIdOf(id);

const assertDraft = (id: string) => {
  if (!isDraftId(id)) throw new Error(`Refusing to write ${id}: the agent only writes drafts`);
};

type Env = Record<string, string | undefined>;

/** Sanity store for the agent: its own token (SANITY_AGENT_TOKEN, Editor role) so edits show as "ZurichJS Bot". */
export function sanityStore(env: Env): ContentStore {
  const token = env.SANITY_AGENT_TOKEN;
  if (!token) throw new Error('SANITY_AGENT_TOKEN is not set');
  const client = createClient({
    projectId: env.SANITY_PROJECT_ID ?? 'viqjrovw',
    dataset: env.SANITY_DATASET ?? 'production',
    apiVersion: '2026-10-01',
    token,
    useCdn: false,
    perspective: 'raw',
  });
  return {
    query: (groq, params = {}) => client.fetch(groq, params),
    getDocument: async (id) => ((await client.getDocument(id)) as SanityDoc | undefined) ?? null,
    saveDraft: async (doc) => {
      assertDraft(doc._id);
      await client.createOrReplace(doc);
    },
    patchDraft: async (draftId, set) => {
      assertDraft(draftId);
      await client.patch(draftId).set(set).commit();
    },
    publish: async (draftId, publishedId) => {
      assertDraft(draftId);
      await client.action({ actionType: 'sanity.action.document.publish', draftId, publishedId });
    },
    discardDraft: async (draftId) => {
      assertDraft(draftId);
      await client.action({ actionType: 'sanity.action.document.discard', draftId });
    },
  };
}
