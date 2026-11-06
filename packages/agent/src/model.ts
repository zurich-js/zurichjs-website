/**
 * Model-agnostic: the provider and model come from the environment, so switching models is a
 * config change. `openai-compatible` covers Mistral, Groq, OpenRouter, Together and local
 * servers (Ollama, LM Studio) through LLM_BASE_URL.
 */
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';

type Env = Record<string, string | undefined>;

export function modelFromEnv(env: Env): LanguageModel {
  const provider = env.LLM_PROVIDER ?? 'openai';
  const model = env.LLM_MODEL;
  const apiKey = env.LLM_API_KEY;
  if (!model) throw new Error('LLM_MODEL is not set');
  switch (provider) {
    case 'openai':
      if (!apiKey) throw new Error('LLM_API_KEY is not set');
      return createOpenAI({ apiKey, ...(env.LLM_BASE_URL ? { baseURL: env.LLM_BASE_URL } : {}) })(model);
    case 'anthropic':
      if (!apiKey) throw new Error('LLM_API_KEY is not set');
      return createAnthropic({ apiKey })(model);
    case 'openai-compatible':
      if (!env.LLM_BASE_URL) throw new Error('LLM_BASE_URL is needed for openai-compatible');
      return createOpenAICompatible({ name: 'llm', baseURL: env.LLM_BASE_URL, ...(apiKey ? { apiKey } : {}) })(model);
    default:
      throw new Error(`Unknown LLM_PROVIDER "${provider}" (use openai, anthropic or openai-compatible)`);
  }
}
