/**
 * The CFP bot's model: the cheapest one, for this path only (owner, 11th November 2026). Same
 * provider and key as the organiser bot (LLM_PROVIDER, LLM_API_KEY, LLM_BASE_URL), its own model
 * in CFP_LLM_MODEL. With Anthropic and no CFP_LLM_MODEL, it is claude-haiku-5-5. It never falls
 * back to LLM_MODEL, the organiser bot's (larger) model.
 */
import type { LanguageModel } from 'ai';
import { modelFromEnv } from '../model.ts';

export const CFP_DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-5-5';

export function cfpModelFromEnv(env: Record<string, string | undefined>): LanguageModel {
  const model = env.CFP_LLM_MODEL || (env.LLM_PROVIDER === 'anthropic' ? CFP_DEFAULT_ANTHROPIC_MODEL : undefined);
  if (!model) throw new Error('CFP_LLM_MODEL is not set (the cheapest model of LLM_PROVIDER)');
  return modelFromEnv({ ...env, LLM_MODEL: model });
}
