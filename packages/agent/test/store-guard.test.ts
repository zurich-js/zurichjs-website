import { describe, expect, it } from 'vitest';
import { agentWritesAllowed, sanityStore } from '../src/store.ts';

describe('the agent and the production dataset', () => {
  it('may write to production only where SANITY_ALLOW_PRODUCTION_WRITES is 1', () => {
    expect(agentWritesAllowed({})).toBe(false);
    expect(agentWritesAllowed({ SANITY_DATASET: 'production' })).toBe(false);
    expect(agentWritesAllowed({ SANITY_DATASET: 'production', CONTEXT: 'deploy-preview' })).toBe(false);
    expect(agentWritesAllowed({ SANITY_DATASET: 'production', SANITY_ALLOW_PRODUCTION_WRITES: '1' })).toBe(true);
    expect(agentWritesAllowed({ SANITY_DATASET: 'staging' })).toBe(true);
  });

  it('refuses every write before it reaches Sanity, and says how to allow it', async () => {
    const store = sanityStore({ SANITY_AGENT_TOKEN: 'sk' });
    const refused = /Writes to the production dataset are off here/;
    await expect(store.saveDraft({ _id: 'drafts.x', _type: 'events' })).rejects.toThrow(refused);
    await expect(store.patchDraft('drafts.x', { title: 'x' })).rejects.toThrow(refused);
    await expect(store.publish('drafts.x', 'x')).rejects.toThrow(refused);
    await expect(store.discardDraft('drafts.x')).rejects.toThrow(refused);
  });
});
