/** One agent turn: thread so far → model with the tools → reply text and the drafts it changed. */
import { generateText, stepCountIs, type LanguageModel, type ModelMessage } from 'ai';
import { systemPrompt } from './prompt.ts';
import type { ContentStore } from './store.ts';
import { ChangeLog, buildTools, type DraftChange } from './tools.ts';

export interface TurnInput {
  model: LanguageModel;
  store: ContentStore;
  /** The conversation so far, oldest first. */
  messages: ModelMessage[];
  now?: () => Date;
  /** Upper bound on model ↔ tool round trips per turn. */
  maxSteps?: number;
}

export interface TurnResult {
  text: string;
  changes: DraftChange[];
}

export async function runTurn({ model, store, messages, now = () => new Date(), maxSteps = 8 }: TurnInput): Promise<TurnResult> {
  const log = new ChangeLog();
  const result = await generateText({
    model,
    system: systemPrompt(now()),
    messages,
    tools: buildTools(store, log, now),
    stopWhen: stepCountIs(maxSteps),
  });
  const text = result.text.trim() || (log.list().length ? 'Done. Here are the draft changes:' : 'I could not finish that. Could you rephrase or give more detail?');
  return { text, changes: log.list() };
}
