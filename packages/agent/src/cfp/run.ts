/** One CFP bot turn: the speaker's thread → the model with the four tools → the reply and what changed. */
import { generateText, stepCountIs, type LanguageModel, type ModelMessage } from 'ai';
import { cfpSystemPrompt } from './prompt.ts';
import type { CfpDraft, CfpStore } from './store.ts';
import { CfpTurnState, buildCfpTools } from './tools.ts';

export interface CfpTurnInput {
  model: LanguageModel;
  store: CfpStore;
  /** The speaker's draft. Its owner comes from the verified Slack event. */
  draft: CfpDraft;
  messages: ModelMessage[];
  maxSteps?: number;
}

export interface CfpTurnResult {
  text: string;
  /** The draft after the turn; null when discarded. */
  draft: CfpDraft | null;
  changed: boolean;
  /** submitMyDraft was called on a complete draft: show the private confirmation. */
  confirm: boolean;
  discarded: boolean;
  /** Model calls made, for the daily cap. */
  steps: number;
}

export async function runCfpTurn({ model, store, draft, messages, maxSteps = 5 }: CfpTurnInput): Promise<CfpTurnResult> {
  const state = new CfpTurnState(draft);
  const result = await generateText({
    model,
    system: cfpSystemPrompt(),
    messages,
    tools: buildCfpTools(store, state),
    stopWhen: stepCountIs(maxSteps),
    maxOutputTokens: 800,
  });
  const text =
    result.text.trim() ||
    (state.discarded
      ? 'Done, I deleted your draft. Mention me in a new message whenever you want to start again.'
      : state.confirm
        ? 'Here is your draft. Check the message only you can see, then press Submit.'
        : 'Sorry, I did not get that. What is your talk about?');
  return { text, draft: state.draft, changed: state.changed, confirm: state.confirm, discarded: state.discarded, steps: result.steps.length };
}
