import { describe, expect, it } from 'vitest';
import { cfpModelFromEnv, confirmationBlocks, escapeMrkdwn, maskEmail } from '../src/cfp/index.ts';

describe('email masking', () => {
  it('shows the first letter and the domain only', () => {
    expect(maskEmail('grace@example.com')).toBe('g•••@example.com');
    expect(maskEmail('a@b.ch')).toBe('a•••@b.ch');
    expect(maskEmail('not-an-email')).toBe('•••');
  });

  it('the confirmation shows the masked email, never the full one', () => {
    const blocks = JSON.stringify(confirmationBlocks({ draftId: 'd', fields: {}, name: 'Grace', email: 'grace@example.com', emailFromProfile: true, hasPhoto: true, photo: null }));
    expect(blocks).toContain('g•••@example.com (from your Slack profile)');
    expect(blocks).not.toContain('grace@example.com');
  });
});

describe('escaping for Slack', () => {
  it('neutralises mentions, broadcasts and links', () => {
    const out = escapeMrkdwn('<!channel> <@U1> @here @everyone <https://x.io|y> http://x.io mailto:a@b.c');
    expect(out).not.toMatch(/<|>/);
    expect(out).not.toMatch(/@(channel|here|everyone)/);
    expect(out).not.toContain('://');
    expect(out).not.toContain('mailto:');
  });

  it('keeps ordinary text readable', () => {
    expect(escapeMrkdwn('Testing *without* mocks & stubs')).toBe('Testing *without* mocks &amp; stubs');
  });
});

describe('the CFP model', () => {
  it('defaults to claude-haiku-5-5 with Anthropic, and never uses the organiser model', () => {
    expect(() => cfpModelFromEnv({ LLM_PROVIDER: 'anthropic', LLM_API_KEY: 'k', LLM_MODEL: 'big-model' })).not.toThrow();
    expect((cfpModelFromEnv({ LLM_PROVIDER: 'anthropic', LLM_API_KEY: 'k', LLM_MODEL: 'big-model' }) as { modelId: string }).modelId).toBe('claude-haiku-5-5');
    expect((cfpModelFromEnv({ LLM_PROVIDER: 'anthropic', LLM_API_KEY: 'k', CFP_LLM_MODEL: 'other' }) as { modelId: string }).modelId).toBe('other');
    expect(() => cfpModelFromEnv({ LLM_PROVIDER: 'openai', LLM_API_KEY: 'k', LLM_MODEL: 'big-model' })).toThrow(/CFP_LLM_MODEL/);
  });
});
