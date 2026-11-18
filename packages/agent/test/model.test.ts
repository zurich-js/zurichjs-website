/** The model goes to the provider we configured, even where Netlify's AI Gateway sets its own base URLs. */
import { generateText } from 'ai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { modelFromEnv } from '../src/model.ts';

const urls: string[] = [];

beforeEach(() => {
  urls.length = 0;
  // What Netlify injects into every function when the AI Gateway is on.
  vi.stubEnv('ANTHROPIC_BASE_URL', 'https://zurichjs.com/.netlify/ai');
  vi.stubEnv('OPENAI_BASE_URL', 'https://zurichjs.com/.netlify/ai/v1');
  vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
    urls.push(String(input instanceof Request ? input.url : input));
    return new Response('', { status: 401, statusText: 'Unauthorized' });
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const call = (env: Record<string, string>) => generateText({ model: modelFromEnv(env), prompt: 'hi', maxRetries: 0 }).catch(() => undefined);

describe('modelFromEnv', () => {
  it('sends Anthropic requests to api.anthropic.com, not the gateway', async () => {
    await call({ LLM_PROVIDER: 'anthropic', LLM_MODEL: 'claude-sonnet-5-5', LLM_API_KEY: 'k' });
    expect(urls).toEqual(['https://api.anthropic.com/v1/messages']);
  });

  it('sends OpenAI requests to api.openai.com, not the gateway', async () => {
    await call({ LLM_PROVIDER: 'openai', LLM_MODEL: 'gpt-x', LLM_API_KEY: 'k' });
    expect(urls[0]).toMatch(/^https:\/\/api\.openai\.com\/v1\//);
  });

  it('still uses LLM_BASE_URL when it is set', async () => {
    await call({ LLM_PROVIDER: 'anthropic', LLM_MODEL: 'claude-sonnet-5-5', LLM_API_KEY: 'k', LLM_BASE_URL: 'https://proxy.example/v1' });
    expect(urls).toEqual(['https://proxy.example/v1/messages']);
  });
});
