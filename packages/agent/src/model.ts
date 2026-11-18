/**
 * Model-agnostic: the provider and model come from the environment, so switching models is a
 * config change. `openai-compatible` covers Mistral, Groq, OpenRouter, Together and local
 * servers (Ollama, LM Studio) through LLM_BASE_URL.
 *
 * The OpenAI and Anthropic clients always get an explicit base URL (LLM_BASE_URL, else the
 * provider's own API). Left unset, the AI SDK reads OPENAI_BASE_URL / ANTHROPIC_BASE_URL, which
 * Netlify's AI Gateway injects into every function: the request then went to
 * zurichjs.com/.netlify/ai with our own key and failed with an empty 401 "Unauthorized"
 * (18th November 2026).
 */
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';

type Env = Record<string, string | undefined>;

export const OPENAI_API_URL = 'https://api.openai.com/v1';
export const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1';

export function modelFromEnv(env: Env): LanguageModel {
  const provider = env.LLM_PROVIDER ?? 'openai';
  const model = env.LLM_MODEL;
  const apiKey = env.LLM_API_KEY;
  if (!model) throw new Error('LLM_MODEL is not set');
  switch (provider) {
    case 'openai':
      if (!apiKey) throw new Error('LLM_API_KEY is not set');
      return createOpenAI({ apiKey, baseURL: env.LLM_BASE_URL || OPENAI_API_URL })(model);
    case 'anthropic':
      if (!apiKey) throw new Error('LLM_API_KEY is not set');
      return createAnthropic({ apiKey, baseURL: env.LLM_BASE_URL || ANTHROPIC_API_URL })(model);
    case 'openai-compatible':
      if (!env.LLM_BASE_URL) throw new Error('LLM_BASE_URL is needed for openai-compatible');
      return createOpenAICompatible({ name: 'llm', baseURL: env.LLM_BASE_URL, ...(apiKey ? { apiKey } : {}) })(model);
    default:
      throw new Error(`Unknown LLM_PROVIDER "${provider}" (use openai, anthropic or openai-compatible)`);
  }
}
